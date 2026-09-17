\set ON_ERROR_STOP on
-- Pruebas de los lotes de compromisos (corren después de 40_reconciliation.sql,
-- que dejó rec-dup conciliado y rec-ok / rec-tarde solo aprobados).
\pset footer off

-- Un segundo pago conciliado, para armar lotes de más de una hoja.
-- mv-2 (900.000, 2026-08-21) todavía está libre.
INSERT INTO "Payment" (id, "fundId", "budgetId", "vendorId", amount, concept, "paidOn",
                       status, "createdBy", "approvedBy", "decidedAt")
VALUES ('rec-dos', 'fund-1', 'bud-1', 'ven-1', 900000, 'Transporte agosto', '2026-08-21',
        'APPROVED', 'p-tes', 'p-apr', '2026-08-05');

SET ROLE authenticated;
SELECT login('00000000-0000-0000-0000-000000000003');  -- tesorero
SELECT ok(reconcile_payment('rec-dos', 'mv-2') IS NOT NULL, 'C01 segundo pago conciliado');

-- ── Solo entran pagos conciliados ──
SELECT expect_error($$SELECT record_payment_batch('fund-1',
                        decode(repeat('11', 32), 'hex'), decode(repeat('22', 32), 'hex'), 10,
                        '2026-08-01', '2026-08-31',
                        '[{"paymentId": "rec-ok", "leafIndex": 0, "commitment": "\\xaa"}]'::jsonb)$$,
                    'no están conciliados', 'C02 un pago solo aprobado no entra al lote');

SELECT expect_error($$SELECT record_payment_batch('fund-1',
                        decode(repeat('11', 32), 'hex'), decode(repeat('22', 32), 'hex'), 10,
                        '2026-08-01', '2026-08-31',
                        '[{"paymentId": "no-existe", "leafIndex": 0, "commitment": "\\xaa"}]'::jsonb)$$,
                    'no están conciliados', 'C03 un pago inventado no entra al lote');

SELECT expect_error($$SELECT record_payment_batch('fund-1',
                        decode(repeat('11', 32), 'hex'), decode(repeat('22', 32), 'hex'), 10,
                        '2026-08-01', '2026-08-31', '[]'::jsonb)$$,
                    'sin pagos', 'C04 un lote vacío no se registra');

-- ── Registrar el lote ──
SELECT record_payment_batch('fund-1',
         decode(repeat('11', 32), 'hex'), decode(repeat('22', 32), 'hex'), 10,
         '2026-08-01', '2026-08-31',
         jsonb_build_array(
           jsonb_build_object('paymentId', 'rec-dup', 'leafIndex', 0, 'commitment', '\x' || repeat('ab', 32)),
           jsonb_build_object('paymentId', 'rec-dos', 'leafIndex', 1, 'commitment', '\x' || repeat('cd', 32))
         )) AS batch \gset

SELECT ok((SELECT count(*) FROM "PaymentCommitment" WHERE "batchId" = :'batch') = 2,
          'C05 el lote queda con sus dos hojas');
SELECT ok((SELECT status = 'BUILT' AND "txHash" IS NULL FROM "PaymentBatch" WHERE id = :'batch'),
          'C06 el lote nace sin anclar');

-- ── Un pago no entra en dos lotes ──
SELECT expect_error($$SELECT record_payment_batch('fund-1',
                        decode(repeat('11', 32), 'hex'), decode(repeat('33', 32), 'hex'), 10,
                        '2026-08-01', '2026-08-31',
                        jsonb_build_array(jsonb_build_object(
                          'paymentId', 'rec-dup', 'leafIndex', 0, 'commitment', '\x' || repeat('ef', 32))))$$,
                    'ya está en otro lote', 'C07 un pago no entra en dos lotes');

-- ── Una raíz no se registra dos veces ──
SELECT expect_error($$SELECT record_payment_batch('fund-1',
                        decode(repeat('11', 32), 'hex'), decode(repeat('22', 32), 'hex'), 10,
                        '2026-09-01', '2026-09-30',
                        jsonb_build_array(jsonb_build_object(
                          'paymentId', 'rec-dos', 'leafIndex', 0, 'commitment', '\x' || repeat('ef', 32))))$$,
                    'ya se registró', 'C08 la misma raíz no se registra dos veces');

-- ── Anclar ──
SELECT login('00000000-0000-0000-0000-000000000002');  -- aprobador
SELECT expect_error(format($$SELECT anchor_payment_batch(%L, 84532,
                        '0x101eB09d656f2c90f485eEC5Ef2F53A9F51F0f3c', '0x%s')$$, :'batch', repeat('ab', 32)),
                    'No autorizado', 'C09 solo tesorería ancla');
SELECT login('00000000-0000-0000-0000-000000000003');

SELECT anchor_payment_batch(:'batch', 84532,
       '0x101eB09d656f2c90f485eEC5Ef2F53A9F51F0f3c', '0x' || repeat('ab', 32));
SELECT ok((SELECT status = 'ANCHORED' AND "anchoredAt" IS NOT NULL FROM "PaymentBatch" WHERE id = :'batch'),
          'C10 el lote queda anclado');
SELECT expect_error(format($$SELECT anchor_payment_batch(%L, 84532,
                        '0x101eB09d656f2c90f485eEC5Ef2F53A9F51F0f3c', '0x%s')$$, :'batch', repeat('cd', 32)),
                    'ya está anclado', 'C11 no se ancla dos veces');

-- ── Anclado es anclado ──
RESET ROLE;
SELECT expect_error(format($$UPDATE "PaymentBatch" SET root = decode(repeat('99',32),'hex') WHERE id = %L$$, :'batch'),
                    'ya está anclado', 'C12 la raíz anclada no se reescribe');
SELECT expect_error(format($$DELETE FROM "PaymentBatch" WHERE id = %L$$, :'batch'),
                    'ya está anclado', 'C13 un lote anclado no se borra');
SELECT expect_error(format($$DELETE FROM "PaymentCommitment" WHERE "batchId" = %L$$, :'batch'),
                    'no se tocan', 'C14 las hojas de un lote anclado no se borran');
SELECT expect_error(format($$INSERT INTO "PaymentCommitment" ("batchId", "paymentId", "leafIndex", commitment, "treeHeight")
                             VALUES (%L, 'rec-ok', 5, decode(repeat('77',32),'hex'), 10)$$, :'batch'),
                    'no se tocan', 'C15 no se le agregan hojas a un lote anclado');

-- ── Reglas de forma del lote ──
SELECT expect_error($$INSERT INTO "PaymentBatch" ("fundId", subject, root, "treeHeight",
                        "periodStart", "periodEnd", "builtBy")
                      VALUES ('fund-1', decode(repeat('11',32),'hex'), decode('aabb','hex'), 10,
                              '2026-09-01', '2026-09-30', 'p-tes')$$,
                    'check constraint', 'C16 la raíz mide 32 bytes');

SELECT expect_error($$INSERT INTO "PaymentBatch" ("fundId", subject, root, "treeHeight",
                        "periodStart", "periodEnd", "builtBy", status, "txHash")
                      VALUES ('fund-1', decode(repeat('11',32),'hex'), decode(repeat('44',32),'hex'), 10,
                              '2026-09-01', '2026-09-30', 'p-tes', 'ANCHORED', '0xnoesunhash')$$,
                    'check constraint', 'C17 un lote anclado necesita una transacción de verdad');

-- Una hoja no puede caer fuera del árbol que declara el lote
INSERT INTO "PaymentBatch" (id, "fundId", subject, root, "treeHeight", "periodStart", "periodEnd", "builtBy")
VALUES ('batch-chico', 'fund-1', decode(repeat('11',32),'hex'), decode(repeat('55',32),'hex'), 2,
        '2026-09-01', '2026-09-30', 'p-tes');
SELECT expect_error($$INSERT INTO "PaymentCommitment" ("batchId", "paymentId", "leafIndex", commitment, "treeHeight")
                      VALUES ('batch-chico', 'rec-ok', 4, decode(repeat('66',32),'hex'), 2)$$,
                    'check constraint', 'C18 una hoja no cae fuera del árbol');
SELECT expect_error($$INSERT INTO "PaymentCommitment" ("batchId", "paymentId", "leafIndex", commitment, "treeHeight")
                      VALUES ('batch-chico', 'rec-ok', 0, decode(repeat('66',32),'hex'), 10)$$,
                    'foreign key', 'C19 la hoja no puede mentir sobre la altura del árbol');

-- ── Lo que ve el público ──
SET ROLE anon;
SELECT expect_error($$SELECT count(*) FROM "PaymentCommitment"$$,
                    'permission denied', 'C20 el público no ve las hojas del árbol');
SELECT expect_error($$SELECT count(*) FROM "PaymentBatch"$$,
                    'permission denied', 'C21 el público no lee la tabla de lotes');

SELECT ok((SELECT count(*) FROM "PublicAnchoredBatch") = 1,
          'C22 el público ve el lote anclado, no el que sigue sin anclar');
SELECT ok((SELECT root = '0x' || repeat('22', 32) FROM "PublicAnchoredBatch"),
          'C23 la raíz se publica en hexadecimal');
SELECT ok((SELECT "txHash" IS NOT NULL AND "chainId" = 84532 FROM "PublicAnchoredBatch"),
          'C24 se publica dónde verificarla en la cadena');

-- El tamaño del lote no se publica: el árbol se rellena justo para esconderlo
SELECT ok(NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'PublicAnchoredBatch'
              AND column_name IN ('leafCount', 'paymentCount', 'n')),
          'C25 la vista pública no revela cuántos pagos tenía el lote');
RESET ROLE;

-- ── Cruce entre organizaciones ──
SET ROLE authenticated;
SELECT login('00000000-0000-0000-0000-000000000006');  -- org-2
SELECT ok((SELECT count(*) FROM "PaymentBatch") = 0, 'C26 no se ven lotes de otro fondo');
SELECT expect_error($$SELECT record_payment_batch('fund-1',
                        decode(repeat('11', 32), 'hex'), decode(repeat('88', 32), 'hex'), 10,
                        '2026-08-01', '2026-08-31',
                        jsonb_build_array(jsonb_build_object(
                          'paymentId', 'rec-dos', 'leafIndex', 0, 'commitment', '\x' || repeat('ef', 32))))$$,
                    'No autorizado', 'C27 nadie arma lotes de un fondo ajeno');
RESET ROLE;
