# Scripts SQL para configurar OpenPay en Supabase

## Instrucciones de uso

1. Abre la consola SQL de Supabase: 
   - Ve a tu dashboard de Supabase (https://app.supabase.com/)
   - Selecciona tu proyecto "OpenPay"
   - Haz clic en "SQL Editor" en el menú lateral
   - Haz clic en "New query"

2. Copia y pega cada bloque de SQL a continuación, y haz clic en "Run" o presiona Ctrl+Enter para ejecutar

## Bloque 1: Configuración de tablas

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

## Bloque 2: Configuración de políticas RLS

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

## Bloque 3: Configuración de triggers y funciones

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

## Bloque 4: Configuración de buckets de almacenamiento

Después de ejecutar los scripts SQL, sigue estos pasos para configurar el almacenamiento:

1. En el dashboard de Supabase, ve a "Storage" en el menú lateral
2. Haz clic en "New bucket"
3. Crea dos buckets:
   - Nombre: `avatars` (para fotos de perfil)
   - Nombre: `documents` (para documentos de identidad)

4. Ejecuta el siguiente SQL para configurar los permisos de los buckets:

```sql
-- Políticas para el bucket de avatares
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

-- Políticas para el bucket de documentos
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

## Próximos pasos

Después de ejecutar todos los scripts SQL:

1. Configura la autenticación:
   - Ve a "Authentication" > "Providers"
   - Habilita la autenticación por correo
   - Personaliza las plantillas de correo en "Email Templates"

2. Genera tu cliente Prisma:
   ```bash
   npx prisma generate
   ```

3. (Opcional) Crea datos de prueba con este SQL:
   ```sql
   -- Nota: Solo ejecuta esto después de haber creado al menos un usuario en Supabase Auth
   -- Reemplaza los IDs con los reales de tus usuarios
   
   -- Insertar perfiles de prueba (reemplaza con un UUID real de auth.users)
   INSERT INTO profiles (user_id, full_name, email)
   VALUES 
     ('REEMPLAZA-CON-TU-USER-ID-REAL', 'Usuario Demo', 'tumail@ejemplo.com');
   
   -- Insertar una cuenta de prueba
   INSERT INTO accounts (profile_id, balance, type, number, status)
   VALUES 
     ((SELECT id FROM profiles WHERE email = 'tumail@ejemplo.com'), 1000.00, 'CHECKING', 'OP-1234-5678-9012', 'ACTIVE');
   ``` 