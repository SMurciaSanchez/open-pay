'use client';

import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  Upload,
  ShieldQuestion,
} from 'lucide-react';
import {
  formatMinorUnits,
  parseBundle,
  toHexRoot,
  verificationKeyHash,
  verifyProof,
  esVálido,
  type PublicClaim,
  type VerifyOutcome,
} from '@/lib/zk/verify';
import { EXPLORER, REGISTRY, consultarAnclaje, type Anclaje } from '@/lib/zk/registry';

type Estado =
  | { fase: 'inicio' }
  | { fase: 'verificando' }
  | { fase: 'listo'; resultado: VerifyOutcome }
  | { fase: 'error'; mensaje: string };

export function ProofVerifier() {
  const [texto, setTexto] = useState('');
  const [estado, setEstado] = useState<Estado>({ fase: 'inicio' });
  const [vkey, setVkey] = useState<unknown>(null);
  const [huella, setHuella] = useState<string | null>(null);
  const [vkeyError, setVkeyError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/zk/verification_key.json')
      .then((r) => {
        if (!r.ok) throw new Error(`el servidor respondió ${r.status}`);
        return r.json();
      })
      .then(async (k) => {
        setVkey(k);
        setHuella(await verificationKeyHash(k));
      })
      .catch((e) => setVkeyError(String(e.message ?? e)));
  }, []);

  const verificar = async () => {
    const parsed = parseBundle(texto);
    if ('error' in parsed) {
      setEstado({ fase: 'error', mensaje: parsed.error });
      return;
    }
    if (!vkey) {
      setEstado({ fase: 'error', mensaje: 'Todavía no cargó la clave de verificación.' });
      return;
    }

    setEstado({ fase: 'verificando' });
    const resultado = await verifyProof(parsed, vkey);
    setEstado({ fase: 'listo', resultado });
  };

  const cargarArchivo = async (file: File) => {
    setTexto(await file.text());
    setEstado({ fase: 'inicio' });
  };

  // En una constante, no leyendo estado.resultado cada vez: TypeScript no
  // mantiene el estrechamiento del tipo sobre la propiedad de un objeto que
  // puede cambiar entre lecturas.
  const resultado = estado.fase === 'listo' ? estado.resultado : null;

  return (
    <div className="space-y-6">
      {vkeyError && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-medium">No se pudo cargar la clave de verificación</p>
          <p className="mt-1">
            {vkeyError}. Sin ella no se puede verificar nada en esta página. Se genera con{' '}
            <code className="rounded bg-amber-100 px-1">npm run build</code> en{' '}
            <code className="rounded bg-amber-100 px-1">packages/circuits</code> y se copia a{' '}
            <code className="rounded bg-amber-100 px-1">public/zk/</code>.
          </p>
        </div>
      )}

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <label htmlFor="prueba" className="block text-sm font-medium">
          Pegá el archivo de la prueba
        </label>
        <p className="mt-1 text-sm text-muted-foreground">
          Es un JSON con <code>proof</code>, <code>publicSignals</code> y <code>claim</code>. Lo
          entrega la organización junto con su informe.
        </p>

        <textarea
          id="prueba"
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            setEstado({ fase: 'inicio' });
          }}
          rows={8}
          spellCheck={false}
          placeholder='{ "proof": { ... }, "publicSignals": [ ... ], "claim": { ... } }'
          className="mt-3 w-full rounded-lg border p-3 font-mono text-xs"
        />

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={verificar}
            disabled={!texto.trim() || estado.fase === 'verificando' || !vkey}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {estado.fase === 'verificando' ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verificando...
              </>
            ) : (
              'Verificar'
            )}
          </button>

          <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border px-4 text-sm font-medium hover:bg-accent">
            <Upload className="h-4 w-4" />
            Subir archivo
            <input
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void cargarArchivo(f);
              }}
            />
          </label>
        </div>
      </div>

      {estado.fase === 'error' && (
        <Resultado ok={false} titulo="No se pudo leer la prueba" detalle={estado.mensaje} />
      )}

      {resultado && <ResultadoDeVerificación resultado={resultado} />}

      {huella && <HuellaDeLaClave huella={huella} />}
    </div>
  );
}

/** El if/return estrecha el tipo; dentro del JSX no lo hace. */
function ResultadoDeVerificación({ resultado }: { resultado: VerifyOutcome }) {
  if (esVálido(resultado)) return <ResultadoVálido claim={resultado.claim} />;
  return <Resultado ok={false} titulo="La prueba NO es válida" detalle={resultado.reason} />;
}

function Resultado({
  ok,
  titulo,
  detalle,
}: {
  ok: boolean;
  titulo: string;
  detalle: string;
}) {
  return (
    <div
      className={`rounded-xl border p-6 ${ok ? 'border-emerald-300 bg-emerald-50' : 'border-red-300 bg-red-50'}`}
    >
      <div className="flex items-start gap-3">
        {ok ? (
          <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" />
        ) : (
          <XCircle className="mt-0.5 h-6 w-6 shrink-0 text-red-600" />
        )}
        <div>
          <h3 className={`font-semibold ${ok ? 'text-emerald-900' : 'text-red-900'}`}>{titulo}</h3>
          <p className={`mt-1 text-sm ${ok ? 'text-emerald-800' : 'text-red-800'}`}>{detalle}</p>
        </div>
      </div>
    </div>
  );
}

/** null mientras consulta; sin registro configurado se queda en null. */
function useAnclaje(valorHex: string): Anclaje | null {
  const [anclaje, setAnclaje] = useState<Anclaje | null>(null);
  useEffect(() => {
    if (!REGISTRY) return;
    let vigente = true;
    setAnclaje(null);
    consultarAnclaje(valorHex).then((a) => vigente && setAnclaje(a));
    return () => {
      vigente = false;
    };
  }, [valorHex]);
  return anclaje;
}

function ResultadoVálido({ claim }: { claim: PublicClaim }) {
  const batch = toHexRoot(claim.batchRoot);
  const vendors = toHexRoot(claim.vendorSetRoot);
  const anclajeBatch = useAnclaje(batch);
  const anclajeVendors = useAnclaje(vendors);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-6">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" />
          <div>
            <h3 className="font-semibold text-emerald-900">La prueba es válida</h3>
            <p className="mt-2 text-sm text-emerald-800">
              Quedó demostrado, sin que se revelara ningún pago, que{' '}
              <strong>todos los pagos del lote fueron a proveedores del conjunto autorizado</strong>{' '}
              y que <strong>entre todos no superan {formatMinorUnits(claim.budgetLimit)}</strong>.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h4 className="font-semibold">Contra qué se comprobó</h4>
        <p className="mt-1 text-sm text-muted-foreground">
          Estas son las únicas tres cosas que la prueba hace públicas. Para que signifiquen algo,
          las dos raíces tienen que estar ancladas en la cadena.
        </p>

        <dl className="mt-4 space-y-4 text-sm">
          <Dato etiqueta="Raíz del lote de pagos" valor={batch} anclaje={anclajeBatch} />
          <Dato
            etiqueta="Raíz del conjunto de proveedores autorizados"
            valor={vendors}
            anclaje={anclajeVendors}
          />
          <Dato etiqueta="Tope del rubro" valor={formatMinorUnits(claim.budgetLimit)} mono={false} />
        </dl>

        {REGISTRY && EXPLORER ? (
          <>
            <ResumenDeAnclaje raíces={[anclajeBatch, anclajeVendors]} />
            <p className="mt-3 text-sm text-muted-foreground">
              Esta consulta la hace tu navegador directo a un nodo público de Base, pero la sigue
              mostrando esta página. Si no querés creerle, llamá vos a{' '}
              <code className="rounded bg-muted px-1">isKnownRoot</code> en el contrato:{' '}
              <a
                href={`${EXPLORER}/address/${REGISTRY}#readContract`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary underline"
              >
                ver CommitmentRegistry
              </a>
            </p>
          </>
        ) : (
          <p className="mt-5 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            <strong>El registro todavía no está desplegado.</strong> Mientras no lo esté, esta
            página comprueba que la prueba es matemáticamente válida, pero no que esas raíces sean
            las que la organización publicó. Las dos mitades hacen falta.
          </p>
        )}
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h4 className="font-semibold">Lo que esto NO demuestra</h4>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>
            Que el dinero se haya movido. Eso lo dice el extracto bancario conciliado, y el banco
            sigue siendo la fuente.
          </li>
          <li>
            Que el conjunto de proveedores sea el correcto. Demuestra que los pagos fueron a ese
            conjunto, no que ese conjunto esté bien armado.
          </li>
          <li>Que el precio pagado fuera razonable. Eso es otra regla, y todavía no existe.</li>
        </ul>
      </div>
    </div>
  );
}

function Dato({
  etiqueta,
  valor,
  mono = true,
  anclaje,
}: {
  etiqueta: string;
  valor: string;
  mono?: boolean;
  /** undefined: el dato no se ancla. null: consultando. */
  anclaje?: Anclaje | null;
}) {
  return (
    <div>
      <dt className="text-muted-foreground">{etiqueta}</dt>
      <dd className={`mt-1 break-all ${mono ? 'font-mono text-xs' : 'font-medium'}`}>{valor}</dd>
      {anclaje !== undefined && REGISTRY && <EstadoDeAnclaje anclaje={anclaje} />}
    </div>
  );
}

function EstadoDeAnclaje({ anclaje }: { anclaje: Anclaje | null }) {
  if (!anclaje) {
    return (
      <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Consultando la cadena...
      </p>
    );
  }
  if (anclaje.estado === 'anclada') {
    return (
      <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
        <CheckCircle2 className="h-3 w-3" />
        Anclada el {formatearFecha(anclaje.fecha)}
      </p>
    );
  }
  if (anclaje.estado === 'no-anclada') {
    return (
      <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-red-700">
        <XCircle className="h-3 w-3" />
        No está anclada en el registro
      </p>
    );
  }
  return (
    <p className="mt-1 inline-flex items-center gap-1 text-xs text-amber-700">
      <AlertTriangle className="h-3 w-3" />
      No se pudo consultar la cadena: {anclaje.mensaje}
    </p>
  );
}

/**
 * La prueba sola demuestra que las reglas se cumplen sobre ESAS raíces; el
 * anclaje, que son las que la organización publicó.
 */
function ResumenDeAnclaje({ raíces }: { raíces: (Anclaje | null)[] }) {
  if (raíces.some((r) => r === null)) return null;
  const estados = raíces.map((r) => r!.estado);

  if (estados.every((e) => e === 'anclada')) {
    return (
      <p className="mt-5 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900">
        <strong>Las dos raíces están ancladas.</strong> Son las que la organización publicó en la
        cadena, así que la prueba habla de sus pagos reales y no de un lote armado para la ocasión.
      </p>
    );
  }
  if (estados.includes('no-anclada')) {
    return (
      <p className="mt-5 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900">
        <strong>Falta anclar al menos una raíz.</strong> La prueba es matemáticamente correcta,
        pero no hay constancia de que la organización haya publicado ese lote o esa lista de
        proveedores. Cualquiera puede armar un lote que cumpla las reglas: sin el anclaje, esta
        prueba no dice nada sobre los pagos reales.
      </p>
    );
  }
  return (
    <p className="mt-5 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
      <strong>No se pudo consultar la cadena.</strong> La prueba es válida, pero falta confirmar
      que las raíces estén ancladas. Podés hacerlo a mano con el enlace de abajo.
    </p>
  );
}

function formatearFecha(fecha: Date): string {
  return fecha.toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short' });
}

function HuellaDeLaClave({ huella }: { huella: string }) {
  const anclaje = useAnclaje(huella);
  return (
    <div className="rounded-xl border bg-muted/30 p-6">
      <div className="flex items-start gap-3">
        <ShieldQuestion className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
        <div className="text-sm">
          <h4 className="font-semibold">¿Y por qué creerle a esta página?</h4>
          <p className="mt-1 text-muted-foreground">
            No hace falta. Esta página verifica con una clave que le sirvió el propio OpenPay, así
            que por sí sola no prueba nada. Su huella es:
          </p>
          <p className="mt-2 break-all font-mono text-xs">{huella}</p>
          {REGISTRY && <EstadoDeAnclaje anclaje={anclaje} />}
          <p className="mt-2 text-muted-foreground">
            {REGISTRY && EXPLORER ? (
              <>
                {anclaje?.estado === 'no-anclada' && (
                  <strong className="text-red-800">
                    Esta huella no está en el registro: la clave que te sirvió esta página no es la
                    que publicó la organización. No confíes en el resultado.{' '}
                  </strong>
                )}
                Podés compararla vos con la anclada en el contrato. Si coinciden, ya no estás
                confiando en nosotros.
              </>
            ) : (
              <>
                Cuando el registro esté desplegado, esta huella quedará anclada en la cadena y vas a
                poder compararla vos. Hasta entonces, este punto queda abierto y conviene decirlo.
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
