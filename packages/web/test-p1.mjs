/**
 * Test P1 - Atomicidad de transacciones
 * Usa pg directo para setup y Supabase RPC para los tests
 * Ejecutar: node test-p1.mjs
 */

import pg from 'pg';
import { createClient } from '@supabase/supabase-js';

const { Client } = pg;

const SUPABASE_URL  = 'https://bmfiotbutuslsaxeumik.supabase.co';
const SUPABASE_ANON = 'sb_publishable_a9vOeuMWSKsTkWs39J2Miw_QsCcBPAh';
const DB_URL = process.env.DB_URL;
if (!DB_URL) { console.error('Falta la variable DB_URL (ver .env.example)'); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
const db = new Client({ connectionString: DB_URL });

const TS = Date.now();
const EMAIL_A = `sender-${TS}@test.local`;
const EMAIL_B = `receiver-${TS}@test.local`;

let passed = 0;
let failed = 0;
let profileAId, profileBId;

function ok(msg)   { console.log(`  ✅ ${msg}`); passed++; }
function fail(msg) { console.log(`  ❌ ${msg}`); failed++; }

async function setup() {
  console.log('\n📦 Insertando datos de prueba via DB directa...');
  await db.connect();

  // Crear perfil A
  const rA = await db.query(
    `INSERT INTO "Profile" (id, "userId", "fullName", email, "createdAt", "updatedAt")
     VALUES (gen_random_uuid()::text, $1, 'Test Sender', $2, NOW(), NOW()) RETURNING id`,
    [`uid-a-${TS}`, EMAIL_A]
  );
  profileAId = rA.rows[0].id;

  // Crear perfil B
  const rB = await db.query(
    `INSERT INTO "Profile" (id, "userId", "fullName", email, "createdAt", "updatedAt")
     VALUES (gen_random_uuid()::text, $1, 'Test Receiver', $2, NOW(), NOW()) RETURNING id`,
    [`uid-b-${TS}`, EMAIL_B]
  );
  profileBId = rB.rows[0].id;

  // Cuenta A con $1000
  await db.query(
    `INSERT INTO "Account" (id, "profileId", balance, type, number, status, "createdAt", "updatedAt")
     VALUES (gen_random_uuid()::text, $1, 1000, 'CHECKING', $2, 'ACTIVE', NOW(), NOW())`,
    [profileAId, `ACC-A-${TS}`]
  );

  // Cuenta B con $0
  await db.query(
    `INSERT INTO "Account" (id, "profileId", balance, type, number, status, "createdAt", "updatedAt")
     VALUES (gen_random_uuid()::text, $1, 0, 'CHECKING', $2, 'ACTIVE', NOW(), NOW())`,
    [profileBId, `ACC-B-${TS}`]
  );

  ok(`Remitente: ${EMAIL_A} → $1,000`);
  ok(`Destinatario: ${EMAIL_B} → $0`);
}

async function runTests() {
  // ── TEST 1: Transferencia normal ──────────────────────────────────────────
  console.log('\n🧪 TEST 1: Transferencia normal ($200)');
  const key1 = `idem-${TS}-1`;
  const r1 = await db.query(`SELECT transfer_funds($1,$2,$3,$4,$5) AS result`,
    [EMAIL_A, EMAIL_B, 200, 'Pago test', key1]);
  const t1 = r1.rows[0].result;
  if (t1?.status === 'completed') ok(`Transferencia completada. ID: ${t1.id}`);
  else fail(`Resultado inesperado: ${JSON.stringify(t1)}`);

  // ── TEST 2: Idempotencia ──────────────────────────────────────────────────
  console.log('\n🧪 TEST 2: Idempotencia (misma clave, no debe duplicar)');
  const r2 = await db.query(`SELECT transfer_funds($1,$2,$3,$4,$5) AS result`,
    [EMAIL_A, EMAIL_B, 200, 'Pago duplicado', key1]);
  const t2 = r2.rows[0].result;
  if (t2?.status === 'already_processed') ok(`Duplicado bloqueado correctamente`);
  else fail(`Debería ser already_processed, recibió: ${JSON.stringify(t2)}`);

  // ── TEST 3: Saldo insuficiente ────────────────────────────────────────────
  console.log('\n🧪 TEST 3: Saldo insuficiente ($999,999)');
  try {
    await db.query(`SELECT transfer_funds($1,$2,$3,$4,$5) AS result`,
      [EMAIL_A, EMAIL_B, 999999, 'Test grande', `idem-${TS}-3`]);
    fail('Debería haber lanzado excepción');
  } catch (e) {
    if (e.message.includes('insuficiente') || e.message.includes('Saldo'))
      ok(`Saldo insuficiente detectado: "${e.message.split('\n')[0]}"`);
    else fail(`Error inesperado: ${e.message}`);
  }

  // ── TEST 4: Auto-transferencia ────────────────────────────────────────────
  console.log('\n🧪 TEST 4: Auto-transferencia (A → A)');
  try {
    await db.query(`SELECT transfer_funds($1,$2,$3,$4,$5) AS result`,
      [EMAIL_A, EMAIL_A, 100, 'Self', `idem-${TS}-4`]);
    fail('Debería haber lanzado excepción');
  } catch (e) {
    if (e.message.includes('mismo')) ok(`Auto-transferencia bloqueada: "${e.message.split('\n')[0]}"`);
    else fail(`Error inesperado: ${e.message}`);
  }

  // ── TEST 5: Monto $0 ──────────────────────────────────────────────────────
  console.log('\n🧪 TEST 5: Monto inválido ($0)');
  try {
    await db.query(`SELECT transfer_funds($1,$2,$3,$4,$5) AS result`,
      [EMAIL_A, EMAIL_B, 0, 'Zero', `idem-${TS}-5`]);
    fail('Debería haber lanzado excepción');
  } catch (e) {
    if (e.message.includes('mayor')) ok(`Monto $0 bloqueado: "${e.message.split('\n')[0]}"`);
    else fail(`Error inesperado: ${e.message}`);
  }

  // ── TEST 6: Destinatario inexistente ──────────────────────────────────────
  console.log('\n🧪 TEST 6: Destinatario inexistente');
  try {
    await db.query(`SELECT transfer_funds($1,$2,$3,$4,$5) AS result`,
      [EMAIL_A, 'noexiste@fake.com', 50, 'Fake', `idem-${TS}-6`]);
    fail('Debería haber lanzado excepción');
  } catch (e) {
    if (e.message.includes('Destinatario')) ok(`Destinatario inválido detectado: "${e.message.split('\n')[0]}"`);
    else fail(`Error inesperado: ${e.message}`);
  }

  // ── TEST 7: Verificar saldo final ─────────────────────────────────────────
  console.log('\n📊 Verificando saldo final...');
  const sA = await db.query(`SELECT balance FROM "Account" WHERE "profileId" = $1`, [profileAId]);
  const sB = await db.query(`SELECT balance FROM "Account" WHERE "profileId" = $1`, [profileBId]);
  const balA = sA.rows[0]?.balance;
  const balB = sB.rows[0]?.balance;

  // Solo test 1 ejecutó: A: 1000-200=800, B: 0+200=200
  if (Number(balA) === 800) ok(`Saldo A correcto: $${balA} (esperado $800)`);
  else fail(`Saldo A incorrecto: $${balA} (esperado $800)`);

  if (Number(balB) === 200) ok(`Saldo B correcto: $${balB} (esperado $200)`);
  else fail(`Saldo B incorrecto: $${balB} (esperado $200)`);
}

async function cleanup() {
  console.log('\n🧹 Limpiando datos de prueba...');
  await db.query(`DELETE FROM "Transaction" WHERE "senderId" = $1 OR "receiverId" = $1`, [profileAId]);
  await db.query(`DELETE FROM "Account" WHERE "profileId" IN ($1,$2)`, [profileAId, profileBId]);
  await db.query(`DELETE FROM "Profile" WHERE id IN ($1,$2)`, [profileAId, profileBId]);
  await db.end();
  ok('Limpieza completada');
}

// ── Main ──────────────────────────────────────────────────────────────────────
console.log('═══════════════════════════════════════════');
console.log('  P1 TEST SUITE — Atomicidad de Transacciones');
console.log('═══════════════════════════════════════════');

try {
  await setup();
  await runTests();
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
