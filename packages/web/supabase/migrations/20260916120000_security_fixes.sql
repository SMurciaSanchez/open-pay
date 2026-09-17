-- ============================================================
-- Correcciones de seguridad — 2026-09-16
--  1. transfer_funds y pay_to_entity: validar que el remitente sea el usuario autenticado
--  2. Permisos de ejecución: solo usuarios autenticados
--  3. Account: impedir que un cliente cree cuentas con saldo inventado
--  4. Account: índice único (un perfil = una cuenta CHECKING)
-- Ejecutar completo en Supabase Dashboard → SQL Editor
--
-- Correcciones sobre la versión original (revisión 2026-09-16):
--  - Se borran TODAS las versiones previas de las funciones antes de crearlas.
--    La versión en la nube usa p_sender_email/p_receiver_email con los mismos
--    tipos; CREATE OR REPLACE falla al cambiar nombres de parámetros (42P13) y,
--    con otra firma, dejaría una sobrecarga vieja sin validar auth.uid().
--  - Variables con prefijo l_ en vez de v_ (bug del SQL Editor, ERROR 42P01).
--  - SET search_path = public en todas las funciones SECURITY DEFINER.
--  - Pasos 0-3 en una transacción: si algo falla, no queda nada a medias.
-- ============================================================

BEGIN;

-- ── 0. Eliminar versiones previas (cualquier firma) ──────────
DO $drop$
DECLARE
  l_sig TEXT;
BEGIN
  FOR l_sig IN
    SELECT p.oid::regprocedure::text
    FROM pg_proc p
    WHERE p.proname IN ('transfer_funds', 'pay_to_entity')
      AND p.pronamespace = 'public'::regnamespace
  LOOP
    EXECUTE 'DROP FUNCTION ' || l_sig;
  END LOOP;
END
$drop$;

-- ── 1a. transfer_funds ───────────────────────────────────────
-- Función atómica para transferencias entre usuarios
-- Ejecutar en: Supabase Dashboard → SQL Editor

-- CAMBIOS RESPECTO A VERSION ANTERIOR:
--   - Firma cambiada a p_sender_id / p_receiver_id (UUID de Profile, no emails)
--     Los emails son mutables; los UUIDs son la clave primaria inmutable.
--   - Bloqueo de AMBAS cuentas al inicio, en orden determinístico (UUID menor primero)
--     Esto elimina el riesgo de deadlock en transferencias A→B y B→A simultáneas.

CREATE OR REPLACE FUNCTION transfer_funds(
  p_sender_id       TEXT,      -- Profile.id del remitente (UUID inmutable)
  p_receiver_id     TEXT,      -- Profile.id del destinatario (UUID inmutable)
  p_amount          DECIMAL,
  p_description     TEXT,
  p_idempotency_key TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  l_sender_account_id   TEXT;
  l_receiver_account_id TEXT;
  l_balance             DECIMAL;
  l_tx_id               TEXT;
  l_first_id            TEXT;
  l_second_id           TEXT;
BEGIN
  -- [FIX 2026-09-16] Solo el dueño del perfil puede enviar desde él
  IF NOT EXISTS (
    SELECT 1 FROM "Profile"
    WHERE id = p_sender_id AND "userId" = auth.uid()::text
  ) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  -- Validaciones de entrada antes de tocar la base de datos
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'El monto debe ser mayor a 0';
  END IF;

  IF p_sender_id = p_receiver_id THEN
    RAISE EXCEPTION 'No puedes enviarte dinero a ti mismo';
  END IF;

  -- 1. Idempotencia: si ya se procesó, retornar resultado existente
  SELECT id INTO l_tx_id
  FROM "Transaction"
  WHERE "idempotencyKey" = p_idempotency_key
  LIMIT 1;

  IF l_tx_id IS NOT NULL THEN
    RETURN json_build_object('id', l_tx_id, 'status', 'already_processed');
  END IF;

  -- 2. Verificar que ambos perfiles existen ANTES de bloquear
  IF NOT EXISTS (SELECT 1 FROM "Profile" WHERE id = p_sender_id) THEN
    RAISE EXCEPTION 'Remitente no encontrado';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM "Profile" WHERE id = p_receiver_id) THEN
    RAISE EXCEPTION 'Destinatario no encontrado';
  END IF;

  -- 3. DEADLOCK PREVENTION: bloquear ambas cuentas en orden determinístico.
  --    Siempre se bloquea primero el UUID lexicográficamente menor.
  --    Si A→B y B→A ocurren al mismo tiempo, ambas transacciones piden
  --    el mismo lock primero → una espera a la otra en vez de deadlock.
  IF p_sender_id < p_receiver_id THEN
    l_first_id  := p_sender_id;
    l_second_id := p_receiver_id;
  ELSE
    l_first_id  := p_receiver_id;
    l_second_id := p_sender_id;
  END IF;

  -- Bloquear primera cuenta (orden determinístico)
  PERFORM id FROM "Account"
  WHERE "profileId" = l_first_id
    AND type = 'CHECKING'
    AND status = 'ACTIVE'
  FOR UPDATE;

  -- Bloquear segunda cuenta (orden determinístico)
  PERFORM id FROM "Account"
  WHERE "profileId" = l_second_id
    AND type = 'CHECKING'
    AND status = 'ACTIVE'
  FOR UPDATE;

  -- 4. Leer saldo del remitente (el lock ya está tomado)
  SELECT id, balance INTO l_sender_account_id, l_balance
  FROM "Account"
  WHERE "profileId" = p_sender_id
    AND type = 'CHECKING'
    AND status = 'ACTIVE';

  IF l_sender_account_id IS NULL THEN
    RAISE EXCEPTION 'El remitente no tiene cuenta activa';
  END IF;

  -- 5. Leer cuenta del destinatario (el lock ya está tomado)
  SELECT id INTO l_receiver_account_id
  FROM "Account"
  WHERE "profileId" = p_receiver_id
    AND type = 'CHECKING'
    AND status = 'ACTIVE';

  IF l_receiver_account_id IS NULL THEN
    RAISE EXCEPTION 'El destinatario no tiene cuenta activa';
  END IF;

  -- 6. Verificar saldo suficiente
  IF l_balance < p_amount THEN
    RAISE EXCEPTION 'Saldo insuficiente: disponible $%, solicitado $%', l_balance, p_amount;
  END IF;

  -- 7. Descontar del remitente
  UPDATE "Account"
  SET balance = balance - p_amount,
      "updatedAt" = NOW()
  WHERE id = l_sender_account_id;

  -- 8. Sumar al destinatario
  UPDATE "Account"
  SET balance = balance + p_amount,
      "updatedAt" = NOW()
  WHERE id = l_receiver_account_id;

  -- 9. Registrar transacción con clave de idempotencia
  INSERT INTO "Transaction" (
    id, "senderId", "receiverId", amount, description,
    status, type, "idempotencyKey", "createdAt", "updatedAt"
  )
  VALUES (
    gen_random_uuid()::text,
    p_sender_id,
    p_receiver_id,
    p_amount,
    p_description,
    'COMPLETED',
    'TRANSFER',
    p_idempotency_key,
    NOW(),
    NOW()
  )
  RETURNING id INTO l_tx_id;

  RETURN json_build_object('id', l_tx_id, 'status', 'completed', 'amount', p_amount);

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION '%', SQLERRM;
END;
$$;

-- ── 1b. pay_to_entity ────────────────────────────────────────
-- Fase 4a: pagos a entidades externas (DIAN, ICBF, EPM, etc.)
-- Análoga a transfer_funds pero el receptor es un EntityReceiver, no un Profile.
-- Solo se descuenta del sender; no hay contraparte que reciba el saldo porque
-- la entidad recibe el pago vía rieles externos (en MVP, la transferencia al
-- banco de la entidad ocurre off-chain; el anclaje blockchain es solo prueba).
--
-- NOTA: se evita deliberadamente el prefijo v_* en variables. El SQL Editor de
-- Supabase tiene un bug de parseo donde, dentro de funciones con dollar-quoted
-- bodies, identificadores tipo v_foo se interpretan como relaciones inexistentes
-- y tira ERROR 42P01. Usamos prefijo l_ ("local") en vez de v_.

CREATE OR REPLACE FUNCTION pay_to_entity(
  p_sender_id        TEXT,
  p_entity_code      TEXT,
  p_amount           DECIMAL,
  p_description      TEXT,
  p_idempotency_key  TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  l_entity_id          TEXT;
  l_entity_is_active   BOOLEAN;
  l_entity_is_verified BOOLEAN;
  l_sender_account_id  TEXT;
  l_balance            DECIMAL;
  l_tx_id              TEXT;
BEGIN
  -- [FIX 2026-09-16] Solo el dueño del perfil puede enviar desde él
  IF NOT EXISTS (
    SELECT 1 FROM "Profile"
    WHERE id = p_sender_id AND "userId" = auth.uid()::text
  ) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'El monto debe ser mayor a 0';
  END IF;

  IF p_entity_code IS NULL OR length(trim(p_entity_code)) = 0 THEN
    RAISE EXCEPTION 'Código de entidad requerido';
  END IF;

  -- 1. Idempotencia
  SELECT id INTO l_tx_id
  FROM "Transaction"
  WHERE "idempotencyKey" = p_idempotency_key
  LIMIT 1;

  IF l_tx_id IS NOT NULL THEN
    RETURN json_build_object('id', l_tx_id, 'status', 'already_processed');
  END IF;

  -- 2. Buscar entidad por código estable
  SELECT id, "isActive", "isVerified"
    INTO l_entity_id, l_entity_is_active, l_entity_is_verified
  FROM "EntityReceiver"
  WHERE "entityCode" = p_entity_code;

  IF l_entity_id IS NULL THEN
    RAISE EXCEPTION 'Entidad % no encontrada', p_entity_code;
  END IF;

  IF NOT l_entity_is_active OR NOT l_entity_is_verified THEN
    RAISE EXCEPTION 'La entidad % no acepta pagos en este momento', p_entity_code;
  END IF;

  -- 3. Verificar perfil del remitente
  IF NOT EXISTS (SELECT 1 FROM "Profile" WHERE id = p_sender_id) THEN
    RAISE EXCEPTION 'Remitente no encontrado';
  END IF;

  -- 4. Lock de cuenta del remitente (único lock, no hay riesgo de deadlock)
  PERFORM id FROM "Account"
  WHERE "profileId" = p_sender_id
    AND type = 'CHECKING'
    AND status = 'ACTIVE'
  FOR UPDATE;

  SELECT id, balance INTO l_sender_account_id, l_balance
  FROM "Account"
  WHERE "profileId" = p_sender_id
    AND type = 'CHECKING'
    AND status = 'ACTIVE';

  IF l_sender_account_id IS NULL THEN
    RAISE EXCEPTION 'El remitente no tiene cuenta activa';
  END IF;

  IF l_balance < p_amount THEN
    RAISE EXCEPTION 'Saldo insuficiente: disponible $%, solicitado $%', l_balance, p_amount;
  END IF;

  -- 5. Descontar del remitente
  UPDATE "Account"
  SET balance = balance - p_amount,
      "updatedAt" = NOW()
  WHERE id = l_sender_account_id;

  -- 6. Registrar Transaction tipo ENTITY_PAYMENT con onChainStatus=PENDING
  INSERT INTO "Transaction" (
    id, "senderId", "receiverId", "entityReceiverId", "isEntityPayment",
    amount, description, status, type, "idempotencyKey",
    "onChainStatus", "createdAt", "updatedAt"
  )
  VALUES (
    gen_random_uuid()::text,
    p_sender_id,
    NULL,
    l_entity_id,
    TRUE,
    p_amount,
    p_description,
    'COMPLETED',
    'ENTITY_PAYMENT',
    p_idempotency_key,
    'PENDING',
    NOW(),
    NOW()
  )
  RETURNING id INTO l_tx_id;

  RETURN json_build_object(
    'id',          l_tx_id,
    'status',      'completed',
    'amount',      p_amount,
    'entityId',    l_entity_id,
    'entityCode',  p_entity_code
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION '%', SQLERRM;
END;
$func$;


-- ── 2. Permisos de ejecución ─────────────────────────────────
REVOKE EXECUTE ON FUNCTION transfer_funds(TEXT, TEXT, DECIMAL, TEXT, TEXT) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION transfer_funds(TEXT, TEXT, DECIMAL, TEXT, TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION pay_to_entity(TEXT, TEXT, DECIMAL, TEXT, TEXT) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION pay_to_entity(TEXT, TEXT, DECIMAL, TEXT, TEXT) TO authenticated;

-- ── 3. Account: forzar valores seguros al crear desde el cliente ──
-- El frontend (web y móvil) sigue insertando la cuenta, pero el trigger
-- ignora el saldo que venga del cliente y evita cuentas duplicadas.
CREATE OR REPLACE FUNCTION enforce_safe_account_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- El backend (service_role) y el SQL Editor pueden sembrar datos libremente
  IF auth.role() IS NULL OR auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  NEW.balance := 0;
  NEW.status  := 'ACTIVE';
  NEW.type    := 'CHECKING';

  IF EXISTS (
    SELECT 1 FROM "Account"
    WHERE "profileId" = NEW."profileId" AND type = 'CHECKING'
  ) THEN
    RAISE EXCEPTION 'El perfil ya tiene una cuenta';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_account_safe_insert ON "Account";
CREATE TRIGGER tr_account_safe_insert
  BEFORE INSERT ON "Account"
  FOR EACH ROW EXECUTE FUNCTION enforce_safe_account_insert();

COMMIT;

-- ── 4. Índice único: un perfil = una cuenta CHECKING ─────────
-- El chequeo del trigger no es seguro ante inserciones simultáneas; el índice sí.
-- Va fuera de la transacción: si hay duplicados, falla solo este paso.
-- Revisar duplicados antes:
--   SELECT "profileId", COUNT(*) FROM "Account"
--   WHERE type = 'CHECKING' GROUP BY 1 HAVING COUNT(*) > 1;
CREATE UNIQUE INDEX IF NOT EXISTS account_one_checking_per_profile
  ON "Account" ("profileId")
  WHERE type = 'CHECKING';

-- ── Verificación rápida (opcional) ───────────────────────────
-- SELECT proname, prosrc LIKE '%auth.uid()%' AS tiene_check
-- FROM pg_proc WHERE proname IN ('transfer_funds','pay_to_entity');
-- Debe devolver exactamente 2 filas, ambas con tiene_check = true.
