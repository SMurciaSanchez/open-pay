-- ============================================================
-- Fase 2 — Lotes de compromisos
-- Qué se ancló en la cadena, de qué pagos y con qué raíz.
--
-- El cálculo de los compromisos y del árbol NO ocurre aquí: Poseidon vive en
-- packages/contracts/src/commitment.ts, porque tiene que ser el mismo código
-- que use el circuito de la Fase 3. Esta migración guarda el resultado y, sobre
-- todo, impone las reglas que hacen que una raíz signifique algo:
--
--  - solo entran pagos RECONCILED, es decir respaldados por un movimiento
--    bancario de un extracto sellado;
--  - un pago entra en un solo lote vigente;
--  - una vez anclado, el lote no se toca: cambiarlo dejaría en la cadena una
--    raíz que ya no corresponde a nada.
--
-- Qué se publica: la raíz, el período y la transacción en la cadena. Qué NO:
-- cuántos pagos tenía el lote. El árbol se rellena hasta una altura fija justo
-- para que la raíz no lo revele; publicar el conteo desharía eso.
--
-- Esta migración cubre los lotes de pagos. Las raíces de listas de proveedores
-- y de reglas (que el contrato también acepta) llegan en la Fase 3.
--
-- Ejecutar completo en Supabase Dashboard → SQL Editor.
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS "PaymentBatch" (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "fundId"          TEXT NOT NULL REFERENCES "Fund"(id) ON DELETE RESTRICT,
  -- Identificador público del fondo tal como va al contrato. No es su id.
  subject           BYTEA NOT NULL,
  root              BYTEA NOT NULL UNIQUE,
  "treeHeight"      INT NOT NULL CHECK ("treeHeight" BETWEEN 1 AND 32),
  "periodStart"     DATE NOT NULL,
  "periodEnd"       DATE NOT NULL,
  status            TEXT NOT NULL DEFAULT 'BUILT' CHECK (status IN ('BUILT', 'ANCHORED')),
  -- Dónde quedó en la cadena (NULL mientras no se haya anclado)
  "chainId"         BIGINT,
  "contractAddress" TEXT,
  "txHash"          TEXT,
  "anchoredAt"      TIMESTAMPTZ,
  "builtBy"         TEXT NOT NULL REFERENCES "Profile"(id),
  "builtAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (octet_length(root) = 32),
  CHECK (octet_length(subject) = 32),
  CHECK ("periodEnd" >= "periodStart"),
  CHECK ((status = 'ANCHORED') = ("txHash" IS NOT NULL
                                  AND "chainId" IS NOT NULL
                                  AND "contractAddress" IS NOT NULL
                                  AND "anchoredAt" IS NOT NULL)),
  CHECK ("contractAddress" IS NULL OR "contractAddress" ~ '^0x[0-9a-fA-F]{40}$'),
  CHECK ("txHash" IS NULL OR "txHash" ~ '^0x[0-9a-fA-F]{64}$'),
  UNIQUE (id, "fundId"),
  UNIQUE (id, "treeHeight")
);

CREATE INDEX IF NOT EXISTS payment_batch_fund_idx ON "PaymentBatch" ("fundId", "periodStart");

-- Una hoja del árbol: el compromiso de un pago y en qué posición quedó.
-- Guardarlo es lo que permite rehacer la prueba de pertenencia más adelante
-- sin tener que reconstruir el lote entero desde cero.
CREATE TABLE IF NOT EXISTS "PaymentCommitment" (
  "batchId"     TEXT NOT NULL REFERENCES "PaymentBatch"(id) ON DELETE CASCADE,
  "paymentId"   TEXT NOT NULL REFERENCES "Payment"(id) ON DELETE RESTRICT,
  "leafIndex"   INT NOT NULL CHECK ("leafIndex" >= 0),
  commitment    BYTEA NOT NULL,
  "treeHeight"  INT NOT NULL,
  PRIMARY KEY ("batchId", "paymentId"),
  CHECK (octet_length(commitment) = 32),
  CHECK ("leafIndex" < (2 ^ "treeHeight")::bigint),
  -- Dos pagos no pueden caer en la misma hoja
  UNIQUE ("batchId", "leafIndex"),
  -- La altura que dice la hoja es la del lote
  FOREIGN KEY ("batchId", "treeHeight") REFERENCES "PaymentBatch"(id, "treeHeight")
);

-- Un pago entra en un solo lote. Si un lote se descarta antes de anclarlo se
-- borra entero (CASCADE) y sus pagos quedan libres para el siguiente.
CREATE UNIQUE INDEX IF NOT EXISTS payment_commitment_one_batch_idx
  ON "PaymentCommitment" ("paymentId");

-- Anclado es anclado: ni el lote ni sus hojas cambian después.
CREATE OR REPLACE FUNCTION forbid_anchored_batch_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  l_status TEXT;
BEGIN
  IF TG_TABLE_NAME = 'PaymentBatch' THEN
    IF OLD.status = 'ANCHORED' THEN
      RAISE EXCEPTION 'El lote ya está anclado en la cadena: no se modifica ni se borra';
    END IF;
    RETURN CASE TG_OP WHEN 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  SELECT status INTO l_status FROM "PaymentBatch"
  WHERE id = CASE TG_OP WHEN 'DELETE' THEN OLD."batchId" ELSE NEW."batchId" END;
  IF l_status = 'ANCHORED' THEN
    RAISE EXCEPTION 'El lote ya está anclado en la cadena: sus hojas no se tocan';
  END IF;
  RETURN CASE TG_OP WHEN 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

DROP TRIGGER IF EXISTS payment_batch_frozen ON "PaymentBatch";
CREATE TRIGGER payment_batch_frozen
  BEFORE UPDATE OR DELETE ON "PaymentBatch"
  FOR EACH ROW EXECUTE FUNCTION forbid_anchored_batch_change();

DROP TRIGGER IF EXISTS payment_commitment_frozen ON "PaymentCommitment";
CREATE TRIGGER payment_commitment_frozen
  BEFORE INSERT OR UPDATE OR DELETE ON "PaymentCommitment"
  FOR EACH ROW EXECUTE FUNCTION forbid_anchored_batch_change();

-- ── RLS y permisos ───────────────────────────────────────────

ALTER TABLE "PaymentBatch"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PaymentCommitment" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "PaymentBatch", "PaymentCommitment" FROM anon, authenticated;

-- Los miembros del fondo ven sus lotes. Armarlos y anclarlos va por RPC.
GRANT SELECT ON "PaymentBatch", "PaymentCommitment" TO authenticated;

DROP POLICY IF EXISTS payment_batch_select ON "PaymentBatch";
CREATE POLICY payment_batch_select ON "PaymentBatch" FOR SELECT TO authenticated
  USING (has_fund_role("fundId", ARRAY['CONFIGURATOR', 'APPROVER', 'TREASURER', 'LEGAL_REP']));

DROP POLICY IF EXISTS payment_commitment_select ON "PaymentCommitment";
CREATE POLICY payment_commitment_select ON "PaymentCommitment" FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM "PaymentBatch" b
    WHERE b.id = "batchId"
      AND has_fund_role(b."fundId",
          ARRAY['CONFIGURATOR', 'APPROVER', 'TREASURER', 'LEGAL_REP'])));

-- ── RPC ──────────────────────────────────────────────────────

-- Registrar un lote ya calculado fuera de la base.
-- p_leaves: [{"paymentId": "...", "leafIndex": 0, "commitment": "\\x..."}, ...]
CREATE OR REPLACE FUNCTION record_payment_batch(
  p_fund_id      TEXT,
  p_subject      BYTEA,
  p_root         BYTEA,
  p_tree_height  INT,
  p_period_start DATE,
  p_period_end   DATE,
  p_leaves       JSONB
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  l_me        TEXT := current_profile_id();
  l_batch_id  TEXT;
  l_count     INT;
  l_bad       TEXT;
BEGIN
  IF NOT has_fund_role(p_fund_id, ARRAY['TREASURER']) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  IF jsonb_typeof(p_leaves) <> 'array' OR jsonb_array_length(p_leaves) = 0 THEN
    RAISE EXCEPTION 'Un lote sin pagos no tiene nada que comprometer';
  END IF;

  -- Todo pago del lote tiene que ser de este fondo y estar conciliado: un lote
  -- de pagos sin respaldo bancario no probaría nada.
  SELECT string_agg(x.id, ', ') INTO l_bad
  FROM jsonb_array_elements(p_leaves) AS leaf
  CROSS JOIN LATERAL (SELECT leaf->>'paymentId' AS id) x
  LEFT JOIN "Payment" p ON p.id = x.id
  WHERE p.id IS NULL
     OR p."fundId" <> p_fund_id
     OR p.status <> 'RECONCILED';

  IF l_bad IS NOT NULL THEN
    RAISE EXCEPTION 'Estos pagos no son de este fondo o no están conciliados: %', l_bad;
  END IF;

  INSERT INTO "PaymentBatch" ("fundId", subject, root, "treeHeight",
                              "periodStart", "periodEnd", "builtBy")
  VALUES (p_fund_id, p_subject, p_root, p_tree_height,
          p_period_start, p_period_end, l_me)
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
    RAISE EXCEPTION 'Esa raíz ya se registró, o alguno de esos pagos ya está en otro lote';
END;
$$;

-- Dejar constancia de que el lote quedó anclado en la cadena.
CREATE OR REPLACE FUNCTION anchor_payment_batch(
  p_batch_id TEXT,
  p_chain_id BIGINT,
  p_contract TEXT,
  p_tx_hash  TEXT
)
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
  IF l_batch.status = 'ANCHORED' THEN
    RAISE EXCEPTION 'Ese lote ya está anclado';
  END IF;

  UPDATE "PaymentBatch"
  SET status = 'ANCHORED', "chainId" = p_chain_id,
      "contractAddress" = p_contract, "txHash" = p_tx_hash, "anchoredAt" = NOW()
  WHERE id = p_batch_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION record_payment_batch(TEXT, BYTEA, BYTEA, INT, DATE, DATE, JSONB) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION anchor_payment_batch(TEXT, BIGINT, TEXT, TEXT)                    FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION record_payment_batch(TEXT, BYTEA, BYTEA, INT, DATE, DATE, JSONB) TO authenticated;
GRANT  EXECUTE ON FUNCTION anchor_payment_batch(TEXT, BIGINT, TEXT, TEXT)                    TO authenticated;

-- ── Vista pública (N0) ───────────────────────────────────────

-- Lo que necesita el portal de verificación: la raíz, cuándo se ancló y dónde
-- mirarla. Sin cantidad de pagos, a propósito: el árbol se rellena hasta una
-- altura fija para que la raíz no delate el tamaño del lote, y publicar el
-- conteo aquí anularía esa precaución.
CREATE OR REPLACE VIEW "PublicAnchoredBatch" AS
SELECT b."fundId",
       '0x' || encode(b.root, 'hex')    AS root,
       '0x' || encode(b.subject, 'hex') AS subject,
       b."treeHeight",
       b."periodStart",
       b."periodEnd",
       b."chainId",
       b."contractAddress",
       b."txHash",
       b."anchoredAt"
FROM "PaymentBatch" b
JOIN "Fund" f ON f.id = b."fundId" AND f.status <> 'DRAFT'
WHERE b.status = 'ANCHORED';

GRANT SELECT ON "PublicAnchoredBatch" TO anon, authenticated;

COMMIT;
