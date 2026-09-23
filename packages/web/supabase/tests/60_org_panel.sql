\set ON_ERROR_STOP on
-- Pruebas del panel de la organización (migración 20260923120000_org_panel.sql).
-- Corren después de 50_commitments.sql. En fund-1 el único proveedor vigente
-- es ven-1 (ven-2 se revocó en 30_mandates.sql); p-tes es el tesorero.
\pset footer off

-- ════════════════ Organización y equipo ════════════════

SET ROLE anon;
SELECT expect_error($$SELECT create_organization('Anónima', NULL, 'NGO')$$,
                    'permission denied', 'P01 sin cuenta no se crea una organización');
RESET ROLE;

SET ROLE authenticated;
SELECT login('00000000-0000-0000-0000-000000000006');  -- p-otro
SELECT create_organization('Fundación Nueva', '900555555', 'FOUNDATION') AS org \gset
SELECT ok((SELECT role = 'LEGAL_REP' FROM "OrgMember"
           WHERE "organizationId" = :'org' AND "profileId" = 'p-otro'),
          'P02 quien crea la organización queda como representante legal');
SELECT expect_error($$SELECT create_organization('Copia', '900555555', 'NGO')$$,
                    'Ya existe una organización con ese NIT', 'P03 el NIT no se repite');
SELECT expect_error($$SELECT create_organization('  ', NULL, 'NGO')$$,
                    'nombre de la organización es obligatorio', 'P04 el nombre es obligatorio');

SELECT expect_error(format($$SELECT add_org_member(%L, 'nadie@example.com', 'TREASURER')$$, :'org'),
                    'No hay una cuenta', 'P05 no se invita a quien no tiene cuenta');
SELECT add_org_member(:'org', 'AUD@example.com', 'TREASURER') AS miembro \gset
SELECT ok(:'miembro' IS NOT NULL, 'P06 se invita por correo, sin importar mayúsculas');
SELECT expect_error(format($$SELECT add_org_member(%L, 'aud@example.com', 'APPROVER')$$, :'org'),
                    'un solo rol', 'P07 una persona no suma un segundo rol');
SELECT expect_error(format($$SELECT add_org_member(%L, 'conf@example.com', 'DUEÑO')$$, :'org'),
                    'Rol inválido', 'P08 solo roles conocidos');
SELECT ok((SELECT count(*) FROM org_members(:'org')) = 2
          AND (SELECT email FROM org_members(:'org') WHERE role = 'TREASURER') = 'aud@example.com',
          'P09 el equipo se ve con nombre y correo');

SELECT login('00000000-0000-0000-0000-000000000005');  -- p-aud, ahora tesorero
SELECT expect_error(format($$SELECT add_org_member(%L, 'conf@example.com', 'APPROVER')$$, :'org'),
                    'No autorizado', 'P10 solo el representante legal arma el equipo');
SELECT ok((SELECT count(*) FROM org_members(:'org')) = 2, 'P11 un miembro ve a su equipo');

SELECT login('00000000-0000-0000-0000-000000000001');  -- p-conf, ajeno a la nueva
SELECT expect_error(format($$SELECT * FROM org_members(%L)$$, :'org'),
                    'No autorizado', 'P12 quien no es miembro no ve el equipo');

SELECT login('00000000-0000-0000-0000-000000000006');  -- p-otro
SELECT id AS yo FROM "OrgMember" WHERE "organizationId" = :'org' AND "profileId" = 'p-otro' \gset
SELECT expect_error(format($$SELECT revoke_org_member(%L)$$, :'yo'),
                    'No puedes sacarte', 'P13 el representante no se saca a sí mismo');
SELECT revoke_org_member(:'miembro');
SELECT ok((SELECT "revokedAt" IS NOT NULL FROM org_members(:'org') WHERE id = :'miembro'),
          'P14 sacar a alguien lo revoca, no lo borra');
SELECT expect_error(format($$SELECT revoke_org_member(%L)$$, :'miembro'),
                    'ya no es miembro', 'P15 no se revoca dos veces');
-- En dos sentencias: dentro de una misma, org_members vería la foto de antes.
SELECT add_org_member(:'org', 'aud@example.com', 'APPROVER') AS de_vuelta \gset
SELECT ok(:'de_vuelta' = :'miembro'
          AND (SELECT role FROM org_members(:'org') WHERE id = :'miembro') = 'APPROVER'
          AND (SELECT "revokedAt" IS NULL FROM org_members(:'org') WHERE id = :'miembro'),
          'P16 quien vuelve al equipo vuelve con el rol nuevo, en la misma fila');
RESET ROLE;

-- ════════════════ Lista de proveedores anclada ════════════════

-- Un rubro limpio y pagos de julio, conciliados, para armar lotes.
INSERT INTO "Budget" (id, "fundId", category, amount) VALUES ('bud-p', 'fund-1', 'Papelería', 50000000);
INSERT INTO "Payment" (id, "fundId", "budgetId", "vendorId", amount, concept, "paidOn",
                       status, "createdBy", "approvedBy", "decidedAt")
VALUES ('pl-1', 'fund-1', 'bud-p', 'ven-1', 1000000, 'Resmas',     '2026-07-10', 'RECONCILED', 'p-tes', 'p-apr', NOW()),
       ('pl-2', 'fund-1', 'bud-p', 'ven-1', 2000000, 'Tóner',      '2026-07-20', 'RECONCILED', 'p-tes', 'p-apr', NOW()),
       ('pl-3', 'fund-1', 'bud-p', 'ven-1', 3000000, 'Sin conciliar', '2026-07-25', 'APPROVED', 'p-tes', 'p-apr', NOW()),
       ('pl-4', 'fund-1', 'bud-p', 'ven-2',  500000, 'Proveedor revocado', '2026-06-15', 'RECONCILED', 'p-tes', 'p-apr', NOW());

SET ROLE authenticated;
SELECT login('00000000-0000-0000-0000-000000000003');  -- p-tes

SELECT expect_error($$SELECT record_vendor_set('fund-1', decode(repeat('01', 32), 'hex'),
                        decode(repeat('a1', 32), 'hex'), 6, ARRAY['ven-1', 'ven-2'])$$,
                    'no coincide', 'P17 no se ancla una lista con un proveedor revocado');
SELECT expect_error($$SELECT record_vendor_set('fund-1', decode(repeat('01', 32), 'hex'),
                        decode(repeat('a1', 32), 'hex'), 6, ARRAY['ven-1', 'ven-1'])$$,
                    'no coincide', 'P18 ni con uno repetido');
SELECT record_vendor_set('fund-1', decode(repeat('01', 32), 'hex'),
                         decode(repeat('a1', 32), 'hex'), 6, ARRAY['ven-1']) AS lista \gset
SELECT ok(record_vendor_set('fund-1', decode(repeat('01', 32), 'hex'),
                            decode(repeat('a1', 32), 'hex'), 6, ARRAY['ven-1']) = :'lista',
          'P19 la misma lista no se duplica');

-- Antes de anclar la lista no se arma el lote
SELECT expect_error(format($$SELECT record_budget_batch('bud-p', %L, decode(repeat('01', 32), 'hex'),
                        decode(repeat('b1', 32), 'hex'), 6, '2026-07-01',
                        '[{"paymentId": "pl-1", "leafIndex": 0, "commitment": "\\x%s"}]'::jsonb)$$,
                        :'lista', repeat('aa', 32)),
                    'tiene que estar anclada', 'P20 la lista se ancla antes que el lote');

SELECT anchor_vendor_set(:'lista', 84532, '0x' || repeat('c', 40), '0x' || repeat('d', 64));
SELECT ok((SELECT status = 'ANCHORED' FROM "VendorSetSnapshot" WHERE id = :'lista'),
          'P21 la lista queda anclada');
SELECT expect_error(format($$SELECT anchor_vendor_set(%L, 84532, '0x%s', '0x%s')$$,
                        :'lista', repeat('c', 40), repeat('e', 64)),
                    'ya está anclada', 'P22 no se ancla dos veces');
RESET ROLE;
SELECT expect_error(format($$UPDATE "VendorSetSnapshot" SET "vendorIds" = ARRAY['ven-2'] WHERE id = %L$$, :'lista'),
                    'ya está anclada', 'P23 una lista anclada no se toca, ni con la llave de servicio');

-- ════════════════ Lotes por rubro ════════════════

SET ROLE authenticated;
SELECT login('00000000-0000-0000-0000-000000000003');  -- p-tes

SELECT expect_error(format($$SELECT record_budget_batch('bud-p', %L, decode(repeat('01', 32), 'hex'),
                        decode(repeat('b1', 32), 'hex'), 6, %L,
                        '[{"paymentId": "pl-1", "leafIndex": 0, "commitment": "\\x%s"}]'::jsonb)$$,
                        :'lista', date_trunc('month', NOW())::date, repeat('aa', 32)),
                    'todavía no ha cerrado', 'P24 no se arma el lote de un mes abierto');
SELECT expect_error(format($$SELECT record_budget_batch('bud-p', %L, decode(repeat('01', 32), 'hex'),
                        decode(repeat('b1', 32), 'hex'), 6, '2026-07-02',
                        '[{"paymentId": "pl-1", "leafIndex": 0, "commitment": "\\x%s"}]'::jsonb)$$,
                        :'lista', repeat('aa', 32)),
                    'primer día del mes', 'P25 el período es un mes calendario');

-- Omitir un pago conciliado: la trampa que esta función existe para impedir
SELECT expect_error(format($$SELECT record_budget_batch('bud-p', %L, decode(repeat('01', 32), 'hex'),
                        decode(repeat('b1', 32), 'hex'), 6, '2026-07-01',
                        '[{"paymentId": "pl-1", "leafIndex": 0, "commitment": "\\x%s"}]'::jsonb)$$,
                        :'lista', repeat('aa', 32)),
                    'exactamente los pagos conciliados', 'P26 no se puede dejar afuera un pago conciliado');
-- Colar uno sin conciliar
SELECT expect_error(format($$SELECT record_budget_batch('bud-p', %L, decode(repeat('01', 32), 'hex'),
                        decode(repeat('b1', 32), 'hex'), 6, '2026-07-01',
                        jsonb_build_array(
                          jsonb_build_object('paymentId', 'pl-1', 'leafIndex', 0, 'commitment', '\x' || repeat('aa', 32)),
                          jsonb_build_object('paymentId', 'pl-2', 'leafIndex', 1, 'commitment', '\x' || repeat('bb', 32)),
                          jsonb_build_object('paymentId', 'pl-3', 'leafIndex', 2, 'commitment', '\x' || repeat('cc', 32))))$$,
                        :'lista'),
                    'exactamente los pagos conciliados', 'P27 no se cuela un pago sin conciliar');
-- Junio: el único pago fue a un proveedor que ya no está en la lista
SELECT expect_error(format($$SELECT record_budget_batch('bud-p', %L, decode(repeat('01', 32), 'hex'),
                        decode(repeat('b2', 32), 'hex'), 6, '2026-06-01',
                        '[{"paymentId": "pl-4", "leafIndex": 0, "commitment": "\\x%s"}]'::jsonb)$$,
                        :'lista', repeat('aa', 32)),
                    'no están en la lista anclada', 'P28 todo pago del lote va a un proveedor de la lista');
SELECT expect_error(format($$SELECT record_budget_batch('bud-p', %L, decode(repeat('01', 32), 'hex'),
                        decode(repeat('b1', 32), 'hex'), 1, '2026-07-01',
                        jsonb_build_array(
                          jsonb_build_object('paymentId', 'pl-1', 'leafIndex', 0, 'commitment', '\x' || repeat('aa', 32)),
                          jsonb_build_object('paymentId', 'pl-2', 'leafIndex', 1, 'commitment', '\x' || repeat('bb', 32)),
                          jsonb_build_object('paymentId', 'pl-3', 'leafIndex', 2, 'commitment', '\x' || repeat('cc', 32))))$$,
                        :'lista'),
                    'no cabe', 'P29 el lote cabe en el árbol');

SELECT record_budget_batch('bud-p', :'lista', decode(repeat('01', 32), 'hex'),
         decode(repeat('b1', 32), 'hex'), 6, '2026-07-01',
         jsonb_build_array(
           jsonb_build_object('paymentId', 'pl-1', 'leafIndex', 0, 'commitment', '\x' || repeat('aa', 32)),
           jsonb_build_object('paymentId', 'pl-2', 'leafIndex', 1, 'commitment', '\x' || repeat('bb', 32)))) AS lote \gset
SELECT ok((SELECT "budgetId" = 'bud-p' AND "vendorSetId" = :'lista' AND "periodEnd" = '2026-07-31'
           FROM "PaymentBatch" WHERE id = :'lote'),
          'P30 el lote queda con su rubro, su lista y el mes completo');

SELECT expect_error(format($$SELECT record_budget_batch('bud-p', %L, decode(repeat('01', 32), 'hex'),
                        decode(repeat('b3', 32), 'hex'), 6, '2026-07-01',
                        '[{"paymentId": "pl-1", "leafIndex": 0, "commitment": "\\x%s"}]'::jsonb)$$,
                        :'lista', repeat('aa', 32)),
                    'exactamente los pagos conciliados', 'P31 un pago no entra en dos lotes');

-- Descartar un lote que no se ancló libera los pagos
SELECT discard_unanchored_batch(:'lote');
SELECT ok(NOT EXISTS (SELECT 1 FROM "PaymentCommitment" WHERE "paymentId" IN ('pl-1', 'pl-2')),
          'P32 descartar un lote sin anclar libera sus pagos');

SELECT record_budget_batch('bud-p', :'lista', decode(repeat('01', 32), 'hex'),
         decode(repeat('b1', 32), 'hex'), 6, '2026-07-01',
         jsonb_build_array(
           jsonb_build_object('paymentId', 'pl-1', 'leafIndex', 0, 'commitment', '\x' || repeat('aa', 32)),
           jsonb_build_object('paymentId', 'pl-2', 'leafIndex', 1, 'commitment', '\x' || repeat('bb', 32)))) AS lote \gset
SELECT anchor_payment_batch(:'lote', 84532, '0x' || repeat('c', 40), '0x' || repeat('f', 64));
SELECT expect_error(format($$SELECT discard_unanchored_batch(%L)$$, :'lote'),
                    'ya está anclado', 'P33 un lote anclado no se descarta');

SELECT login('00000000-0000-0000-0000-000000000001');  -- p-conf: miembro, no tesorero
SELECT expect_error(format($$SELECT discard_unanchored_batch(%L)$$, :'lote'),
                    'No autorizado', 'P34 solo tesorería arma y descarta lotes');
SELECT login('00000000-0000-0000-0000-000000000006');  -- p-otro: de otra organización
SELECT expect_error($$SELECT record_vendor_set('fund-1', decode(repeat('01', 32), 'hex'),
                        decode(repeat('a9', 32), 'hex'), 6, ARRAY['ven-1'])$$,
                    'No autorizado', 'P35 nadie ancla listas de un fondo ajeno');
SELECT ok((SELECT count(*) FROM "VendorSetSnapshot") = 0, 'P36 ni ve las listas de un fondo ajeno');
RESET ROLE;

-- ════════════════ Pruebas ZK y vista pública ════════════════

SET ROLE authenticated;
SELECT login('00000000-0000-0000-0000-000000000003');
SELECT expect_error(format($$INSERT INTO "BatchProof" ("batchId", "budgetLimitMinor", proof, "publicSignals", "vkeyHash")
                             VALUES (%L, 1, '{}', '["1","2","3"]', decode(repeat('00', 32), 'hex'))$$, :'lote'),
                    'permission denied', 'P37 ningún cliente sube pruebas');
RESET ROLE;

-- La sube el script del operador (llave de servicio)
INSERT INTO "BatchProof" ("batchId", "budgetLimitMinor", proof, "publicSignals", "vkeyHash")
VALUES (:'lote', 5000000000, '{"pi_a": ["1"]}', '["1", "2", "5000000000"]', decode(repeat('8c', 32), 'hex'));
SELECT expect_error(format($$UPDATE "BatchProof" SET "budgetLimitMinor" = 1 WHERE "batchId" = %L$$, :'lote'),
                    'solo inserción', 'P38 una prueba publicada no se cambia');

SET ROLE anon;
SELECT ok((SELECT count(*) FROM "PublicBatchProof") = 1, 'P39 el público ve la prueba del lote anclado');
SELECT ok((SELECT "batchRoot" = '0x' || repeat('b1', 32)
                  AND "vendorSetRoot" = '0x' || repeat('a1', 32)
                  AND "budgetCategory" = 'Papelería'
                  AND "vendorSetTxHash" = '0x' || repeat('d', 64)
           FROM "PublicBatchProof"),
          'P40 con las dos raíces, el rubro y dónde se anclaron');
SELECT ok(NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'PublicBatchProof'
              AND column_name IN ('leafCount', 'paymentCount', 'vendorIds', 'amount', 'salt')),
          'P41 sin cantidad de pagos, montos, sales ni la lista de proveedores');
SELECT expect_error($$SELECT count(*) FROM "VendorSetSnapshot"$$,
                    'permission denied', 'P42 el público no lee la lista de proveedores');
SELECT expect_error($$SELECT count(*) FROM "BatchProof"$$,
                    'permission denied', 'P43 el público lee las pruebas solo por la vista');
RESET ROLE;

-- ════════════════ Conciliar fija la fecha del pago ════════════════

-- El tesorero declaró junio; el banco dice que el dinero salió en julio.
INSERT INTO "Payment" (id, "fundId", "budgetId", "vendorId", amount, concept, "paidOn",
                       status, "createdBy", "approvedBy", "decidedAt")
VALUES ('pf-1', 'fund-1', 'bud-1', 'ven-1', 700000, 'Fecha declarada mal', '2026-06-30',
        'APPROVED', 'p-tes', 'p-apr', '2026-07-01');
INSERT INTO "BankStatement" (id, "bankAccountId", "organizationId", "periodStart", "periodEnd",
                             "openingBalance", "closingBalance", "fileSha256", "declaredCount", "importedBy")
VALUES ('st-jul', 'ba-1', 'org-1', '2026-07-01', '2026-07-31', 1000000, 300000,
        decode(repeat('e7', 32), 'hex'), 1, 'p-tes');
INSERT INTO "BankMovement" (id, "statementId", "periodStart", "periodEnd", "postedOn",
                            direction, amount, "bankReference")
VALUES ('mv-jul', 'st-jul', '2026-07-01', '2026-07-31', '2026-07-15', 'DEBIT', 700000, 'REF-JUL');

SET ROLE authenticated;
SELECT login('00000000-0000-0000-0000-000000000003');  -- p-tes
SELECT seal_bank_statement('st-jul');
SELECT reconcile_payment('pf-1', 'mv-jul');
SELECT ok((SELECT "paidOn" = '2026-07-15' AND status = 'RECONCILED' FROM "Payment" WHERE id = 'pf-1'),
          'P44 al conciliar, la fecha del pago pasa a ser la del banco');
RESET ROLE;
