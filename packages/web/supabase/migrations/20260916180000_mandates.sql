-- ============================================================
-- Fase 2 — Modelo de mandatos
-- Quién administra dinero ajeno, con qué reglas, a quién puede pagar
-- y quién puede auditarlo.
--
-- Niveles de datos según docs/POLITICA_DATOS.md (N0 público … N4 restringido).
--
-- Decisiones:
--  - Los clientes (authenticated/anon) NO leen ni escriben estas tablas
--    directamente salvo donde RLS lo permite explícitamente. Los cambios de
--    estado de un pago y la lectura de auditores pasan por RPC.
--  - Público (N0/N1) se expone solo con vistas que ya aplican las reglas
--    de agregados (k >= 10, sin celdas dominantes, meses cerrados, redondeo).
--  - Separación de funciones: una persona tiene UN rol por organización;
--    quien crea un pago no lo aprueba; quien otorga una llave no la usa.
--  - FundRule y AccessLog son solo inserción (versionado / bitácora).
--  - La sal de cada pago (N4) no se concede a ningún rol de cliente.
--  - Datos bancarios del proveedor (N3) en tabla aparte, solo tesorería,
--    guardados ya cifrados por la aplicación (llave por fondo, Capa 4).
--
-- Fuera de esta migración: beneficiarios (N4), extractos bancarios y
-- conciliación, CommitmentRegistry.
--
-- Ejecutar completo en Supabase Dashboard → SQL Editor.
-- ============================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ── 0. Utilidades ────────────────────────────────────────────

-- Profile.id del usuario autenticado (NULL si no hay sesión)
CREATE OR REPLACE FUNCTION current_profile_id()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM "Profile" WHERE "userId" = auth.uid()::text
$$;

CREATE OR REPLACE FUNCTION forbid_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION '% es de solo inserción', TG_TABLE_NAME;
END;
$$;

-- ── 1. Organización y roles ──────────────────────────────────

CREATE TABLE IF NOT EXISTS "Organization" (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name         TEXT NOT NULL,                       -- N0
  nit          TEXT UNIQUE,                         -- N0 (dato institucional)
  kind         TEXT NOT NULL CHECK (kind IN ('FOUNDATION', 'NGO', 'PUBLIC_ENTITY', 'COMPANY', 'OTHER')),
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Un rol por persona por organización (POLITICA_DATOS §9).
-- LEGAL_REP otorga llaves de auditoría; no configura ni aprueba.
CREATE TABLE IF NOT EXISTS "OrgMember" (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "organizationId"  TEXT NOT NULL REFERENCES "Organization"(id) ON DELETE RESTRICT,
  "profileId"       TEXT NOT NULL REFERENCES "Profile"(id) ON DELETE RESTRICT,
  role              TEXT NOT NULL CHECK (role IN ('CONFIGURATOR', 'APPROVER', 'TREASURER', 'LEGAL_REP')),
  "revokedAt"       TIMESTAMPTZ,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("organizationId", "profileId")
);

CREATE OR REPLACE FUNCTION has_org_role(p_org_id TEXT, p_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM "OrgMember"
    WHERE "organizationId" = p_org_id
      AND "profileId" = current_profile_id()
      AND role = ANY (p_roles)
      AND "revokedAt" IS NULL
  )
$$;

-- ── 2. Fondo, presupuesto, contrato ──────────────────────────

CREATE TABLE IF NOT EXISTS "Fund" (
  id                 TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "organizationId"   TEXT NOT NULL REFERENCES "Organization"(id) ON DELETE RESTRICT,
  name               TEXT NOT NULL,                                  -- N0
  purpose            TEXT NOT NULL,                                  -- N0
  "totalAmount"      NUMERIC(18,2) NOT NULL CHECK ("totalAmount" > 0),
  "isTotalPublic"    BOOLEAN NOT NULL DEFAULT TRUE,                  -- FALSE → N2
  currency           TEXT NOT NULL DEFAULT 'COP',
  "startsOn"         DATE NOT NULL,
  "endsOn"           DATE,
  status             TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('DRAFT', 'ACTIVE', 'CLOSED')),
  "createdBy"        TEXT NOT NULL REFERENCES "Profile"(id),
  "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ("endsOn" IS NULL OR "endsOn" >= "startsOn"),
  UNIQUE (id, "organizationId")
);

-- Rubros del fondo. Público solo como agregado (N1).
CREATE TABLE IF NOT EXISTS "Budget" (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "fundId"     TEXT NOT NULL REFERENCES "Fund"(id) ON DELETE RESTRICT,
  category     TEXT NOT NULL,                                        -- p. ej. "Salud"
  amount       NUMERIC(18,2) NOT NULL CHECK (amount > 0),
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("fundId", category),
  UNIQUE (id, "fundId")
);

CREATE TABLE IF NOT EXISTS "Contract" (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "fundId"       TEXT NOT NULL REFERENCES "Fund"(id) ON DELETE RESTRICT,
  "budgetId"     TEXT NOT NULL,
  object         TEXT NOT NULL,                                      -- N0 si es público; N2 si no
  value          NUMERIC(18,2) NOT NULL CHECK (value > 0),
  "isPublic"     BOOLEAN NOT NULL DEFAULT FALSE,                     -- TRUE si ya es público en SECOP II
  "secopUrl"     TEXT,
  "signedOn"     DATE,
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY ("budgetId", "fundId") REFERENCES "Budget"(id, "fundId"),
  CHECK (NOT "isPublic" OR "secopUrl" IS NOT NULL),
  UNIQUE (id, "fundId")
);

-- ── 3. Proveedores autorizados ───────────────────────────────

-- N2 (N0 si ya es público en SECOP). La lista vigente de un fondo es el
-- "conjunto autorizado" cuya raíz se anclará on-chain (Fase 2–3).
CREATE TABLE IF NOT EXISTS "AuthorizedVendor" (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "fundId"     TEXT NOT NULL REFERENCES "Fund"(id) ON DELETE RESTRICT,
  "legalName"  TEXT NOT NULL,
  nit          TEXT NOT NULL,
  "revokedAt"  TIMESTAMPTZ,                                          -- se revoca, no se borra
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("fundId", nit),
  UNIQUE (id, "fundId")
);

-- N3: datos bancarios, ya cifrados por la aplicación. Solo tesorería.
CREATE TABLE IF NOT EXISTS "VendorBankAccount" (
  "vendorId"     TEXT PRIMARY KEY REFERENCES "AuthorizedVendor"(id) ON DELETE CASCADE,
  ciphertext     BYTEA NOT NULL,
  "keyId"        TEXT NOT NULL,                                      -- versión de la llave del fondo
  "updatedAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 4. Reglas del fondo (N0, versionadas, solo inserción) ────

CREATE TABLE IF NOT EXISTS "FundRule" (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "fundId"     TEXT NOT NULL REFERENCES "Fund"(id) ON DELETE RESTRICT,
  kind         TEXT NOT NULL CHECK (kind IN (
    'AUTHORIZED_VENDOR_ONLY',   -- todo pago va a un proveedor del conjunto autorizado
    'WITHIN_BUDGET',            -- la suma por rubro no supera su presupuesto
    'CONTRACT_REQUIRED',        -- todo pago tiene contrato
    'MAX_PAYMENT'               -- tope por pago individual (params.max)
  )),
  params       JSONB NOT NULL DEFAULT '{}'::jsonb,
  version      INT NOT NULL CHECK (version > 0),
  "createdBy"  TEXT NOT NULL REFERENCES "Profile"(id),
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("fundId", kind, version)
);

DROP TRIGGER IF EXISTS fund_rule_append_only ON "FundRule";
CREATE TRIGGER fund_rule_append_only
  BEFORE UPDATE OR DELETE ON "FundRule"
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();

-- ── 5. Pagos (N2) ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "Payment" (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "fundId"        TEXT NOT NULL REFERENCES "Fund"(id) ON DELETE RESTRICT,
  "budgetId"      TEXT NOT NULL,
  "contractId"    TEXT,
  "vendorId"      TEXT NOT NULL,
  amount          NUMERIC(18,2) NOT NULL CHECK (amount > 0),
  concept         TEXT NOT NULL,
  "paidOn"        DATE,
  status          TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'APPROVED', 'REJECTED', 'RECONCILED')),
  -- N4: sal del compromiso. Ningún rol de cliente tiene permiso sobre esta columna.
  salt            BYTEA NOT NULL DEFAULT extensions.gen_random_bytes(32),
  "createdBy"     TEXT NOT NULL REFERENCES "Profile"(id),
  "approvedBy"    TEXT REFERENCES "Profile"(id),
  "decidedAt"     TIMESTAMPTZ,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- El rubro, el contrato y el proveedor deben ser del mismo fondo
  FOREIGN KEY ("budgetId", "fundId")   REFERENCES "Budget"(id, "fundId"),
  FOREIGN KEY ("contractId", "fundId") REFERENCES "Contract"(id, "fundId"),
  FOREIGN KEY ("vendorId", "fundId")   REFERENCES "AuthorizedVendor"(id, "fundId"),
  CHECK (octet_length(salt) = 32),
  -- Quien crea no aprueba
  CHECK ("approvedBy" IS NULL OR "approvedBy" <> "createdBy"),
  CHECK ((status = 'DRAFT') = ("approvedBy" IS NULL AND "decidedAt" IS NULL))
);

CREATE INDEX IF NOT EXISTS payment_fund_idx ON "Payment" ("fundId", status);

-- ── 6. Llaves de auditoría y bitácora de accesos ─────────────

CREATE TABLE IF NOT EXISTS "AccessGrant" (
  id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "fundId"            TEXT NOT NULL REFERENCES "Fund"(id) ON DELETE RESTRICT,
  "granteeProfileId"  TEXT NOT NULL REFERENCES "Profile"(id),
  "granteeRole"       TEXT NOT NULL CHECK ("granteeRole" IN ('AUDITOR', 'FISCAL_REVIEWER', 'AUTHORITY', 'DONOR')),
  purpose             TEXT NOT NULL CHECK (length(trim(purpose)) >= 10),
  "validFrom"         TIMESTAMPTZ NOT NULL,
  "validUntil"        TIMESTAMPTZ NOT NULL,
  "approvedBy"        TEXT NOT NULL REFERENCES "Profile"(id),
  "revokedAt"         TIMESTAMPTZ,
  "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ("validUntil" > "validFrom"),
  CHECK ("validUntil" <= "validFrom" + INTERVAL '1 year'),
  -- Quien la aprueba no la usa
  CHECK ("approvedBy" <> "granteeProfileId")
);

CREATE TABLE IF NOT EXISTS "AccessLog" (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "grantId"       TEXT NOT NULL REFERENCES "AccessGrant"(id) ON DELETE RESTRICT,
  "profileId"     TEXT NOT NULL REFERENCES "Profile"(id),
  action          TEXT NOT NULL,                                     -- p. ej. 'READ_PAYMENTS'
  "recordCount"   INT NOT NULL CHECK ("recordCount" >= 0),
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS access_log_grant_idx ON "AccessLog" ("grantId", "createdAt");

DROP TRIGGER IF EXISTS access_log_append_only ON "AccessLog";
CREATE TRIGGER access_log_append_only
  BEFORE UPDATE OR DELETE ON "AccessLog"
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();

-- ── 7. RLS y permisos base ───────────────────────────────────

ALTER TABLE "Organization"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrgMember"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Fund"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Budget"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Contract"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuthorizedVendor"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VendorBankAccount" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FundRule"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payment"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AccessGrant"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AccessLog"         ENABLE ROW LEVEL SECURITY;

-- Partir de cero: Supabase concede todo a anon/authenticated por defecto
REVOKE ALL ON "Organization", "OrgMember", "Fund", "Budget", "Contract",
  "AuthorizedVendor", "VendorBankAccount", "FundRule", "Payment",
  "AccessGrant", "AccessLog" FROM anon, authenticated;

-- 7a. Organización y miembros: los miembros ven su organización y su equipo
GRANT SELECT ON "Organization", "OrgMember" TO authenticated;

DROP POLICY IF EXISTS org_select_members ON "Organization";
CREATE POLICY org_select_members ON "Organization" FOR SELECT TO authenticated
  USING (has_org_role(id, ARRAY['CONFIGURATOR', 'APPROVER', 'TREASURER', 'LEGAL_REP']));

DROP POLICY IF EXISTS org_member_select ON "OrgMember";
CREATE POLICY org_member_select ON "OrgMember" FOR SELECT TO authenticated
  USING (has_org_role("organizationId", ARRAY['CONFIGURATOR', 'APPROVER', 'TREASURER', 'LEGAL_REP']));

-- 7b. Fondo, rubros, contratos, proveedores, reglas:
--     lectura para miembros; escritura solo CONFIGURATOR.
GRANT SELECT ON "Fund", "Budget", "Contract", "AuthorizedVendor", "FundRule" TO authenticated;
GRANT INSERT ON "Fund", "Budget", "Contract", "AuthorizedVendor", "FundRule" TO authenticated;
GRANT UPDATE (name, purpose, "endsOn", status, "isTotalPublic", "updatedAt") ON "Fund" TO authenticated;
GRANT UPDATE ("revokedAt") ON "AuthorizedVendor" TO authenticated;

DROP POLICY IF EXISTS fund_select ON "Fund";
CREATE POLICY fund_select ON "Fund" FOR SELECT TO authenticated
  USING (has_org_role("organizationId", ARRAY['CONFIGURATOR', 'APPROVER', 'TREASURER', 'LEGAL_REP']));

DROP POLICY IF EXISTS fund_insert ON "Fund";
CREATE POLICY fund_insert ON "Fund" FOR INSERT TO authenticated
  WITH CHECK (has_org_role("organizationId", ARRAY['CONFIGURATOR'])
              AND "createdBy" = current_profile_id());

DROP POLICY IF EXISTS fund_update ON "Fund";
CREATE POLICY fund_update ON "Fund" FOR UPDATE TO authenticated
  USING (has_org_role("organizationId", ARRAY['CONFIGURATOR']))
  WITH CHECK (has_org_role("organizationId", ARRAY['CONFIGURATOR']));

-- Rol del usuario en la organización dueña de un fondo
CREATE OR REPLACE FUNCTION has_fund_role(p_fund_id TEXT, p_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM "Fund" f
    WHERE f.id = p_fund_id AND has_org_role(f."organizationId", p_roles)
  )
$$;

DO $policies$
DECLARE
  l_table TEXT;
BEGIN
  FOREACH l_table IN ARRAY ARRAY['Budget', 'Contract', 'AuthorizedVendor', 'FundRule']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', lower(l_table) || '_select', l_table);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR SELECT TO authenticated
         USING (has_fund_role("fundId", ARRAY[''CONFIGURATOR'', ''APPROVER'', ''TREASURER'', ''LEGAL_REP'']))',
      lower(l_table) || '_select', l_table);

    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', lower(l_table) || '_insert', l_table);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR INSERT TO authenticated
         WITH CHECK (has_fund_role("fundId", ARRAY[''CONFIGURATOR'']))',
      lower(l_table) || '_insert', l_table);
  END LOOP;
END
$policies$;

-- Las reglas quedan firmadas por quien las crea
DROP POLICY IF EXISTS fundrule_insert ON "FundRule";
CREATE POLICY fundrule_insert ON "FundRule" FOR INSERT TO authenticated
  WITH CHECK (has_fund_role("fundId", ARRAY['CONFIGURATOR'])
              AND "createdBy" = current_profile_id());

DROP POLICY IF EXISTS authorizedvendor_update ON "AuthorizedVendor";
CREATE POLICY authorizedvendor_update ON "AuthorizedVendor" FOR UPDATE TO authenticated
  USING (has_fund_role("fundId", ARRAY['CONFIGURATOR']))
  WITH CHECK (has_fund_role("fundId", ARRAY['CONFIGURATOR']));

-- 7c. Datos bancarios: solo tesorería
GRANT SELECT, INSERT, UPDATE ON "VendorBankAccount" TO authenticated;

DROP POLICY IF EXISTS vendor_bank_treasurer ON "VendorBankAccount";
CREATE POLICY vendor_bank_treasurer ON "VendorBankAccount" FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM "AuthorizedVendor" v
    WHERE v.id = "vendorId" AND has_fund_role(v."fundId", ARRAY['TREASURER'])))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "AuthorizedVendor" v
    WHERE v.id = "vendorId" AND has_fund_role(v."fundId", ARRAY['TREASURER'])));

-- 7d. Pagos: miembros leen (sin la sal); tesorería crea borradores.
--     El id lo puede generar el cliente (sirve de clave de idempotencia).
--     Aprobar / rechazar solo con decide_payment().
GRANT SELECT (id, "fundId", "budgetId", "contractId", "vendorId", amount, concept,
              "paidOn", status, "createdBy", "approvedBy", "decidedAt",
              "createdAt", "updatedAt") ON "Payment" TO authenticated;
GRANT INSERT (id, "fundId", "budgetId", "contractId", "vendorId", amount, concept,
              "paidOn", "createdBy") ON "Payment" TO authenticated;

DROP POLICY IF EXISTS payment_select ON "Payment";
CREATE POLICY payment_select ON "Payment" FOR SELECT TO authenticated
  USING (has_fund_role("fundId", ARRAY['CONFIGURATOR', 'APPROVER', 'TREASURER', 'LEGAL_REP']));

DROP POLICY IF EXISTS payment_insert ON "Payment";
CREATE POLICY payment_insert ON "Payment" FOR INSERT TO authenticated
  WITH CHECK (has_fund_role("fundId", ARRAY['TREASURER'])
              AND "createdBy" = current_profile_id()
              AND status = 'DRAFT');

-- 7e. Llaves: el representante legal y el propio auditor las ven.
--     Se crean solo con grant_access().
GRANT SELECT ON "AccessGrant" TO authenticated;

DROP POLICY IF EXISTS access_grant_select ON "AccessGrant";
CREATE POLICY access_grant_select ON "AccessGrant" FOR SELECT TO authenticated
  USING ("granteeProfileId" = current_profile_id()
         OR has_fund_role("fundId", ARRAY['LEGAL_REP']));

-- 7f. Bitácora: la ven el representante legal y el auditor dueño de la llave
GRANT SELECT ON "AccessLog" TO authenticated;

DROP POLICY IF EXISTS access_log_select ON "AccessLog";
CREATE POLICY access_log_select ON "AccessLog" FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM "AccessGrant" g
    WHERE g.id = "grantId"
      AND (g."granteeProfileId" = current_profile_id()
           OR has_fund_role(g."fundId", ARRAY['LEGAL_REP']))));

-- ── 8. RPC ───────────────────────────────────────────────────

-- Aprobar o rechazar un pago. Quien lo creó no puede decidirlo.
CREATE OR REPLACE FUNCTION decide_payment(p_payment_id TEXT, p_approve BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  l_me       TEXT := current_profile_id();
  l_payment  "Payment"%ROWTYPE;
  l_spent    NUMERIC;
  l_budget   NUMERIC;
BEGIN
  SELECT * INTO l_payment FROM "Payment" WHERE id = p_payment_id FOR UPDATE;

  IF NOT FOUND OR NOT has_fund_role(l_payment."fundId", ARRAY['APPROVER']) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  IF l_payment."createdBy" = l_me THEN
    RAISE EXCEPTION 'Quien crea un pago no puede decidirlo';
  END IF;
  IF l_payment.status <> 'DRAFT' THEN
    RAISE EXCEPTION 'El pago ya fue decidido';
  END IF;

  IF p_approve THEN
    IF EXISTS (SELECT 1 FROM "AuthorizedVendor"
               WHERE id = l_payment."vendorId" AND "revokedAt" IS NOT NULL) THEN
      RAISE EXCEPTION 'Proveedor revocado';
    END IF;

    -- Bloquea el rubro para que dos aprobaciones simultáneas no lo excedan
    SELECT amount INTO l_budget FROM "Budget" WHERE id = l_payment."budgetId" FOR UPDATE;
    SELECT COALESCE(SUM(amount), 0) INTO l_spent
    FROM "Payment"
    WHERE "budgetId" = l_payment."budgetId" AND status IN ('APPROVED', 'RECONCILED');

    IF l_spent + l_payment.amount > l_budget THEN
      RAISE EXCEPTION 'El pago excede el presupuesto del rubro';
    END IF;
  END IF;

  UPDATE "Payment"
  SET status       = CASE WHEN p_approve THEN 'APPROVED' ELSE 'REJECTED' END,
      "approvedBy" = l_me,
      "decidedAt"  = NOW(),
      "updatedAt"  = NOW()
  WHERE id = p_payment_id;
END;
$$;

-- Otorgar una llave de auditoría (solo LEGAL_REP, nunca para sí mismo)
CREATE OR REPLACE FUNCTION grant_access(
  p_fund_id      TEXT,
  p_grantee_id   TEXT,
  p_grantee_role TEXT,
  p_purpose      TEXT,
  p_valid_from   TIMESTAMPTZ,
  p_valid_until  TIMESTAMPTZ
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  l_id TEXT;
BEGIN
  IF NOT has_fund_role(p_fund_id, ARRAY['LEGAL_REP']) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  -- Un miembro activo de la organización no puede ser su propio auditor
  IF EXISTS (
    SELECT 1 FROM "OrgMember" m JOIN "Fund" f ON f."organizationId" = m."organizationId"
    WHERE f.id = p_fund_id AND m."profileId" = p_grantee_id AND m."revokedAt" IS NULL
  ) THEN
    RAISE EXCEPTION 'El auditor no puede ser miembro de la organización';
  END IF;

  INSERT INTO "AccessGrant" ("fundId", "granteeProfileId", "granteeRole", purpose,
                             "validFrom", "validUntil", "approvedBy")
  VALUES (p_fund_id, p_grantee_id, p_grantee_role, p_purpose,
          p_valid_from, p_valid_until, current_profile_id())
  RETURNING id INTO l_id;

  RETURN l_id;
END;
$$;

-- Revocar una llave antes de su vencimiento
CREATE OR REPLACE FUNCTION revoke_access(p_grant_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE "AccessGrant"
  SET "revokedAt" = NOW()
  WHERE id = p_grant_id AND "revokedAt" IS NULL
    AND has_fund_role("fundId", ARRAY['LEGAL_REP']);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
END;
$$;

-- Lectura de pagos por un auditor. Cada llamada queda en AccessLog.
CREATE OR REPLACE FUNCTION audit_read_payments(p_grant_id TEXT)
RETURNS TABLE (
  id TEXT, "budgetId" TEXT, "contractId" TEXT, "vendorId" TEXT,
  "vendorName" TEXT, "vendorNit" TEXT,
  amount NUMERIC, concept TEXT, "paidOn" DATE, status TEXT, "decidedAt" TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  l_me     TEXT := current_profile_id();
  l_fund   TEXT;
  l_count  INT;
BEGIN
  SELECT g."fundId" INTO l_fund
  FROM "AccessGrant" g
  WHERE g.id = p_grant_id
    AND g."granteeProfileId" = l_me
    AND g."revokedAt" IS NULL
    AND NOW() >= g."validFrom" AND NOW() < g."validUntil";

  IF l_fund IS NULL THEN
    RAISE EXCEPTION 'Llave inexistente, vencida o revocada';
  END IF;

  SELECT count(*) INTO l_count FROM "Payment" p WHERE p."fundId" = l_fund;

  INSERT INTO "AccessLog" ("grantId", "profileId", action, "recordCount")
  VALUES (p_grant_id, l_me, 'READ_PAYMENTS', l_count);

  RETURN QUERY
  SELECT p.id, p."budgetId", p."contractId", p."vendorId",
         v."legalName", v.nit,
         p.amount, p.concept, p."paidOn", p.status, p."decidedAt"
  FROM "Payment" p
  JOIN "AuthorizedVendor" v ON v.id = p."vendorId"
  WHERE p."fundId" = l_fund
  ORDER BY p."paidOn" NULLS LAST, p."createdAt";
END;
$$;

REVOKE ALL ON FUNCTION decide_payment(TEXT, BOOLEAN) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION grant_access(TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION revoke_access(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION audit_read_payments(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION decide_payment(TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION grant_access(TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION revoke_access(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION audit_read_payments(TEXT) TO authenticated;

-- ── 9. Vistas públicas (N0 / N1) ─────────────────────────────
-- Se ejecutan con permisos del dueño a propósito: exponen solo columnas
-- y agregados permitidos por POLITICA_DATOS §3.2 y §4.

CREATE OR REPLACE VIEW "PublicFund" AS
SELECT f.id, o.name AS "organizationName", o.nit AS "organizationNit",
       f.name, f.purpose, f.currency, f."startsOn", f."endsOn", f.status,
       CASE WHEN f."isTotalPublic" THEN round(f."totalAmount", -6) END AS "totalAmountRounded"
FROM "Fund" f
JOIN "Organization" o ON o.id = f."organizationId"
WHERE f.status <> 'DRAFT';

-- Solo la versión vigente de cada regla
CREATE OR REPLACE VIEW "PublicFundRule" AS
SELECT DISTINCT ON (r."fundId", r.kind)
       r."fundId", r.kind, r.params, r.version, r."createdAt"
FROM "FundRule" r
JOIN "Fund" f ON f.id = r."fundId" AND f.status <> 'DRAFT'
ORDER BY r."fundId", r.kind, r.version DESC;

-- Contratos que ya son públicos en SECOP II
CREATE OR REPLACE VIEW "PublicContract" AS
SELECT c.id, c."fundId", c.object, c.value, c."secopUrl", c."signedOn"
FROM "Contract" c
JOIN "Fund" f ON f.id = c."fundId" AND f.status <> 'DRAFT'
WHERE c."isPublic";

-- Ejecución por rubro: meses cerrados, k >= 10, sin pago que domine > 80 %,
-- porcentajes enteros. Si no se cumple, la celda sale en NULL (suprimida).
CREATE OR REPLACE VIEW "PublicBudgetExecution" AS
WITH closed AS (
  SELECT p."budgetId", p.amount
  FROM "Payment" p
  WHERE p.status IN ('APPROVED', 'RECONCILED')
    AND p."paidOn" < date_trunc('month', NOW())::date
),
agg AS (
  SELECT "budgetId", count(*) AS n, sum(amount) AS total, max(amount) AS biggest
  FROM closed
  GROUP BY "budgetId"
)
SELECT b."fundId", b.category,
       CASE WHEN a.n >= 10 AND a.biggest <= 0.8 * a.total
            THEN round(100 * a.total / b.amount)::int
       END AS "executedPercent",
       (date_trunc('month', NOW()) - INTERVAL '1 day')::date AS "periodEnd"
FROM "Budget" b
JOIN "Fund" f ON f.id = b."fundId" AND f.status <> 'DRAFT'
LEFT JOIN agg a ON a."budgetId" = b.id;

-- Que existe una auditoría en curso, sin quién ni qué
CREATE OR REPLACE VIEW "PublicAuditActivity" AS
SELECT g."fundId", date_trunc('month', g."validFrom")::date AS "fromMonth",
       date_trunc('month', g."validUntil")::date AS "untilMonth",
       (g."revokedAt" IS NULL AND NOW() BETWEEN g."validFrom" AND g."validUntil") AS "isActive"
FROM "AccessGrant" g;

GRANT SELECT ON "PublicFund", "PublicFundRule", "PublicContract",
  "PublicBudgetExecution", "PublicAuditActivity" TO anon, authenticated;

COMMIT;
