\set ON_ERROR_STOP on
-- Pruebas de la migración 20261110180000_profile_on_signup.sql.
-- Corren después de 80_anchor_limits.sql.
--
-- Antes el perfil se creaba en el primer inicio de sesión, desde el navegador.
-- Quien se registraba y confirmaba su correo pero todavía no había entrado no
-- tenía perfil, y el representante legal no podía sumarlo al equipo.
-- Ahora lo crea la base en cuanto el correo queda confirmado.
\pset footer off

-- ════════════════ El perfil nace con el correo confirmado ════════════════

INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES ('00000000-0000-0000-0000-0000000000a1', 'nueva@example.com', '{"full_name": "Persona Nueva"}');
SELECT ok(NOT EXISTS (SELECT 1 FROM "Profile" WHERE email = 'nueva@example.com'),
          'S01 sin confirmar el correo todavía no hay perfil');

UPDATE auth.users SET email_confirmed_at = NOW() WHERE id = '00000000-0000-0000-0000-0000000000a1';
SELECT ok((SELECT "fullName" = 'Persona Nueva' AND "userId" = '00000000-0000-0000-0000-0000000000a1'
           FROM "Profile" WHERE email = 'nueva@example.com'),
          'S02 al confirmar el correo se crea el perfil, con su nombre');

UPDATE auth.users SET email_confirmed_at = NOW() WHERE id = '00000000-0000-0000-0000-0000000000a1';
SELECT ok((SELECT count(*) FROM "Profile" WHERE email = 'nueva@example.com') = 1,
          'S03 confirmar otra vez no duplica el perfil');

-- Registro que ya llega confirmado (p. ej. confirmación desactivada) y sin nombre.
INSERT INTO auth.users (id, email, email_confirmed_at)
VALUES ('00000000-0000-0000-0000-0000000000a2', 'Sin.Nombre@Example.com', NOW());
SELECT ok((SELECT "fullName" = 'Sin.Nombre' FROM "Profile"
           WHERE "userId" = '00000000-0000-0000-0000-0000000000a2'),
          'S04 sin nombre en el registro se usa la parte del correo antes de la arroba');

-- ════════════════ Lo que esto arregla ════════════════

SET ROLE authenticated;
SELECT login('00000000-0000-0000-0000-000000000004');  -- p-rep, representante legal de org-1
SELECT ok(add_org_member('org-1', 'nueva@example.com', 'APPROVER') IS NOT NULL,
          'S05 se puede sumar al equipo a quien se registró y nunca ha iniciado sesión');
RESET ROLE;

-- ════════════════ Nunca tumba un registro ════════════════

-- Otra cuenta con un correo que ya tiene perfil: el registro sigue, sin segundo perfil.
INSERT INTO auth.users (id, email, email_confirmed_at)
VALUES ('00000000-0000-0000-0000-0000000000a3', 'conf@example.com', NOW());
SELECT ok((SELECT count(*) FROM "Profile" WHERE email = 'conf@example.com') = 1
          AND EXISTS (SELECT 1 FROM auth.users WHERE id = '00000000-0000-0000-0000-0000000000a3'),
          'S06 un correo que ya tiene perfil no rompe el registro ni crea otro perfil');

-- Quien ya tenía perfil y vuelve a confirmar (cambio de correo, p. ej.) queda igual.
INSERT INTO auth.users (id, email, email_confirmed_at)
VALUES ('00000000-0000-0000-0000-000000000003', 'tes@example.com', NOW());
SELECT ok((SELECT count(*) FROM "Profile" WHERE "userId" = '00000000-0000-0000-0000-000000000003') = 1,
          'S07 quien ya tenía perfil no recibe otro');
