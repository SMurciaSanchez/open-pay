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
AS $func$
DECLARE
  l_entity_id          TEXT;
  l_entity_is_active   BOOLEAN;
  l_entity_is_verified BOOLEAN;
  l_sender_account_id  TEXT;
  l_balance            DECIMAL;
  l_tx_id              TEXT;
BEGIN
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

GRANT EXECUTE ON FUNCTION pay_to_entity(TEXT, TEXT, DECIMAL, TEXT, TEXT) TO authenticated;
