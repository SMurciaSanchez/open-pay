# Configuración de Supabase para OpenPay

## 1. Configuración del Proyecto Supabase

### 1.1 Obtener credenciales de API
1. Ve al Dashboard de Supabase y selecciona tu proyecto
2. Navega a "Settings" > "API"
3. Copia los valores de:
   - **Project URL**: URL de tu proyecto (ej: https://abcdefghijklm.supabase.co)
   - **anon public key**: Clave anónima para operaciones públicas
   - **service_role key**: Clave de servicio para operaciones privilegiadas (¡MANTENER SEGURA!)

### 1.2 Configurar .env.local
Actualiza el archivo `.env.local` con tus credenciales reales:

```
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXV...
DATABASE_URL=postgresql://postgres:tu-password@db.tu-proyecto-id.supabase.co:5432/postgres
```

## 2. Configuración de Autenticación

### 2.1 Habilitar métodos de autenticación
1. Ve a "Authentication" > "Providers"
2. Habilita "Email" con estas opciones:
   - [x] Enable Email Signups
   - [x] Enable Email Confirmations
   - [x] Secure Email Change
   - [ ] Disable Signup (desmarcar para permitir registros)

### 2.2 Personalizar plantillas de correo
1. Ve a "Authentication" > "Email Templates"
2. Personaliza las plantillas:
   - Confirmación
   - Recuperación de contraseña
   - Cambio de correo
   - Invitación de usuario

## 3. Seguridad de Base de Datos (RLS)

### 3.1 Activar Políticas de Seguridad (RLS)

Ejecuta estas SQL queries en el editor SQL de Supabase:

```sql
-- Habilitar RLS en todas las tablas
ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."transactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."service_payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;

-- Política para perfiles (solo ver/editar el propio)
CREATE POLICY "Users can view own profile" 
ON "public"."profiles" FOR SELECT 
USING (auth.uid() = "userId");

CREATE POLICY "Users can update own profile" 
ON "public"."profiles" FOR UPDATE 
USING (auth.uid() = "userId");

-- Política para cuentas (solo ver/usar las propias)
CREATE POLICY "Users can view own accounts" 
ON "public"."accounts" FOR SELECT 
USING ((SELECT "userId" FROM "profiles" WHERE "id" = "profileId") = auth.uid());

-- Política para transacciones (solo ver las propias)
CREATE POLICY "Users can view own transactions" 
ON "public"."transactions" FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM "profiles" 
    WHERE ("profiles"."id" = "senderId" OR "profiles"."id" = "receiverId") 
    AND "profiles"."userId" = auth.uid()
  )
);

-- Política para crear transacciones (solo desde cuenta propia)
CREATE POLICY "Users can create transactions" 
ON "public"."transactions" FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "profiles" 
    WHERE "profiles"."id" = "senderId" 
    AND "profiles"."userId" = auth.uid()
  )
);
```

## 4. Sincronización con Prisma

### 4.1 Generar cliente Prisma
Una vez configurada la base de datos en Supabase, ejecuta:

```bash
npx prisma generate
```

### 4.2 Push del schema a Supabase
Para crear las tablas en Supabase según tu schema Prisma:

```bash
npx prisma db push
```

## 5. Triggers y Funciones

### 5.1 Crear trigger para actualizar balances

Ejecuta este SQL para crear una función que actualice automáticamente los balances:

```sql
-- Función para actualizar balances
CREATE OR REPLACE FUNCTION update_account_balances()
RETURNS TRIGGER AS $$
BEGIN
  -- Restar del balance del remitente
  IF NEW.status = 'COMPLETED' THEN
    UPDATE accounts 
    SET balance = balance - NEW.amount
    FROM profiles
    WHERE accounts.profile_id = NEW.sender_id 
    AND accounts.type = 'CHECKING';
    
    -- Sumar al balance del destinatario
    UPDATE accounts
    SET balance = balance + NEW.amount
    FROM profiles
    WHERE accounts.profile_id = NEW.receiver_id
    AND accounts.type = 'CHECKING';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar balances al completar transacción
CREATE TRIGGER after_transaction_insert
AFTER INSERT ON transactions
FOR EACH ROW
EXECUTE FUNCTION update_account_balances();
```

## 6. Webhooks (opcional)

### 6.1 Configurar Webhooks para notificaciones
1. Ve a "Database" > "Webhooks"
2. Crea un nuevo webhook:
   - **Name**: TransactionNotification
   - **Table**: transactions
   - **Events**: INSERT
   - **URL**: URL de tu endpoint (ej: https://tu-backend.railway.app/api/webhooks/transaction)

## 7. Storage (para avatares y documentos)

### 7.1 Crear buckets
1. Ve a "Storage"
2. Crea dos buckets:
   - **avatars**: para fotos de perfil
   - **documents**: para documentos de identidad

### 7.2 Configurar políticas RLS para Storage
```sql
-- Permitir a usuarios subir su propio avatar
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Permitir a usuarios ver su propio avatar
CREATE POLICY "Users can view their own avatar"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
``` 