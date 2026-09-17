-- Supabase mínimo: roles, auth.uid(), Profile
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
GRANT USAGE ON SCHEMA public TO anon, authenticated;
CREATE SCHEMA auth;
GRANT USAGE ON SCHEMA auth TO anon, authenticated;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
$$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
-- Supabase concede todo por defecto en public
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;

CREATE TABLE "Profile" (
  id TEXT PRIMARY KEY,
  "userId" TEXT UNIQUE NOT NULL,
  "fullName" TEXT NOT NULL
);
INSERT INTO "Profile" VALUES
 ('p-conf',  '00000000-0000-0000-0000-000000000001', 'Configurador'),
 ('p-apr',   '00000000-0000-0000-0000-000000000002', 'Aprobador'),
 ('p-tes',   '00000000-0000-0000-0000-000000000003', 'Tesorero'),
 ('p-rep',   '00000000-0000-0000-0000-000000000004', 'Representante'),
 ('p-aud',   '00000000-0000-0000-0000-000000000005', 'Auditor'),
 ('p-otro',  '00000000-0000-0000-0000-000000000006', 'Ajeno');
