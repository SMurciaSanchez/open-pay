/**
 * Lotes anclados y lista de proveedores anclada.
 *
 * Leer se hace con la sesión del usuario. Anclar la lista y cerrar un lote van
 * por /api/org/batch, porque necesitan la sal de los pagos y la llave del
 * publicador, que solo tiene el servidor.
 */
import { supabase } from '../supabase';
import { unwrap } from './org';

export interface VendorSet {
  id: string;
  fundId: string;
  /** bytea como lo devuelve la API: \x + 64 hexadecimales */
  root: string;
  vendorIds: string[];
  status: 'BUILT' | 'ANCHORED';
  txHash: string | null;
  anchoredAt: string | null;
  builtAt: string;
}

export interface Batch {
  id: string;
  fundId: string;
  budgetId: string | null;
  root: string;
  periodStart: string;
  periodEnd: string;
  status: 'BUILT' | 'ANCHORED';
  txHash: string | null;
  anchoredAt: string | null;
  /** Si ya se subió la prueba ZK del lote. */
  proved: boolean;
}

export const hex32 = (bytea: string) => '0x' + bytea.replace(/^\\x/, '');

export async function listVendorSets(fundId: string): Promise<VendorSet[]> {
  return unwrap(
    supabase
      .from('VendorSetSnapshot')
      .select('id, fundId, root, vendorIds, status, txHash, anchoredAt, builtAt')
      .eq('fundId', fundId)
      .order('builtAt', { ascending: false }),
  );
}

export async function listBatches(fundId: string): Promise<Batch[]> {
  const lotes = (await unwrap(
    supabase
      .from('PaymentBatch')
      .select('id, fundId, budgetId, root, periodStart, periodEnd, status, txHash, anchoredAt')
      .eq('fundId', fundId)
      .order('periodStart', { ascending: false }),
  )) as Omit<Batch, 'proved'>[];
  if (lotes.length === 0) return [];
  const pruebas = (await unwrap(
    supabase.from('BatchProof').select('batchId').in('batchId', lotes.map((l) => l.id)),
  )) as { batchId: string }[];
  const conPrueba = new Set(pruebas.map((p) => p.batchId));
  return lotes.map((l) => ({ ...l, proved: conPrueba.has(l.id) }));
}

/** Ids de los pagos que ya están en algún lote. */
export async function batchedPaymentIds(paymentIds: string[]): Promise<Set<string>> {
  if (paymentIds.length === 0) return new Set();
  const filas = (await unwrap(
    supabase.from('PaymentCommitment').select('paymentId').in('paymentId', paymentIds),
  )) as { paymentId: string }[];
  return new Set(filas.map((f) => f.paymentId));
}

async function llamar<T>(body: Record<string, unknown>): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('No hay sesión');
  const r = await fetch('/api/org/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify(body),
  });
  const cuerpo = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(cuerpo.error ?? 'No se pudo completar la operación.');
  return cuerpo as T;
}

/** Ancla en la cadena la lista vigente de proveedores autorizados del fondo. */
export async function anchorVendors(fundId: string): Promise<{ vendorSetRoot: string; txHash: string }> {
  return llamar({ action: 'anchor-vendors', fundId });
}

/** Cierra el lote de un rubro para un mes ya terminado y ancla su raíz. */
export async function closeBatch(budgetId: string, periodStart: string): Promise<{ batchId: string; batchTxHash: string }> {
  return llamar({ action: 'close', budgetId, periodStart });
}
