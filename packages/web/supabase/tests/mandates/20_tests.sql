\set ON_ERROR_STOP on
\pset footer off

-- Falla si la sentencia NO lanza un error que contenga el patrón
CREATE FUNCTION expect_error(p_sql TEXT, p_pattern TEXT, p_name TEXT) RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE p_sql;
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM ILIKE '%' || p_pattern || '%' THEN
      RAISE NOTICE 'OK   %  (%)', p_name, SQLERRM;
      RETURN;
    END IF;
    RAISE EXCEPTION 'FALLA % — error inesperado: %', p_name, SQLERRM;
  END;
  RAISE EXCEPTION 'FALLA % — no lanzó error', p_name;
END $$;

CREATE FUNCTION ok(p_cond BOOLEAN, p_name TEXT) RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
  IF p_cond IS NOT TRUE THEN RAISE EXCEPTION 'FALLA %', p_name; END IF;
  RAISE NOTICE 'OK   %', p_name;
END $$;

CREATE FUNCTION login(p_uid TEXT) RETURNS VOID LANGUAGE sql AS
$$ SELECT set_config('request.jwt.claim.sub', p_uid, false) $$;

-- ── Datos base (plataforma, service_role) ──
INSERT INTO "Organization" (id, name, nit, kind) VALUES
  ('org-1', 'Fundación Prueba', '900000001', 'FOUNDATION'),
  ('org-2', 'Otra ONG', '900000002', 'NGO');
INSERT INTO "OrgMember" ("organizationId", "profileId", role) VALUES
  ('org-1', 'p-conf', 'CONFIGURATOR'),
  ('org-1', 'p-apr',  'APPROVER'),
  ('org-1', 'p-tes',  'TREASURER'),
  ('org-1', 'p-rep',  'LEGAL_REP'),
  ('org-2', 'p-otro', 'CONFIGURATOR');

SELECT expect_error($$INSERT INTO "OrgMember" ("organizationId", "profileId", role)
                     VALUES ('org-1', 'p-tes', 'APPROVER')$$,
                    'duplicate key', 'T01 una persona no tiene dos roles en la misma organización');

-- ── Configurador arma el fondo ──
SET ROLE authenticated;
SELECT login('00000000-0000-0000-0000-000000000001');

INSERT INTO "Fund" (id, "organizationId", name, purpose, "totalAmount", "startsOn", "createdBy")
VALUES ('fund-1', 'org-1', 'Fondo Salud', 'Atención primaria rural', 500000000, '2026-01-01', 'p-conf');
INSERT INTO "Budget" (id, "fundId", category, amount) VALUES
  ('bud-1', 'fund-1', 'Salud', 100000000),
  ('bud-2', 'fund-1', 'Logística', 1000000);
INSERT INTO "AuthorizedVendor" (id, "fundId", "legalName", nit) VALUES
  ('ven-1', 'fund-1', 'Proveedor Uno SAS', '800000001'),
  ('ven-2', 'fund-1', 'Proveedor Dos SAS', '800000002');
INSERT INTO "Contract" (id, "fundId", "budgetId", object, value, "isPublic", "secopUrl")
VALUES ('con-1', 'fund-1', 'bud-1', 'Suministro de medicamentos', 50000000, TRUE, 'https://community.secop.gov.co/x');
INSERT INTO "FundRule" ("fundId", kind, params, version, "createdBy")
VALUES ('fund-1', 'MAX_PAYMENT', '{"max": 20000000}', 1, 'p-conf'),
       ('fund-1', 'MAX_PAYMENT', '{"max": 30000000}', 2, 'p-conf');

SELECT expect_error($$INSERT INTO "FundRule" ("fundId", kind, version, "createdBy")
                     VALUES ('fund-1', 'CONTRACT_REQUIRED', 1, 'p-apr')$$,
                    'row-level security', 'T02 una regla no se puede firmar a nombre de otro');
SELECT expect_error($$SELECT decide_payment('x', true)$$, 'No autorizado',
                    'T03 el configurador no aprueba pagos');

-- ── Otro fondo (org-2) para probar cruces ──
SELECT login('00000000-0000-0000-0000-000000000006');
INSERT INTO "Fund" (id, "organizationId", name, purpose, "totalAmount", "startsOn", "createdBy")
VALUES ('fund-2', 'org-2', 'Fondo Ajeno', 'Otro propósito', 1000000, '2026-01-01', 'p-otro');
INSERT INTO "Budget" (id, "fundId", category, amount) VALUES ('bud-x', 'fund-2', 'Varios', 1000000);
INSERT INTO "AuthorizedVendor" (id, "fundId", "legalName", nit) VALUES ('ven-x', 'fund-2', 'Ajeno SAS', '800000009');
SELECT ok((SELECT count(*) FROM "Fund") = 1, 'T04 un miembro de otra organización solo ve su fondo');
SELECT ok((SELECT count(*) FROM "Payment") = 0, 'T05 no ve pagos ajenos');
SELECT expect_error($$INSERT INTO "Budget" ("fundId", category, amount) VALUES ('fund-1', 'Hack', 1)$$,
                    'row-level security', 'T06 no puede crear rubros en un fondo ajeno');

-- ── Tesorería ──
SELECT login('00000000-0000-0000-0000-000000000003');
INSERT INTO "Payment" (id, "fundId", "budgetId", "contractId", "vendorId", amount, concept, "paidOn", "createdBy")
VALUES ('pay-1', 'fund-1', 'bud-1', 'con-1', 'ven-1', 10000000, 'Lote 1', '2026-08-10', 'p-tes'),
       ('pay-big', 'fund-1', 'bud-2', NULL, 'ven-1', 900000, 'Transporte', '2026-08-11', 'p-tes'),
       ('pay-big2', 'fund-1', 'bud-2', NULL, 'ven-1', 200000, 'Transporte 2', '2026-08-12', 'p-tes'),
       ('pay-rev', 'fund-1', 'bud-1', NULL, 'ven-2', 1000, 'Revocado', '2026-08-12', 'p-tes');

SELECT expect_error($$INSERT INTO "Payment" ("fundId", "budgetId", "vendorId", amount, concept, "createdBy")
                     VALUES ('fund-1', 'bud-1', 'ven-x', 5, 'Proveedor de otro fondo', 'p-tes')$$,
                    'foreign key', 'T07 no se paga a un proveedor de otro fondo');
SELECT expect_error($$INSERT INTO "Payment" ("fundId", "budgetId", "vendorId", amount, concept, "createdBy")
                     VALUES ('fund-1', 'bud-x', 'ven-1', 5, 'Rubro de otro fondo', 'p-tes')$$,
                    'foreign key', 'T08 no se imputa a un rubro de otro fondo');
SELECT expect_error($$INSERT INTO "Payment" ("fundId", "budgetId", "vendorId", amount, concept, "createdBy", status)
                     VALUES ('fund-1', 'bud-1', 'ven-1', 5, 'Autoaprobado', 'p-tes', 'APPROVED')$$,
                    'permission denied', 'T09 tesorería no crea pagos ya aprobados');
SELECT expect_error($$UPDATE "Payment" SET status = 'APPROVED' WHERE id = 'pay-1'$$,
                    'permission denied', 'T10 nadie cambia el estado sin decide_payment');
SELECT expect_error($$SELECT salt FROM "Payment"$$,
                    'permission denied', 'T11 la sal (N4) no es legible');
SELECT expect_error($$SELECT decide_payment('pay-1', true)$$, 'No autorizado',
                    'T12 tesorería no aprueba sus pagos');

INSERT INTO "VendorBankAccount" ("vendorId", ciphertext, "keyId") VALUES ('ven-1', '\xdeadbeef', 'k1');
SELECT ok((SELECT count(*) FROM "VendorBankAccount") = 1, 'T13 tesorería ve datos bancarios');

-- ── Configurador revoca un proveedor ──
SELECT login('00000000-0000-0000-0000-000000000001');
UPDATE "AuthorizedVendor" SET "revokedAt" = NOW() WHERE id = 'ven-2';
SELECT expect_error($$UPDATE "AuthorizedVendor" SET nit = '1' WHERE id = 'ven-1'$$,
                    'permission denied', 'T14 el NIT de un proveedor no se reescribe');
SELECT ok((SELECT count(*) FROM "VendorBankAccount") = 0, 'T15 el configurador no ve datos bancarios');

-- ── Aprobador ──
SELECT login('00000000-0000-0000-0000-000000000002');
SELECT decide_payment('pay-1', true);
SELECT ok((SELECT status FROM "Payment" WHERE id = 'pay-1') = 'APPROVED', 'T16 el aprobador aprueba');
SELECT expect_error($$SELECT decide_payment('pay-1', false)$$, 'ya fue decidido', 'T17 no se decide dos veces');
SELECT decide_payment('pay-big', true);
SELECT expect_error($$SELECT decide_payment('pay-big2', true)$$, 'excede el presupuesto',
                    'T18 no se aprueba por encima del rubro');
SELECT expect_error($$SELECT decide_payment('pay-rev', true)$$, 'revocado',
                    'T19 no se aprueba a un proveedor revocado');
SELECT decide_payment('pay-rev', false);
SELECT expect_error($$INSERT INTO "Fund" ("organizationId", name, purpose, "totalAmount", "startsOn", "createdBy")
                     VALUES ('org-1', 'x', 'x', 1, '2026-01-01', 'p-apr')$$,
                    'row-level security', 'T20 el aprobador no configura fondos');
SELECT expect_error($$SELECT grant_access('fund-1', 'p-aud', 'AUDITOR', 'Auditoría anual 2026', NOW(), NOW() + INTERVAL '30 days')$$,
                    'No autorizado', 'T21 el aprobador no otorga llaves');

-- ── Representante legal ──
SELECT login('00000000-0000-0000-0000-000000000004');
SELECT expect_error($$SELECT grant_access('fund-1', 'p-rep', 'AUDITOR', 'Auditoría anual 2026', NOW(), NOW() + INTERVAL '30 days')$$,
                    'miembro de la organización', 'T22 el representante no se da llave a sí mismo');
SELECT expect_error($$SELECT grant_access('fund-1', 'p-aud', 'AUDITOR', 'Auditoría', NOW(), NOW() + INTERVAL '2 years')$$,
                    'check constraint', 'T23 llave sin propósito claro o de más de un año');
SELECT grant_access('fund-1', 'p-aud', 'AUDITOR', 'Auditoría anual 2026', NOW() - INTERVAL '1 day', NOW() + INTERVAL '30 days') AS grant_id \gset
SELECT grant_access('fund-1', 'p-aud', 'DONOR', 'Revisión de donante futura', NOW() + INTERVAL '10 days', NOW() + INTERVAL '20 days') AS future_grant \gset

-- ── Auditor ──
SELECT login('00000000-0000-0000-0000-000000000005');
SELECT ok((SELECT count(*) FROM "Payment") = 0, 'T24 el auditor no lee la tabla directamente');
SELECT ok((SELECT count(*) FROM audit_read_payments(:'grant_id')) = 4, 'T25 el auditor lee con llave vigente');
SELECT ok((SELECT count(*) FROM "AccessLog") = 1, 'T26 la lectura queda en la bitácora');
SELECT expect_error(format('SELECT * FROM audit_read_payments(%L)', :'future_grant'), 'vencida',
                    'T27 una llave que aún no empieza no sirve');
SELECT expect_error(format('DELETE FROM "AccessLog" WHERE "grantId" = %L', :'grant_id'),
                    'permission denied', 'T28 el auditor no borra la bitácora');

SELECT login('00000000-0000-0000-0000-000000000006');
SELECT expect_error(format('SELECT * FROM audit_read_payments(%L)', :'grant_id'), 'vencida',
                    'T29 la llave de otro no sirve');

SELECT login('00000000-0000-0000-0000-000000000004');
SELECT ok((SELECT count(*) FROM "AccessLog") = 1, 'T30 el representante ve la bitácora');
SELECT revoke_access(:'grant_id');
SELECT login('00000000-0000-0000-0000-000000000005');
SELECT expect_error(format('SELECT * FROM audit_read_payments(%L)', :'grant_id'), 'revocada',
                    'T31 una llave revocada no sirve');

RESET ROLE;
SELECT expect_error($$DELETE FROM "AccessLog"$$, 'solo inserción', 'T32 la bitácora es inmutable incluso para el dueño');
SELECT expect_error($$UPDATE "FundRule" SET params = '{}'$$, 'solo inserción', 'T33 las reglas no se reescriben');

-- ── Público ──
SET ROLE anon;
SELECT expect_error($$SELECT * FROM "Fund"$$, 'permission denied', 'T34 anónimo no lee tablas');
SELECT ok((SELECT count(*) FROM "PublicFund") = 2, 'T35 anónimo ve los fondos');
SELECT ok((SELECT "totalAmountRounded" FROM "PublicFund" WHERE id = 'fund-1') = 500000000, 'T36 total redondeado');
SELECT ok((SELECT version FROM "PublicFundRule" WHERE "fundId" = 'fund-1' AND kind = 'MAX_PAYMENT') = 2,
          'T37 solo la versión vigente de cada regla');
SELECT ok((SELECT count(*) FROM "PublicContract") = 1, 'T38 contratos SECOP visibles');
SELECT ok((SELECT "executedPercent" FROM "PublicBudgetExecution" WHERE category = 'Salud') IS NULL,
          'T39 rubro con menos de 10 pagos: suprimido');
SELECT ok((SELECT count(*) FROM "PublicAuditActivity" WHERE "fundId" = 'fund-1') = 2, 'T40 se sabe que hubo auditorías');
SELECT ok(NOT EXISTS (SELECT 1 FROM information_schema.columns
                      WHERE table_name = 'PublicAuditActivity'
                        AND column_name IN ('granteeProfileId', 'purpose')), 'T41 sin quién ni para qué');

-- Rubro con 12 pagos parejos del mes pasado → se publica
RESET ROLE;
INSERT INTO "Payment" ("fundId", "budgetId", "vendorId", amount, concept, "paidOn", status, "createdBy", "approvedBy", "decidedAt")
SELECT 'fund-1', 'bud-1', 'ven-1', 1000000, 'Lote ' || g, '2026-08-15', 'APPROVED', 'p-tes', 'p-apr', NOW()
FROM generate_series(1, 12) g;
-- Pago de este mes: no debe contar todavía
INSERT INTO "Payment" ("fundId", "budgetId", "vendorId", amount, concept, "paidOn", status, "createdBy", "approvedBy", "decidedAt")
VALUES ('fund-1', 'bud-1', 'ven-1', 5000000, 'Este mes', date_trunc('month', NOW())::date + 1, 'APPROVED', 'p-tes', 'p-apr', NOW());

SET ROLE anon;
-- 12 × 1M + 10M (pay-1) = 22M sobre 100M; ningún pago supera el 80 %
SELECT ok((SELECT "executedPercent" FROM "PublicBudgetExecution" WHERE category = 'Salud') = 22,
          'T42 rubro con k >= 10: 22 % (sin el pago del mes en curso)');
SELECT ok((SELECT "executedPercent" FROM "PublicBudgetExecution" WHERE category = 'Logística') IS NULL,
          'T43 rubro con un solo pago: suprimido');
RESET ROLE;

-- Celda dominante: un pago enorme en el mismo rubro
UPDATE "Budget" SET amount = 1000000000 WHERE id = 'bud-1';
INSERT INTO "Payment" ("fundId", "budgetId", "vendorId", amount, concept, "paidOn", status, "createdBy", "approvedBy", "decidedAt")
VALUES ('fund-1', 'bud-1', 'ven-1', 500000000, 'Dominante', '2026-08-20', 'APPROVED', 'p-tes', 'p-apr', NOW());
SET ROLE anon;
SELECT ok((SELECT "executedPercent" FROM "PublicBudgetExecution" WHERE category = 'Salud') IS NULL,
          'T44 un pago > 80 % del rubro: suprimido');
RESET ROLE;

\echo '=== TODAS LAS PRUEBAS PASARON ==='
