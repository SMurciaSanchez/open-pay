/**
 * Banco de la organización: cuentas, extractos y conciliación.
 *
 * Igual que en org.ts, las reglas viven en la base. Lo único que pasa por el
 * servidor de la aplicación es el cifrado del número de cuenta y de la glosa
 * de los movimientos (/api/org/bank/encrypt), porque la llave no puede estar
 * en el navegador.
 */
import { supabase } from '../supabase';
import { parseExtracto, netoDe, type MovimientoCsv } from '../bank/csv';
import { myProfileId, unwrap } from './org';

export interface BankAccount {
  id: string;
  organizationId: string;
  bankName: string;
  alias: string;
  last4: string;
  closedAt: string | null;
}

export interface BankStatement {
  id: string;
  bankAccountId: string;
  organizationId: string;
  periodStart: string;
  periodEnd: string;
  openingBalance: number;
  closingBalance: number;
  /** bytea como lo devuelve la API: \x + 64 hexadecimales */
  fileSha256: string;
  declaredCount: number;
  status: 'IMPORTING' | 'SEALED';
  importedAt: string;
  sealedAt: string | null;
}

export interface BankMovement {
  id: string;
  statementId: string;
  postedOn: string;
  direction: 'DEBIT' | 'CREDIT';
  amount: number;
  bankReference: string;
}

export interface Reconciliation {
  id: string;
  paymentId: string;
  movementId: string;
  reconciledAt: string;
}

async function cifrar(
  organizationId: string,
  field: 'account-number' | 'movement-description',
  values: string[],
): Promise<{ keyId: string; ciphers: string[] }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('No hay sesión');
  const r = await fetch('/api/org/bank/encrypt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ organizationId, field, values }),
  });
  const cuerpo = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(cuerpo.error ?? 'No se pudo cifrar el dato bancario.');
  return cuerpo;
}

async function descifrar<T>(cuerpo: Record<string, unknown>): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('No hay sesión');
  const r = await fetch('/api/org/bank/decrypt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify(cuerpo),
  });
  const respuesta = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(respuesta.error ?? 'No se pudo leer el dato bancario.');
  return respuesta as T;
}

/** Número completo de una cuenta. Solo tesorería; se descifra en el servidor. */
export async function revealAccountNumber(orgId: string, accountId: string): Promise<string> {
  return (await descifrar<{ number: string }>({ organizationId: orgId, accountId })).number;
}

/** Glosas de los movimientos de unos extractos, por id de movimiento. Solo tesorería. */
export async function revealDescriptions(orgId: string, statementIds: string[]): Promise<Record<string, string>> {
  if (statementIds.length === 0) return {};
  return (await descifrar<{ descriptions: Record<string, string> }>({ organizationId: orgId, statementIds })).descriptions;
}

// ── Cuentas ────────────────────────────────────────────────────

/** Solo el tesorero las ve: a los demás roles la base les devuelve lista vacía. */
export async function listBankAccounts(orgId: string): Promise<BankAccount[]> {
  return unwrap(
    supabase
      .from('OrgBankAccount')
      .select('id, organizationId, bankName, alias, last4, closedAt')
      .eq('organizationId', orgId)
      .order('createdAt'),
  );
}

export async function createBankAccount(
  orgId: string,
  bankName: string,
  alias: string,
  number: string,
): Promise<void> {
  const digitos = number.replace(/[\s-]/g, '');
  if (!/^\d{6,20}$/.test(digitos)) throw new Error('El número de cuenta debe tener entre 6 y 20 dígitos.');
  const { keyId, ciphers } = await cifrar(orgId, 'account-number', [digitos]);
  await unwrap(
    supabase.from('OrgBankAccount').insert({
      organizationId: orgId,
      bankName,
      alias,
      last4: digitos.slice(-4),
      numberCipher: ciphers[0],
      keyId,
    }),
  );
}

// ── Extractos ──────────────────────────────────────────────────

export async function listStatements(orgId: string): Promise<BankStatement[]> {
  return unwrap(
    supabase
      .from('BankStatement')
      .select('*')
      .eq('organizationId', orgId)
      .order('periodStart', { ascending: false }),
  );
}

export async function listMovements(statementIds: string[]): Promise<BankMovement[]> {
  if (statementIds.length === 0) return [];
  return unwrap(
    supabase
      .from('BankMovement')
      .select('id, statementId, postedOn, direction, amount, bankReference')
      .in('statementId', statementIds)
      .order('postedOn'),
  );
}

async function sha256Hex(datos: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', datos);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, '0')).join('');
}

export interface NewStatement {
  organizationId: string;
  bankAccountId: string;
  periodStart: string;
  periodEnd: string;
  openingBalance: number;
  closingBalance: number;
  file: File;
}

/** Lee el archivo sin guardar nada: sirve para mostrar el resumen antes de importar. */
export async function leerExtracto(file: File): Promise<{ movimientos: MovimientoCsv[]; neto: number }> {
  const movimientos = parseExtracto(await file.text());
  return { movimientos, neto: netoDe(movimientos) };
}

/**
 * Importa el extracto como borrador (IMPORTING). Guarda la huella SHA-256 del
 * archivo tal como llegó: es lo que deja a un auditor comprobar que lo
 * importado es el archivo original. Sellarlo es un paso aparte.
 */
export async function importStatement(s: NewStatement): Promise<string> {
  const bytes = await s.file.arrayBuffer();
  const movimientos = parseExtracto(new TextDecoder('utf-8').decode(bytes));
  const fuera = movimientos.find((m) => m.postedOn < s.periodStart || m.postedOn > s.periodEnd);
  if (fuera) {
    throw new Error(`El movimiento ${fuera.bankReference} (${fuera.postedOn}) cae fuera del período del extracto.`);
  }

  const [yo, hash, cifrado] = await Promise.all([
    myProfileId(),
    sha256Hex(bytes),
    cifrar(s.organizationId, 'movement-description', movimientos.map((m) => m.description || '(sin glosa)')),
  ]);

  const extracto = await unwrap(
    supabase
      .from('BankStatement')
      .insert({
        bankAccountId: s.bankAccountId,
        organizationId: s.organizationId,
        periodStart: s.periodStart,
        periodEnd: s.periodEnd,
        openingBalance: s.openingBalance,
        closingBalance: s.closingBalance,
        fileSha256: '\\x' + hash,
        declaredCount: movimientos.length,
        importedBy: yo,
      })
      .select('id')
      .single<{ id: string }>(),
  );

  try {
    await unwrap(
      supabase.from('BankMovement').insert(
        movimientos.map((m, i) => ({
          statementId: extracto.id,
          periodStart: s.periodStart,
          periodEnd: s.periodEnd,
          postedOn: m.postedOn,
          direction: m.direction,
          amount: m.amount,
          bankReference: m.bankReference,
          descriptionCipher: cifrado.ciphers[i],
          keyId: cifrado.keyId,
        })),
      ),
    );
  } catch (e) {
    // Sin sus movimientos el borrador no sirve: se descarta para poder reintentar.
    await supabase.from('BankStatement').delete().eq('id', extracto.id);
    throw e;
  }
  return extracto.id;
}

/** La base comprueba que los movimientos cuadren con los saldos antes de sellar. */
export async function sealStatement(statementId: string): Promise<void> {
  await unwrap(supabase.rpc('seal_bank_statement', { p_statement_id: statementId }));
}

/** Solo borradores: uno sellado no se borra. */
export async function discardStatement(statementId: string): Promise<void> {
  await unwrap(supabase.from('BankStatement').delete().eq('id', statementId));
}

// ── Conciliación ───────────────────────────────────────────────

/** Conciliaciones vigentes (no revocadas) de los pagos que el usuario puede ver. */
export async function listReconciliations(paymentIds: string[]): Promise<Reconciliation[]> {
  if (paymentIds.length === 0) return [];
  return unwrap(
    supabase
      .from('PaymentReconciliation')
      .select('id, paymentId, movementId, reconciledAt')
      .in('paymentId', paymentIds)
      .is('revokedAt', null),
  );
}

/** Movimientos ya usados por una conciliación vigente (de cualquier fondo de la organización). */
export async function usedMovementIds(movementIds: string[]): Promise<Set<string>> {
  if (movementIds.length === 0) return new Set();
  const filas = await unwrap(
    supabase
      .from('PaymentReconciliation')
      .select('movementId')
      .in('movementId', movementIds)
      .is('revokedAt', null),
  );
  return new Set((filas as { movementId: string }[]).map((f) => f.movementId));
}

export async function reconcilePayment(paymentId: string, movementId: string): Promise<void> {
  await unwrap(supabase.rpc('reconcile_payment', { p_payment_id: paymentId, p_movement_id: movementId }));
}

export async function unreconcilePayment(reconciliationId: string, reason: string): Promise<void> {
  await unwrap(
    supabase.rpc('unreconcile_payment', { p_reconciliation_id: reconciliationId, p_reason: reason }),
  );
}
