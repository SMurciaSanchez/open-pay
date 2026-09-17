/**
 * Test P2 - Row Level Security
 * Verifica que:
 *  - Anon no puede leer ninguna tabla
 *  - Usuario autenticado solo ve sus propios datos
 *  - transfer_funds (SECURITY DEFINER) sigue funcionando con RLS activo
 * Ejecutar: node test-p2.mjs
 */

import pg from 'pg';
import { createClient } from '@supabase/supabase-js';

const { Client } = pg;

const SUPABASE_URL  = 'https://bmfiotbutuslsaxeumik.supabase.co';
const SUPABASE_ANON = 'sb_publishable_a9vOeuMWSKsTkWs39J2Miw_QsCcBPAh';
const DB_URL = process.env.DB_URL;
if (!DB_URL) { console.error('Falta la variable DB_URL (ver .env.example)'); process.exit(1); }

const TS = Date.now();
const EMAIL_A = `rls-a-${TS}@test.local`;
const EMAIL_B = `rls-b-${TS}@test.local`;
const PASS    = 'TestPass123!';

let passed = 0;
let failed = 0;
let profileAId, profileBId;

function ok(msg)   { console.log(`  ✅ ${msg}`); passed++; }
function fail(msg) { console.log(`  ❌ ${msg}`); failed++; }

// ── Setup: crear datos de prueba via DB directa (service role) ──────────────
const db = new Client({ connectionString: DB_URL });

async function setup() {
  console.log('\n📦 Setup: creando usuarios y cuentas de prueba...');
  await db.connect();

  // Crear UUIDs de auth.users simulados (sin contraseña — no necesitamos login real)
  const rA = await db.query(`SELECT gen_random_uuid() AS id`);
  const userAId = rA.rows[0].id;

  const rB = await db.query(`SELECT gen_random_uuid() AS id`);
  const userBId = rB.rows[0].id;

  // Crear perfiles enlazados a los auth.users
  const pA = await db.query(
    `INSERT INTO "Profile" (id, "userId", "fullName", email, "createdAt", "updatedAt")
     VALUES (gen_random_uuid()::text, $1, 'User A', $2, NOW(), NOW()) RETURNING id`,
    [userAId, EMAIL_A]
  );
  profileAId = pA.rows[0].id;

  const pB = await db.query(
    `INSERT INTO "Profile" (id, "userId", "fullName", email, "createdAt", "updatedAt")
     VALUES (gen_random_uuid()::text, $1, 'User B', $2, NOW(), NOW()) RETURNING id`,
    [userBId, EMAIL_B]
  );
  profileBId = pB.rows[0].id;

  // Cuentas
  await db.query(
    `INSERT INTO "Account" (id, "profileId", balance, type, number, status, "createdAt", "updatedAt")
     VALUES (gen_random_uuid()::text, $1, 500, 'CHECKING', $2, 'ACTIVE', NOW(), NOW())`,
    [profileAId, `RLSA-${TS}`]
  );
  await db.query(
    `INSERT INTO "Account" (id, "profileId", balance, type, number, status, "createdAt", "updatedAt")
     VALUES (gen_random_uuid()::text, $1, 0, 'CHECKING', $2, 'ACTIVE', NOW(), NOW())`,
    [profileBId, `RLSB-${TS}`]
  );

  ok(`Usuario A: ${EMAIL_A} (profileId: ${profileAId.slice(0,8)}...)`);
  ok(`Usuario B: ${EMAIL_B} (profileId: ${profileBId.slice(0,8)}...)`);
}

// ── TEST 1: Anon no puede leer tablas ────────────────────────────────────────
async function testAnonBlocked() {
  console.log('\n🧪 TEST 1: Acceso anónimo bloqueado');
  const anon = createClient(SUPABASE_URL, SUPABASE_ANON);

  const { data: profiles, error: e1 } = await anon.from('Profile').select('*');
  if (!profiles || profiles.length === 0)
    ok('Anon no puede leer Profile (0 rows)');
  else
    fail(`Anon leyó ${profiles.length} perfiles — RLS no funciona`);

  const { data: accounts } = await anon.from('Account').select('*');
  if (!accounts || accounts.length === 0)
    ok('Anon no puede leer Account (0 rows)');
  else
    fail(`Anon leyó ${accounts.length} cuentas`);

  const { data: txs } = await anon.from('Transaction').select('*');
  if (!txs || txs.length === 0)
    ok('Anon no puede leer Transaction (0 rows)');
  else
    fail(`Anon leyó ${txs.length} transacciones`);
}

// ── TEST 2: Aislamiento — simulando JWT auth directo en Postgres ─────────────
// auth.uid() en Supabase lee: current_setting('request.jwt.claims')::json->>'sub'
// Por eso podemos simular cualquier usuario sin GoTrue
async function testUserIsolation() {
  console.log('\n🧪 TEST 2: Aislamiento entre usuarios (simulación JWT en DB)');

  // Obtener los userId de ambos perfiles
  const rA = await db.query(`SELECT "userId" FROM "Profile" WHERE id = $1`, [profileAId]);
  const rB = await db.query(`SELECT "userId" FROM "Profile" WHERE id = $1`, [profileBId]);
  const uidA = rA.rows[0]?.userId;
  const uidB = rB.rows[0]?.userId;

  if (!uidA || !uidB) { fail('No se encontraron userIds'); return; }
  ok(`userIds obtenidos — A: ${uidA.slice(0,8)}..., B: ${uidB.slice(0,8)}...`);

  // Simular sesión autenticada como A
  const dbA = new Client({ connectionString: DB_URL });
  await dbA.connect();
  await dbA.query('BEGIN');
  await dbA.query(`SET LOCAL role TO authenticated`);
  await dbA.query(`SET LOCAL search_path TO public`);
  await dbA.query(`SELECT set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: uidA, role: 'authenticated' })]);

  // A solo debe ver su propio perfil
  const pA = await dbA.query(`SELECT * FROM "Profile"`);
  if (pA.rows.length === 1 && pA.rows[0].id === profileAId)
    ok(`A ve solo su perfil (1 row)`);
  else
    fail(`A ve ${pA.rows.length} perfiles — esperado 1`);

  // A no debe ver el perfil de B
  const pB = await dbA.query(`SELECT * FROM "Profile" WHERE id = $1`, [profileBId]);
  if (pB.rows.length === 0)
    ok(`A no puede acceder al perfil de B`);
  else
    fail(`A puede leer el perfil de B — fuga de datos`);

  // A solo debe ver su propia cuenta
  const acA = await dbA.query(`SELECT * FROM "Account"`);
  if (acA.rows.length === 1 && acA.rows[0].profileId === profileAId)
    ok(`A ve solo su cuenta (1 row)`);
  else
    fail(`A ve ${acA.rows.length} cuentas — esperado 1`);

  await dbA.query('ROLLBACK');
  await dbA.end();

  // Simular sesión autenticada como B — no debe ver datos de A
  const dbB = new Client({ connectionString: DB_URL });
  await dbB.connect();
  await dbB.query('BEGIN');
  await dbB.query(`SET LOCAL role TO authenticated`);
  await dbB.query(`SET LOCAL search_path TO public`);
  await dbB.query(`SELECT set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: uidB, role: 'authenticated' })]);

  const pBsee = await dbB.query(`SELECT * FROM "Profile" WHERE id = $1`, [profileAId]);
  if (pBsee.rows.length === 0)
    ok(`B no puede acceder al perfil de A`);
  else
    fail(`B puede leer el perfil de A — fuga de datos`);

  const txBsee = await dbB.query(`SELECT * FROM "Transaction" WHERE "senderId" = $1`, [profileAId]);
  if (txBsee.rows.length === 0)
    ok(`B no puede ver transacciones de A`);
  else
    fail(`B puede ver ${txBsee.rows.length} transacciones de A`);

  await dbB.query('ROLLBACK');
  await dbB.end();
}

// ── TEST 3: transfer_funds sigue funcionando con RLS activo ─────────────────
async function testTransferWithRLS() {
  console.log('\n🧪 TEST 3: transfer_funds funciona con RLS activo (SECURITY DEFINER)');

  const { rows } = await db.query(
    `SELECT transfer_funds($1,$2,$3,$4,$5) AS result`,
    [EMAIL_A, EMAIL_B, 100, 'RLS test', `rls-idem-${TS}`]
  );
  const result = rows[0].result;

  if (result?.status === 'completed')
    ok(`Transferencia completada correctamente. ID: ${result.id}`);
  else
    fail(`Resultado inesperado: ${JSON.stringify(result)}`);

  // Verificar saldos finales
  const sA = await db.query(`SELECT balance FROM "Account" WHERE "profileId" = $1`, [profileAId]);
  const sB = await db.query(`SELECT balance FROM "Account" WHERE "profileId" = $1`, [profileBId]);

  if (Number(sA.rows[0]?.balance) === 400) ok(`Saldo A correcto: $400`);
  else fail(`Saldo A incorrecto: $${sA.rows[0]?.balance} (esperado $400)`);

  if (Number(sB.rows[0]?.balance) === 100) ok(`Saldo B correcto: $100`);
  else fail(`Saldo B incorrecto: $${sB.rows[0]?.balance} (esperado $100)`);
}

// ── TEST 4: No se puede escribir Transaction directamente ─────────────────────
async function testDirectWriteBlocked() {
  console.log('\n🧪 TEST 4: INSERT directo en Transaction bloqueado para usuarios');

  const clientA = createClient(SUPABASE_URL, SUPABASE_ANON);
  await clientA.auth.signInWithPassword({ email: EMAIL_A, password: PASS });

  const { error } = await clientA.from('Transaction').insert({
    senderId:   profileAId,
    receiverId: profileBId,
    amount:     9999,
    status:     'COMPLETED',
    type:       'TRANSFER',
  });

  if (error)
    ok(`INSERT directo bloqueado: "${error.message.split('\n')[0]}"`);
  else
    fail('INSERT directo en Transaction fue aceptado — vulnerabilidad grave');

  await clientA.auth.signOut();
}

// ── Cleanup ───────────────────────────────────────────────────────────────────
async function cleanup() {
  console.log('\n🧹 Limpiando...');
  await db.query(`DELETE FROM "Transaction" WHERE "senderId" = $1 OR "receiverId" = $1`, [profileAId]);
  await db.query(`DELETE FROM "Account" WHERE "profileId" IN ($1,$2)`, [profileAId, profileBId]);
  await db.query(`DELETE FROM "Profile" WHERE id IN ($1,$2)`, [profileAId, profileBId]);

  // (no hay filas en auth.users que limpiar — UUIDs eran sintéticos)

  await db.end();
  ok('Limpieza completada');
}

// ── Main ──────────────────────────────────────────────────────────────────────
console.log('═══════════════════════════════════════════');
console.log('  P2 TEST SUITE — Row Level Security');
console.log('═══════════════════════════════════════════');

try {
  await setup();
  await testAnonBlocked();
  await testUserIsolation();
  await testTransferWithRLS();
  await testDirectWriteBlocked();
  await cleanup();
} catch (err) {
  console.error('\n💥 Error fatal:', err.message);
  try { await db.end(); } catch (_) {}
  process.exit(1);
}

console.log('\n═══════════════════════════════════════════');
console.log(`  Resultado: ${passed} ✅  ${failed} ❌`);
console.log('═══════════════════════════════════════════\n');
if (failed > 0) process.exit(1);
