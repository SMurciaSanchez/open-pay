 -- Script para poblar la base de datos de Supabase con datos de prueba
-- Ejecutar en el Editor SQL de Supabase (https://garzwhnenhtmpfvfntmk.supabase.co/project/sql)

-- Nota: Este script asume que ya tienes un usuario registrado con el ID correspondiente
-- Reemplaza 'TU-USER-ID' con el ID real de tu usuario (puedes obtenerlo de la tabla auth.users)
-- Ejemplo de cómo obtener tu ID de usuario:
-- SELECT id FROM auth.users WHERE email = 'sebasms777@gmail.com';

-- Variables (reemplaza estos valores con los tuyos)
DO $$
DECLARE
  user_id UUID := '307f4abd-e2b9-4252-b815-6e0fc9826ed1'; -- Tu ID de auth.users
  profile_id UUID;
  second_profile_id UUID;
  account_id UUID;
  savings_account_id UUID;
  other_account_id UUID;
BEGIN

-- 1. Insertar perfiles
INSERT INTO public.profiles (id, user_id, full_name, email, phone, avatar_url)
VALUES 
  (uuid_generate_v4(), user_id, 'Sebastián Murcia', 'sebasms777@gmail.com', '3001234567', 'https://ui-avatars.com/api/?name=Sebastian+Murcia')
RETURNING id INTO profile_id;

INSERT INTO public.profiles (id, full_name, email, phone, avatar_url)
VALUES 
  (uuid_generate_v4(), 'Usuario de Prueba', 'usuario.prueba@openpaycolombia.com', '3009876543', 'https://ui-avatars.com/api/?name=Usuario+Prueba')
RETURNING id INTO second_profile_id;

-- 2. Insertar cuentas
-- Cuenta principal
INSERT INTO public.accounts (id, profile_id, balance, type, number, status)
VALUES 
  (uuid_generate_v4(), profile_id, 1000000.00, 'CHECKING', '1000000001', 'ACTIVE')
RETURNING id INTO account_id;

-- Cuenta de ahorros
INSERT INTO public.accounts (id, profile_id, balance, type, number, status)
VALUES 
  (uuid_generate_v4(), profile_id, 500000.00, 'SAVINGS', '1000000002', 'ACTIVE')
RETURNING id INTO savings_account_id;

-- Cuenta para otro usuario
INSERT INTO public.accounts (id, profile_id, balance, type, number, status)
VALUES 
  (uuid_generate_v4(), second_profile_id, 750000.00, 'CHECKING', '1000000003', 'ACTIVE')
RETURNING id INTO other_account_id;

-- 3. Insertar transacciones
-- Transacción recibida
INSERT INTO public.transactions (sender_id, receiver_id, amount, description, status, type)
VALUES 
  (second_profile_id, profile_id, 150000.00, 'Pago por servicios', 'COMPLETED', 'TRANSFER');

-- Transacción enviada
INSERT INTO public.transactions (sender_id, receiver_id, amount, description, status, type)
VALUES 
  (profile_id, second_profile_id, 50000.00, 'Reembolso parcial', 'COMPLETED', 'TRANSFER');

-- Transacción entre cuentas propias
INSERT INTO public.transactions (sender_id, receiver_id, amount, description, status, type)
VALUES 
  (profile_id, profile_id, 100000.00, 'Transferencia a cuenta de ahorros', 'COMPLETED', 'INTERNAL_TRANSFER');

-- 4. Insertar pagos de servicios
INSERT INTO public.service_payments (profile_id, service_type, provider, bill_number, amount, status, due_date, paid_at)
VALUES 
  (profile_id, 'ELECTRICITY', 'Codensa', 'F-123456789', 87500.00, 'PENDING', NOW() + INTERVAL '10 days', NULL),
  (profile_id, 'WATER', 'Acueducto', 'A-987654321', 65300.00, 'COMPLETED', NOW() - INTERVAL '5 days', NOW() - INTERVAL '3 days'),
  (profile_id, 'INTERNET', 'Claro', 'I-456789123', 125000.00, 'PENDING', NOW() + INTERVAL '15 days', NULL);

-- 5. Insertar registros de auditoría
INSERT INTO public.audit_logs (user_id, action, resource, details, ip_address)
VALUES 
  (user_id, 'LOGIN', 'auth', 'Inicio de sesión exitoso', '127.0.0.1'),
  (user_id, 'CREATE', 'accounts', 'Creación de cuenta corriente', '127.0.0.1'),
  (user_id, 'CREATE', 'accounts', 'Creación de cuenta de ahorros', '127.0.0.1'),
  (user_id, 'TRANSFER', 'transactions', 'Transferencia a otra cuenta', '127.0.0.1'),
  (user_id, 'PAYMENT', 'service_payments', 'Pago de servicio de agua', '127.0.0.1');

-- Mensaje de confirmación
RAISE NOTICE 'Datos de prueba insertados correctamente';
RAISE NOTICE 'ID de tu perfil: %', profile_id;
RAISE NOTICE 'ID de tu cuenta corriente: %', account_id;
RAISE NOTICE 'ID de tu cuenta de ahorros: %', savings_account_id;

END $$;