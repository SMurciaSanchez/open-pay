# Inicialización de Base de Datos en Supabase para OpenPay

## Configuración inicial de tablas

Para configurar correctamente las tablas en Supabase, ejecuta el siguiente SQL en el editor SQL de Supabase:

```sql
-- Configuración de extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabla de perfiles (vinculada a auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Trigger para actualizar el campo updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Tabla de cuentas
CREATE TABLE public.accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  balance DECIMAL(12,2) NOT NULL DEFAULT 0,
  type TEXT NOT NULL DEFAULT 'CHECKING',
  number TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TRIGGER update_accounts_updated_at
BEFORE UPDATE ON accounts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Tabla de transacciones
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'COMPLETED',
  type TEXT NOT NULL DEFAULT 'TRANSFER',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TRIGGER update_transactions_updated_at
BEFORE UPDATE ON transactions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Tabla de pagos de servicios
CREATE TABLE public.service_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL,
  provider TEXT NOT NULL,
  bill_number TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  due_date TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TRIGGER update_service_payments_updated_at
BEFORE UPDATE ON service_payments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Tabla de auditoría
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  details TEXT,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
```

## Configuración de políticas de seguridad (RLS)

Para proteger tus datos, configura las políticas de seguridad a nivel de fila:

```sql
-- Activar RLS en todas las tablas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para perfiles
CREATE POLICY "Usuarios pueden ver su propio perfil"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden actualizar su propio perfil"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden insertar su propio perfil"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Políticas para cuentas
CREATE POLICY "Usuarios pueden ver sus propias cuentas"
ON public.accounts FOR SELECT
USING ((SELECT user_id FROM profiles WHERE id = profile_id) = auth.uid());

CREATE POLICY "Usuarios pueden actualizar sus propias cuentas"
ON public.accounts FOR UPDATE
USING ((SELECT user_id FROM profiles WHERE id = profile_id) = auth.uid());

CREATE POLICY "Usuarios pueden insertar sus propias cuentas"
ON public.accounts FOR INSERT
WITH CHECK ((SELECT user_id FROM profiles WHERE id = profile_id) = auth.uid());

-- Políticas para transacciones
CREATE POLICY "Usuarios pueden ver sus propias transacciones"
ON public.transactions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE (profiles.id = sender_id OR profiles.id = receiver_id) 
    AND profiles.user_id = auth.uid()
  )
);

CREATE POLICY "Usuarios pueden insertar transacciones desde sus cuentas"
ON public.transactions FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = sender_id 
    AND profiles.user_id = auth.uid()
  )
);

-- Políticas para pagos de servicios
CREATE POLICY "Usuarios pueden ver sus propios pagos"
ON public.service_payments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = profile_id 
    AND profiles.user_id = auth.uid()
  )
);

CREATE POLICY "Usuarios pueden insertar sus propios pagos"
ON public.service_payments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = profile_id 
    AND profiles.user_id = auth.uid()
  )
);

-- Políticas para auditoría (solo admin puede ver)
CREATE POLICY "Solo administradores pueden ver auditoría"
ON public.audit_logs FOR SELECT
USING (
  auth.jwt() ->> 'role' = 'admin'
);

-- Permitir inserción en logs de auditoría desde cualquier usuario autenticado
CREATE POLICY "Usuarios autenticados pueden insertar registros de auditoría"
ON public.audit_logs FOR INSERT
WITH CHECK (auth.role() = 'authenticated');
```

## Funciones y Triggers para lógica de negocio

Para manejar acciones automáticas como actualizar balances en transacciones:

```sql
-- Función para actualizar balances en cuentas al completar una transacción
CREATE OR REPLACE FUNCTION update_balances_on_transaction()
RETURNS TRIGGER AS $$
DECLARE
  sender_account_id UUID;
  receiver_account_id UUID;
BEGIN
  -- Solo procesar si la transacción está COMPLETED
  IF NEW.status = 'COMPLETED' THEN
    -- Obtener cuenta principal del remitente
    SELECT id INTO sender_account_id FROM accounts 
    WHERE profile_id = NEW.sender_id AND type = 'CHECKING'
    ORDER BY created_at ASC LIMIT 1;
    
    -- Obtener cuenta principal del destinatario
    SELECT id INTO receiver_account_id FROM accounts 
    WHERE profile_id = NEW.receiver_id AND type = 'CHECKING'
    ORDER BY created_at ASC LIMIT 1;
    
    -- Restar de la cuenta del remitente
    IF sender_account_id IS NOT NULL THEN
      UPDATE accounts 
      SET balance = balance - NEW.amount
      WHERE id = sender_account_id;
    END IF;
    
    -- Sumar a la cuenta del destinatario
    IF receiver_account_id IS NOT NULL THEN
      UPDATE accounts 
      SET balance = balance + NEW.amount
      WHERE id = receiver_account_id;
    END IF;
    
    -- Registrar en auditoría
    INSERT INTO audit_logs (action, resource, details)
    VALUES ('transaction_completed', 'transactions', 'Transaction ID: ' || NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar balances
CREATE TRIGGER after_transaction_insert_or_update
AFTER INSERT OR UPDATE OF status ON transactions
FOR EACH ROW
EXECUTE FUNCTION update_balances_on_transaction();

-- Función para generar número de cuenta único al crear una cuenta
CREATE OR REPLACE FUNCTION generate_account_number()
RETURNS TRIGGER AS $$
BEGIN
  -- Generar número de cuenta en formato: OP-XXXX-XXXX-XXXX
  NEW.number = 'OP-' || 
               to_char(floor(random() * 10000), 'FM0000') || '-' ||
               to_char(floor(random() * 10000), 'FM0000') || '-' ||
               to_char(floor(random() * 10000), 'FM0000');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para generar número de cuenta
CREATE TRIGGER before_account_insert
BEFORE INSERT ON accounts
FOR EACH ROW
WHEN (NEW.number IS NULL)
EXECUTE FUNCTION generate_account_number();
```

## Datos iniciales para pruebas

Opcionalmente, puedes insertar algunos datos de prueba:

```sql
-- Insertar perfiles de prueba (reemplaza los UUIDs con IDs reales de auth.users)
INSERT INTO profiles (user_id, full_name, email)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'Usuario Demo', 'demo@openpay.com'),
  ('00000000-0000-0000-0000-000000000002', 'Admin OpenPay', 'admin@openpay.com');

-- Insertar cuentas de prueba
INSERT INTO accounts (profile_id, balance, type, number, status)
VALUES 
  ((SELECT id FROM profiles WHERE email = 'demo@openpay.com'), 1000.00, 'CHECKING', 'OP-1234-5678-9012', 'ACTIVE'),
  ((SELECT id FROM profiles WHERE email = 'admin@openpay.com'), 5000.00, 'CHECKING', 'OP-9876-5432-1098', 'ACTIVE');
```

## Configuración de Buckets de Storage

Para almacenar avatares y documentos:

1. Ve a Storage en el panel de Supabase
2. Crea los siguientes buckets:
   - `avatars` - para fotos de perfil
   - `documents` - para documentos de identidad

3. Configura las políticas RLS para los buckets:

```sql
-- Política para permitir a usuarios subir y ver sus propios avatares
CREATE POLICY "Usuarios pueden subir sus propios avatares"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Usuarios pueden actualizar sus propios avatares"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Usuarios pueden ver sus propios avatares"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Política para documentos (similar a avatares)
CREATE POLICY "Usuarios pueden subir sus propios documentos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Usuarios pueden ver sus propios documentos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

## Webhooks para Notificaciones

Para configurar notificaciones en tiempo real:

1. Ve a Database > Webhooks en el panel de Supabase
2. Crea un nuevo webhook para transacciones:
   - Name: `transaction_notifications`
   - Table: `transactions`
   - Events: `INSERT`, `UPDATE`
   - URL de destino: URL de tu API (e.j., `https://tu-api.railway.app/api/webhooks/transactions`)
   - HTTP Method: `POST`

## Próximos pasos

Una vez completada esta configuración inicial:

1. Conecta tu aplicación usando el cliente de Supabase o Prisma
2. Prueba el flujo de registro e inicio de sesión
3. Verifica que las políticas RLS estén funcionando correctamente
4. Prueba las transacciones y verifica que los balances se actualicen
5. Monitorea los logs de auditoría para detectar posibles problemas 