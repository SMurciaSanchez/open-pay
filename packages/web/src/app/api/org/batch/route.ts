/**
 * Anclar la lista de proveedores de un fondo y cerrar el lote de un rubro.
 *
 * Por qué pasa por el servidor: el compromiso de cada pago lleva su sal (N4),
 * que ningún rol de cliente puede leer, y publicar en la cadena necesita la
 * llave del publicador. El servidor hace solo eso. Todo lo demás —quién puede,
 * qué pagos entran, que el mes esté cerrado, que el lote esté completo— lo
 * deciden las funciones de la base.
 *
 * Orden que importa: primero se valida la sesión y se comprueba el rol con el
 * token del usuario; solo después se usa la llave de servicio. Con ella se
 * hacen dos cosas: leer las sales y llamar las funciones que registran y
 * anclan. Esas funciones no las puede ejecutar ningún cliente —si pudiera, un
 * tesorero las llamaría directo con una raíz o una transacción inventadas— y
 * reciben el perfil en cuyo nombre se actúa, cuyo rol vuelven a comprobar.
 *
 * Acciones:
 *   { action: 'anchor-vendors', fundId }
 *   { action: 'close', budgetId, periodStart: 'AAAA-MM-01' }
 */
import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/supabase';
import {
  DEFAULT_TREE_HEIGHT,
  VENDOR_TREE_HEIGHT,
  buildMerkleTree,
  buildVendorSet,
  paymentCommitment,
  pesosToMinorUnits,
  toBytes32,
} from '@/lib/zk/commitment';
import { publicDbError } from '@/lib/server/errors';
import { CHAIN_ID, ChainError, RootKind, fundSubject, isPublished, publishRoot, registryAddress } from '@/lib/server/chain';

export const runtime = 'nodejs';
export const maxDuration = 60;

/** Error que se le puede mostrar tal cual al usuario. */
class Rechazo extends Error {
  constructor(mensaje: string, public status = 400) {
    super(mensaje);
  }
}

/** bytes32 '0x…' → formato bytea de la API de Supabase. */
const bytea = (hex: string) => '\\x' + hex.replace(/^0x/, '');

async function db<T>(
  p: PromiseLike<{ data: T | null; error: { code?: string; message: string } | null }>,
): Promise<T> {
  const { data, error } = await p;
  if (error) {
    const publico = publicDbError(error);
    // Lo que no se le muestra al usuario queda aquí para quien opera el servidor.
    if (publico.status === 500) console.error('[api/org/batch] base:', error.code, error.message);
    throw new Rechazo(publico.mensaje, publico.status);
  }
  return data as T;
}

async function exigirTesorero(user: SupabaseClient, fundId: string) {
  const ok = await db<boolean>(user.rpc('has_fund_role', { p_fund_id: fundId, p_roles: ['TREASURER'] }));
  if (ok !== true) throw new Rechazo('Tu rol no permite hacer esto.', 403);
}

/** El servidor actuando en nombre de alguien cuya sesión ya validó. */
interface Servidor {
  admin: SupabaseClient;
  /** Profile.id de quien hizo la petición. */
  actor: string;
}

async function servidorPara(token: string): Promise<Servidor> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Rechazo('El servidor no tiene configurada la llave de servicio.', 500);
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new Rechazo('La sesión no es válida. Vuelve a iniciar sesión.', 401);
  const perfil = await db<{ id: string } | null>(
    admin.from('Profile').select('id').eq('userId', data.user.id).maybeSingle(),
  );
  if (!perfil) throw new Rechazo('Tu rol no permite hacer esto.', 403);
  return { admin, actor: perfil.id };
}

interface Anclado {
  id: string;
  root: string;
  txHash: string;
}

/** Registra la lista vigente de proveedores y la ancla si todavía no lo está. */
async function anclarProveedores(user: SupabaseClient, srv: Servidor, fundId: string): Promise<Anclado> {
  const vigentes = await db<{ id: string }[]>(
    user.from('AuthorizedVendor').select('id').eq('fundId', fundId).is('revokedAt', null),
  );
  if (vigentes.length === 0) throw new Rechazo('El fondo no tiene proveedores autorizados.');

  // El orden es parte de la lista: el camino de cada proveedor depende de él.
  const vendorIds = vigentes.map((v) => v.id).sort();
  const root = toBytes32(buildVendorSet(vendorIds).root);
  const subject = fundSubject(fundId);

  const id = await db<string>(
    srv.admin.rpc('record_vendor_set', {
      p_actor: srv.actor,
      p_fund_id: fundId,
      p_subject: bytea(subject),
      p_root: bytea(root),
      p_tree_height: VENDOR_TREE_HEIGHT,
      p_vendor_ids: vendorIds,
    }),
  );

  const lista = await db<{ status: string; txHash: string | null }>(
    user.from('VendorSetSnapshot').select('status, txHash').eq('id', id).single(),
  );
  if (lista.status === 'ANCHORED' && lista.txHash) return { id, root, txHash: lista.txHash };

  const txHash = await publishRoot(RootKind.VendorSet, subject, root);
  await db(
    srv.admin.rpc('anchor_vendor_set', {
      p_actor: srv.actor,
      p_vendor_set_id: id,
      p_chain_id: CHAIN_ID,
      p_contract: registryAddress(),
      p_tx_hash: txHash,
    }),
  );
  return { id, root, txHash };
}

function finDeMes(periodStart: string): string {
  const [a, m] = periodStart.split('-').map(Number);
  return new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10);
}

async function anclarLote(srv: Servidor, batchId: string, subject: string, root: string): Promise<string> {
  const txHash = await publishRoot(RootKind.PaymentBatch, subject, root);
  await db(
    srv.admin.rpc('anchor_payment_batch', {
      p_actor: srv.actor,
      p_batch_id: batchId,
      p_chain_id: CHAIN_ID,
      p_contract: registryAddress(),
      p_tx_hash: txHash,
    }),
  );
  return txHash;
}

async function cerrarLote(user: SupabaseClient, srv: Servidor, budgetId: string, periodStart: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])-01$/.test(periodStart)) {
    throw new Rechazo('El período tiene que ser el primer día de un mes (AAAA-MM-01).');
  }
  const periodEnd = finDeMes(periodStart);
  // Antes de gastar nada en la cadena. La base lo vuelve a comprobar.
  if (periodEnd >= new Date().toISOString().slice(0, 8) + '01') {
    throw new Rechazo('El mes todavía no ha cerrado.');
  }

  const rubro = await db<{ id: string; fundId: string } | null>(
    user.from('Budget').select('id, fundId').eq('id', budgetId).maybeSingle(),
  );
  if (!rubro) throw new Rechazo('Tu rol no permite hacer esto.', 403);
  await exigirTesorero(user, rubro.fundId);
  const subject = fundSubject(rubro.fundId);

  // Un intento anterior pudo dejar el lote armado sin anclar.
  const previo = await db<{ id: string; status: string; root: string; txHash: string | null } | null>(
    user.from('PaymentBatch').select('id, status, root, txHash').eq('budgetId', budgetId).eq('periodStart', periodStart).maybeSingle(),
  );
  if (previo) {
    const rootPrevio = '0x' + previo.root.replace(/^\\x/, '');
    if (previo.status === 'ANCHORED') {
      return { batchId: previo.id, batchRoot: rootPrevio, batchTxHash: previo.txHash, yaEstaba: true };
    }
    if (await isPublished(rootPrevio)) {
      const txHash = await anclarLote(srv, previo.id, subject, rootPrevio);
      return { batchId: previo.id, batchRoot: rootPrevio, batchTxHash: txHash, yaEstaba: false };
    }
    await db(srv.admin.rpc('discard_unanchored_batch', { p_actor: srv.actor, p_batch_id: previo.id }));
  }

  const lista = await anclarProveedores(user, srv, rubro.fundId);

  // Las sales de los pagos del lote: ningún rol de cliente las puede leer.
  const pagos = await db<{ id: string; amount: number | string; vendorId: string; paidOn: string; salt: string }[]>(
    srv.admin
      .from('Payment')
      .select('id, amount, vendorId, paidOn, salt')
      .eq('budgetId', budgetId)
      .eq('status', 'RECONCILED')
      .gte('paidOn', periodStart)
      .lte('paidOn', periodEnd),
  );
  if (pagos.length === 0) throw new Rechazo('No hay pagos conciliados de ese rubro en ese mes.');
  if (pagos.length > 2 ** DEFAULT_TREE_HEIGHT) {
    throw new Rechazo(`El rubro tiene ${pagos.length} pagos en el mes y un lote admite ${2 ** DEFAULT_TREE_HEIGHT}.`);
  }

  pagos.sort((a, b) => (a.id < b.id ? -1 : 1));
  const compromisos = pagos.map((p) =>
    paymentCommitment({
      paymentId: p.id,
      amountMinorUnits: pesosToMinorUnits(p.amount),
      vendorId: p.vendorId,
      paidOn: p.paidOn,
      saltHex: p.salt,
    }),
  );
  const root = toBytes32(buildMerkleTree(compromisos).root);

  const batchId = await db<string>(
    srv.admin.rpc('record_budget_batch', {
      p_actor: srv.actor,
      p_budget_id: budgetId,
      p_vendor_set_id: lista.id,
      p_subject: bytea(subject),
      p_root: bytea(root),
      p_tree_height: DEFAULT_TREE_HEIGHT,
      p_period_start: periodStart,
      p_leaves: pagos.map((p, i) => ({
        paymentId: p.id,
        leafIndex: i,
        commitment: bytea(toBytes32(compromisos[i])),
      })),
    }),
  );

  const txHash = await anclarLote(srv, batchId, subject, root);
  return { batchId, batchRoot: root, batchTxHash: txHash, vendorSetRoot: lista.root, yaEstaba: false };
}

export async function POST(req: Request) {
  try {
    const token = /^Bearer (.+)$/.exec(req.headers.get('authorization') ?? '')?.[1];
    if (!token) throw new Rechazo('Falta la sesión.', 401);

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) throw new Rechazo('Cuerpo inválido.');
    const user = getSupabaseClient(token);

    if (body.action === 'anchor-vendors' && typeof body.fundId === 'string') {
      await exigirTesorero(user, body.fundId);
      const lista = await anclarProveedores(user, await servidorPara(token), body.fundId);
      return NextResponse.json({ vendorSetId: lista.id, vendorSetRoot: lista.root, txHash: lista.txHash });
    }

    if (body.action === 'close' && typeof body.budgetId === 'string' && typeof body.periodStart === 'string') {
      return NextResponse.json(await cerrarLote(user, await servidorPara(token), body.budgetId, body.periodStart));
    }

    throw new Rechazo('Acción inválida.');
  } catch (e) {
    if (e instanceof Rechazo) return NextResponse.json({ error: e.message }, { status: e.status });
    if (e instanceof ChainError) return NextResponse.json({ error: e.message }, { status: 502 });
    console.error('[api/org/batch]', e);
    return NextResponse.json({ error: 'Error interno al cerrar el lote.' }, { status: 500 });
  }
}
