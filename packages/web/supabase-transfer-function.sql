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
AS $$
DECLARE
  v_sender_account_id   TEXT;
  v_receiver_account_id TEXT;
  v_balance             DECIMAL;
  v_tx_id               TEXT;
  v_first_id            TEXT;
  v_second_id           TEXT;
BEGIN
  -- Validaciones de entrada antes de tocar la base de datos
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'El monto debe ser mayor a 0';
  END IF;

  IF p_sender_id = p_receiver_id THEN
    RAISE EXCEPTION 'No puedes enviarte dinero a ti mismo';
  END IF;

  -- 1. Idempotencia: si ya se procesó, retornar resultado existente
  SELECT id INTO v_tx_id
  FROM "Transaction"
  WHERE "idempotencyKey" = p_idempotency_key
  LIMIT 1;

  IF v_tx_id IS NOT NULL THEN
    RETURN json_build_object('id', v_tx_id, 'status', 'already_processed');
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
    v_first_id  := p_sender_id;
    v_second_id := p_receiver_id;
  ELSE
    v_first_id  := p_receiver_id;
    v_second_id := p_sender_id;
  END IF;

  -- Bloquear primera cuenta (orden determinístico)
  PERFORM id FROM "Account"
  WHERE "profileId" = v_first_id
    AND type = 'CHECKING'
    AND status = 'ACTIVE'
  FOR UPDATE;

  -- Bloquear segunda cuenta (orden determinístico)
  PERFORM id FROM "Account"
  WHERE "profileId" = v_second_id
    AND type = 'CHECKING'
    AND status = 'ACTIVE'
  FOR UPDATE;

  -- 4. Leer saldo del remitente (el lock ya está tomado)
  SELECT id, balance INTO v_sender_account_id, v_balance
  FROM "Account"
  WHERE "profileId" = p_sender_id
    AND type = 'CHECKING'
    AND status = 'ACTIVE';

  IF v_sender_account_id IS NULL THEN
    RAISE EXCEPTION 'El remitente no tiene cuenta activa';
  END IF;

  -- 5. Leer cuenta del destinatario (el lock ya está tomado)
  SELECT id INTO v_receiver_account_id
  FROM "Account"
  WHERE "profileId" = p_receiver_id
    AND type = 'CHECKING'
    AND status = 'ACTIVE';

  IF v_receiver_account_id IS NULL THEN
    RAISE EXCEPTION 'El destinatario no tiene cuenta activa';
  END IF;

  -- 6. Verificar saldo suficiente
  IF v_balance < p_amount THEN
    RAISE EXCEPTION 'Saldo insuficiente: disponible $%, solicitado $%', v_balance, p_amount;
  END IF;

  -- 7. Descontar del remitente
  UPDATE "Account"
  SET balance = balance - p_amount,
      "updatedAt" = NOW()
  WHERE id = v_sender_account_id;

  -- 8. Sumar al destinatario
  UPDATE "Account"
  SET balance = balance + p_amount,
      "updatedAt" = NOW()
  WHERE id = v_receiver_account_id;

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
  RETURNING id INTO v_tx_id;

  RETURN json_build_object('id', v_tx_id, 'status', 'completed', 'amount', p_amount);

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION '%', SQLERRM;
END;
$$;
