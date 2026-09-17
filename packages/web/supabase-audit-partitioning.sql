-- ============================================================
--  AuditLog: Migración a tabla particionada por rango mensual
--
--  IMPORTANTE: PostgreSQL NO permite convertir una tabla normal
--  en particionada con ALTER TABLE. Este script hace la migración
--  correcta:
--    1. Renombrar tabla existente a _old
--    2. Crear tabla particionada nueva con misma estructura
--    3. Migrar datos de _old a la nueva
--    4. Crear particiones para el período histórico + futuro
--    5. Re-aplicar triggers de inmutabilidad en la tabla nueva
--    6. Renombrar _old como backup hasta verificar que todo OK
--
--  Ejecutar en: Supabase Dashboard → SQL Editor
--  PRECAUCIÓN: Ejecutar en horario de bajo tráfico. La migración
--  de datos es una operación costosa en tablas grandes.
-- ============================================================

BEGIN;

-- ── PASO 1: Renombrar tabla existente ───────────────────────
-- No la borramos hasta verificar que la migración fue exitosa.
ALTER TABLE "AuditLog" RENAME TO "AuditLog_migration_backup";

-- ── PASO 2: Crear tabla particionada nueva ───────────────────
-- Particionada por RANGE sobre createdAt (mensual).
-- Las inserciones van automáticamente a la partición correcta.
CREATE TABLE "AuditLog" (
  id          TEXT NOT NULL,
  "userId"    TEXT,
  action      TEXT NOT NULL,
  resource    TEXT NOT NULL,
  details     TEXT,
  "ipAddress" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, "createdAt")   -- la PK debe incluir la clave de partición
) PARTITION BY RANGE ("createdAt");

-- ── PASO 3: Crear particiones mensuales ─────────────────────
-- Histórico (ajustar según la fecha más antigua de tus datos)
CREATE TABLE "AuditLog_2025_01" PARTITION OF "AuditLog"
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE "AuditLog_2025_02" PARTITION OF "AuditLog"
  FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

CREATE TABLE "AuditLog_2025_03" PARTITION OF "AuditLog"
  FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');

CREATE TABLE "AuditLog_2025_04" PARTITION OF "AuditLog"
  FOR VALUES FROM ('2025-04-01') TO ('2025-05-01');

CREATE TABLE "AuditLog_2025_05" PARTITION OF "AuditLog"
  FOR VALUES FROM ('2025-05-01') TO ('2025-06-01');

CREATE TABLE "AuditLog_2025_06" PARTITION OF "AuditLog"
  FOR VALUES FROM ('2025-06-01') TO ('2025-07-01');

CREATE TABLE "AuditLog_2025_07" PARTITION OF "AuditLog"
  FOR VALUES FROM ('2025-07-01') TO ('2025-08-01');

CREATE TABLE "AuditLog_2025_08" PARTITION OF "AuditLog"
  FOR VALUES FROM ('2025-08-01') TO ('2025-09-01');

CREATE TABLE "AuditLog_2025_09" PARTITION OF "AuditLog"
  FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');

CREATE TABLE "AuditLog_2025_10" PARTITION OF "AuditLog"
  FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');

CREATE TABLE "AuditLog_2025_11" PARTITION OF "AuditLog"
  FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');

CREATE TABLE "AuditLog_2025_12" PARTITION OF "AuditLog"
  FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');

-- Presente y futuro
CREATE TABLE "AuditLog_2026_01" PARTITION OF "AuditLog"
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE TABLE "AuditLog_2026_02" PARTITION OF "AuditLog"
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

CREATE TABLE "AuditLog_2026_03" PARTITION OF "AuditLog"
  FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

CREATE TABLE "AuditLog_2026_04" PARTITION OF "AuditLog"
  FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');

CREATE TABLE "AuditLog_2026_05" PARTITION OF "AuditLog"
  FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');

CREATE TABLE "AuditLog_2026_06" PARTITION OF "AuditLog"
  FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');

CREATE TABLE "AuditLog_2026_07" PARTITION OF "AuditLog"
  FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');

CREATE TABLE "AuditLog_2026_08" PARTITION OF "AuditLog"
  FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');

CREATE TABLE "AuditLog_2026_09" PARTITION OF "AuditLog"
  FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');

CREATE TABLE "AuditLog_2026_10" PARTITION OF "AuditLog"
  FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');

CREATE TABLE "AuditLog_2026_11" PARTITION OF "AuditLog"
  FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');

CREATE TABLE "AuditLog_2026_12" PARTITION OF "AuditLog"
  FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');

-- ── PASO 4: Migrar datos históricos ──────────────────────────
-- INSERT … SELECT desde el backup a la nueva tabla particionada.
-- Cualquier fila cuyo createdAt caiga fuera de las particiones
-- creadas arriba fallará aquí (lo cual es útil para detectar
-- datos más antiguos que no contemplamos).
INSERT INTO "AuditLog" (id, "userId", action, resource, details, "ipAddress", "createdAt")
SELECT id, "userId", action, resource, details, "ipAddress", "createdAt"
FROM "AuditLog_migration_backup";

-- ── PASO 5: Índices en la tabla particionada ─────────────────
-- Los índices en tablas particionadas se crean en la tabla padre
-- y Postgres los propaga a cada partición.
CREATE INDEX idx_auditlog_userid    ON "AuditLog" ("userId");
CREATE INDEX idx_auditlog_action    ON "AuditLog" (action);
CREATE INDEX idx_auditlog_createdat ON "AuditLog" ("createdAt" DESC);

-- ── PASO 6: Re-aplicar trigger de inmutabilidad ──────────────
-- Los triggers del archivo supabase-p5-auditlog.sql se adjuntan
-- a la tabla padre y Postgres los hereda en cada partición.
-- Si ya ejecutaste ese script, el trigger prevent_auditlog_modification
-- ya existe como función; solo hay que re-crear el trigger sobre
-- la tabla nueva.
DROP TRIGGER IF EXISTS tr_auditlog_immutable ON "AuditLog";
CREATE TRIGGER tr_auditlog_immutable
  BEFORE UPDATE OR DELETE ON "AuditLog"
  FOR EACH ROW
  EXECUTE FUNCTION prevent_auditlog_modification();

-- ── PASO 7: Permisos ─────────────────────────────────────────
REVOKE UPDATE, DELETE ON "AuditLog" FROM authenticated;
REVOKE UPDATE, DELETE ON "AuditLog" FROM anon;

COMMIT;

-- ── POST-MIGRACIÓN (ejecutar después de verificar) ───────────
-- Una vez confirmado que la nueva tabla tiene todos los datos:
--
--   DROP TABLE "AuditLog_migration_backup";
--
-- ── MANTENIMIENTO MENSUAL ────────────────────────────────────
-- Cada mes crear la partición del mes siguiente ANTES de que llegue.
-- Ejemplo para crear la partición de enero 2027:
--
--   CREATE TABLE "AuditLog_2027_01" PARTITION OF "AuditLog"
--     FOR VALUES FROM ('2027-01-01') TO ('2027-02-01');
--
-- ── ARCHIVADO (datos > 2 años) ───────────────────────────────
-- Mover particiones viejas a tabla de archivo (solo lectura):
--
--   -- 1. Desconectar partición del padre
--   ALTER TABLE "AuditLog" DETACH PARTITION "AuditLog_2025_01";
--   -- 2. Renombrar como archivo
--   ALTER TABLE "AuditLog_2025_01" RENAME TO "AuditLog_archive_2025_01";
--   -- 3. Revocar insert (solo lectura)
--   REVOKE INSERT ON "AuditLog_archive_2025_01" FROM authenticated;
