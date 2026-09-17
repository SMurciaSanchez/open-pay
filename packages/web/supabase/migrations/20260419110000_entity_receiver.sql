-- Fase 4a: Pagos a entidades (impuestos, donaciones, servicios públicos)
-- Objetivo: habilitar pagos desde un Profile hacia una entidad externa (DIAN, ICBF, etc.)
-- que se anclarán on-chain usando anchorEntityPayment() en vez de anchorTransaction().

-- ── 1. Tabla de entidades receptoras ────────────────────────────
CREATE TABLE IF NOT EXISTS "EntityReceiver" (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name          TEXT NOT NULL,
  -- entityCode: identificador estable usado como entityId on-chain (hash keccak256).
  -- No se puede cambiar una vez emitido, so sirve como primary key semántica.
  "entityCode"  TEXT NOT NULL UNIQUE,
  category      TEXT NOT NULL CHECK (category IN (
    'TAX',              -- DIAN, predial, vehiculos
    'SOCIAL',           -- ICBF, programas sociales
    'DONATION',         -- Cruz Roja, fundaciones
    'UTILITIES',        -- EPM, Codensa, Aguas
    'TELECOM',          -- Claro, Movistar, Tigo
    'OTHER'
  )),
  description   TEXT,
  "logoUrl"     TEXT,
  -- isVerified: solo las verificadas aparecen en el selector de la app.
  -- Permite sembrar entidades en estado no verificado hasta revisión manual.
  "isVerified"  BOOLEAN NOT NULL DEFAULT FALSE,
  "isActive"    BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS entity_receiver_category_idx
  ON "EntityReceiver" (category) WHERE "isActive" = TRUE AND "isVerified" = TRUE;

CREATE INDEX IF NOT EXISTS entity_receiver_code_idx
  ON "EntityReceiver" ("entityCode");

-- ── 2. Extensión de Transaction ─────────────────────────────────
-- Los pagos a entidades se registran en la misma tabla Transaction para reusar
-- el pipeline on-chain (webhook → edge function). La diferencia es que
-- receiverId queda NULL y entityReceiverId apunta a la entidad.
ALTER TABLE "Transaction"
  ALTER COLUMN "receiverId" DROP NOT NULL;

ALTER TABLE "Transaction"
  ADD COLUMN IF NOT EXISTS "entityReceiverId" TEXT
    REFERENCES "EntityReceiver"(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS "isEntityPayment" BOOLEAN NOT NULL DEFAULT FALSE;

-- Constraint de integridad: un row es P2P (receiverId set) o entidad (entityReceiverId set),
-- nunca ambas ni ninguna.
ALTER TABLE "Transaction"
  DROP CONSTRAINT IF EXISTS transaction_recipient_xor;

ALTER TABLE "Transaction"
  ADD CONSTRAINT transaction_recipient_xor
  CHECK (
    ("isEntityPayment" = TRUE  AND "entityReceiverId" IS NOT NULL AND "receiverId" IS NULL)
    OR
    ("isEntityPayment" = FALSE AND "entityReceiverId" IS NULL     AND "receiverId" IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS transaction_entity_receiver_idx
  ON "Transaction" ("entityReceiverId") WHERE "entityReceiverId" IS NOT NULL;

-- ── 3. RLS: EntityReceiver es un directorio público ─────────────
ALTER TABLE "EntityReceiver" ENABLE ROW LEVEL SECURITY;

-- Cualquier usuario autenticado puede listar entidades activas y verificadas.
DROP POLICY IF EXISTS "entity_receiver_select_public" ON "EntityReceiver";
CREATE POLICY "entity_receiver_select_public"
  ON "EntityReceiver" FOR SELECT
  TO authenticated
  USING ("isActive" = TRUE AND "isVerified" = TRUE);

-- INSERT/UPDATE/DELETE: bloqueado a todos. Solo admin vía service_role.

-- El SQL Editor del dashboard de Supabase no aplica grants automáticamente
-- a los roles authenticated/anon cuando se crea una tabla via migración.
-- Sin esto, la RLS policy se evalúa pero el rol no tiene permiso base y
-- PostgREST devuelve 403. Grant explícito:
GRANT SELECT ON "EntityReceiver" TO authenticated, anon;

-- ── 4. Seed de entidades colombianas verificadas ────────────────
INSERT INTO "EntityReceiver" (name, "entityCode", category, description, "logoUrl", "isVerified", "isActive")
VALUES
  ('DIAN — Dirección de Impuestos y Aduanas Nacionales',
   'CO-DIAN',
   'TAX',
   'Recaudo de impuestos nacionales (renta, IVA, retefuente).',
   NULL, TRUE, TRUE),

  ('Secretaría de Hacienda de Bogotá — Impuesto Predial',
   'CO-SHD-PREDIAL',
   'TAX',
   'Pago del impuesto predial unificado para Bogotá D.C.',
   NULL, TRUE, TRUE),

  ('Secretaría de Hacienda de Bogotá — Impuesto Vehicular',
   'CO-SHD-VEHICULAR',
   'TAX',
   'Pago del impuesto sobre vehículos automotores de Bogotá.',
   NULL, TRUE, TRUE),

  ('ICBF — Instituto Colombiano de Bienestar Familiar',
   'CO-ICBF',
   'SOCIAL',
   'Aportes voluntarios a programas de protección a la infancia.',
   NULL, TRUE, TRUE),

  ('Cruz Roja Colombiana',
   'CO-CRUZROJA',
   'DONATION',
   'Donaciones para atención humanitaria y emergencias.',
   NULL, TRUE, TRUE),

  ('Fundación Teletón',
   'CO-TELETON',
   'DONATION',
   'Donaciones para la rehabilitación integral de niños con discapacidad.',
   NULL, TRUE, TRUE),

  ('EPM — Empresas Públicas de Medellín',
   'CO-EPM',
   'UTILITIES',
   'Pago de energía, acueducto y gas natural de EPM.',
   NULL, TRUE, TRUE),

  ('Codensa — Enel Colombia',
   'CO-CODENSA',
   'UTILITIES',
   'Pago de facturas de energía eléctrica en Bogotá y Cundinamarca.',
   NULL, TRUE, TRUE),

  ('Empresa de Acueducto y Alcantarillado de Bogotá',
   'CO-EAAB',
   'UTILITIES',
   'Pago de facturas de acueducto y alcantarillado de Bogotá.',
   NULL, TRUE, TRUE),

  ('Claro Colombia',
   'CO-CLARO',
   'TELECOM',
   'Pago de planes móviles, internet hogar y TV de Claro.',
   NULL, TRUE, TRUE),

  ('Movistar Colombia',
   'CO-MOVISTAR',
   'TELECOM',
   'Pago de planes móviles e internet de Movistar.',
   NULL, TRUE, TRUE),

  ('Tigo (Colombia Móvil)',
   'CO-TIGO',
   'TELECOM',
   'Pago de planes móviles e internet de Tigo.',
   NULL, TRUE, TRUE)
ON CONFLICT ("entityCode") DO NOTHING;
