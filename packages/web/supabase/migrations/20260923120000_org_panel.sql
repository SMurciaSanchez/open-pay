-- ============================================================
-- Panel de la organización (docs/PLAN_PANEL_ORGANIZACION.md, Etapa 1)
--
-- Lo que faltaba para que una organización recorra el flujo desde la app:
--
--  1. Crear la organización e invitar a su equipo. Hasta ahora solo se podía
--     con la llave de servicio.
--  2. Lotes por rubro. El circuito prueba "total ≤ tope", y el tope es el de un
--     rubro (Budget): un lote que mezclara rubros no tendría un tope único.
--  3. La lista de proveedores que se ancla, en orden. El circuito necesita el
--     camino de cada proveedor dentro de esa lista, y el camino depende del
--     orden: sin guardarlo, la raíz anclada no se podría rehacer.
--  4. La prueba ZK de cada lote, pública, para que /verificar la abra sola.
--
-- Quién hace qué:
--  - El navegador del tesorero no puede armar el lote: la sal de cada pago (N4)
--    no la lee ningún rol de cliente, y sin ella no hay compromiso. Lo arma el
--    servidor, que lee las sales con la llave de servicio. Pero la AUTORIZACIÓN
--    sigue aquí: el servidor llama a estas funciones con el token del tesorero,
--    y son ellas las que comprueban el rol y las reglas del lote.
--  - La prueba la sube el script del operador con la llave de servicio
--    (packages/circuits/src/prove-batch.ts). Ningún cliente escribe pruebas.
--
-- Ejecutar completo en Supabase Dashboard → SQL Editor.
-- ============================================================

BEGIN;

-- ── 1. Organización y equipo ─────────────────────────────────

-- Quien crea la organización queda como representante legal: es el rol que
-- responde por ella y el único que administra el equipo.
CREATE OR REPLACE FUNCTION create_organization(p_name TEXT, p_nit TEXT, p_kind TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  l_me  TEXT := current_profile_id();
  l_id  TEXT;
BEGIN
  IF l_me IS NULL THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  IF length(trim(coalesce(p_name, ''))) < 3 THEN
    RAISE EXCEPTION 'El nombre de la organización es obligatorio';
  END IF;

  INSERT INTO "Organization" (name, nit, kind)
  VALUES (trim(p_name), nullif(trim(coalesce(p_nit, '')), ''), p_kind)
  RETURNING id INTO l_id;

  INSERT INTO "OrgMember" ("organizationId", "profileId", role)
  VALUES (l_id, l_me, 'LEGAL_REP');

  RETURN l_id;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Ya existe una organización con ese NIT';
END;
$$;

-- Agregar a alguien al equipo. Tiene que tener cuenta en OpenPay.
-- Si antes fue miembro y se le revocó, vuelve con el rol nuevo: la fila es la
-- misma porque la regla es un rol por persona por organización.
CREATE OR REPLACE FUNCTION add_org_member(p_org_id TEXT, p_email TEXT, p_role TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  l_profile  TEXT;
  l_member   "OrgMember"%ROWTYPE;
  l_id       TEXT;
BEGIN
  IF NOT has_org_role(p_org_id, ARRAY['LEGAL_REP']) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  IF p_role NOT IN ('CONFIGURATOR', 'APPROVER', 'TREASURER', 'LEGAL_REP') THEN
    RAISE EXCEPTION 'Rol inválido';
  END IF;

  SELECT id INTO l_profile FROM "Profile" WHERE lower(email) = lower(trim(p_email));
  IF l_profile IS NULL THEN
    RAISE EXCEPTION 'No hay una cuenta de OpenPay con ese correo';
  END IF;

  SELECT * INTO l_member FROM "OrgMember"
  WHERE "organizationId" = p_org_id AND "profileId" = l_profile
  FOR UPDATE;

  IF FOUND AND l_member."revokedAt" IS NULL THEN
    RAISE EXCEPTION 'Esa persona ya es miembro (una persona tiene un solo rol)';
  END IF;

  IF FOUND THEN
    UPDATE "OrgMember" SET role = p_role, "revokedAt" = NULL
    WHERE id = l_member.id;
    RETURN l_member.id;
  END IF;

  INSERT INTO "OrgMember" ("organizationId", "profileId", role)
  VALUES (p_org_id, l_profile, p_role)
  RETURNING id INTO l_id;
  RETURN l_id;
END;
$$;

-- Sacar a alguien del equipo. Se revoca, no se borra: la historia de quién
-- aprobó qué tiene que seguir apuntando a alguien.
CREATE OR REPLACE FUNCTION revoke_org_member(p_member_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  l_member "OrgMember"%ROWTYPE;
BEGIN
  SELECT * INTO l_member FROM "OrgMember" WHERE id = p_member_id FOR UPDATE;

  IF NOT FOUND OR NOT has_org_role(l_member."organizationId", ARRAY['LEGAL_REP']) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  -- Si el representante se sacara a sí mismo, la organización podría quedar
  -- sin nadie que administre el equipo.
  IF l_member."profileId" = current_profile_id() THEN
    RAISE EXCEPTION 'No puedes sacarte a ti mismo del equipo';
  END IF;
  IF l_member."revokedAt" IS NOT NULL THEN
    RAISE EXCEPTION 'Esa persona ya no es miembro';
  END IF;

  UPDATE "OrgMember" SET "revokedAt" = NOW() WHERE id = p_member_id;
END;
$$;

-- El equipo con nombres y correos. Profile solo deja leer el propio, así que
-- sin esto nadie vería con quién trabaja.
CREATE OR REPLACE FUNCTION org_members(p_org_id TEXT)
RETURNS TABLE (id TEXT, "profileId" TEXT, "fullName" TEXT, email TEXT,
               role TEXT, "revokedAt" TIMESTAMPTZ, "createdAt" TIMESTAMPTZ)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_org_role(p_org_id, ARRAY['CONFIGURATOR', 'APPROVER', 'TREASURER', 'LEGAL_REP']) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  RETURN QUERY
  SELECT m.id, m."profileId", p."fullName", p.email, m.role, m."revokedAt", m."createdAt"
  FROM "OrgMember" m
  JOIN "Profile" p ON p.id = m."profileId"
  WHERE m."organizationId" = p_org_id
  ORDER BY m."revokedAt" NULLS FIRST, m."createdAt";
END;
$$;

-- ── 2. Lista de proveedores anclada ──────────────────────────

CREATE TABLE IF NOT EXISTS "VendorSetSnapshot" (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "fundId"          TEXT NOT NULL REFERENCES "Fund"(id) ON DELETE RESTRICT,
  subject           BYTEA NOT NULL,
  root              BYTEA NOT NULL UNIQUE,
  "treeHeight"      INT NOT NULL CHECK ("treeHeight" BETWEEN 1 AND 32),
  -- En el orden de las hojas. El camino de cada proveedor depende de él.
  "vendorIds"       TEXT[] NOT NULL CHECK (cardinality("vendorIds") > 0),
  status            TEXT NOT NULL DEFAULT 'BUILT' CHECK (status IN ('BUILT', 'ANCHORED')),
  "chainId"         BIGINT,
  "contractAddress" TEXT,
  "txHash"          TEXT,
  "anchoredAt"      TIMESTAMPTZ,
  "builtBy"         TEXT NOT NULL REFERENCES "Profile"(id),
  "builtAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (octet_length(root) = 32),
  CHECK (octet_length(subject) = 32),
  CHECK (cardinality("vendorIds") <= (2 ^ "treeHeight")::bigint),
  CHECK ((status = 'ANCHORED') = ("txHash" IS NOT NULL
                                  AND "chainId" IS NOT NULL
                                  AND "contractAddress" IS NOT NULL
                                  AND "anchoredAt" IS NOT NULL)),
  CHECK ("contractAddress" IS NULL OR "contractAddress" ~ '^0x[0-9a-fA-F]{40}$'),
  CHECK ("txHash" IS NULL OR "txHash" ~ '^0x[0-9a-fA-F]{64}$'),
  UNIQUE (id, "fundId")
);

CREATE INDEX IF NOT EXISTS vendor_set_fund_idx ON "VendorSetSnapshot" ("fundId", "builtAt");

CREATE OR REPLACE FUNCTION forbid_anchored_vendor_set_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'ANCHORED' THEN
    RAISE EXCEPTION 'La lista ya está anclada en la cadena: no se modifica ni se borra';
  END IF;
  RETURN CASE TG_OP WHEN 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

DROP TRIGGER IF EXISTS vendor_set_frozen ON "VendorSetSnapshot";
CREATE TRIGGER vendor_set_frozen
  BEFORE UPDATE OR DELETE ON "VendorSetSnapshot"
  FOR EACH ROW EXECUTE FUNCTION forbid_anchored_vendor_set_change();

-- ── 3. Lotes por rubro ───────────────────────────────────────

ALTER TABLE "PaymentBatch" ADD COLUMN IF NOT EXISTS "budgetId" TEXT;
ALTER TABLE "PaymentBatch" ADD COLUMN IF NOT EXISTS "vendorSetId" TEXT;

DO $fk$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_batch_budget_fk') THEN
    ALTER TABLE "PaymentBatch" ADD CONSTRAINT payment_batch_budget_fk
      FOREIGN KEY ("budgetId", "fundId") REFERENCES "Budget"(id, "fundId");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_batch_vendor_set_fk') THEN
    ALTER TABLE "PaymentBatch" ADD CONSTRAINT payment_batch_vendor_set_fk
      FOREIGN KEY ("vendorSetId", "fundId") REFERENCES "VendorSetSnapshot"(id, "fundId");
  END IF;
END
$fk$;

-- Un lote por rubro y por período: dos lotes del mismo mes permitirían partir
-- los pagos para que cada mitad quepa en el tope.
CREATE UNIQUE INDEX IF NOT EXISTS payment_batch_budget_period_idx
  ON "PaymentBatch" ("budgetId", "periodStart") WHERE "budgetId" IS NOT NULL;

-- ── 4. RPC para el servidor (se llaman con el token del tesorero) ──

-- Registrar la lista de proveedores tal como se va a anclar. Tiene que ser
-- exactamente la lista vigente del fondo: ni uno de más, ni uno revocado.
CREATE OR REPLACE FUNCTION record_vendor_set(
  p_fund_id     TEXT,
  p_subject     BYTEA,
  p_root        BYTEA,
  p_tree_height INT,
  p_vendor_ids  TEXT[]
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  l_id       TEXT;
  l_vigentes TEXT[];
BEGIN
  IF NOT has_fund_role(p_fund_id, ARRAY['TREASURER']) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  SELECT coalesce(array_agg(id ORDER BY id), '{}') INTO l_vigentes
  FROM "AuthorizedVendor"
  WHERE "fundId" = p_fund_id AND "revokedAt" IS NULL;

  IF cardinality(l_vigentes) = 0 THEN
    RAISE EXCEPTION 'El fondo no tiene proveedores autorizados';
  END IF;
  IF (SELECT array_agg(v ORDER BY v) FROM unnest(p_vendor_ids) v) IS DISTINCT FROM l_vigentes THEN
    RAISE EXCEPTION 'La lista no coincide con los proveedores vigentes del fondo';
  END IF;

  -- La misma lista ya registrada: se reutiliza en vez de duplicarla.
  SELECT id INTO l_id FROM "VendorSetSnapshot" WHERE root = p_root AND "fundId" = p_fund_id;
  IF l_id IS NOT NULL THEN
    RETURN l_id;
  END IF;

  INSERT INTO "VendorSetSnapshot" ("fundId", subject, root, "treeHeight", "vendorIds", "builtBy")
  VALUES (p_fund_id, p_subject, p_root, p_tree_height, p_vendor_ids, current_profile_id())
  RETURNING id INTO l_id;

  RETURN l_id;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Esa raíz ya está registrada en otro fondo';
END;
$$;

CREATE OR REPLACE FUNCTION anchor_vendor_set(
  p_vendor_set_id TEXT,
  p_chain_id      BIGINT,
  p_contract      TEXT,
  p_tx_hash       TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  l_set "VendorSetSnapshot"%ROWTYPE;
BEGIN
  SELECT * INTO l_set FROM "VendorSetSnapshot" WHERE id = p_vendor_set_id FOR UPDATE;

  IF NOT FOUND OR NOT has_fund_role(l_set."fundId", ARRAY['TREASURER']) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  IF l_set.status = 'ANCHORED' THEN
    RAISE EXCEPTION 'Esa lista ya está anclada';
  END IF;

  UPDATE "VendorSetSnapshot"
  SET status = 'ANCHORED', "chainId" = p_chain_id,
      "contractAddress" = p_contract, "txHash" = p_tx_hash, "anchoredAt" = NOW()
  WHERE id = p_vendor_set_id;
END;
$$;

-- Registrar el lote de un rubro para un mes cerrado.
--
-- Las comprobaciones que le dan sentido a la raíz:
--  - el mes ya terminó (se ancla después de cerrar el período: MODELO_AMENAZA §6);
--  - la lista de proveedores contra la que se probará ya está anclada;
--  - TODOS los pagos conciliados del rubro en ese mes entran, sin excepción.
--    Esto es lo que impide armar un lote "cómodo" dejando afuera un pago: el
--    circuito prueba que el lote es completo respecto de la raíz, y esta
--    función, que la raíz es completa respecto de la base.
--  - cada pago fue a un proveedor de esa lista;
--  - caben en el árbol.
--
-- Los compromisos los calcula el servidor (Poseidon, con la sal). Esta función
-- no los puede recalcular; confía en el servidor para eso y solo en eso.
CREATE OR REPLACE FUNCTION record_budget_batch(
  p_budget_id     TEXT,
  p_vendor_set_id TEXT,
  p_subject       BYTEA,
  p_root          BYTEA,
  p_tree_height   INT,
  p_period_start  DATE,
  p_leaves        JSONB
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  l_me          TEXT := current_profile_id();
  l_fund        TEXT;
  l_set         "VendorSetSnapshot"%ROWTYPE;
  l_period_end  DATE := (p_period_start + INTERVAL '1 month' - INTERVAL '1 day')::date;
  l_esperados   TEXT[];
  l_recibidos   TEXT[];
  l_batch_id    TEXT;
  l_count       INT;
BEGIN
  SELECT "fundId" INTO l_fund FROM "Budget" WHERE id = p_budget_id;
  IF l_fund IS NULL OR NOT has_fund_role(l_fund, ARRAY['TREASURER']) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  IF p_period_start <> date_trunc('month', p_period_start)::date THEN
    RAISE EXCEPTION 'El período tiene que empezar el primer día del mes';
  END IF;
  IF l_period_end >= date_trunc('month', NOW())::date THEN
    RAISE EXCEPTION 'El mes todavía no ha cerrado';
  END IF;

  SELECT * INTO l_set FROM "VendorSetSnapshot" WHERE id = p_vendor_set_id;
  IF NOT FOUND OR l_set."fundId" <> l_fund THEN
    RAISE EXCEPTION 'La lista de proveedores no es de este fondo';
  END IF;
  IF l_set.status <> 'ANCHORED' THEN
    RAISE EXCEPTION 'La lista de proveedores tiene que estar anclada antes que el lote';
  END IF;

  IF jsonb_typeof(p_leaves) <> 'array' OR jsonb_array_length(p_leaves) = 0 THEN
    RAISE EXCEPTION 'Un lote sin pagos no tiene nada que comprometer';
  END IF;
  IF jsonb_array_length(p_leaves) > (2 ^ p_tree_height)::bigint THEN
    RAISE EXCEPTION 'El lote no cabe en un árbol de altura %', p_tree_height;
  END IF;

  -- Los que tienen que estar: conciliados, del rubro, pagados en el mes, sin lote.
  SELECT coalesce(array_agg(p.id ORDER BY p.id), '{}') INTO l_esperados
  FROM "Payment" p
  WHERE p."budgetId" = p_budget_id
    AND p.status = 'RECONCILED'
    AND p."paidOn" BETWEEN p_period_start AND l_period_end
    AND NOT EXISTS (SELECT 1 FROM "PaymentCommitment" c WHERE c."paymentId" = p.id);

  SELECT coalesce(array_agg(leaf->>'paymentId' ORDER BY leaf->>'paymentId'), '{}') INTO l_recibidos
  FROM jsonb_array_elements(p_leaves) leaf;

  IF l_recibidos IS DISTINCT FROM l_esperados THEN
    RAISE EXCEPTION 'El lote tiene que traer exactamente los pagos conciliados del rubro en ese mes (se esperaban %, llegaron %)',
      cardinality(l_esperados), cardinality(l_recibidos);
  END IF;

  IF EXISTS (
    SELECT 1 FROM "Payment" p
    WHERE p.id = ANY (l_esperados) AND NOT (p."vendorId" = ANY (l_set."vendorIds"))
  ) THEN
    RAISE EXCEPTION 'Hay pagos a proveedores que no están en la lista anclada';
  END IF;

  INSERT INTO "PaymentBatch" ("fundId", "budgetId", "vendorSetId", subject, root, "treeHeight",
                              "periodStart", "periodEnd", "builtBy")
  VALUES (l_fund, p_budget_id, p_vendor_set_id, p_subject, p_root, p_tree_height,
          p_period_start, l_period_end, l_me)
  RETURNING id INTO l_batch_id;

  INSERT INTO "PaymentCommitment" ("batchId", "paymentId", "leafIndex", commitment, "treeHeight")
  SELECT l_batch_id,
         leaf->>'paymentId',
         (leaf->>'leafIndex')::int,
         decode(replace(leaf->>'commitment', '\x', ''), 'hex'),
         p_tree_height
  FROM jsonb_array_elements(p_leaves) AS leaf;

  GET DIAGNOSTICS l_count = ROW_COUNT;
  IF l_count <> jsonb_array_length(p_leaves) THEN
    RAISE EXCEPTION 'El lote trae hojas repetidas';
  END IF;

  RETURN l_batch_id;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Ya hay un lote de ese rubro para ese mes, o esa raíz ya se registró';
END;
$$;

-- Descartar un lote que se armó pero no se pudo anclar (p. ej. falló la red).
-- Los pagos quedan libres para armarlo de nuevo.
CREATE OR REPLACE FUNCTION discard_unanchored_batch(p_batch_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  l_batch "PaymentBatch"%ROWTYPE;
BEGIN
  SELECT * INTO l_batch FROM "PaymentBatch" WHERE id = p_batch_id FOR UPDATE;
  IF NOT FOUND OR NOT has_fund_role(l_batch."fundId", ARRAY['TREASURER']) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  -- El trigger payment_batch_frozen impide borrar uno anclado.
  DELETE FROM "PaymentBatch" WHERE id = p_batch_id;
END;
$$;

-- ── 5. Pruebas ZK de los lotes ───────────────────────────────

-- Solo inserción. La sube el script del operador con la llave de servicio.
CREATE TABLE IF NOT EXISTS "BatchProof" (
  "batchId"          TEXT PRIMARY KEY REFERENCES "PaymentBatch"(id) ON DELETE RESTRICT,
  -- Tope probado, en unidades mínimas (pesos × 100): es la tercera señal pública.
  "budgetLimitMinor" NUMERIC(38,0) NOT NULL CHECK ("budgetLimitMinor" > 0),
  proof              JSONB NOT NULL,
  "publicSignals"    JSONB NOT NULL CHECK (jsonb_array_length("publicSignals") = 3),
  -- Huella de la clave con que se generó; tiene que ser la anclada.
  "vkeyHash"         BYTEA NOT NULL CHECK (octet_length("vkeyHash") = 32),
  "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS batch_proof_append_only ON "BatchProof";
CREATE TRIGGER batch_proof_append_only
  BEFORE UPDATE OR DELETE ON "BatchProof"
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();

-- ── 6. RLS y permisos ────────────────────────────────────────

ALTER TABLE "VendorSetSnapshot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BatchProof"        ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "VendorSetSnapshot", "BatchProof" FROM anon, authenticated;

GRANT SELECT ON "VendorSetSnapshot", "BatchProof" TO authenticated;

DROP POLICY IF EXISTS vendor_set_select ON "VendorSetSnapshot";
CREATE POLICY vendor_set_select ON "VendorSetSnapshot" FOR SELECT TO authenticated
  USING (has_fund_role("fundId", ARRAY['CONFIGURATOR', 'APPROVER', 'TREASURER', 'LEGAL_REP']));

DROP POLICY IF EXISTS batch_proof_select ON "BatchProof";
CREATE POLICY batch_proof_select ON "BatchProof" FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM "PaymentBatch" b
    WHERE b.id = "batchId"
      AND has_fund_role(b."fundId", ARRAY['CONFIGURATOR', 'APPROVER', 'TREASURER', 'LEGAL_REP'])));

REVOKE ALL ON FUNCTION create_organization(TEXT, TEXT, TEXT)              FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION add_org_member(TEXT, TEXT, TEXT)                   FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION revoke_org_member(TEXT)                            FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION org_members(TEXT)                                  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION record_vendor_set(TEXT, BYTEA, BYTEA, INT, TEXT[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION anchor_vendor_set(TEXT, BIGINT, TEXT, TEXT)        FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION record_budget_batch(TEXT, TEXT, BYTEA, BYTEA, INT, DATE, JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION discard_unanchored_batch(TEXT)                     FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION create_organization(TEXT, TEXT, TEXT)              TO authenticated;
GRANT EXECUTE ON FUNCTION add_org_member(TEXT, TEXT, TEXT)                   TO authenticated;
GRANT EXECUTE ON FUNCTION revoke_org_member(TEXT)                            TO authenticated;
GRANT EXECUTE ON FUNCTION org_members(TEXT)                                  TO authenticated;
GRANT EXECUTE ON FUNCTION record_vendor_set(TEXT, BYTEA, BYTEA, INT, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION anchor_vendor_set(TEXT, BIGINT, TEXT, TEXT)        TO authenticated;
GRANT EXECUTE ON FUNCTION record_budget_batch(TEXT, TEXT, BYTEA, BYTEA, INT, DATE, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION discard_unanchored_batch(TEXT)                     TO authenticated;

-- ── 7. Vista pública: lo que abre /verificar?lote=<id> ───────

-- Nada que no esté ya en la cadena o en las vistas públicas: nombre del fondo y
-- de la organización (N0), rubro y su tope (N1), período, raíces, prueba y
-- dónde se anclaron. Sin número de pagos, a propósito (ver PublicAnchoredBatch).
CREATE OR REPLACE VIEW "PublicBatchProof" AS
SELECT b.id                                  AS "batchId",
       f.id                                  AS "fundId",
       f.name                                AS "fundName",
       o.name                                AS "organizationName",
       bu.category                           AS "budgetCategory",
       b."periodStart",
       b."periodEnd",
       '0x' || encode(b.root, 'hex')         AS "batchRoot",
       '0x' || encode(vs.root, 'hex')        AS "vendorSetRoot",
       bp."budgetLimitMinor"::text           AS "budgetLimitMinor",
       bp.proof,
       bp."publicSignals",
       '0x' || encode(bp."vkeyHash", 'hex')  AS "vkeyHash",
       b."chainId",
       b."contractAddress",
       b."txHash"                            AS "batchTxHash",
       vs."txHash"                           AS "vendorSetTxHash",
       b."anchoredAt",
       bp."createdAt"                        AS "provedAt"
FROM "BatchProof" bp
JOIN "PaymentBatch" b       ON b.id = bp."batchId" AND b.status = 'ANCHORED'
JOIN "VendorSetSnapshot" vs ON vs.id = b."vendorSetId" AND vs.status = 'ANCHORED'
JOIN "Budget" bu            ON bu.id = b."budgetId"
JOIN "Fund" f               ON f.id = b."fundId" AND f.status <> 'DRAFT'
JOIN "Organization" o       ON o.id = f."organizationId";

GRANT SELECT ON "PublicBatchProof" TO anon, authenticated;

COMMIT;
