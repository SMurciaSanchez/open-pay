\set ON_ERROR_STOP on
-- Pruebas de la migración 20261110120000_panel_hardening.sql (revisión de
-- seguridad del 2026-11-10). Corren después de 60_org_panel.sql.
--
--  A1: registrar y anclar listas y lotes solo lo hace el servidor (llave de
--      servicio), diciendo en nombre de quién actúa. Un tesorero con su sesión
--      no puede llamar esas funciones con una raíz o una transacción inventadas.
--  M1: un pago no puede colarse ni salirse de un mes cuyo lote ya existe, y un
--      mes no se cierra con pagos aprobados todavía sin conciliar.
\pset footer off

-- ════════════════ A1: solo el servidor registra y ancla ════════════════

SELECT ok(NOT EXISTS (
            SELECT 1 FROM pg_proc p
            WHERE p.pronamespace = 'public'::regnamespace
              AND p.proname IN ('record_vendor_set', 'anchor_vendor_set', 'record_budget_batch',
                                'anchor_payment_batch', 'discard_unanchored_batch', 'record_payment_batch')
              AND (has_function_privilege('authenticated', p.oid, 'EXECUTE')
                   OR has_function_privilege('anon', p.oid, 'EXECUTE'))),
          'H01 ningún cliente puede ejecutar las funciones de registro y anclaje');

SET ROLE authenticated;
SELECT login('00000000-0000-0000-0000-000000000003');  -- p-tes, tesorero legítimo
SELECT expect_error($$SELECT record_vendor_set('p-tes', 'fund-1', decode(repeat('01', 32), 'hex'),
                        decode(repeat('a2', 32), 'hex'), 6, ARRAY['ven-1'])$$,
                    'permission denied', 'H02 el tesorero no registra una lista por su cuenta');
RESET ROLE;

SET ROLE service_role;
SELECT expect_error($$SELECT record_vendor_set('p-conf', 'fund-1', decode(repeat('01', 32), 'hex'),
                        decode(repeat('a2', 32), 'hex'), 6, ARRAY['ven-1'])$$,
                    'No autorizado', 'H03 el servidor no actúa en nombre de quien no es tesorero');
SELECT expect_error($$SELECT record_vendor_set(NULL, 'fund-1', decode(repeat('01', 32), 'hex'),
                        decode(repeat('a2', 32), 'hex'), 6, ARRAY['ven-1'])$$,
                    'No autorizado', 'H04 ni en nombre de nadie');
SELECT expect_error($$SELECT record_vendor_set('p-otro', 'fund-1', decode(repeat('01', 32), 'hex'),
                        decode(repeat('a2', 32), 'hex'), 6, ARRAY['ven-1'])$$,
                    'No autorizado', 'H05 ni en nombre de alguien de otra organización');
SELECT record_vendor_set('p-tes', 'fund-1', decode(repeat('01', 32), 'hex'),
                         decode(repeat('a2', 32), 'hex'), 6, ARRAY['ven-1']) AS lista2 \gset
RESET ROLE;
SELECT ok((SELECT "builtBy" = 'p-tes' AND status = 'BUILT' FROM "VendorSetSnapshot" WHERE id = :'lista2'),
          'H06 el servidor registra la lista y queda a nombre del tesorero');

SET ROLE service_role;
SELECT expect_error(format($$SELECT anchor_vendor_set('p-apr', %L, 84532, '0x%s', '0x%s')$$,
                        :'lista2', repeat('c', 40), repeat('1', 64)),
                    'No autorizado', 'H07 anclar una lista también exige tesorero');
SELECT anchor_vendor_set('p-tes', :'lista2', 84532, '0x' || repeat('c', 40), '0x' || repeat('1', 64));
RESET ROLE;
SELECT ok((SELECT status = 'ANCHORED' FROM "VendorSetSnapshot" WHERE id = :'lista2'),
          'H08 el servidor ancla la lista');

-- ════════════════ M1: septiembre, con banco ════════════════

-- Tres pagos del rubro Papelería aprobados el 1 de septiembre y un extracto de
-- septiembre con las tres salidas.
INSERT INTO "Payment" (id, "fundId", "budgetId", "vendorId", amount, concept, "paidOn",
                       status, "createdBy", "approvedBy", "decidedAt")
VALUES ('ph-1', 'fund-1', 'bud-p', 'ven-1', 300000, 'Septiembre 1', '2026-09-10', 'APPROVED', 'p-tes', 'p-apr', '2026-09-01'),
       ('ph-2', 'fund-1', 'bud-p', 'ven-1', 200000, 'Septiembre 2', '2026-09-20', 'APPROVED', 'p-tes', 'p-apr', '2026-09-01'),
       -- El incómodo: se declara en septiembre aunque el banco dirá septiembre.
       ('ph-3', 'fund-1', 'bud-p', 'ven-1', 100000, 'Septiembre tardío', '2026-10-02', 'APPROVED', 'p-tes', 'p-apr', '2026-09-01');
INSERT INTO "BankStatement" (id, "bankAccountId", "organizationId", "periodStart", "periodEnd",
                             "openingBalance", "closingBalance", "fileSha256", "declaredCount", "importedBy")
VALUES ('st-sep', 'ba-1', 'org-1', '2026-09-01', '2026-09-30', 1000000, 400000,
        decode(repeat('a9', 32), 'hex'), 3, 'p-tes');
INSERT INTO "BankMovement" (id, "statementId", "periodStart", "periodEnd", "postedOn",
                            direction, amount, "bankReference")
VALUES ('mv-a1', 'st-sep', '2026-09-01', '2026-09-30', '2026-09-10', 'DEBIT', 300000, 'REF-A1'),
       ('mv-a2', 'st-sep', '2026-09-01', '2026-09-30', '2026-09-20', 'DEBIT', 200000, 'REF-A2'),
       ('mv-a3', 'st-sep', '2026-09-01', '2026-09-30', '2026-09-25', 'DEBIT', 100000, 'REF-A3');

SET ROLE authenticated;
SELECT login('00000000-0000-0000-0000-000000000003');  -- p-tes
SELECT seal_bank_statement('st-sep');
SELECT reconcile_payment('ph-1', 'mv-a1') AS rec1 \gset
RESET ROLE;

-- ph-2 está aprobado, declarado en septiembre y sin conciliar: septiembre no se cierra.
SET ROLE service_role;
SELECT expect_error(format($$SELECT record_budget_batch('p-tes', 'bud-p', %L, decode(repeat('01', 32), 'hex'),
                        decode(repeat('b8', 32), 'hex'), 6, '2026-09-01',
                        '[{"paymentId": "ph-1", "leafIndex": 0, "commitment": "\\x%s"}]'::jsonb)$$,
                        :'lista2', repeat('aa', 32)),
                    'aprobados sin conciliar', 'H09 un mes no se cierra con pagos aprobados sin conciliar');
RESET ROLE;

SET ROLE authenticated;
SELECT login('00000000-0000-0000-0000-000000000003');
SELECT reconcile_payment('ph-2', 'mv-a2');
RESET ROLE;

SET ROLE service_role;
SELECT expect_error(format($$SELECT record_budget_batch('p-apr', 'bud-p', %L, decode(repeat('01', 32), 'hex'),
                        decode(repeat('b8', 32), 'hex'), 6, '2026-09-01',
                        jsonb_build_array(
                          jsonb_build_object('paymentId', 'ph-1', 'leafIndex', 0, 'commitment', '\x' || repeat('aa', 32)),
                          jsonb_build_object('paymentId', 'ph-2', 'leafIndex', 1, 'commitment', '\x' || repeat('bb', 32))))$$,
                        :'lista2'),
                    'No autorizado', 'H10 el lote solo se arma en nombre de un tesorero');
SELECT record_budget_batch('p-tes', 'bud-p', :'lista2', decode(repeat('01', 32), 'hex'),
         decode(repeat('b8', 32), 'hex'), 6, '2026-09-01',
         jsonb_build_array(
           jsonb_build_object('paymentId', 'ph-1', 'leafIndex', 0, 'commitment', '\x' || repeat('aa', 32)),
           jsonb_build_object('paymentId', 'ph-2', 'leafIndex', 1, 'commitment', '\x' || repeat('bb', 32)))) AS lote_sep \gset
RESET ROLE;
SELECT ok((SELECT "builtBy" = 'p-tes' AND status = 'BUILT' FROM "PaymentBatch" WHERE id = :'lote_sep'),
          'H11 con todo conciliado, el servidor arma el lote de septiembre');

-- El lote de septiembre ya existe. El tesorero intenta conciliar ahora el pago
-- incómodo con una salida de septiembre: quedaría conciliado en septiembre y fuera de
-- la prueba de septiembre.
SET ROLE authenticated;
SELECT login('00000000-0000-0000-0000-000000000003');
SELECT expect_error($$SELECT reconcile_payment('ph-3', 'mv-a3')$$,
                    'ya tiene lote', 'H12 no se concilia un pago dentro de un mes que ya tiene lote');
SELECT ok((SELECT status = 'APPROVED' FROM "Payment" WHERE id = 'ph-3'),
          'H13 el pago tardío sigue a la vista como aprobado sin conciliar');
-- Y tampoco se saca del lote un pago que ya está comprometido en él.
SELECT expect_error(format($$SELECT unreconcile_payment(%L, 'Me equivoqué de movimiento')$$, :'rec1'),
                    'ya está en un lote', 'H14 no se revoca la conciliación de un pago que ya está en un lote');
SELECT expect_error(format($$SELECT anchor_payment_batch('p-tes', %L, 84532, '0x%s', '0x%s')$$,
                        :'lote_sep', repeat('c', 40), repeat('2', 64)),
                    'permission denied', 'H15 el tesorero no ancla el lote por su cuenta');
SELECT expect_error(format($$SELECT discard_unanchored_batch('p-tes', %L)$$, :'lote_sep'),
                    'permission denied', 'H16 ni lo descarta por su cuenta');
RESET ROLE;

SET ROLE service_role;
SELECT expect_error(format($$SELECT discard_unanchored_batch('p-conf', %L)$$, :'lote_sep'),
                    'No autorizado', 'H17 descartar un lote exige tesorero');
SELECT anchor_payment_batch('p-tes', :'lote_sep', 84532, '0x' || repeat('c', 40), '0x' || repeat('2', 64));
RESET ROLE;
SELECT ok((SELECT status = 'ANCHORED' AND "txHash" = '0x' || repeat('2', 64)
           FROM "PaymentBatch" WHERE id = :'lote_sep'),
          'H18 el servidor ancla el lote');
