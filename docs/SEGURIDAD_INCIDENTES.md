# Registro de incidentes de seguridad

> Nunca escribir contraseñas, llaves ni tokens en este archivo. Solo qué pasó, dónde y el estado.

## INC-001 — Contraseñas de Postgres expuestas en repositorio público

- **Detectado**: 16/09/2026
- **Severidad**: 🔴 Crítica (repo `SMurciaSanchez/open-pay-mvp` es público en GitHub)
- **Estado**: ✅ Cerrado — 16/09/2026 (proyectos fuera de línea, repo privado, proyecto y repo nuevos)

### Credenciales afectadas

| # | Proyecto Supabase | Credencial | Dónde estaba | Commits en historial | Removida del código | Rotada |
|---|---|---|---|---|---|---|
| 1 | `bmfiotbutuslsaxeumik` | Contraseña de Postgres (usuario `postgres.bmfiotbutuslsaxeumik`, pooler `aws-1-us-east-2`) | `packages/web/test-p1.mjs`, `packages/web/test-p2.mjs` | `c502e5e`, `6c1ffff` | ✅ `6f4505e` | ⬜ |
| 2 | `garzwhnenhtmpfvfntmk` | Contraseña de Postgres (usuario `postgres`, host `db.garzwhnenhtmpfvfntmk.supabase.co`) | `packages/web/VERCEL_DEPLOYMENT.md` (línea 67) | ver `git log -S garzwhnenhtmpfvfntmk` | ✅ `6f4505e` | ⬜ |

### Pasos pendientes

- [ ] Rotar contraseña 1: Supabase → proyecto `bmfiotbutuslsaxeumik` → Project Settings → Database → Reset database password.
- [ ] Rotar contraseña 2: igual, en el proyecto `garzwhnenhtmpfvfntmk`.
- [ ] Guardar las nuevas contraseñas **solo** en un gestor de contraseñas (Bitwarden, 1Password) y en `.env` locales (ignorados por git).
- [ ] Actualizar la variable `DATABASE_URL` / `DB_URL` en Vercel si alguno de los proyectos la usa.
- [ ] Revisar logs de Supabase (Logs → Postgres) por conexiones desconocidas desde la fecha del primer commit.
- [x] Pasar el repositorio a privado.
- [ ] (Opcional) Limpiar historial con `git filter-repo` y forzar push. No sustituye la rotación: clones y forks ya pueden tener las claves.
- [ ] Marcar este incidente como ✅ Cerrado.

### Lecciones

- Nunca escribir credenciales en scripts ni documentación; usar variables de entorno y `.env.example` con valores vacíos.
- El `.gitignore` de la raíz estaba en UTF-16 y git no lo leía: revisar codificación de archivos de configuración.
- Pendiente: agregar escaneo de secretos (p. ej. `gitleaks` como pre-commit o GitHub secret scanning).

## INC-002 — Correo y contraseña de un usuario en scripts de prueba

- **Detectado**: 16/09/2026
- **Severidad**: 🟢 Baja (confirmado: era una contraseña de prueba, no reutilizada; pública desde 20/04/2025)
- **Estado**: ✅ Cerrado — 16/09/2026

### Qué pasó

`packages/web/test-supabase.js` y `packages/web/test-supabase-queries.js` (commit `fdf3667`, primer commit de `open-pay-mvp`) tenían escrito el correo de un fundador junto con una contraseña de prueba, para iniciar sesión desde el script. También tenían la clave `anon` del proyecto `garzwhnenhtmpfvfntmk` (pública por diseño; se reemplazó igual en la documentación).

### Pasos

- [x] Archivos excluidos del repositorio nuevo `open-pay`; clave `anon` reemplazada por `<TU_ANON_KEY>` en `INSTRUCCIONES_VERCEL.md` y `VERCEL_DEPLOYMENT.md`.
- [x] Confirmado por el titular: la contraseña era de prueba y no se usa en otros servicios.
- [x] Pasar `open-pay-mvp` a privado.

### Lecciones

- Los scripts de prueba inician sesión con usuarios de prueba creados para eso, nunca con cuentas personales, y leen las credenciales del entorno.
- Antes de publicar un repositorio, escanear el árbol completo (no solo los `.env`).
