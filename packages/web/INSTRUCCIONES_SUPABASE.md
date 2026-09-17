# Instrucciones para completar la configuración de OpenPay con Supabase

Ya has configurado las credenciales en tu archivo `.env.local` y has generado el cliente Prisma. A continuación, vamos a completar la configuración de Supabase.

## 1. Configuración de la base de datos

1. Abre tu proyecto en Supabase: [https://app.supabase.com/project/garzwhnenhtmpfvfntmk](https://app.supabase.com/project/garzwhnenhtmpfvfntmk)

2. Ve al SQL Editor y ejecuta cada bloque de SQL que se encuentra en el archivo `SCRIPTS_SQL_OPENPAY.md`. Cada bloque debe ejecutarse por separado:
   - Bloque 1: Configuración de tablas
   - Bloque 2: Configuración de políticas RLS
   - Bloque 3: Configuración de triggers y funciones

## 2. Configuración de autenticación

1. Ve a "Authentication" > "Providers"
2. Asegúrate de que "Email" esté habilitado con las siguientes opciones:
   - ✅ Enable Email Signups
   - ✅ Enable Email Confirmations
   - ✅ Secure Email Change
   - ⬜ Disable Signup (desmarcar para permitir registros)

3. Personaliza las plantillas de correo en "Email Templates":
   - Confirmación
   - Recuperación de contraseña
   - Cambio de correo
   - Invitación de usuario

## 3. Configuración de Storage

1. Ve a "Storage" en el menú lateral
2. Crea dos buckets:
   - Nombre: `avatars` (para fotos de perfil)
   - Nombre: `documents` (para documentos de identidad)

3. Regresa al SQL Editor y ejecuta el Bloque 4 de SQL del archivo `SCRIPTS_SQL_OPENPAY.md` para configurar los permisos de los buckets.

## 4. Creación de usuario de prueba

1. Ve a "Authentication" > "Users"
2. Haz clic en "New User"
3. Completa los campos requeridos:
   - Email: tu-correo@ejemplo.com
   - Password: una contraseña segura
4. Anota el UUID del usuario que se crea (lo necesitarás para los datos de prueba)

5. Después de crear el usuario, regresa al SQL Editor y crea datos de prueba:
   ```sql
   -- Insertar perfil de prueba (reemplaza el UUID con el del usuario que creaste)
   INSERT INTO profiles (user_id, full_name, email)
   VALUES 
     ('el-uuid-del-usuario-creado', 'Tu Nombre', 'tu-correo@ejemplo.com');
   
   -- Insertar una cuenta de prueba
   INSERT INTO accounts (profile_id, balance, type, number, status)
   VALUES 
     ((SELECT id FROM profiles WHERE email = 'tu-correo@ejemplo.com'), 1000.00, 'CHECKING', 'OP-1234-5678-9012', 'ACTIVE');
   ```

## 5. Prueba del cliente de Supabase

Para verificar que la configuración está correcta, vamos a crear un archivo de prueba:

1. Crea un archivo `test-supabase.js` en tu directorio raíz:
   ```javascript
   // test-supabase.js
   const { createClient } = require('@supabase/supabase-js');
   
   const supabaseUrl = 'https://garzwhnenhtmpfvfntmk.supabase.co';
   const supabaseKey = 'tu-clave-anon-key'; // Usa la clave anon_key (NO la service_role)
   
   const supabase = createClient(supabaseUrl, supabaseKey);
   
   async function testConnection() {
     try {
       // Probar autenticación
       const { data: authData, error: authError } = await supabase.auth.getSession();
       console.log('Sesión:', authData ? 'OK' : 'No hay sesión activa');
       
       // Probar acceso a tabla pública
       const { data, error } = await supabase.from('profiles').select('*').limit(1);
       
       if (error) {
         console.error('Error al acceder a la tabla profiles:', error.message);
       } else {
         console.log('Conexión exitosa a la base de datos.');
         console.log('Datos recuperados:', data);
       }
     } catch (error) {
       console.error('Error de conexión:', error.message);
     }
   }
   
   testConnection();
   ```

2. Ejecuta el script con Node.js para verificar la conexión:
   ```bash
   node test-supabase.js
   ```

## 6. Configuración del webhook (opcional)

Si deseas implementar notificaciones en tiempo real:

1. Ve a "Database" > "Webhooks"
2. Haz clic en "Create new webhook"
3. Configura:
   - Name: `transaction_notifications`
   - Table: `transactions`
   - Events: `INSERT`, `UPDATE`
   - URL Endpoint: URL de tu API (e.j., `https://tu-api.railway.app/api/webhooks/transactions`)
   - HTTP Method: `POST`

## 7. Próximos pasos para despliegue

Una vez que hayas completado la configuración de Supabase:

1. **Desarrollo local**: 
   - Utiliza el cliente de Supabase para desarrollar tus componentes
   - Prueba las operaciones CRUD con los datos de ejemplo

2. **Prepárate para el despliegue en Vercel**:
   - Sigue las instrucciones en `SUPABASE_DEPLOYMENT.md`
   - Asegúrate de configurar todas las variables de entorno necesarias en Vercel

## Notas importantes de seguridad

1. **Nunca expongas tu `service_role_key` en el código del frontend**. Solo debe usarse en el backend o en scripts de administración.

2. **Siempre usa políticas RLS** para controlar el acceso a tus datos. No confíes solo en la lógica de tu aplicación.

3. **Haz backups regulares** de tu base de datos desde el panel de Supabase.

4. **Monitorea el uso de tu proyecto** en la sección "Reports" para detectar cualquier actividad inusual. 