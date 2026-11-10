\set ON_ERROR_STOP on
-- Pruebas de la migración 20261110150000_anchor_limits.sql (M3 de la revisión
-- de seguridad del 2026-11-10). Corren después de 70_hardening.sql.
--
-- Cada lista de proveedores y cada lote que se ancla es una transacción que
-- paga la billetera compartida de OpenPay. Registrarse y crear una organización
-- es libre, así que sin freno cualquiera podía vaciarla:
--  - solo anclan las organizaciones que el operador habilitó;
--  - un fondo registra como máximo 3 listas de proveedores nuevas cada 24 horas.
\pset footer off

INSERT INTO "Organization" (id, name, nit, kind) VALUES ('org-lim', 'Recién Llegada', '900000077', 'NGO');
INSERT INTO "OrgMember" ("organizationId", "profileId", role) VALUES ('org-lim', 'p-tes', 'TREASURER');
INSERT INTO "Fund" (id, "organizationId", name, purpose, "totalAmount", "startsOn", "createdBy")
VALUES ('fund-lim', 'org-lim', 'Fondo Nuevo', 'Probar límites', 10000000, '2026-01-01', 'p-tes');
INSERT INTO "Budget" (id, "fundId", category, amount) VALUES ('bud-lim', 'fund-lim', 'Varios', 10000000);
INSERT INTO "AuthorizedVendor" (id, "fundId", "legalName", nit) VALUES ('vl-1', 'fund-lim', 'Uno SAS', '811000001');

-- ════════════════ Solo anclan las organizaciones habilitadas ════════════════

SELECT ok((SELECT NOT "anchoringEnabled" FROM "Organization" WHERE id = 'org-lim'),
          'L01 una organización nueva no nace habilitada para anclar');

SET ROLE service_role;
SELECT expect_error($$SELECT record_vendor_set('p-tes', 'fund-lim', decode(repeat('07', 32), 'hex'),
                        decode(repeat('d1', 32), 'hex'), 6, ARRAY['vl-1'])$$,
                    'no está habilitada', 'L02 sin habilitar no se registra una lista para anclar');
SELECT expect_error(format($$SELECT record_budget_batch('p-tes', 'bud-lim', %L, decode(repeat('07', 32), 'hex'),
                        decode(repeat('e1', 32), 'hex'), 6, '2026-07-01',
                        '[{"paymentId": "x", "leafIndex": 0, "commitment": "\\x%s"}]'::jsonb)$$,
                        'no-importa', repeat('aa', 32)),
                    'no está habilitada', 'L03 ni se arma un lote');
RESET ROLE;

SET ROLE authenticated;
SELECT login('00000000-0000-0000-0000-000000000003');  -- p-tes, miembro de org-lim
SELECT expect_error($$UPDATE "Organization" SET "anchoringEnabled" = TRUE WHERE id = 'org-lim'$$,
                    'permission denied', 'L04 la organización no se habilita a sí misma');
RESET ROLE;

-- La habilita el operador.
UPDATE "Organization" SET "anchoringEnabled" = TRUE WHERE id = 'org-lim';

-- ════════════════ Tres listas nuevas por fondo cada 24 horas ════════════════

SET ROLE service_role;
SELECT record_vendor_set('p-tes', 'fund-lim', decode(repeat('07', 32), 'hex'),
                         decode(repeat('d1', 32), 'hex'), 6, ARRAY['vl-1']) AS l1 \gset
RESET ROLE;
INSERT INTO "AuthorizedVendor" (id, "fundId", "legalName", nit) VALUES ('vl-2', 'fund-lim', 'Dos SAS', '811000002');
SET ROLE service_role;
SELECT record_vendor_set('p-tes', 'fund-lim', decode(repeat('07', 32), 'hex'),
                         decode(repeat('d2', 32), 'hex'), 6, ARRAY['vl-1', 'vl-2']) AS l2 \gset
RESET ROLE;
INSERT INTO "AuthorizedVendor" (id, "fundId", "legalName", nit) VALUES ('vl-3', 'fund-lim', 'Tres SAS', '811000003');
SET ROLE service_role;
SELECT record_vendor_set('p-tes', 'fund-lim', decode(repeat('07', 32), 'hex'),
                         decode(repeat('d3', 32), 'hex'), 6, ARRAY['vl-1', 'vl-2', 'vl-3']) AS l3 \gset
SELECT ok(:'l1' <> :'l2' AND :'l2' <> :'l3', 'L05 una organización habilitada registra sus listas');

-- Volver a pedir la lista vigente no cuenta: no es una lista nueva.
SELECT ok(record_vendor_set('p-tes', 'fund-lim', decode(repeat('07', 32), 'hex'),
                            decode(repeat('d3', 32), 'hex'), 6, ARRAY['vl-1', 'vl-2', 'vl-3']) = :'l3',
          'L06 repetir la lista vigente no gasta el cupo');
RESET ROLE;

INSERT INTO "AuthorizedVendor" (id, "fundId", "legalName", nit) VALUES ('vl-4', 'fund-lim', 'Cuatro SAS', '811000004');
SET ROLE service_role;
SELECT expect_error($$SELECT record_vendor_set('p-tes', 'fund-lim', decode(repeat('07', 32), 'hex'),
                        decode(repeat('d4', 32), 'hex'), 6, ARRAY['vl-1', 'vl-2', 'vl-3', 'vl-4'])$$,
                    'últimas 24 horas', 'L07 la cuarta lista del día se rechaza');
RESET ROLE;

-- Pasado el día, el cupo vuelve.
UPDATE "VendorSetSnapshot" SET "builtAt" = NOW() - INTERVAL '25 hours' WHERE id = :'l1';
SET ROLE service_role;
SELECT ok(record_vendor_set('p-tes', 'fund-lim', decode(repeat('07', 32), 'hex'),
                            decode(repeat('d4', 32), 'hex'), 6, ARRAY['vl-1', 'vl-2', 'vl-3', 'vl-4']) IS NOT NULL,
          'L08 al día siguiente se puede registrar otra');
RESET ROLE;

-- El cupo es por fondo: el de otro fondo no se toca.
SELECT ok((SELECT count(*) FROM "VendorSetSnapshot" WHERE "fundId" = 'fund-1') >= 2,
          'L09 las listas de otro fondo no cuentan');
