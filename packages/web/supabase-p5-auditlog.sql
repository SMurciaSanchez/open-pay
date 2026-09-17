-- ============================================================
--  P5 — AuditLog append-only
--
--  Garantiza que los registros de auditoría jamás puedan
--  modificarse ni eliminarse, ni siquiera por el service_role.
--
--  Ejecutar en: Supabase Dashboard → SQL Editor
--  O via script Node incluido (test-p5.mjs)
-- ============================================================

-- ── 1. Trigger: bloquea UPDATE y DELETE en AuditLog ─────────
--  Los triggers se ejecutan ANTES de la operación, para cualquier
--  rol, incluso postgres y service_role (que bypassean RLS pero
--  NO los triggers).
CREATE OR REPLACE FUNCTION prevent_auditlog_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION
    'AuditLog es de solo escritura. Los registros de auditoría '
    'no pueden modificarse ni eliminarse. '
    'Operación intentada: % sobre id=%', TG_OP, OLD.id;
END;
$$;

DROP TRIGGER IF EXISTS tr_auditlog_immutable ON "AuditLog";
CREATE TRIGGER tr_auditlog_immutable
  BEFORE UPDATE OR DELETE ON "AuditLog"
  FOR EACH ROW
  EXECUTE FUNCTION prevent_auditlog_modification();

-- ── 2. Revocar UPDATE/DELETE a nivel de privilege ───────────
--  (authenticated y anon ya no tenían GRANT desde P2,
--   pero lo hacemos explícito como doble barrera)
REVOKE UPDATE, DELETE ON "AuditLog" FROM authenticated;
REVOKE UPDATE, DELETE ON "AuditLog" FROM anon;

-- ── 3. Función auxiliar para insertar entradas de auditoría ──
--  SECURITY DEFINER → corre como owner, puede insertar aunque
--  el llamante (authenticated) no tenga GRANT directo en AuditLog.
--  Esto permite que triggers en otras tablas y funciones como
--  transfer_funds puedan registrar eventos de forma centralizada.
CREATE OR REPLACE FUNCTION log_audit_event(
  p_user_id   TEXT,
  p_action    TEXT,
  p_resource  TEXT,
  p_details   TEXT   DEFAULT NULL,
  p_ip        TEXT   DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO "AuditLog" (
    id, "userId", action, resource, details, "ipAddress", "createdAt"
  )
  VALUES (
    gen_random_uuid()::text,
    p_user_id,
    p_action,
    p_resource,
    p_details,
    p_ip,
    NOW()
  );
END;
$$;

-- Permitir que usuarios autenticados registren sus propios eventos
GRANT EXECUTE ON FUNCTION log_audit_event(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- ── 4. Auto-auditoría: Profile ───────────────────────────────
CREATE OR REPLACE FUNCTION audit_profile_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_audit_event(
      NEW."userId", 'PROFILE_CREATED', 'Profile',
      json_build_object('profileId', NEW.id)::text, NULL
    );
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM log_audit_event(
      NEW."userId", 'PROFILE_UPDATED', 'Profile',
      json_build_object('profileId', NEW.id)::text, NULL
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_profile_audit ON "Profile";
CREATE TRIGGER tr_profile_audit
  AFTER INSERT OR UPDATE ON "Profile"
  FOR EACH ROW
  EXECUTE FUNCTION audit_profile_changes();

-- ── 5. Auto-auditoría: Transaction ──────────────────────────
CREATE OR REPLACE FUNCTION audit_transaction_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_audit_event(
      NULL,
      'TRANSACTION_CREATED',
      'Transaction',
      json_build_object(
        'id',       NEW.id,
        'amount',   NEW.amount,
        'type',     NEW.type,
        'status',   NEW.status,
        'senderId', NEW."senderId"
      )::text,
      NULL
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_transaction_audit ON "Transaction";
CREATE TRIGGER tr_transaction_audit
  AFTER INSERT ON "Transaction"
  FOR EACH ROW
  EXECUTE FUNCTION audit_transaction_changes();

-- ── 6. Auto-auditoría: ServicePayment ───────────────────────
CREATE OR REPLACE FUNCTION audit_servicepayment_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_audit_event(
      NULL,
      'SERVICE_PAYMENT_CREATED',
      'ServicePayment',
      json_build_object(
        'id',        NEW.id,
        'amount',    NEW.amount,
        'profileId', NEW."profileId"
      )::text,
      NULL
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_servicepayment_audit ON "ServicePayment";
CREATE TRIGGER tr_servicepayment_audit
  AFTER INSERT ON "ServicePayment"
  FOR EACH ROW
  EXECUTE FUNCTION audit_servicepayment_changes();
