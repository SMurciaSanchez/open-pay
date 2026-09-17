\set ON_ERROR_STOP on
-- Pruebas del esquema base y de las RPC de dinero (requiere 10_helpers.sql)

-- Usuarios A, B y C
SET ROLE authenticated;
SELECT login('00000000-0000-0000-0000-00000000000a');
INSERT INTO "Profile" (id, "userId", "fullName", email)
VALUES ('p-a', '00000000-0000-0000-0000-00000000000a', 'Ana', 'ana@example.com');
SELECT expect_error($$INSERT INTO "Profile" ("userId", "fullName", email)
                     VALUES ('00000000-0000-0000-0000-00000000000b', 'Falso', 'falso@example.com')$$,
                    'row-level security', 'B01 no se crea un perfil a nombre de otro');
SELECT ok((SELECT count(*) FROM "Profile") = 1, 'B02 cada quien ve solo su perfil');
SELECT expect_error($$UPDATE "Profile" SET email = 'x@example.com' WHERE id = 'p-a'$$,
                    'permission denied', 'B03 el email no se edita desde el cliente');
UPDATE "Profile" SET phone = '3000000000' WHERE id = 'p-a';
SELECT ok((SELECT phone FROM "Profile" WHERE id = 'p-a') = '3000000000', 'B04 se edita el teléfono propio');

INSERT INTO "Account" ("profileId", balance, number) VALUES ('p-a', 999999, 'ACC-A');
SELECT ok((SELECT balance FROM "Account" WHERE "profileId" = 'p-a') = 0, 'B05 el saldo inicial siempre es 0');
SELECT expect_error($$INSERT INTO "Account" ("profileId", number) VALUES ('p-a', 'ACC-A2')$$,
                    'ya tiene una cuenta', 'B06 una sola cuenta por perfil');
SELECT expect_error($$UPDATE "Account" SET balance = 1000000 WHERE "profileId" = 'p-a'$$,
                    'permission denied', 'B07 el saldo no se edita desde el cliente');

SELECT login('00000000-0000-0000-0000-00000000000c');
INSERT INTO "Profile" (id, "userId", "fullName", email)
VALUES ('p-c', '00000000-0000-0000-0000-00000000000c', 'Caro', 'caro@example.com');

SELECT login('00000000-0000-0000-0000-00000000000b');
INSERT INTO "Profile" (id, "userId", "fullName", email)
VALUES ('p-b', '00000000-0000-0000-0000-00000000000b', 'Beto', 'beto@example.com');
INSERT INTO "Account" ("profileId", number) VALUES ('p-b', 'ACC-B');
SELECT expect_error($$INSERT INTO "Account" ("profileId", number) VALUES ('p-c', 'ACC-X')$$,
                    'row-level security', 'B08 no se crea una cuenta en un perfil ajeno');


-- Saldo de prueba (plataforma)
RESET ROLE;
UPDATE "Account" SET balance = 100 WHERE "profileId" = 'p-a';

SET ROLE authenticated;
SELECT login('00000000-0000-0000-0000-00000000000a');
SELECT ok(find_recipient('  BETO@example.com ') = 'p-b', 'B09 buscar destinatario devuelve solo el id');
SELECT ok(find_recipient('nadie@example.com') IS NULL, 'B10 email inexistente → NULL');
SELECT transfer_funds('p-a', 'p-b', 30, 'Almuerzo', 'idem-1');
SELECT ok((SELECT balance FROM "Account" WHERE "profileId" = 'p-a') = 70, 'B11 la transferencia descuenta');
SELECT ok((transfer_funds('p-a', 'p-b', 30, 'Almuerzo', 'idem-1')->>'status') = 'already_processed',
          'B12 la misma clave de idempotencia no cobra dos veces');
SELECT expect_error($$SELECT transfer_funds('p-a', 'p-b', 1000, 'Mucho', 'idem-2')$$,
                    'Saldo insuficiente', 'B13 no se envía más del saldo');
SELECT expect_error($$SELECT transfer_funds('p-b', 'p-a', 1, 'Robo', 'idem-3')$$,
                    'No autorizado', 'B14 no se envía desde un perfil ajeno');
SELECT expect_error($$INSERT INTO "Transaction" ("senderId", "receiverId", amount) VALUES ('p-b', 'p-a', 5)$$,
                    'permission denied', 'B15 no se crean transacciones sin RPC');
SELECT (pay_to_entity('p-a', 'CO-DIAN', 20, 'Impuesto', 'idem-4'))->>'status' AS pago_entidad;
SELECT ok((SELECT balance FROM "Account" WHERE "profileId" = 'p-a') = 50, 'B16 pago a entidad descuenta');
SELECT ok((SELECT count(*) FROM "Transaction") = 2, 'B17 el remitente ve sus 2 transacciones');
SELECT expect_error($$SELECT * FROM "AuditLog"$$, 'permission denied', 'B18 AuditLog no es legible desde el cliente');

SELECT login('00000000-0000-0000-0000-00000000000b');
SELECT ok((SELECT count(*) FROM "Transaction") = 1, 'B19 el destinatario ve solo la suya');
SELECT ok((SELECT balance FROM "Account" WHERE "profileId" = 'p-b') = 30, 'B20 el destinatario recibe');

SELECT login('00000000-0000-0000-0000-00000000000c');
SELECT ok((SELECT count(*) FROM "Transaction") = 0, 'B21 un tercero no ve transacciones ajenas');
SELECT ok((SELECT count(*) FROM "Account") = 0, 'B22 un tercero no ve cuentas ajenas');
SELECT ok((SELECT count(*) FROM "EntityReceiver") > 0, 'B25 un usuario autenticado ve el directorio de entidades');

SET ROLE anon;
SELECT expect_error($$SELECT find_recipient('ana@example.com')$$, 'permission denied',
                    'B23 anónimo no busca destinatarios');
SELECT expect_error($$SELECT * FROM "Profile"$$, 'permission denied', 'B24 anónimo no lee perfiles');

RESET ROLE;
INSERT INTO "AuditLog" (action, resource) VALUES ('LOGIN', 'auth');
SELECT expect_error($$DELETE FROM "AuditLog"$$, 'solo inserción', 'B26 AuditLog es inmutable');

\echo '=== PRUEBAS BASE PASARON ==='
