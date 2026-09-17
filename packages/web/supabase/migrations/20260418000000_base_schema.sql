-- ============================================================
-- Esquema base: Profile, Account, Transaction, AuditLog
--
-- Estas tablas se crearon a mano en el panel del proyecto original y
-- nunca quedaron en una migración. Este archivo las reconstruye a partir
-- del código (antiguo schema.prisma + consultas de la app) para poder
-- levantar un proyecto nuevo desde cero. Va antes que las demás
-- migraciones, que asumen que estas tablas existen.
--
-- Niveles de datos según docs/POLITICA_DATOS.md:
--  - Profile (email, nombre, teléfono): N3, solo el titular.
--  - Account y Transaction (dinero propio): N3, solo el titular / las partes.
--  - AuditLog: N2, sin acceso desde el cliente.
-- ============================================================

BEGIN;

-- ── 1. Tablas ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "Profile" (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId"     TEXT NOT NULL UNIQUE,          -- auth.users.id
  "fullName"   TEXT NOT NULL,
  email        TEXT NOT NULL UNIQUE,
  "avatarUrl"  TEXT,
  phone        TEXT,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Account" (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "profileId"  TEXT NOT NULL REFERENCES "Profile"(id) ON DELETE RESTRICT,
  balance      NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  type         TEXT NOT NULL DEFAULT 'CHECKING' CHECK (type IN ('CHECKING', 'SAVINGS', 'CREDIT')),
  number       TEXT NOT NULL UNIQUE,
  status       TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'BLOCKED', 'SUSPENDED')),
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS account_profile_idx ON "Account" ("profileId");

CREATE TABLE IF NOT EXISTS "Transaction" (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "senderId"        TEXT NOT NULL REFERENCES "Profile"(id) ON DELETE RESTRICT,
  "receiverId"      TEXT NOT NULL REFERENCES "Profile"(id) ON DELETE RESTRICT,
  amount            NUMERIC(18,2) NOT NULL CHECK (amount > 0),
  description       TEXT,
  status            TEXT NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'REJECTED')),
  type              TEXT NOT NULL DEFAULT 'TRANSFER',   -- TRANSFER, PAYMENT, DEPOSIT, WITHDRAWAL, ENTITY_PAYMENT
  "idempotencyKey"  TEXT UNIQUE,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS transaction_sender_idx   ON "Transaction" ("senderId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS transaction_receiver_idx ON "Transaction" ("receiverId", "createdAt" DESC);

CREATE TABLE IF NOT EXISTS "AuditLog" (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId"     TEXT,
  action       TEXT NOT NULL,
  resource     TEXT NOT NULL,
  details      TEXT,
  "ipAddress"  TEXT,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audit_log_created_idx ON "AuditLog" ("createdAt" DESC);

-- AuditLog es de solo inserción
CREATE OR REPLACE FUNCTION audit_log_forbid_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'AuditLog es de solo inserción';
END;
$$;

DROP TRIGGER IF EXISTS audit_log_append_only ON "AuditLog";
CREATE TRIGGER audit_log_append_only
  BEFORE UPDATE OR DELETE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION audit_log_forbid_mutation();

-- ── 2. RLS y permisos ────────────────────────────────────────

ALTER TABLE "Profile"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Account"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Transaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog"    ENABLE ROW LEVEL SECURITY;

-- Partir de cero: Supabase concede todo a anon/authenticated por defecto
REVOKE ALL ON "Profile", "Account", "Transaction", "AuditLog" FROM anon, authenticated;

-- Profile: cada quien ve y edita solo el suyo. email y userId no se editan.
GRANT SELECT, INSERT ON "Profile" TO authenticated;
GRANT UPDATE ("fullName", "avatarUrl", phone, "updatedAt") ON "Profile" TO authenticated;

DROP POLICY IF EXISTS profile_select_own ON "Profile";
CREATE POLICY profile_select_own ON "Profile" FOR SELECT TO authenticated
  USING ("userId" = auth.uid()::text);

DROP POLICY IF EXISTS profile_insert_own ON "Profile";
CREATE POLICY profile_insert_own ON "Profile" FOR INSERT TO authenticated
  WITH CHECK ("userId" = auth.uid()::text);

DROP POLICY IF EXISTS profile_update_own ON "Profile";
CREATE POLICY profile_update_own ON "Profile" FOR UPDATE TO authenticated
  USING ("userId" = auth.uid()::text)
  WITH CHECK ("userId" = auth.uid()::text);

-- Account: el titular ve y crea la suya (el saldo inicial lo fuerza
-- tr_account_safe_insert en 20260916120000_security_fixes.sql).
-- Los saldos solo cambian por RPC.
GRANT SELECT ON "Account" TO authenticated;
GRANT INSERT ("profileId", balance, type, number, status) ON "Account" TO authenticated;

DROP POLICY IF EXISTS account_select_own ON "Account";
CREATE POLICY account_select_own ON "Account" FOR SELECT TO authenticated
  USING ("profileId" IN (SELECT id FROM "Profile" WHERE "userId" = auth.uid()::text));

DROP POLICY IF EXISTS account_insert_own ON "Account";
CREATE POLICY account_insert_own ON "Account" FOR INSERT TO authenticated
  WITH CHECK ("profileId" IN (SELECT id FROM "Profile" WHERE "userId" = auth.uid()::text));

-- Transaction: solo las dos partes la ven; se crea solo por RPC.
GRANT SELECT ON "Transaction" TO authenticated;

DROP POLICY IF EXISTS transaction_select_parties ON "Transaction";
CREATE POLICY transaction_select_parties ON "Transaction" FOR SELECT TO authenticated
  USING ("senderId"   IN (SELECT id FROM "Profile" WHERE "userId" = auth.uid()::text)
      OR "receiverId" IN (SELECT id FROM "Profile" WHERE "userId" = auth.uid()::text));

-- AuditLog: sin acceso desde el cliente (solo service_role).

-- ── 3. Buscar destinatario ───────────────────────────────────
-- Devuelve solo el id del perfil con ese email, sin exponer la tabla.
CREATE OR REPLACE FUNCTION find_recipient(p_email TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM "Profile"
  WHERE lower(email) = lower(trim(p_email))
    AND auth.uid() IS NOT NULL
$$;

REVOKE ALL ON FUNCTION find_recipient(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION find_recipient(TEXT) TO authenticated;

COMMIT;
