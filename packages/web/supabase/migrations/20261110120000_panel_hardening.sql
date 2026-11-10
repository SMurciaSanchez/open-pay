-- ============================================================
-- OpenPay — Endurecimiento del panel (revisión de seguridad 2026-11-10)
--
-- A1. Registrar y anclar listas de proveedores y lotes pasa a ser cosa del
--     servidor. Antes estas funciones se llamaban con el token del tesorero,
--     así que la base no distinguía al servidor del navegador del tesorero:
--     él podía llamarlas directo con una raíz o una transacción inventadas y
--     dejar un mes "anclado" y congelado sin nada en la cadena.
--     Ahora solo las ejecuta service_role y reciben en p_actor el perfil en
--     cuyo nombre actúa el servidor (que ya validó su sesión). El rol de ese
--     perfil se sigue comprobando aquí.
--
-- M1. Un mes con lote es un mes cerrado:
--     - no se concilia un pago con un movimiento de un mes que ya tiene lote
--       (quedaría conciliado en ese mes y fuera de su prueba);
--     - no se revoca la conciliación de un pago que ya está en un lote;
--     - no se arma el lote de un mes mientras queden pagos aprobados de ese
--       mes sin conciliar.
--
-- Se puede aplicar más de una vez.
-- ============================================================

BEGIN;

-- ── 1. De quién es el rol, cuando quien llama es el servidor ──

CREATE OR REPLACE FUNCTION profile_has_fund_role(p_profile_id TEXT, p_fund_id TEXT, p_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM "Fund" f
    JOIN "OrgMember" m ON m."organizationId" = f."organizationId"
    WHERE f.id = p_fund_id
      AND m."profileId" = p_profile_id
      AND m.role = ANY (p_roles)
      AND m."revokedAt" IS NULL
  )
$$;

-- ── 2. Fuera las versiones que podía llamar un cliente ────────

DROP FUNCTION IF EXISTS record_vendor_set(TEXT, BYTEA, BYTEA, INT, TEXT[]);
DROP FUNCTION IF EXISTS anchor_vendor_set(TEXT, BIGINT, TEXT, TEXT);
DROP FUNCTION IF EXISTS record_budget_batch(TEXT, TEXT, BYTEA, BYTEA, INT, DATE, JSONB);
DROP FUNCTION IF EXISTS anchor_payment_batch(TEXT, BIGINT, TEXT, TEXT);
DROP FUNCTION IF EXISTS discard_unanchored_batch(TEXT);

-- El lote por fondo de 20260917140000 quedó reemplazado por el lote por rubro
-- y dejaba elegir qué pagos entraban. Ningún cliente lo ejecuta ya.
REVOKE ALL ON FUNCTION record_payment_batch(TEXT, BYTEA, BYTEA, INT, DATE, DATE, JSONB)
  FROM PUBLIC, anon, authenticated;

-- ── 3. Lista de proveedores ───────────────────────────────────

CREATE OR REPLACE FUNCTION record_vendor_set(
  p_actor       TEXT,
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
  IF NOT profile_has_fund_role(p_actor, p_fund_id, ARRAY['TREASURER']) THEN
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
  VALUES (p_fund_id, p_subject, p_root, p_tree_height, p_vendor_ids, p_actor)
  RETURNING id INTO l_id;

  RETURN l_id;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Esa raíz ya está registrada en otro fondo';
END;
$$;

CREATE OR REPLACE FUNCTION anchor_vendor_set(
  p_actor         TEXT,
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

  IF NOT FOUND OR NOT profile_has_fund_role(p_actor, l_set."fundId", ARRAY['TREASURER']) THEN
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

-- ── 4. Lote de un rubro ───────────────────────────────────────

-- Igual que en 20260923120000_org_panel.sql, con tres cambios: actúa en nombre
-- de p_actor, toma el candado del rubro (el mismo que toma conciliar, para que
-- un pago no se concilie mientras se arma el lote) y no cierra un mes con
-- pagos aprobados de ese mes todavía sin conciliar.
--
-- Los compromisos y la raíz los calcula el servidor (Poseidon, con la sal).
-- Esta función no los puede recalcular; por eso solo el servidor la ejecuta.
CREATE OR REPLACE FUNCTION record_budget_batch(
  p_actor         TEXT,
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
  l_fund        TEXT;
  l_set         "VendorSetSnapshot"%ROWTYPE;
  l_period_end  DATE := (p_period_start + INTERVAL '1 month' - INTERVAL '1 day')::date;
  l_esperados   TEXT[];
  l_recibidos   TEXT[];
  l_batch_id    TEXT;
  l_count       INT;
BEGIN
  SELECT "fundId" INTO l_fund FROM "Budget" WHERE id = p_budget_id FOR UPDATE;
  IF l_fund IS NULL OR NOT profile_has_fund_role(p_actor, l_fund, ARRAY['TREASURER']) THEN
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

  -- Cerrado el mes ya no se concilia nada en él: lo que quede aprobado y sin
  -- conciliar se quedaría fuera de la prueba para siempre.
  SELECT count(*) INTO l_count
  FROM "Payment" p
  WHERE p."budgetId" = p_budget_id
    AND p.status = 'APPROVED'
    AND p."paidOn" BETWEEN p_period_start AND l_period_end;
  IF l_count > 0 THEN
    RAISE EXCEPTION 'Quedan % pagos aprobados sin conciliar en ese mes: hay que conciliarlos antes de cerrarlo', l_count;
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
          p_period_start, l_period_end, p_actor)
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

CREATE OR REPLACE FUNCTION anchor_payment_batch(
  p_actor    TEXT,
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

  IF NOT FOUND OR NOT profile_has_fund_role(p_actor, l_batch."fundId", ARRAY['TREASURER']) THEN
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

-- Descartar un lote que se armó pero no se pudo anclar (p. ej. falló la red).
CREATE OR REPLACE FUNCTION discard_unanchored_batch(p_actor TEXT, p_batch_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  l_batch "PaymentBatch"%ROWTYPE;
BEGIN
  SELECT * INTO l_batch FROM "PaymentBatch" WHERE id = p_batch_id FOR UPDATE;
  IF NOT FOUND OR NOT profile_has_fund_role(p_actor, l_batch."fundId", ARRAY['TREASURER']) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  -- El trigger payment_batch_frozen impide borrar uno anclado.
  DELETE FROM "PaymentBatch" WHERE id = p_batch_id;
END;
$$;

-- ── 5. Permisos: solo la llave de servicio ────────────────────

REVOKE ALL ON FUNCTION profile_has_fund_role(TEXT, TEXT, TEXT[])                 FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION record_vendor_set(TEXT, TEXT, BYTEA, BYTEA, INT, TEXT[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION anchor_vendor_set(TEXT, TEXT, BIGINT, TEXT, TEXT)        FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION record_budget_batch(TEXT, TEXT, TEXT, BYTEA, BYTEA, INT, DATE, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION anchor_payment_batch(TEXT, TEXT, BIGINT, TEXT, TEXT)     FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION discard_unanchored_batch(TEXT, TEXT)                     FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION record_vendor_set(TEXT, TEXT, BYTEA, BYTEA, INT, TEXT[]) TO service_role;
GRANT EXECUTE ON FUNCTION anchor_vendor_set(TEXT, TEXT, BIGINT, TEXT, TEXT)        TO service_role;
GRANT EXECUTE ON FUNCTION record_budget_batch(TEXT, TEXT, TEXT, BYTEA, BYTEA, INT, DATE, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION anchor_payment_batch(TEXT, TEXT, BIGINT, TEXT, TEXT)     TO service_role;
GRANT EXECUTE ON FUNCTION discard_unanchored_batch(TEXT, TEXT)                     TO service_role;

-- ── 6. Conciliar respeta los meses cerrados ───────────────────

-- Misma función que en 20260923120000_org_panel.sql, con un cambio: toma el
-- candado del rubro y rechaza un movimiento cuyo mes ya tiene lote.
CREATE OR REPLACE FUNCTION reconcile_payment(p_payment_id TEXT, p_movement_id TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  l_me       TEXT := current_profile_id();
  l_payment  "Payment"%ROWTYPE;
  l_mov      "BankMovement"%ROWTYPE;
  l_stmt     "BankStatement"%ROWTYPE;
  l_pay_org  TEXT;
  l_id       TEXT;
BEGIN
  SELECT * INTO l_payment FROM "Payment" WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND OR NOT has_fund_role(l_payment."fundId", ARRAY['TREASURER']) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  SELECT * INTO l_mov FROM "BankMovement" WHERE id = p_movement_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Movimiento no encontrado';
  END IF;

  SELECT * INTO l_stmt FROM "BankStatement" WHERE id = l_mov."statementId";

  -- El movimiento tiene que ser de un banco de la misma organización del fondo
  SELECT f."organizationId" INTO l_pay_org FROM "Fund" f WHERE f.id = l_payment."fundId";
  IF l_stmt."organizationId" <> l_pay_org THEN
    RAISE EXCEPTION 'El movimiento es de otra organización';
  END IF;

  IF l_stmt.status <> 'SEALED' THEN
    RAISE EXCEPTION 'El extracto todavía no está sellado';
  END IF;
  IF l_payment.status <> 'APPROVED' THEN
    RAISE EXCEPTION 'Solo se concilia un pago aprobado (este está en %)', l_payment.status;
  END IF;
  IF l_mov.direction <> 'DEBIT' THEN
    RAISE EXCEPTION 'Un pago se justifica con una salida de dinero, no con una entrada';
  END IF;
  IF l_mov.amount <> l_payment.amount THEN
    RAISE EXCEPTION 'El movimiento es por % y el pago por %', l_mov.amount, l_payment.amount;
  END IF;
  -- La plata no puede haber salido antes de que alguien autorizara el pago:
  -- ese es exactamente el caso "pago sin autorización" que OpenPay busca cerrar.
  IF l_mov."postedOn" < l_payment."decidedAt"::date THEN
    RAISE EXCEPTION 'El dinero salió el % y el pago se aprobó el %',
      l_mov."postedOn", l_payment."decidedAt"::date;
  END IF;

  -- El lote de un mes compromete todos sus pagos conciliados. Si el mes ya
  -- tiene lote, un pago que se concilie ahora en ese mes quedaría fuera de su
  -- prueba. El candado del rubro es el mismo que toma record_budget_batch.
  PERFORM 1 FROM "Budget" WHERE id = l_payment."budgetId" FOR UPDATE;
  IF EXISTS (
    SELECT 1 FROM "PaymentBatch" b
    WHERE b."budgetId" = l_payment."budgetId"
      AND l_mov."postedOn" BETWEEN b."periodStart" AND b."periodEnd"
  ) THEN
    RAISE EXCEPTION 'El dinero salió el % y ese mes ya tiene lote para este rubro: está cerrado',
      l_mov."postedOn";
  END IF;

  INSERT INTO "PaymentReconciliation" ("paymentId", "movementId", "reconciledBy")
  VALUES (p_payment_id, p_movement_id, l_me)
  RETURNING id INTO l_id;

  -- La fecha del pago pasa a ser la del banco: es la que decide a qué mes
  -- (y a qué lote) pertenece, y no puede quedar a criterio de quien lo registró.
  UPDATE "Payment"
  SET status = 'RECONCILED', "paidOn" = l_mov."postedOn", "updatedAt" = NOW()
  WHERE id = p_payment_id;

  RETURN l_id;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Ese pago o ese movimiento ya está conciliado';
END;
$$;

-- Misma función que en 20260917120000_bank_reconciliation.sql, con un cambio:
-- un pago que ya está en un lote no vuelve a "aprobado".
CREATE OR REPLACE FUNCTION unreconcile_payment(p_reconciliation_id TEXT, p_reason TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  l_me   TEXT := current_profile_id();
  l_rec  "PaymentReconciliation"%ROWTYPE;
  l_fund TEXT;
BEGIN
  SELECT * INTO l_rec FROM "PaymentReconciliation"
  WHERE id = p_reconciliation_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conciliación no encontrada';
  END IF;

  SELECT "fundId" INTO l_fund FROM "Payment" WHERE id = l_rec."paymentId";
  IF NOT has_fund_role(l_fund, ARRAY['TREASURER']) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  IF l_rec."revokedAt" IS NOT NULL THEN
    RAISE EXCEPTION 'Esa conciliación ya estaba revocada';
  END IF;
  IF length(trim(COALESCE(p_reason, ''))) < 10 THEN
    RAISE EXCEPTION 'Hay que decir por qué se revoca (mínimo 10 caracteres)';
  END IF;
  IF EXISTS (SELECT 1 FROM "PaymentCommitment" c WHERE c."paymentId" = l_rec."paymentId") THEN
    RAISE EXCEPTION 'Ese pago ya está en un lote: su conciliación no se revoca';
  END IF;

  UPDATE "PaymentReconciliation"
  SET "revokedAt" = NOW(), "revokedBy" = l_me, "revokeReason" = p_reason
  WHERE id = p_reconciliation_id;

  UPDATE "Payment"
  SET status = 'APPROVED', "updatedAt" = NOW()
  WHERE id = l_rec."paymentId";
END;
$$;

COMMIT;
