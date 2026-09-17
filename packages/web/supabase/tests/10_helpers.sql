-- Utilidades de prueba y perfiles de ejemplo (se cargan después de las migraciones)

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

-- Simula la sesión de un usuario autenticado
CREATE FUNCTION login(p_uid TEXT) RETURNS VOID LANGUAGE sql AS $$
  SELECT set_config('request.jwt.claim.sub', p_uid, false),
         set_config('request.jwt.claim.role', 'authenticated', false)
$$;

INSERT INTO "Profile" (id, "userId", "fullName", email) VALUES
 ('p-conf', '00000000-0000-0000-0000-000000000001', 'Configurador',  'conf@example.com'),
 ('p-apr',  '00000000-0000-0000-0000-000000000002', 'Aprobador',     'apr@example.com'),
 ('p-tes',  '00000000-0000-0000-0000-000000000003', 'Tesorero',      'tes@example.com'),
 ('p-rep',  '00000000-0000-0000-0000-000000000004', 'Representante', 'rep@example.com'),
 ('p-aud',  '00000000-0000-0000-0000-000000000005', 'Auditor',       'aud@example.com'),
 ('p-otro', '00000000-0000-0000-0000-000000000006', 'Ajeno',         'otro@example.com');
