/**
 * PP — Prueba de privacidad (docs/MODELO_AMENAZA.md §7).
 *
 * Pregunta: con TODO lo que OpenPay publica, ¿se puede deducir Y (monto,
 * proveedor, fecha o número de pagos) mejor que antes de mirarlo?
 *
 * Lo que publica un lote es: la raíz del lote, la raíz de la lista de
 * proveedores, el tope del rubro, la prueba Groth16 y la fecha de anclaje. De
 * esos, la lista y el tope son iguales en los dos escenarios de cada juego (se
 * comprueba), y la prueba Groth16 es de conocimiento cero: no aporta nada que
 * no esté ya en sus señales públicas. Eso es un teorema del esquema, no algo
 * que este archivo pueda medir, y depende de una ceremonia honesta
 * (docs/CEREMONIA.md). Queda la raíz del lote, y es lo que se ataca acá.
 *
 * Cada ataque tiene un CONTROL: el mismo ataque contra sales débiles tiene que
 * ganar. Sin eso, un "no pudo" no diría nada, porque podría ser un ataque que
 * no sirve.
 *
 * Las sales "de producción" salen de SHA-256 sobre una semilla fija: el
 * atacante no la conoce, y la prueba da siempre el mismo resultado (no es
 * inestable). En la base, la sal sale de gen_random_bytes(32).
 *
 * El criterio de los agregados (POLITICA_DATOS.md §4: k ≥ 10, sin celda
 * dominante, meses cerrados) se prueba sobre las vistas en SQL:
 * packages/web/supabase/tests/30_mandates.sql (T42-T44) y
 * 40_reconciliation.sql (R42-R45). Se corren con `sh packages/web/supabase/tests/run.sh`.
 */
import { expect } from 'chai';
import { createHash } from 'node:crypto';
import { poseidon2 } from 'poseidon-lite';
import {
  DEFAULT_TREE_HEIGHT,
  ZERO_LEAF,
  buildMerkleTree,
  buildVendorSet,
  dateToDays,
  paymentCommitment,
  toField,
  uuidToField,
  vendorLeaf,
  type PaymentInput,
} from '../../../contracts/src/commitment';
import { PAGOS, PRESUPUESTO, PROVEEDORES } from '../../src/demo-data';
import {
  CON_RED,
  PORTAL,
  cargarPruebaDemo,
  todasLasRaíces,
  type RaízAnclada,
} from './publico';

const demo = cargarPruebaDemo();

// ── Sales ─────────────────────────────────────────────────────────

/** Sal impredecible para el atacante, reproducible para la prueba. */
function salFuerte(ronda: number, i: number): string {
  return createHash('sha256').update(`openpay-pp|${ronda}|${i}`).digest('hex');
}

/**
 * Lo que un atacante probaría primero: las sales que alguien pondría por
 * descuido. La tercera es exactamente la de la demo.
 */
const SALES_DÉBILES: [string, (i: number) => string][] = [
  ['ceros', () => '00'.repeat(32)],
  ['el índice', (i) => i.toString(16).padStart(64, '0')],
  ['un byte repetido', (i) => (((i + 1) * 0x11) & 0xff).toString(16).padStart(2, '0').repeat(32)],
];

function conSales(pagos: PaymentInput[], sal: (i: number) => string): PaymentInput[] {
  return pagos.map((p, i) => ({ ...p, saltHex: sal(i) }));
}

// ── Raíz rápida ───────────────────────────────────────────────────
// buildMerkleTree calcula las 64 hojas; los juegos hacen miles de raíces, y
// casi todas las hojas son relleno. Los subárboles de relleno son constantes,
// así que se precalculan. La primera prueba comprueba que da lo mismo.

const CEROS: bigint[] = [ZERO_LEAF];
for (let h = 1; h <= DEFAULT_TREE_HEIGHT; h++) CEROS.push(poseidon2([CEROS[h - 1], CEROS[h - 1]]));

function raízRápida(hojas: bigint[]): bigint {
  let nivel = hojas.slice();
  for (let h = 0; h < DEFAULT_TREE_HEIGHT; h++) {
    const arriba: bigint[] = [];
    for (let i = 0; i < nivel.length; i += 2) {
      arriba.push(poseidon2([nivel[i], i + 1 < nivel.length ? nivel[i + 1] : CEROS[h]]));
    }
    nivel = arriba;
  }
  return nivel[0];
}

function raíz(pagos: PaymentInput[]): bigint {
  return raízRápida(pagos.map(paymentCommitment));
}

// ── El juego ──────────────────────────────────────────────────────

interface Vista {
  batchRoot: bigint;
  vendorSetRoot: bigint;
  budgetLimit: bigint;
}

/** Todo lo que se publica de un lote, salvo la prueba (ver cabecera). */
function publicar(pagos: PaymentInput[]): Vista {
  return {
    batchRoot: raíz(pagos),
    vendorSetRoot: buildVendorSet(PROVEEDORES).root,
    budgetLimit: PRESUPUESTO,
  };
}

/**
 * Escenarios A y B que difieren SOLO en Y. Los dos cumplen X con el mismo tope
 * y la misma lista, y suman lo mismo, así que ningún agregado los distingue.
 */
const JUEGOS: [string, PaymentInput[], PaymentInput[]][] = [
  [
    'Y1 — el monto de un pago',
    PAGOS,
    PAGOS.map((p, i) =>
      i === 1 ? { ...p, amountMinorUnits: p.amountMinorUnits + 200_000_00n }
        : i === 3 ? { ...p, amountMinorUnits: p.amountMinorUnits - 200_000_00n }
          : p,
    ),
  ],
  [
    'Y2 — a qué proveedor fue un pago',
    PAGOS,
    PAGOS.map((p, i) => (i === 0 ? { ...p, vendorId: PROVEEDORES[1] } : p)),
  ],
  [
    'Y3 — la fecha de un pago',
    PAGOS,
    PAGOS.map((p, i) => (i === 5 ? { ...p, paidOn: '2026-08-05' } : p)),
  ],
  [
    'Y4 — cuántos pagos hubo (7 contra 6)',
    PAGOS,
    [
      ...PAGOS.slice(0, 5),
      { ...PAGOS[5], amountMinorUnits: PAGOS[5].amountMinorUnits + PAGOS[6].amountMinorUnits },
    ],
  ],
];

type Atacante = {
  entrenar?(muestras: { vista: Vista; esB: boolean }[]): void;
  adivinar(vista: Vista, a: PaymentInput[], b: PaymentInput[]): boolean;
};

/**
 * Sabe todo de los dos escenarios menos las sales, y prueba las sales débiles.
 * Si reproduce la raíz, acierta; si no, tira una moneda.
 */
function atacanteDiccionario(moneda: () => boolean): Atacante {
  // Las raíces candidatas no cambian entre rondas: se calculan una vez.
  let candidatas: Map<bigint, boolean> | undefined;
  return {
    adivinar(vista, a, b) {
      if (!candidatas) {
        candidatas = new Map();
        for (const [, sal] of SALES_DÉBILES) {
          candidatas.set(raíz(conSales(a, sal)), false);
          candidatas.set(raíz(conSales(b, sal)), true);
        }
      }
      return candidatas.get(vista.batchRoot) ?? moneda();
    },
  };
}

/**
 * Busca un sesgo estadístico: aprende de muestras etiquetadas cuál de los 32
 * bits bajos de la raíz separa mejor A de B, y apuesta por él.
 */
function atacanteSesgo(): Atacante {
  let bit = 0;
  let unoEsB = true;
  return {
    entrenar(muestras) {
      let mejor = -1;
      for (let k = 0; k < 32; k++) {
        let aciertos = 0;
        for (const m of muestras) {
          const uno = ((m.vista.batchRoot >> BigInt(k)) & 1n) === 1n;
          if (uno === m.esB) aciertos++;
        }
        const ventaja = Math.abs(aciertos / muestras.length - 0.5);
        if (ventaja > mejor) {
          mejor = ventaja;
          bit = k;
          unoEsB = aciertos / muestras.length >= 0.5;
        }
      }
    },
    adivinar(vista) {
      const uno = ((vista.batchRoot >> BigInt(bit)) & 1n) === 1n;
      return uno === unoEsB;
    },
  };
}

/** Moneda determinista, para que el resultado no dependa del azar de la corrida. */
function monedaCon(semilla: string): () => boolean {
  let n = 0;
  return () => (createHash('sha256').update(`${semilla}|${n++}`).digest()[0] & 1) === 1;
}

/** Elige A o B "al azar" (determinista) en cada ronda. */
function eligeB(ronda: number): boolean {
  return (createHash('sha256').update(`openpay-pp-elige|${ronda}`).digest()[0] & 1) === 1;
}

const RONDAS = 400;
const ENTRENAMIENTO = 400;

/**
 * Juega RONDAS veces y devuelve la tasa de acierto. `sal(ronda, i)` decide qué
 * sales usa OpenPay en cada ronda.
 */
function jugar(
  a: PaymentInput[],
  b: PaymentInput[],
  atacante: Atacante,
  sal: (ronda: number, i: number) => string,
  desde = 0,
): number {
  let aciertos = 0;
  for (let r = desde; r < desde + RONDAS; r++) {
    const esB = eligeB(r);
    const vista = publicar(conSales(esB ? b : a, (i) => sal(r, i)));
    if (atacante.adivinar(vista, a, b) === esB) aciertos++;
  }
  return aciertos / RONDAS;
}

/**
 * Con 400 rondas, el acierto de alguien que adivina tiene desviación 2,5 %.
 * Se acepta hasta 60 % (4 desviaciones): más que eso sería ventaja real.
 */
const TECHO = 0.6;

// ── Búsqueda de datos privados en lo publicado ───────────────────

/** Todas las formas en que un dato de la demo podría aparecer escrito. */
function secretosDeLaDemo(): { números: Map<bigint, string>; textos: Map<string, string> } {
  const números = new Map<bigint, string>();
  const textos = new Map<string, string>();
  const uuidTexto = (u: string, qué: string) => {
    textos.set(u.toLowerCase(), qué);
    textos.set(u.replace(/-/g, '').toLowerCase(), qué);
  };

  PAGOS.forEach((p, i) => {
    const n = `pago ${i + 1}`;
    números.set(uuidToField(p.paymentId), `${n}: id`);
    uuidTexto(p.paymentId, `${n}: id`);
    números.set(p.amountMinorUnits, `${n}: monto en centavos`);
    números.set(p.amountMinorUnits / 100n, `${n}: monto en pesos`);
    números.set(dateToDays(p.paidOn), `${n}: fecha en días`);
    textos.set(p.paidOn, `${n}: fecha`);
    números.set(toField(p.saltHex), `${n}: sal`);
    textos.set(p.saltHex.toLowerCase(), `${n}: sal`);
    números.set(paymentCommitment(p), `${n}: hoja del lote`);
  });
  PROVEEDORES.forEach((v, i) => {
    const n = `proveedor ${i + 1}`;
    números.set(uuidToField(v), `${n}: id`);
    uuidTexto(v, `${n}: id`);
    números.set(vendorLeaf(v), `${n}: hoja de la lista`);
  });
  return { números, textos };
}

/** Devuelve cada dato privado encontrado en el texto, con dónde estaba. */
function buscarFugas(fuente: string, texto: string): string[] {
  const { números, textos } = secretosDeLaDemo();
  const fugas = new Set<string>();
  const minúsculas = texto.toLowerCase();

  for (const [t, qué] of textos) {
    if (minúsculas.includes(t)) fugas.add(`${fuente}: ${qué} (${t})`);
  }

  // Los números se comparan como número entero, token por token: buscarlos como
  // subcadena daría falsos positivos (un "20669" aparece por azar dentro de
  // cualquier número de 77 cifras).
  const fichas = texto.match(/0x[0-9a-fA-F]+|\b[0-9a-fA-F]{64}\b|\d+/g) ?? [];
  for (const f of fichas) {
    const valores: bigint[] = [];
    if (f.startsWith('0x')) valores.push(BigInt(f));
    else if (/^\d+$/.test(f)) valores.push(BigInt(f));
    // Una palabra de 32 bytes sin 0x puede ser hexadecimal aunque solo tenga dígitos.
    if (/^[0-9a-fA-F]{64}$/.test(f)) valores.push(BigInt('0x' + f));
    for (const v of valores) {
      // Los ids de la demo son UUID como 00000000-…-000000000001, que como
      // número valen 1..5 y aparecen en cualquier página. Un número tan chico
      // no identifica nada; esos UUID se siguen buscando en su forma de texto.
      if (v < 10_000n) continue;
      const qué = números.get(v);
      if (qué) fugas.add(`${fuente}: ${qué} (${f.slice(0, 20)}…)`);
    }
  }
  return [...fugas];
}

// ── Las pruebas ──────────────────────────────────────────────────

/** Tasas de acierto de cada juego, para imprimirlas al final como evidencia. */
const resultados: { juego: string; atacante: string; acierto: string }[] = [];
function anotar(juego: string, atacante: string, tasa: number): void {
  resultados.push({ juego, atacante, acierto: `${(tasa * 100).toFixed(1)} %` });
}

describe('PP — prueba de privacidad', function () {
  this.timeout(600_000);

  after(() => {
    if (resultados.length === 0) return;
    console.log(`\n  Acierto de los atacantes en ${RONDAS} rondas (adivinar = 50 %, techo ${TECHO * 100} %):`);
    console.table(resultados);
  });

  it('la raíz rápida del juego es la misma que arma commitment.ts', () => {
    expect(raíz(PAGOS)).to.equal(buildMerkleTree(PAGOS.map(paymentCommitment)).root);
    expect(raíz(PAGOS).toString()).to.equal(demo.claim.batchRoot);
  });

  describe('juego de indistinguibilidad: A y B difieren solo en Y', () => {
    for (const [nombre, a, b] of JUEGOS) {
      describe(nombre, () => {
        it('A y B cumplen X y publican la misma lista, el mismo tope y el mismo total', () => {
          const suma = (ps: PaymentInput[]) => ps.reduce((s, p) => s + p.amountMinorUnits, 0n);
          expect(suma(a)).to.equal(suma(b));
          expect(suma(a) <= PRESUPUESTO).to.equal(true);
          for (const p of [...a, ...b]) expect(PROVEEDORES).to.include(p.vendorId);
          const va = publicar(conSales(a, (i) => salFuerte(0, i)));
          const vb = publicar(conSales(b, (i) => salFuerte(0, i)));
          expect(va.vendorSetRoot).to.equal(vb.vendorSetRoot);
          expect(va.budgetLimit).to.equal(vb.budgetLimit);
        });

        it(`el atacante con diccionario de sales no pasa del ${TECHO * 100} %`, () => {
          const tasa = jugar(a, b, atacanteDiccionario(monedaCon(nombre)), salFuerte);
          anotar(nombre, 'diccionario', tasa);
          expect(tasa, `acertó ${(tasa * 100).toFixed(1)} %`).to.be.at.most(TECHO);
        });

        it('CONTROL: con sales débiles, el mismo atacante acierta siempre', () => {
          const débil = SALES_DÉBILES[2][1];
          const tasa = jugar(a, b, atacanteDiccionario(monedaCon(nombre)), (_, i) => débil(i));
          anotar(nombre, 'diccionario, sales débiles (control)', tasa);
          expect(tasa).to.equal(1);
        });

        it(`el atacante que busca sesgos en los bits no pasa del ${TECHO * 100} %`, () => {
          const atacante = atacanteSesgo();
          const muestras = [];
          for (let r = 0; r < ENTRENAMIENTO; r++) {
            const esB = eligeB(100_000 + r);
            muestras.push({
              vista: publicar(conSales(esB ? b : a, (i) => salFuerte(100_000 + r, i))),
              esB,
            });
          }
          atacante.entrenar!(muestras);
          const tasa = jugar(a, b, atacante, salFuerte, 200_000);
          anotar(nombre, 'sesgo de bits', tasa);
          expect(tasa, `acertó ${(tasa * 100).toFixed(1)} %`).to.be.at.most(TECHO);
        });
      });
    }
  });

  describe('fuerza bruta sobre las hojas', () => {
    /**
     * El peor caso: el atacante sabe el id, el monto, el proveedor y la fecha de
     * cada pago —todo menos la sal— y prueba sales. Si reproduce una hoja,
     * confirma el pago y puede seguir probando montos o proveedores.
     */
    function candidatasDeSal(): string[] {
      const c = ['00'.repeat(32), 'ff'.repeat(32)];
      for (let b = 0; b < 256; b++) c.push(b.toString(16).padStart(2, '0').repeat(32));
      for (let n = 0; n <= 1000; n++) c.push(n.toString(16).padStart(64, '0'));
      return c;
    }

    function hojasReproducidas(pagos: PaymentInput[]): number {
      const reales = new Set(pagos.map((p) => paymentCommitment(p)));
      let halladas = 0;
      for (const p of pagos) {
        for (const s of candidatasDeSal()) {
          if (reales.has(paymentCommitment({ ...p, saltHex: s }))) {
            halladas++;
            break;
          }
        }
      }
      return halladas;
    }

    it('con sales de producción no se reproduce ninguna hoja', () => {
      expect(hojasReproducidas(conSales(PAGOS, (i) => salFuerte(7, i)))).to.equal(0);
    });

    it('CONTROL: con las sales de la demo se reproducen todas (la demo no sirve de ejemplo de privacidad)', () => {
      expect(hojasReproducidas(PAGOS)).to.equal(PAGOS.length);
    });

    it('ni con un solo pago en el lote se reproduce la raíz probando sales', () => {
      // El caso más fácil para el atacante: la raíz depende de una sola hoja.
      const p = { ...PAGOS[0], saltHex: salFuerte(8, 0) };
      const r = raíz([p]);
      for (const s of candidatasDeSal()) {
        expect(raíz([{ ...p, saltHex: s }])).to.not.equal(r);
      }
    });
  });

  describe('forma del árbol: la raíz no dice cuántos pagos hubo', () => {
    it('lotes de 1, 7 y 64 pagos dan raíces del mismo tamaño y aspecto', () => {
      const lleno = Array.from({ length: 64 }, (_, i) => ({
        ...PAGOS[i % PAGOS.length],
        paymentId: `00000000-0000-0000-0000-${(5000 + i).toString(16).padStart(12, '0')}`,
        saltHex: salFuerte(9, i),
      }));
      const raíces = [
        raíz(conSales(PAGOS.slice(0, 1), (i) => salFuerte(9, i))),
        raíz(conSales(PAGOS, (i) => salFuerte(9, i))),
        buildMerkleTree(lleno.map(paymentCommitment)).root,
      ];
      // La altura es fija: todas son un elemento del campo, sin longitud ni
      // estructura que dependa del número de hojas.
      for (const r of raíces) {
        expect(r > 0n).to.equal(true);
        expect(r.toString(16).length).to.be.within(56, 64);
      }
    });

    it('el testigo público siempre trae 3 señales, sin importar cuántos pagos', () => {
      expect(demo.publicSignals).to.have.length(3);
    });
  });

  describe('búsqueda de datos privados en todo lo publicado', () => {
    it('control: la búsqueda encuentra un dato privado cuando está', () => {
      const trampa = JSON.stringify({ nota: PAGOS[2].paidOn, x: (PAGOS[2].amountMinorUnits / 100n).toString() });
      expect(buscarFugas('trampa', trampa)).to.have.length.greaterThan(1);
    });

    it('la prueba publicada no contiene ningún dato de un pago ni de un proveedor', () => {
      expect(buscarFugas('demo-proof.json', JSON.stringify(demo))).to.deep.equal([]);
    });

    (CON_RED ? describe : describe.skip)('con red', () => {
      let raíces: RaízAnclada[];
      before(async () => {
        raíces = await todasLasRaíces();
      });

      it('nada de lo anclado en CommitmentRegistry contiene datos privados', () => {
        expect(raíces.length).to.be.greaterThan(0);
        expect(buscarFugas('CommitmentRegistry', JSON.stringify(raíces))).to.deep.equal([]);
      });

      it('se ancló UNA raíz por lote, no una por pago', () => {
        // Si se anclara por pago, contar anclajes revelaría cuántos pagos hubo
        // y sus fechas aproximadas.
        const deLotes = raíces.filter((r) => r.kind === 0);
        expect(deLotes.map((r) => BigInt(r.value))).to.include(BigInt(demo.claim.batchRoot));
        const delFondo = deLotes.filter(
          (r) => r.subject === raíces.find((x) => BigInt(x.value) === BigInt(demo.claim.batchRoot))!.subject,
        );
        expect(delFondo).to.have.length(1);
      });

      it('el lote se ancló después de cerrar su período: la fecha de anclaje no delata fechas de pago', () => {
        const r = raíces.find((x) => BigInt(x.value) === BigInt(demo.claim.batchRoot))!;
        const últimoPago = PAGOS.map((p) => p.paidOn).sort().at(-1)!;
        const [año, mes] = últimoPago.split('-').map(Number);
        const cierre = Date.UTC(año, mes, 1) / 1000; // primer día del mes siguiente
        expect(r.publishedAt).to.be.at.least(cierre);
      });

      it('la página pública /verificar no contiene datos privados', async () => {
        const html = await (await fetch(`${PORTAL}/verificar`)).text();
        expect(html.length).to.be.greaterThan(1000);
        expect(buscarFugas('/verificar', html)).to.deep.equal([]);
      });
    });
  });
});
