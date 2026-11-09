/**
 * Genera la prueba ZK de un lote real y la publica.
 *
 *   npm run prove-batch -- <id del lote>
 *       Lee el lote ya anclado, genera la prueba, la verifica y la sube a
 *       BatchProof. Desde ahí la muestra /verificar?lote=<id>.
 *
 *   npm run prove-batch -- --simular <id del rubro> <AAAA-MM-01>
 *       Arma el lote igual que lo armaría el servidor al cerrar ese mes, lo
 *       prueba y lo verifica, pero no escribe nada: ni en la base ni en la
 *       cadena. Sirve para saber antes de que cierre el mes si el lote va a
 *       poder probarse.
 *
 * Corre en el PC del operador porque la clave de prueba no cabe en el servidor
 * de la web. Usa la llave de servicio de Supabase: necesita la sal de cada pago
 * (N4), que ningún rol de cliente puede leer. La toma de
 * packages/web/.env.local o de las variables SUPABASE_URL y
 * SUPABASE_SERVICE_ROLE_KEY. No imprime ningún pago.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { toBytes32, type PaymentInput } from '../../contracts/src/commitment';
import { buildWitness } from './witness';
import { cerrarProver, prove, verify, verificationKeyHash, loadVerificationKey } from './prove';

// ── Configuración ──────────────────────────────────────────────

function leerEnvLocal(): Record<string, string> {
  const archivo = path.resolve(__dirname, '..', '..', 'web', '.env.local');
  if (!existsSync(archivo)) return {};
  return Object.fromEntries(
    readFileSync(archivo, 'utf8')
      .split(/\r?\n/)
      .filter((l) => /^[A-Z_]+=/.test(l))
      .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]),
  );
}

const local = leerEnvLocal();
const SUPABASE_URL = process.env.SUPABASE_URL ?? local.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? local.SUPABASE_SERVICE_ROLE_KEY;

async function rest<T>(ruta: string, init: RequestInit = {}): Promise<T> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${ruta}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY!,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  const texto = await r.text();
  if (!r.ok) throw new Error(`Supabase respondió ${r.status} en ${ruta.split('?')[0]}: ${texto}`);
  return (texto ? JSON.parse(texto) : null) as T;
}

// ── Lectura ────────────────────────────────────────────────────

interface FilaPago {
  id: string;
  amount: number | string;
  vendorId: string;
  paidOn: string;
  salt: string;
}

/** Pesos con hasta dos decimales → unidades mínimas, sin pasar por decimales flotantes. */
function aUnidadesMinimas(monto: number | string): bigint {
  const texto = typeof monto === 'number' ? monto.toFixed(2) : monto.trim();
  const r = /^(\d+)(?:\.(\d{1,2}))?$/.exec(texto);
  if (!r) throw new Error(`Monto inválido: ${monto}`);
  return BigInt(r[1]) * 100n + BigInt((r[2] ?? '').padEnd(2, '0'));
}

const aPago = (p: FilaPago): PaymentInput => ({
  paymentId: p.id,
  amountMinorUnits: aUnidadesMinimas(p.amount),
  vendorId: p.vendorId,
  paidOn: p.paidOn,
  saltHex: p.salt,
});

const hex = (bytea: string) => '0x' + bytea.slice(2); // \x… → 0x…
const enLista = (ids: string[]) => `in.(${ids.map((i) => `"${i}"`).join(',')})`;

interface Lote {
  pagos: PaymentInput[];
  vendorIds: string[];
  tope: bigint;
  /** Lo anclado, si el lote ya existe: la prueba tiene que dar estas mismas raíces. */
  esperado?: { batchRoot: string; vendorSetRoot: string };
}

async function leerLote(batchId: string): Promise<Lote> {
  const [lote] = await rest<
    { id: string; status: string; root: string; budgetId: string | null; vendorSetId: string | null }[]
  >(`PaymentBatch?id=eq.${batchId}&select=id,status,root,budgetId,vendorSetId`);
  if (!lote) throw new Error(`No existe el lote ${batchId}`);
  if (lote.status !== 'ANCHORED') throw new Error('El lote todavía no está anclado: primero se ancla, después se prueba.');
  if (!lote.budgetId || !lote.vendorSetId) throw new Error('El lote no es de un rubro (formato anterior al panel).');

  const [[lista], [rubro], hojas] = await Promise.all([
    rest<{ root: string; vendorIds: string[]; status: string }[]>(
      `VendorSetSnapshot?id=eq.${lote.vendorSetId}&select=root,vendorIds,status`,
    ),
    rest<{ amount: number | string }[]>(`Budget?id=eq.${lote.budgetId}&select=amount`),
    rest<{ paymentId: string; leafIndex: number }[]>(
      `PaymentCommitment?batchId=eq.${batchId}&select=paymentId,leafIndex&order=leafIndex`,
    ),
  ]);
  if (hojas.some((h, i) => h.leafIndex !== i)) throw new Error('Las hojas del lote no son consecutivas.');

  const filas = await rest<FilaPago[]>(
    `Payment?id=${enLista(hojas.map((h) => h.paymentId))}&select=id,amount,vendorId,paidOn,salt`,
  );
  const porId = new Map(filas.map((f) => [f.id, f]));
  const pagos = hojas.map((h) => {
    const fila = porId.get(h.paymentId);
    if (!fila) throw new Error('Falta un pago del lote en la base.');
    return aPago(fila);
  });

  return {
    pagos,
    vendorIds: lista.vendorIds,
    tope: aUnidadesMinimas(rubro.amount),
    esperado: { batchRoot: hex(lote.root), vendorSetRoot: hex(lista.root) },
  };
}

/** Lo mismo que hará /api/org/batch al cerrar: pagos por id, proveedores vigentes por id. */
async function simularLote(budgetId: string, inicio: string): Promise<Lote> {
  if (!/^\d{4}-(0[1-9]|1[0-2])-01$/.test(inicio)) throw new Error('El período es AAAA-MM-01.');
  const [a, m] = inicio.split('-').map(Number);
  const fin = new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10);

  const [rubro] = await rest<{ amount: number | string; fundId: string }[]>(
    `Budget?id=eq.${budgetId}&select=amount,fundId`,
  );
  if (!rubro) throw new Error(`No existe el rubro ${budgetId}`);

  const [filas, proveedores] = await Promise.all([
    rest<FilaPago[]>(
      `Payment?budgetId=eq.${budgetId}&status=eq.RECONCILED&paidOn=gte.${inicio}&paidOn=lte.${fin}` +
        '&select=id,amount,vendorId,paidOn,salt',
    ),
    rest<{ id: string }[]>(`AuthorizedVendor?fundId=eq.${rubro.fundId}&revokedAt=is.null&select=id`),
  ]);
  if (filas.length === 0) throw new Error('No hay pagos conciliados de ese rubro en ese mes.');

  filas.sort((x, y) => (x.id < y.id ? -1 : 1));
  return {
    pagos: filas.map(aPago),
    vendorIds: proveedores.map((v) => v.id).sort(),
    tope: aUnidadesMinimas(rubro.amount),
  };
}

// ── Principal ──────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const simular = args[0] === '--simular';
  if ((simular && args.length !== 3) || (!simular && args.length !== 1)) {
    console.error('Uso:  npm run prove-batch -- <id del lote>');
    console.error('      npm run prove-batch -- --simular <id del rubro> <AAAA-MM-01>');
    process.exitCode = 1;
    return;
  }
  if (!SUPABASE_URL || !SERVICE_KEY) {
    throw new Error('Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (o packages/web/.env.local).');
  }

  const lote = simular ? await simularLote(args[1], args[2]) : await leerLote(args[0]);
  console.log(simular ? 'Simulación: no se escribe nada.' : `Lote ${args[0]}`);
  console.log(`Tope del rubro: ${lote.tope / 100n} pesos. Proveedores en la lista: ${lote.vendorIds.length}.`);

  // Antes de gastar el tiempo de la prueba: que las raíces sean las ancladas.
  const testigo = buildWitness({ payments: lote.pagos, vendorIds: lote.vendorIds, budgetLimit: lote.tope });
  const raíces = { batchRoot: toBytes32(testigo.batchRoot), vendorSetRoot: toBytes32(testigo.vendorSetRoot) };
  if (lote.esperado) {
    if (raíces.batchRoot !== lote.esperado.batchRoot) {
      throw new Error('La raíz del lote recalculada no es la anclada: la base y la cadena no coinciden.');
    }
    if (raíces.vendorSetRoot !== lote.esperado.vendorSetRoot) {
      throw new Error('La raíz de proveedores recalculada no es la anclada.');
    }
    console.log('Las raíces recalculadas coinciden con las ancladas.');
  }

  console.log('Generando la prueba...');
  const inicio = Date.now();
  const bundle = await prove({ payments: lote.pagos, vendorIds: lote.vendorIds, budgetLimit: lote.tope });
  console.log(`Lista en ${((Date.now() - inicio) / 1000).toFixed(1)} s`);

  if (!(await verify(bundle))) throw new Error('La prueba recién generada no verifica: algo está mal.');
  console.log('La prueba verifica.');
  console.log('  raíz del lote:        ', raíces.batchRoot);
  console.log('  raíz de proveedores:  ', raíces.vendorSetRoot);

  // El portal verifica con su copia de la clave: si no es la misma, daría "no válida".
  const huella = verificationKeyHash();
  const delPortal = path.resolve(__dirname, '..', '..', 'web', 'public', 'zk', 'verification_key.json');
  if (existsSync(delPortal)) {
    const huellaPortal = verificationKeyHash(JSON.parse(readFileSync(delPortal, 'utf8')));
    if (huellaPortal !== huella) {
      throw new Error('La clave de verificación de build/ no es la del portal (web/public/zk). Corre npm run copy-vkey o revisa la ceremonia.');
    }
  }
  if (!(await verify(bundle, loadVerificationKey()))) throw new Error('No verifica con la clave del disco.');

  if (simular) {
    console.log('\nSimulación terminada: cuando el mes cierre, este lote se podrá anclar y probar.');
    return;
  }

  try {
    await rest('BatchProof', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        batchId: args[0],
        budgetLimitMinor: lote.tope.toString(),
        proof: bundle.proof,
        publicSignals: bundle.publicSignals,
        vkeyHash: '\\x' + huella.slice(2),
      }),
    });
  } catch (e) {
    if (/duplicate key|23505/.test((e as Error).message)) {
      console.log('\nEste lote ya tenía su prueba publicada: no se cambia (es solo inserción).');
      return;
    }
    throw e;
  }
  console.log(`\nPrueba publicada. Se verifica en /verificar?lote=${args[0]}`);
}

main()
  .catch((e) => {
    console.error('Error:', (e as Error).message);
    process.exitCode = 1;
  })
  // Sin esto el proceso no sale nunca: snarkjs deja su pool de workers abierto.
  .finally(cerrarProver);
