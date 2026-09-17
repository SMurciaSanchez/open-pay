/**
 * P5 — AuditLog append-only: deploy + test
 *
 * Pasos:
 *   1. Despliega supabase-p5-auditlog.sql vía pg directo
 *   2. Verifica que INSERT funciona
 *   3. Verifica que UPDATE lanza excepción
 *   4. Verifica que DELETE lanza excepción
 *   5. Verifica que auto-auditoría de Profile funciona
 */

import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const { Client } = pg;

// ── Leer .env.local ──────────────────────────────────────────
function loadEnv() {
  try {
    const env = readFileSync(join(__dirname, '.env.local'), 'utf8');
    for (const line of env.split('\n')) {
      const [k, ...vs] = line.split('=');
      if (k && vs.length) process.env[k.trim()] = vs.join('=').trim();
    }
  } catch { /* ignora si no existe */ }
}
loadEnv();

const SUPABASE_URL   = process.env.NEXT_PUBLIC_SUPABASE_URL;
const DATABASE_URL   = process.env.DATABASE_URL;

if (!SUPABASE_URL && !DATABASE_URL) {
  console.error('❌  Falta NEXT_PUBLIC_SUPABASE_URL o DATABASE_URL en .env.local');
  process.exit(1);
}

if (!DATABASE_URL) {
  console.error('❌  Falta DATABASE_URL en .env.local');
  process.exit(1);
}

// ── Helpers ──────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function ok(name) {
  console.log(`  ✅  ${name}`);
  passed++;
}

function fail(name, err) {
  console.log(`  ❌  ${name}`);
  console.log(`      ${err?.message ?? err}`);
  failed++;
}

async function expectError(client, sql, params, expectedMsg, testName) {
  try {
    await client.query(sql, params);
    fail(testName, 'Se esperaba un error pero la query tuvo éxito');
  } catch (e) {
    if (e.message.includes(expectedMsg)) {
      ok(testName);
    } else {
      fail(testName, `Error inesperado: ${e.message}`);
    }
  }
}

// ── Conectar ─────────────────────────────────────────────────
const client = new Client({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ── Main ─────────────────────────────────────────────────────
async function main() {
  console.log('\n══════════════════════════════════════════════');
  console.log('  P5 — AuditLog append-only');
  console.log('══════════════════════════════════════════════\n');

  await client.connect();
  const dbHost = new URL(DATABASE_URL.replace(/^postgres(ql)?:\/\//, 'http://')).hostname;
  console.log(`Conectado a ${dbHost}\n`);

  // ── Paso 1: Deploy SQL ──────────────────────────────────────
  console.log('📦  Desplegando supabase-p5-auditlog.sql...');
  const sql = readFileSync(join(__dirname, 'supabase-p5-auditlog.sql'), 'utf8');
  try {
    await client.query(sql);
    ok('SQL desplegado sin errores');
  } catch (e) {
    fail('Deploy SQL', e);
    await client.end();
    process.exit(1);
  }

  // ── Paso 2: INSERT debe funcionar ───────────────────────────
  console.log('\n🔸  Pruebas de INSERT (debe funcionar)');
  let insertedId;
  try {
    const res = await client.query(
      `INSERT INTO "AuditLog" (id, "userId", action, resource, details, "createdAt")
       VALUES (gen_random_uuid()::text, 'test-user', 'TEST_ACTION', 'AuditLog', 'test', NOW())
       RETURNING id`
    );
    insertedId = res.rows[0].id;
    ok(`INSERT directo → id=${insertedId.substring(0, 8)}...`);
  } catch (e) {
    fail('INSERT directo', e);
  }

  // INSERT vía log_audit_event()
  try {
    await client.query(
      `SELECT log_audit_event('u1', 'TEST_VIA_FUNCTION', 'AuditLog', 'via función', '1.2.3.4')`
    );
    ok('INSERT vía log_audit_event()');
  } catch (e) {
    fail('INSERT vía log_audit_event()', e);
  }

  // ── Paso 3: UPDATE debe fallar ──────────────────────────────
  console.log('\n🔸  Pruebas de UPDATE (debe bloquearse)');
  if (insertedId) {
    await expectError(
      client,
      `UPDATE "AuditLog" SET details = 'modificado' WHERE id = $1`,
      [insertedId],
      'solo escritura',
      'UPDATE bloqueado por trigger'
    );
  } else {
    fail('UPDATE bloqueado', 'No hay fila insertada para testear');
  }

  // ── Paso 4: DELETE debe fallar ──────────────────────────────
  console.log('\n🔸  Pruebas de DELETE (debe bloquearse)');
  if (insertedId) {
    await expectError(
      client,
      `DELETE FROM "AuditLog" WHERE id = $1`,
      [insertedId],
      'solo escritura',
      'DELETE bloqueado por trigger'
    );
  } else {
    fail('DELETE bloqueado', 'No hay fila insertada para testear');
  }

  // ── Paso 5: Auto-auditoría de Profile ───────────────────────
  console.log('\n🔸  Auto-auditoría de Profile');
  const testUserId = `test-audit-${Date.now()}`;
  let profileId;

  try {
    const res = await client.query(
      `INSERT INTO "Profile" (id, "userId", "fullName", email, "createdAt", "updatedAt")
       VALUES (gen_random_uuid()::text, $1, 'Audit Test', 'audit@test.com', NOW(), NOW())
       RETURNING id`,
      [testUserId]
    );
    profileId = res.rows[0].id;
    ok(`Profile creado → id=${profileId.substring(0, 8)}...`);
  } catch (e) {
    fail('Crear Profile de prueba', e);
  }

  if (profileId) {
    // Verificar que se insertó un log automático
    await new Promise(r => setTimeout(r, 300));
    try {
      const res = await client.query(
        `SELECT id, action, resource FROM "AuditLog"
         WHERE "userId" = $1 AND action = 'PROFILE_CREATED'
         LIMIT 1`,
        [testUserId]
      );
      if (res.rows.length > 0) {
        ok(`Trigger auto-insertó: action=${res.rows[0].action}`);
      } else {
        fail('Trigger auto-auditoría de Profile', 'No se encontró entrada en AuditLog');
      }
    } catch (e) {
      fail('Verificar auto-auditoría', e);
    }

    // UPDATE en Profile → debe generar PROFILE_UPDATED
    try {
      await client.query(
        `UPDATE "Profile" SET "fullName" = 'Audit Test Updated', "updatedAt" = NOW() WHERE id = $1`,
        [profileId]
      );
      await new Promise(r => setTimeout(r, 200));

      const res = await client.query(
        `SELECT action FROM "AuditLog"
         WHERE "userId" = $1 AND action = 'PROFILE_UPDATED'
         LIMIT 1`,
        [testUserId]
      );
      if (res.rows.length > 0) {
        ok('Trigger auto-insertó: action=PROFILE_UPDATED');
      } else {
        fail('Trigger PROFILE_UPDATED', 'No se encontró entrada en AuditLog');
      }
    } catch (e) {
      fail('Trigger PROFILE_UPDATED', e);
    }

    // Limpiar Profile de prueba (AuditLog queda permanente)
    await client.query(`DELETE FROM "Profile" WHERE id = $1`, [profileId]).catch(() => {});
  }

  // ── Paso 6: Verificar conteo total de registros AuditLog ────
  console.log('\n🔸  Estado final de AuditLog');
  try {
    const res = await client.query(`SELECT COUNT(*) as total FROM "AuditLog"`);
    ok(`AuditLog tiene ${res.rows[0].total} registros (solo INSERT posible)`);
  } catch (e) {
    fail('Conteo de registros', e);
  }

  // ── Resultado ────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════');
  console.log(`  Resultado: ${passed} pasaron, ${failed} fallaron`);
  console.log('══════════════════════════════════════════════\n');

  await client.end();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(async e => {
  console.error('Error fatal:', e);
  await client.end().catch(() => {});
  process.exit(1);
});
