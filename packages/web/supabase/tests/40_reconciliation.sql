\set ON_ERROR_STOP on
-- Pruebas de conciliación bancaria. Corren después de 30_mandates.sql, que ya
-- dejó org-1/fund-1 con miembros y pagos, y org-2/p-otro como organización ajena.
\pset footer off

-- Pagos propios de estas pruebas, con fecha de aprobación real (decide_payment
-- siempre aprueba "ahora", y aquí hacen falta aprobaciones anteriores a los
-- movimientos bancarios de agosto). bud-1 quedó en 1.000.000.000.
INSERT INTO "Payment" (id, "fundId", "budgetId", "vendorId", amount, concept, "paidOn",
                       status, "createdBy", "approvedBy", "decidedAt")
VALUES ('rec-ok',    'fund-1', 'bud-1', 'ven-1', 10000000, 'Medicamentos agosto', '2026-08-20',
        'APPROVED', 'p-tes', 'p-apr', '2026-08-05'),
       ('rec-dup',   'fund-1', 'bud-1', 'ven-1', 10000000, 'Otro pago igual',     '2026-08-20',
        'APPROVED', 'p-tes', 'p-apr', '2026-08-05'),
       ('rec-tarde', 'fund-1', 'bud-1', 'ven-1',   900000, 'Aprobado tarde',      '2026-08-21',
        'APPROVED', 'p-tes', 'p-apr', '2026-08-25');

-- ── Cuenta bancaria: solo tesorería ──
SET ROLE authenticated;
SELECT login('00000000-0000-0000-0000-000000000001');  -- configurador
SELECT expect_error($$INSERT INTO "OrgBankAccount" ("organizationId", "bankName", alias, last4, "numberCipher", "keyId")
                      VALUES ('org-1', 'Bancolombia', 'Hack', '1111', '\x00', 'k1')$$,
                    'row-level security', 'R01 el configurador no registra cuentas bancarias');

SELECT login('00000000-0000-0000-0000-000000000003');  -- tesorero
INSERT INTO "OrgBankAccount" (id, "organizationId", "bankName", alias, last4, "numberCipher", "keyId")
VALUES ('ba-1', 'org-1', 'Bancolombia', 'Ahorros fondo salud', '4821', '\xdeadbeef', 'k-org1-v1');

SELECT expect_error($$INSERT INTO "OrgBankAccount" ("organizationId", "bankName", alias, last4, "numberCipher", "keyId")
                      VALUES ('org-1', 'Davivienda', 'Mala', '48', '\x00', 'k1')$$,
                    'check constraint', 'R02 los últimos 4 dígitos son 4 dígitos');

SELECT expect_error($$INSERT INTO "OrgBankAccount" ("organizationId", "bankName", alias, last4, "numberCipher", "keyId")
                      VALUES ('org-2', 'Bancolombia', 'Ajena', '9999', '\x00', 'k1')$$,
                    'row-level security', 'R03 no se registra una cuenta de otra organización');

-- ── Importar un extracto ──
INSERT INTO "BankStatement" (id, "bankAccountId", "organizationId", "periodStart", "periodEnd",
                             "openingBalance", "closingBalance", "fileSha256", "declaredCount", "importedBy")
VALUES ('st-1', 'ba-1', 'org-1', '2026-08-01', '2026-08-31', 50000000, 39100000,
        decode(repeat('a1', 32), 'hex'), 3, 'p-tes');

SELECT expect_error($$INSERT INTO "BankStatement" ("bankAccountId", "organizationId", "periodStart", "periodEnd",
                        "openingBalance", "closingBalance", "fileSha256", "declaredCount", "importedBy")
                      VALUES ('ba-1', 'org-1', '2026-08-15', '2026-09-15', 0, 0,
                              decode(repeat('b2', 32), 'hex'), 0, 'p-tes')$$,
                    'cubre ese período', 'R04 dos extractos de la misma cuenta no se solapan');

SELECT expect_error($$INSERT INTO "BankStatement" ("bankAccountId", "organizationId", "periodStart", "periodEnd",
                        "openingBalance", "closingBalance", "fileSha256", "declaredCount", "importedBy")
                      VALUES ('ba-1', 'org-1', '2026-10-01', '2026-10-31', 0, 0,
                              decode(repeat('a1', 32), 'hex'), 0, 'p-tes')$$,
                    'duplicate key', 'R05 el mismo archivo no se importa dos veces');

SELECT expect_error($$INSERT INTO "BankStatement" ("bankAccountId", "organizationId", "periodStart", "periodEnd",
                        "openingBalance", "closingBalance", "fileSha256", "declaredCount", "importedBy", status)
                      VALUES ('ba-1', 'org-1', '2026-11-01', '2026-11-30', 0, 0,
                              decode(repeat('c3', 32), 'hex'), 0, 'p-tes', 'SEALED')$$,
                    'row-level security', 'R06 un extracto no nace sellado');

-- ── Movimientos ──
INSERT INTO "BankMovement" (id, "statementId", "periodStart", "periodEnd", "postedOn",
                            direction, amount, "bankReference", "descriptionCipher", "keyId")
VALUES ('mv-1', 'st-1', '2026-08-01', '2026-08-31', '2026-08-20', 'DEBIT',  10000000, 'REF-001', '\xcafe', 'k-org1-v1'),
       ('mv-2', 'st-1', '2026-08-01', '2026-08-31', '2026-08-21', 'DEBIT',    900000, 'REF-002', NULL, NULL),
       ('mv-3', 'st-1', '2026-08-01', '2026-08-31', '2026-08-25', 'CREDIT',      0.01, 'REF-003', NULL, NULL);

SELECT expect_error($$INSERT INTO "BankMovement" ("statementId", "periodStart", "periodEnd", "postedOn",
                        direction, amount, "bankReference")
                      VALUES ('st-1', '2026-08-01', '2026-08-31', '2026-09-05', 'DEBIT', 1, 'REF-X')$$,
                    'check constraint', 'R07 un movimiento cae dentro del período del extracto');

SELECT expect_error($$INSERT INTO "BankMovement" ("statementId", "periodStart", "periodEnd", "postedOn",
                        direction, amount, "bankReference")
                      VALUES ('st-1', '2026-08-01', '2026-09-30', '2026-08-20', 'DEBIT', 1, 'REF-Y')$$,
                    'foreign key', 'R08 no se puede mentir sobre el período del extracto');

SELECT expect_error($$INSERT INTO "BankMovement" ("statementId", "periodStart", "periodEnd", "postedOn",
                        direction, amount, "bankReference")
                      VALUES ('st-1', '2026-08-01', '2026-08-31', '2026-08-20', 'DEBIT', 5, 'REF-001')$$,
                    'duplicate key', 'R09 no se repite la referencia del banco dentro del extracto');

-- ── Sellar: tiene que cuadrar ──
SELECT expect_error($$SELECT reconcile_payment('rec-ok', 'mv-1')$$,
                    'no está sellado', 'R10 sin sellar no se concilia');

SELECT expect_error($$SELECT seal_bank_statement('st-1')$$,
                    'no cuadra', 'R11 no se sella un extracto que no cuadra');

-- Un renglón de menos tampoco pasa
DELETE FROM "BankMovement" WHERE id = 'mv-3';
SELECT expect_error($$SELECT seal_bank_statement('st-1')$$,
                    'declara 3 movimientos y tiene 2', 'R12 no se sella si faltan renglones');
INSERT INTO "BankMovement" (id, "statementId", "periodStart", "periodEnd", "postedOn",
                            direction, amount, "bankReference")
VALUES ('mv-3', 'st-1', '2026-08-01', '2026-08-31', '2026-08-25', 'CREDIT', 0.01, 'REF-003');

SELECT login('00000000-0000-0000-0000-000000000002');  -- aprobador
SELECT expect_error($$SELECT seal_bank_statement('st-1')$$,
                    'No autorizado', 'R13 solo tesorería sella');
SELECT login('00000000-0000-0000-0000-000000000003');

-- Se corrige el saldo declarado: 50.000.000 − 10.900.000 + 0,01
UPDATE "BankStatement" SET "closingBalance" = 39100000.01 WHERE id = 'st-1';
SELECT seal_bank_statement('st-1');
SELECT ok((SELECT status = 'SEALED' AND "sealedAt" IS NOT NULL FROM "BankStatement" WHERE id = 'st-1'),
          'R14 el extracto queda sellado cuando cuadra');

SELECT expect_error($$INSERT INTO "BankMovement" ("statementId", "periodStart", "periodEnd", "postedOn",
                        direction, amount, "bankReference")
                      VALUES ('st-1', '2026-08-01', '2026-08-31', '2026-08-28', 'DEBIT', 1, 'REF-TARDE')$$,
                    'ya está sellado', 'R15 a un extracto sellado no se le agregan movimientos');

SELECT expect_error($$UPDATE "BankMovement" SET amount = 1 WHERE id = 'mv-1'$$,
                    'no se modifican', 'R16 los movimientos de un extracto sellado no se editan');
SELECT expect_error($$DELETE FROM "BankMovement" WHERE id = 'mv-2'$$,
                    'no se modifican', 'R17 los movimientos de un extracto sellado no se borran');
SELECT expect_error($$UPDATE "BankStatement" SET "closingBalance" = 0 WHERE id = 'st-1'$$,
                    'no se modifica', 'R18 un extracto sellado no se edita');
SELECT expect_error($$DELETE FROM "BankStatement" WHERE id = 'st-1'$$,
                    'no se borra', 'R19 un extracto sellado no se borra');
SELECT expect_error($$SELECT seal_bank_statement('st-1')$$,
                    'ya está sellado', 'R20 no se sella dos veces');

-- ── Conciliar ──
SELECT expect_error($$SELECT reconcile_payment('rec-ok', 'mv-3')$$,
                    'salida de dinero', 'R21 una entrada de dinero no justifica un pago');
SELECT expect_error($$SELECT reconcile_payment('rec-ok', 'mv-2')$$,
                    'es por', 'R22 el monto del movimiento tiene que ser el del pago');
SELECT expect_error($$SELECT reconcile_payment('pay-rev', 'mv-1')$$,
                    'pago aprobado', 'R23 no se concilia un pago rechazado');
SELECT expect_error($$SELECT reconcile_payment('pay-big2', 'mv-1')$$,
                    'pago aprobado', 'R24 no se concilia un borrador');

SELECT ok(reconcile_payment('rec-ok', 'mv-1') IS NOT NULL, 'R25 se concilia el pago con su movimiento');
SELECT ok((SELECT status = 'RECONCILED' FROM "Payment" WHERE id = 'rec-ok'),
          'R26 el pago queda conciliado');
SELECT expect_error($$SELECT reconcile_payment('rec-ok', 'mv-1')$$,
                    'pago aprobado', 'R27 un pago conciliado no se vuelve a conciliar');
SELECT expect_error($$SELECT reconcile_payment('rec-dup', 'mv-1')$$,
                    'ya está conciliado', 'R28 un mismo movimiento no justifica dos pagos');

-- La plata no puede haber salido antes de la aprobación
SELECT expect_error($$SELECT reconcile_payment('rec-tarde', 'mv-2')$$,
                    'se aprobó el', 'R29 el dinero no sale antes de que se apruebe el pago');

-- ── Cruce entre organizaciones ──
SELECT login('00000000-0000-0000-0000-000000000006');  -- org-2
SELECT ok((SELECT count(*) FROM "BankStatement") = 0, 'R30 no se ven extractos de otra organización');
SELECT ok((SELECT count(*) FROM "BankMovement") = 0,  'R31 no se ven movimientos de otra organización');
SELECT ok((SELECT count(*) FROM "PaymentReconciliation") = 0, 'R32 no se ven conciliaciones ajenas');
SELECT expect_error($$SELECT reconcile_payment('rec-dup', 'mv-1')$$,
                    'No autorizado', 'R33 nadie concilia pagos de otra organización');

-- ── Revocar una conciliación ──
SELECT login('00000000-0000-0000-0000-000000000003');
SELECT expect_error($$SELECT unreconcile_payment(
                        (SELECT id FROM "PaymentReconciliation" WHERE "paymentId" = 'rec-ok'), 'corto')$$,
                    'mínimo 10 caracteres', 'R34 revocar exige un motivo');

SELECT unreconcile_payment((SELECT id FROM "PaymentReconciliation" WHERE "paymentId" = 'rec-ok'),
                           'El movimiento correspondía a otro contrato');
SELECT ok((SELECT status = 'APPROVED' FROM "Payment" WHERE id = 'rec-ok'),
          'R35 al revocar, el pago vuelve a aprobado');
SELECT ok((SELECT "revokedBy" = 'p-tes' AND "revokedAt" IS NOT NULL
           FROM "PaymentReconciliation" WHERE "paymentId" = 'rec-ok'),
          'R36 queda registrado quién revocó');

SELECT expect_error($$DELETE FROM "PaymentReconciliation" WHERE "paymentId" = 'rec-ok'$$,
                    'permission denied', 'R37 el cliente no tiene con qué borrar una conciliación');
SELECT expect_error($$UPDATE "PaymentReconciliation" SET "revokeReason" = 'otra cosa distinta'
                      WHERE "paymentId" = 'rec-ok'$$,
                    'permission denied', 'R37b ni con qué editarla');

-- Liberado el movimiento, ahora sí lo puede usar el otro pago
SELECT ok(reconcile_payment('rec-dup', 'mv-1') IS NOT NULL,
          'R38 revocada la conciliación, el movimiento queda libre');
SELECT ok((SELECT count(*) FROM "PaymentReconciliation" WHERE "movementId" = 'mv-1') = 2,
          'R39 la conciliación revocada queda como historia');

-- ── Lo que ve el público ──
RESET ROLE;
-- Ni siquiera el dueño de la base borra o reescribe una conciliación:
-- el privilegio frena al cliente, el trigger frena a todos los demás.
SELECT expect_error($$DELETE FROM "PaymentReconciliation" WHERE "paymentId" = 'rec-ok'$$,
                    'no se borra', 'R39b el trigger frena incluso al dueño de la base');
SELECT expect_error($$UPDATE "PaymentReconciliation" SET "revokeReason" = 'reescrito a mano'
                      WHERE "paymentId" = 'rec-ok'$$,
                    'revocada no se modifica', 'R39c una conciliación revocada no se reescribe');

-- Julio 2026: solo 3 pagos en el mes → por debajo de k = 10
INSERT INTO "Payment" ("fundId", "budgetId", "vendorId", amount, concept, "paidOn",
                       status, "createdBy", "approvedBy", "decidedAt")
SELECT 'fund-1', 'bud-1', 'ven-1', 1000, 'Julio ' || g, '2026-07-10',
       'APPROVED', 'p-tes', 'p-apr', '2026-07-01'
FROM generate_series(1, 3) g;

SET ROLE anon;
SELECT expect_error($$SELECT count(*) FROM "BankStatement"$$,
                    'permission denied', 'R40 el público no lee extractos');
SELECT expect_error($$SELECT count(*) FROM "BankMovement"$$,
                    'permission denied', 'R41 el público no lee movimientos');
SELECT expect_error($$SELECT count(*) FROM "PaymentReconciliation"$$,
                    'permission denied', 'R41b el público no lee conciliaciones');
SELECT expect_error($$SELECT count(*) FROM "OrgBankAccount"$$,
                    'permission denied', 'R41c el público no lee cuentas bancarias');
SELECT ok((SELECT "reconciledPercent" FROM "PublicReconciliationStatus"
           WHERE "fundId" = 'fund-1' AND month = '2026-07-01') IS NULL,
          'R42 mes con menos de 10 pagos: porcentaje suprimido');
SELECT ok((SELECT "reconciledPercent" FROM "PublicReconciliationStatus"
           WHERE "fundId" = 'fund-1' AND month = '2026-08-01') IS NOT NULL,
          'R43 mes con k >= 10: se publica el porcentaje conciliado');
SELECT ok((SELECT "reconciledPercent" BETWEEN 0 AND 100 FROM "PublicReconciliationStatus"
           WHERE "fundId" = 'fund-1' AND month = '2026-08-01'),
          'R44 el porcentaje es un porcentaje');
SELECT ok((SELECT count(*) FROM "PublicReconciliationStatus"
           WHERE month >= date_trunc('month', NOW())::date) = 0,
          'R45 el mes en curso no se publica');
RESET ROLE;
