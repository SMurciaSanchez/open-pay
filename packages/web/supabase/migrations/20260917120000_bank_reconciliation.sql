-- ============================================================
-- Fase 2 — Conciliación bancaria
-- La organización sigue pagando desde su banco. OpenPay importa el extracto,
-- lo sella y empareja cada movimiento con el pago que lo justifica.
--
-- Un pago solo llega a RECONCILED cuando existe un movimiento bancario real,
-- del mismo banco de la organización, por el mismo monto, posterior a la
-- aprobación y todavía sin usar por ningún otro pago.
--
-- LÍMITE HONESTO (supuesto S5 de docs/MODELO_AMENAZA.md): esto verifica lo que
-- se registró, no lo que hizo el banco. Quien importa el extracto podría subir
-- uno falso. Lo que sí se logra es que el extracto quede sellado, cuadrado
-- contra sus propios saldos y con el hash del archivo original guardado, de
-- modo que un auditor pueda contrastarlo con el PDF del banco y cualquier
-- manipulación exija falsificar también ese archivo. La confirmación directa
-- con el banco es Fase 6.
--
-- Niveles de datos (docs/POLITICA_DATOS.md):
--  - Saldos y montos del extracto: N2 (miembros de la organización).
--  - Número de cuenta y descripción del movimiento: N3, cifrados por la
--    aplicación con la llave del fondo. La descripción del banco suele traer
--    el nombre de la contraparte, por eso nunca va en claro.
--  - Público: solo el porcentaje conciliado por mes cerrado, con k >= 10.
--
-- Separación de funciones: tesorería importa, sella y concilia; nadie más.
-- Todo es solo inserción: un extracto sellado no se edita y una conciliación
-- no se borra, se revoca con motivo.
--
-- Ejecutar completo en Supabase Dashboard → SQL Editor.
-- ============================================================

BEGIN;

-- ── 1. Cuenta bancaria de la organización (N3) ───────────────

CREATE TABLE IF NOT EXISTS "OrgBankAccount" (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "organizationId"  TEXT NOT NULL REFERENCES "Organization"(id) ON DELETE RESTRICT,
  "bankName"        TEXT NOT NULL,                     -- N2: "Bancolombia"
  alias             TEXT NOT NULL,                     -- N2: "Ahorros fondo salud"
  last4             TEXT NOT NULL CHECK (last4 ~ '^[0-9]{4}$'),
  -- N3: número completo, cifrado por la aplicación (llave por organización)
  "numberCipher"    BYTEA NOT NULL,
  "keyId"           TEXT NOT NULL,
  currency          TEXT NOT NULL DEFAULT 'COP',
  "closedAt"        TIMESTAMPTZ,                       -- se cierra, no se borra
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (id, "organizationId")
);

-- ── 2. Extracto bancario (evidencia sellada) ─────────────────

CREATE TABLE IF NOT EXISTS "BankStatement" (
  id                 TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "bankAccountId"    TEXT NOT NULL REFERENCES "OrgBankAccount"(id) ON DELETE RESTRICT,
  "organizationId"   TEXT NOT NULL,
  "periodStart"      DATE NOT NULL,
  "periodEnd"        DATE NOT NULL,
  "openingBalance"   NUMERIC(18,2) NOT NULL,
  "closingBalance"   NUMERIC(18,2) NOT NULL,
  -- SHA-256 del archivo tal como lo entregó el banco. Es lo que permite a un
  -- auditor comprobar que el extracto importado es el mismo que el original.
  "fileSha256"       BYTEA NOT NULL,
  "declaredCount"    INT NOT NULL CHECK ("declaredCount" >= 0),
  status             TEXT NOT NULL DEFAULT 'IMPORTING'
                       CHECK (status IN ('IMPORTING', 'SEALED')),
  "importedBy"       TEXT NOT NULL REFERENCES "Profile"(id),
  "importedAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "sealedAt"         TIMESTAMPTZ,
  CHECK (octet_length("fileSha256") = 32),
  CHECK ("periodEnd" >= "periodStart"),
  CHECK ((status = 'SEALED') = ("sealedAt" IS NOT NULL)),
  -- El mismo archivo no se importa dos veces
  UNIQUE ("bankAccountId", "fileSha256"),
  FOREIGN KEY ("bankAccountId", "organizationId")
    REFERENCES "OrgBankAccount"(id, "organizationId"),
  UNIQUE (id, "organizationId"),
  UNIQUE (id, "periodStart", "periodEnd")
);

CREATE INDEX IF NOT EXISTS bank_statement_account_idx
  ON "BankStatement" ("bankAccountId", "periodStart");

-- Dos extractos de la misma cuenta no pueden solaparse: si se solaparan, un
-- mismo movimiento entraría dos veces y podría justificar dos pagos distintos.
CREATE OR REPLACE FUNCTION forbid_overlapping_statement()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "BankStatement" s
    WHERE s."bankAccountId" = NEW."bankAccountId"
      AND s.id <> NEW.id
      AND s."periodStart" <= NEW."periodEnd"
      AND s."periodEnd"   >= NEW."periodStart"
  ) THEN
    RAISE EXCEPTION 'Ya hay un extracto de esta cuenta que cubre ese período';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bank_statement_no_overlap ON "BankStatement";
CREATE TRIGGER bank_statement_no_overlap
  BEFORE INSERT ON "BankStatement"
  FOR EACH ROW EXECUTE FUNCTION forbid_overlapping_statement();

-- Un extracto sellado es evidencia: no se edita ni se borra.
CREATE OR REPLACE FUNCTION forbid_sealed_statement_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status = 'SEALED' THEN
      RAISE EXCEPTION 'Un extracto sellado no se borra';
    END IF;
    RETURN OLD;
  END IF;
  IF OLD.status = 'SEALED' THEN
    RAISE EXCEPTION 'Un extracto sellado no se modifica';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bank_statement_sealed_immutable ON "BankStatement";
CREATE TRIGGER bank_statement_sealed_immutable
  BEFORE UPDATE OR DELETE ON "BankStatement"
  FOR EACH ROW EXECUTE FUNCTION forbid_sealed_statement_change();

-- ── 3. Movimientos del extracto ──────────────────────────────

CREATE TABLE IF NOT EXISTS "BankMovement" (
  id                 TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "statementId"      TEXT NOT NULL REFERENCES "BankStatement"(id) ON DELETE CASCADE,
  "periodStart"      DATE NOT NULL,
  "periodEnd"        DATE NOT NULL,
  "postedOn"         DATE NOT NULL,
  direction          TEXT NOT NULL CHECK (direction IN ('DEBIT', 'CREDIT')),
  amount             NUMERIC(18,2) NOT NULL CHECK (amount > 0),
  -- Referencia propia del banco. No es un dato personal.
  "bankReference"    TEXT NOT NULL,
  -- N3: la glosa del banco trae el nombre de la contraparte. Cifrada.
  "descriptionCipher" BYTEA,
  "keyId"            TEXT,
  "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- El movimiento cae dentro del período que declara su extracto
  FOREIGN KEY ("statementId", "periodStart", "periodEnd")
    REFERENCES "BankStatement"(id, "periodStart", "periodEnd"),
  CHECK ("postedOn" BETWEEN "periodStart" AND "periodEnd"),
  CHECK (("descriptionCipher" IS NULL) = ("keyId" IS NULL)),
  -- El banco no repite referencia dentro de un mismo extracto
  UNIQUE ("statementId", "bankReference")
);

CREATE INDEX IF NOT EXISTS bank_movement_match_idx
  ON "BankMovement" ("statementId", direction, amount);

-- Mientras el extracto se está importando sus renglones se pueden corregir:
-- todavía es un borrador. Una vez sellado, nadie los toca.
CREATE OR REPLACE FUNCTION forbid_movement_after_seal()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  l_row    RECORD;
  l_status TEXT;
BEGIN
  l_row := CASE TG_OP WHEN 'DELETE' THEN OLD ELSE NEW END;
  SELECT status INTO l_status FROM "BankStatement" WHERE id = l_row."statementId";

  IF l_status IS DISTINCT FROM 'IMPORTING' THEN
    IF TG_OP = 'INSERT' THEN
      RAISE EXCEPTION 'El extracto ya está sellado: no admite más movimientos';
    END IF;
    RAISE EXCEPTION 'El extracto está sellado: sus movimientos no se modifican';
  END IF;

  RETURN l_row;
END;
$$;

DROP TRIGGER IF EXISTS bank_movement_append_only ON "BankMovement";
CREATE TRIGGER bank_movement_append_only
  BEFORE INSERT OR UPDATE OR DELETE ON "BankMovement"
  FOR EACH ROW EXECUTE FUNCTION forbid_movement_after_seal();

-- ── 4. Conciliación pago ↔ movimiento ────────────────────────

CREATE TABLE IF NOT EXISTS "PaymentReconciliation" (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "paymentId"      TEXT NOT NULL REFERENCES "Payment"(id) ON DELETE RESTRICT,
  "movementId"     TEXT NOT NULL REFERENCES "BankMovement"(id) ON DELETE RESTRICT,
  "reconciledBy"   TEXT NOT NULL REFERENCES "Profile"(id),
  "reconciledAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Una conciliación equivocada se revoca con motivo; no se borra.
  "revokedAt"      TIMESTAMPTZ,
  "revokedBy"      TEXT REFERENCES "Profile"(id),
  "revokeReason"   TEXT,
  CHECK (("revokedAt" IS NULL) = ("revokedBy" IS NULL)),
  CHECK ("revokedAt" IS NULL OR length(trim("revokeReason")) >= 10)
);

-- Vigente: un pago se justifica con un movimiento y un movimiento justifica
-- un solo pago. Las revocadas quedan como historia y no estorban.
CREATE UNIQUE INDEX IF NOT EXISTS reconciliation_payment_live_idx
  ON "PaymentReconciliation" ("paymentId") WHERE "revokedAt" IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS reconciliation_movement_live_idx
  ON "PaymentReconciliation" ("movementId") WHERE "revokedAt" IS NULL;

CREATE OR REPLACE FUNCTION forbid_reconciliation_edit()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Una conciliación no se borra: se revoca con motivo';
  END IF;
  IF OLD."revokedAt" IS NOT NULL THEN
    RAISE EXCEPTION 'Una conciliación revocada no se modifica';
  END IF;
  IF (NEW.id, NEW."paymentId", NEW."movementId", NEW."reconciledBy", NEW."reconciledAt")
     IS DISTINCT FROM
     (OLD.id, OLD."paymentId", OLD."movementId", OLD."reconciledBy", OLD."reconciledAt") THEN
    RAISE EXCEPTION 'De una conciliación solo se puede cambiar su revocación';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reconciliation_append_only ON "PaymentReconciliation";
CREATE TRIGGER reconciliation_append_only
  BEFORE UPDATE OR DELETE ON "PaymentReconciliation"
  FOR EACH ROW EXECUTE FUNCTION forbid_reconciliation_edit();

-- ── 5. RLS y permisos ────────────────────────────────────────

ALTER TABLE "OrgBankAccount"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BankStatement"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BankMovement"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PaymentReconciliation" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "OrgBankAccount", "BankStatement", "BankMovement",
  "PaymentReconciliation" FROM anon, authenticated;

-- 5a. Cuenta bancaria: solo tesorería, y el número nunca sale en claro
--     de la base (va cifrado desde la aplicación).
GRANT SELECT, INSERT ON "OrgBankAccount" TO authenticated;
GRANT UPDATE (alias, "closedAt") ON "OrgBankAccount" TO authenticated;

DROP POLICY IF EXISTS org_bank_account_treasurer ON "OrgBankAccount";
CREATE POLICY org_bank_account_treasurer ON "OrgBankAccount" FOR ALL TO authenticated
  USING (has_org_role("organizationId", ARRAY['TREASURER']))
  WITH CHECK (has_org_role("organizationId", ARRAY['TREASURER']));

-- 5b. Extractos: los miembros ven que existen y si cuadran; solo tesorería
--     importa. Sellar va por RPC (verifica el cuadre antes de cerrar).
GRANT SELECT ON "BankStatement" TO authenticated;
GRANT INSERT ON "BankStatement" TO authenticated;
-- Mientras no esté sellado se pueden corregir los saldos y el conteo que se
-- tecleó del encabezado. El período y el hash del archivo no: son lo que
-- identifica al extracto, y cambiarlos sería importar otro.
GRANT UPDATE ("openingBalance", "closingBalance", "declaredCount")
  ON "BankStatement" TO authenticated;
GRANT DELETE ON "BankStatement" TO authenticated;

DROP POLICY IF EXISTS bank_statement_select ON "BankStatement";
CREATE POLICY bank_statement_select ON "BankStatement" FOR SELECT TO authenticated
  USING (has_org_role("organizationId",
         ARRAY['CONFIGURATOR', 'APPROVER', 'TREASURER', 'LEGAL_REP']));

DROP POLICY IF EXISTS bank_statement_insert ON "BankStatement";
CREATE POLICY bank_statement_insert ON "BankStatement" FOR INSERT TO authenticated
  WITH CHECK (has_org_role("organizationId", ARRAY['TREASURER'])
              AND "importedBy" = current_profile_id()
              AND status = 'IMPORTING');

-- Las políticas solo filtran por rol, a propósito: quien está sellado lo frena
-- el trigger, que sí puede explicar qué pasó. Si la política filtrara por
-- estado, el UPDATE sobre un extracto sellado no tocaría ninguna fila y
-- terminaría "bien" sin haber hecho nada, que es la peor de las respuestas.
DROP POLICY IF EXISTS bank_statement_fix ON "BankStatement";
CREATE POLICY bank_statement_fix ON "BankStatement" FOR UPDATE TO authenticated
  USING (has_org_role("organizationId", ARRAY['TREASURER']))
  WITH CHECK (has_org_role("organizationId", ARRAY['TREASURER']));

DROP POLICY IF EXISTS bank_statement_discard ON "BankStatement";
CREATE POLICY bank_statement_discard ON "BankStatement" FOR DELETE TO authenticated
  USING (has_org_role("organizationId", ARRAY['TREASURER']));

-- 5c. Movimientos: los ve quien ve el extracto; los carga tesorería y los
--     puede corregir mientras el extracto siga siendo un borrador.
GRANT SELECT, INSERT, UPDATE, DELETE ON "BankMovement" TO authenticated;

DROP POLICY IF EXISTS bank_movement_select ON "BankMovement";
CREATE POLICY bank_movement_select ON "BankMovement" FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM "BankStatement" s
    WHERE s.id = "statementId"
      AND has_org_role(s."organizationId",
          ARRAY['CONFIGURATOR', 'APPROVER', 'TREASURER', 'LEGAL_REP'])));

DROP POLICY IF EXISTS bank_movement_insert ON "BankMovement";
CREATE POLICY bank_movement_insert ON "BankMovement" FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM "BankStatement" s
    WHERE s.id = "statementId"
      AND has_org_role(s."organizationId", ARRAY['TREASURER'])));

-- Corregir un renglón mal leído del PDF. El trigger ya impide tocar los de un
-- extracto sellado; aquí se limita a quién puede intentarlo.
DROP POLICY IF EXISTS bank_movement_fix ON "BankMovement";
CREATE POLICY bank_movement_fix ON "BankMovement" FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM "BankStatement" s
    WHERE s.id = "statementId"
      AND has_org_role(s."organizationId", ARRAY['TREASURER'])))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "BankStatement" s
    WHERE s.id = "statementId"
      AND has_org_role(s."organizationId", ARRAY['TREASURER'])));

DROP POLICY IF EXISTS bank_movement_discard ON "BankMovement";
CREATE POLICY bank_movement_discard ON "BankMovement" FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM "BankStatement" s
    WHERE s.id = "statementId"
      AND has_org_role(s."organizationId", ARRAY['TREASURER'])));

-- 5d. Conciliaciones: las ven los miembros del fondo; se crean y se revocan
--     solo por RPC (que es donde se comprueban monto, fecha y titularidad).
GRANT SELECT ON "PaymentReconciliation" TO authenticated;

DROP POLICY IF EXISTS reconciliation_select ON "PaymentReconciliation";
CREATE POLICY reconciliation_select ON "PaymentReconciliation" FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM "Payment" p
    WHERE p.id = "paymentId"
      AND has_fund_role(p."fundId",
          ARRAY['CONFIGURATOR', 'APPROVER', 'TREASURER', 'LEGAL_REP'])));

-- ── 6. RPC ───────────────────────────────────────────────────

-- Sellar el extracto. Antes de cerrarlo comprueba que cuadre consigo mismo:
-- saldo final − saldo inicial tiene que ser exactamente créditos − débitos, y
-- la cantidad de movimientos tiene que ser la declarada al importar. Un
-- extracto al que le falten o le sobren renglones no se puede sellar, y sin
-- sellar no sirve para conciliar nada.
CREATE OR REPLACE FUNCTION seal_bank_statement(p_statement_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  l_stmt      "BankStatement"%ROWTYPE;
  l_count     INT;
  l_net       NUMERIC(18,2);
  l_expected  NUMERIC(18,2);
BEGIN
  SELECT * INTO l_stmt FROM "BankStatement" WHERE id = p_statement_id FOR UPDATE;

  IF NOT FOUND OR NOT has_org_role(l_stmt."organizationId", ARRAY['TREASURER']) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  IF l_stmt.status <> 'IMPORTING' THEN
    RAISE EXCEPTION 'El extracto ya está sellado';
  END IF;

  SELECT count(*),
         COALESCE(SUM(CASE WHEN direction = 'CREDIT' THEN amount ELSE -amount END), 0)
    INTO l_count, l_net
  FROM "BankMovement" WHERE "statementId" = p_statement_id;

  IF l_count <> l_stmt."declaredCount" THEN
    RAISE EXCEPTION 'El extracto declara % movimientos y tiene %',
      l_stmt."declaredCount", l_count;
  END IF;

  l_expected := l_stmt."closingBalance" - l_stmt."openingBalance";
  IF l_net <> l_expected THEN
    RAISE EXCEPTION 'El extracto no cuadra: los movimientos suman % y los saldos exigen %',
      l_net, l_expected;
  END IF;

  UPDATE "BankStatement"
  SET status = 'SEALED', "sealedAt" = NOW()
  WHERE id = p_statement_id;
END;
$$;

-- Conciliar un pago aprobado contra un movimiento del extracto.
-- Todo lo que se comprueba aquí es lo que hace que RECONCILED signifique algo.
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

  INSERT INTO "PaymentReconciliation" ("paymentId", "movementId", "reconciledBy")
  VALUES (p_payment_id, p_movement_id, l_me)
  RETURNING id INTO l_id;

  UPDATE "Payment"
  SET status = 'RECONCILED', "updatedAt" = NOW()
  WHERE id = p_payment_id;

  RETURN l_id;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Ese pago o ese movimiento ya está conciliado';
END;
$$;

-- Revocar una conciliación equivocada. El pago vuelve a APPROVED y el
-- movimiento queda libre otra vez; la conciliación errada queda registrada.
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

  UPDATE "PaymentReconciliation"
  SET "revokedAt" = NOW(), "revokedBy" = l_me, "revokeReason" = p_reason
  WHERE id = p_reconciliation_id;

  UPDATE "Payment"
  SET status = 'APPROVED', "updatedAt" = NOW()
  WHERE id = l_rec."paymentId";
END;
$$;

REVOKE EXECUTE ON FUNCTION seal_bank_statement(TEXT)         FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION reconcile_payment(TEXT, TEXT)     FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION unreconcile_payment(TEXT, TEXT)   FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION seal_bank_statement(TEXT)         TO authenticated;
GRANT  EXECUTE ON FUNCTION reconcile_payment(TEXT, TEXT)     TO authenticated;
GRANT  EXECUTE ON FUNCTION unreconcile_payment(TEXT, TEXT)   TO authenticated;

-- ── 7. Vista pública (N1) ────────────────────────────────────

-- Qué tan respaldado por el banco está lo que el fondo dice haber pagado.
-- Solo meses cerrados y solo si hay al menos 10 pagos en el mes: con menos,
-- el porcentaje permitiría deducir pagos individuales.
CREATE OR REPLACE VIEW "PublicReconciliationStatus" AS
WITH closed AS (
  SELECT p."fundId",
         date_trunc('month', p."paidOn")::date AS month,
         count(*) AS n,
         count(*) FILTER (WHERE p.status = 'RECONCILED') AS reconciled
  FROM "Payment" p
  JOIN "Fund" f ON f.id = p."fundId" AND f.status <> 'DRAFT'
  WHERE p.status IN ('APPROVED', 'RECONCILED')
    AND p."paidOn" < date_trunc('month', NOW())::date
  GROUP BY 1, 2
)
SELECT "fundId", month,
       CASE WHEN n >= 10 THEN round(100.0 * reconciled / n)::int END AS "reconciledPercent"
FROM closed;

GRANT SELECT ON "PublicReconciliationStatus" TO anon, authenticated;

COMMIT;
