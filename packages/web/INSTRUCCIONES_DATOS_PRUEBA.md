# Instrucciones para insertar datos de prueba en Supabase

Este archivo te guiará para insertar datos de prueba en tu base de datos Supabase antes de desplegar la aplicación en Vercel.

## Paso 1: Ejecutar el script SQL para crear las tablas (si aún no lo has hecho)

Si aún no has inicializado las tablas en Supabase, primero debes ejecutar el script SQL que se encuentra en `packages/web/SUPABASE_INIT.md`. Este script creará las tablas y configurará las políticas de seguridad (RLS).

## Paso 2: Insertar datos de prueba

1. Inicia sesión en tu [panel de control de Supabase](https://garzwhnenhtmpfvfntmk.supabase.co/project/sql)
2. Ve a la sección "SQL Editor"
3. Copia el contenido del archivo `packages/web/supabase-seed-data.sql`
4. Pega el SQL en el editor y ejecútalo
5. Verás mensajes de notificación que confirman que los datos se insertaron correctamente

> ⚠️ Nota: El script usa el ID de usuario de `sebasms777@gmail.com`. Si has creado otro usuario, deberás modificar el valor de `user_id` en el script.

## Paso 3: Verificar los datos insertados

Para verificar que los datos se insertaron correctamente, puedes ejecutar el script de prueba:

```bash
# Desde la raíz del proyecto
node packages/web/test-supabase-queries.js
```

Este script mostrará:
- Tu perfil
- Tus cuentas
- Tus transacciones
- Tus pagos de servicios
- Registros de auditoría (si tienes permisos de administrador)

## Paso 4: Explorar los datos en el panel de Supabase

También puedes explorar los datos directamente desde el panel de Supabase:

1. Ve a la sección "Table Editor"
2. Selecciona cada tabla para ver los registros:
   - `profiles`
   - `accounts`
   - `transactions`
   - `service_payments`
   - `audit_logs`

## Qué datos fueron creados

El script inserta los siguientes datos de prueba:

1. **Perfiles**
   - Tu perfil con tu email
   - Un perfil de usuario de prueba

2. **Cuentas**
   - Una cuenta corriente con $1,000,000
   - Una cuenta de ahorros con $500,000
   - Una cuenta para el usuario de prueba con $750,000

3. **Transacciones**
   - Una transferencia recibida de $150,000
   - Una transferencia enviada de $50,000
   - Una transferencia entre tus propias cuentas de $100,000

4. **Pagos de servicios**
   - Un pago pendiente de electricidad (Codensa) por $87,500
   - Un pago completado de agua (Acueducto) por $65,300
   - Un pago pendiente de internet (Claro) por $125,000

5. **Logs de auditoría**
   - Varios registros de actividad para fines de demostración

## Paso siguiente: Despliegue en Vercel

Una vez que hayas verificado que los datos están correctamente insertados, puedes proceder con el despliegue en Vercel siguiendo las instrucciones en `packages/web/INSTRUCCIONES_VERCEL.md`. 