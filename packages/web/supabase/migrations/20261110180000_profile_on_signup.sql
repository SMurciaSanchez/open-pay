-- ============================================================
-- OpenPay — El perfil se crea al confirmar el correo
--
-- Hasta ahora el perfil lo creaba el navegador en el primer inicio de sesión
-- (ensureProfile). Quien se registraba y confirmaba su correo pero todavía no
-- había entrado no tenía perfil, y add_org_member no lo encontraba: no se le
-- podía sumar a un equipo.
--
-- Ahora lo crea la base en cuanto auth.users marca el correo como confirmado.
-- Se espera a la confirmación a propósito: así nadie queda "invitable" con un
-- correo que no demostró que es suyo.
--
-- El navegador sigue llamando a ensureProfile; ya no encuentra nada que crear.
--
-- Se puede aplicar más de una vez.
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION create_profile_for_confirmed_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NULL OR NEW.email_confirmed_at IS NULL THEN
    RETURN NEW;
  END IF;

  BEGIN
    INSERT INTO "Profile" ("userId", "fullName", email)
    VALUES (
      NEW.id::text,
      coalesce(nullif(trim(NEW.raw_user_meta_data->>'full_name'), ''), split_part(NEW.email, '@', 1), 'Usuario'),
      NEW.email
    )
    -- Ya tiene perfil, o ese correo ya es de otro perfil: no se toca nada.
    ON CONFLICT DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- Un fallo aquí no puede impedir que alguien se registre o confirme su
    -- correo: el perfil se crearía igual en su primer inicio de sesión.
    RAISE WARNING 'No se pudo crear el perfil de %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION create_profile_for_confirmed_user() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS profile_on_confirmed_user ON auth.users;
CREATE TRIGGER profile_on_confirmed_user
  AFTER INSERT OR UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_profile_for_confirmed_user();

-- Quienes ya confirmaron su correo y nunca entraron.
INSERT INTO "Profile" ("userId", "fullName", email)
SELECT u.id::text,
       coalesce(nullif(trim(u.raw_user_meta_data->>'full_name'), ''), split_part(u.email, '@', 1), 'Usuario'),
       u.email
FROM auth.users u
WHERE u.email IS NOT NULL AND u.email_confirmed_at IS NOT NULL
ON CONFLICT DO NOTHING;

COMMIT;
