-- ============================================================
--  P2 — Row Level Security (RLS)
--  Ejecutar en: Supabase Dashboard → SQL Editor
--  O via: node -e "..." --input-type=module
-- ============================================================

-- ── 1. Habilitar RLS en todas las tablas públicas ───────────
ALTER TABLE "Profile"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Account"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Transaction"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ServicePayment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog"       ENABLE ROW LEVEL SECURITY;

-- ── 2. Profile ───────────────────────────────────────────────
-- Cada usuario solo ve/modifica su propio perfil
CREATE POLICY "profile_select_own"
  ON "Profile" FOR SELECT
  USING (auth.uid()::text = "userId");

CREATE POLICY "profile_insert_own"
  ON "Profile" FOR INSERT
  WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "profile_update_own"
  ON "Profile" FOR UPDATE
  USING (auth.uid()::text = "userId")
  WITH CHECK (auth.uid()::text = "userId");

-- ── 3. Account ───────────────────────────────────────────────
-- Solo cuentas que pertenecen al perfil del usuario autenticado
CREATE POLICY "account_select_own"
  ON "Account" FOR SELECT
  USING (
    "profileId" IN (
      SELECT id FROM "Profile" WHERE "userId" = auth.uid()::text
    )
  );

-- INSERT permitido solo para la cuenta propia (creación inicial)
CREATE POLICY "account_insert_own"
  ON "Account" FOR INSERT
  WITH CHECK (
    "profileId" IN (
      SELECT id FROM "Profile" WHERE "userId" = auth.uid()::text
    )
  );

-- UPDATE/DELETE bloqueados: solo transfer_funds (SECURITY DEFINER) puede modificar saldos

-- ── 4. Transaction ───────────────────────────────────────────
-- El usuario puede ver transacciones donde es remitente O destinatario
CREATE POLICY "transaction_select_own"
  ON "Transaction" FOR SELECT
  USING (
    "senderId"   IN (SELECT id FROM "Profile" WHERE "userId" = auth.uid()::text)
    OR
    "receiverId" IN (SELECT id FROM "Profile" WHERE "userId" = auth.uid()::text)
  );

-- INSERT/UPDATE/DELETE solo vía transfer_funds (SECURITY DEFINER) — bloqueado directo

-- ── 5. ServicePayment ────────────────────────────────────────
CREATE POLICY "servicepayment_select_own"
  ON "ServicePayment" FOR SELECT
  USING (
    "profileId" IN (
      SELECT id FROM "Profile" WHERE "userId" = auth.uid()::text
    )
  );

CREATE POLICY "servicepayment_insert_own"
  ON "ServicePayment" FOR INSERT
  WITH CHECK (
    "profileId" IN (
      SELECT id FROM "Profile" WHERE "userId" = auth.uid()::text
    )
  );

-- ── 6. AuditLog ──────────────────────────────────────────────
-- Sin políticas = nadie (ni authenticated) puede acceder directamente
-- Solo el service_role (backend) puede escribir/leer auditoría

-- ── 7. Grants para los roles de Supabase ─────────────────────
-- Las tablas creadas con Prisma no tienen grants por defecto.
-- Sin GRANT, RLS no puede hacer su trabajo (da permission denied antes de evaluar políticas).

-- Acceso al schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Profile: authenticated puede leer/crear/editar su perfil
GRANT SELECT, INSERT, UPDATE ON "Profile" TO authenticated;

-- Account: authenticated puede leer e insertar (solo transfer_funds hace UPDATE)
GRANT SELECT, INSERT ON "Account" TO authenticated;

-- Transaction: authenticated puede leer (solo transfer_funds hace INSERT)
GRANT SELECT ON "Transaction" TO authenticated;

-- ServicePayment: authenticated puede leer e insertar sus propios pagos
GRANT SELECT, INSERT ON "ServicePayment" TO authenticated;

-- AuditLog: sin grants para authenticated — solo service_role

-- transfer_funds: solo usuarios autenticados pueden llamar la función
GRANT EXECUTE ON FUNCTION transfer_funds(TEXT, TEXT, DECIMAL, TEXT, TEXT) TO authenticated;
