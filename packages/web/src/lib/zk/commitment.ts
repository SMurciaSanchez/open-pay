/**
 * Compromisos y árboles de Merkle con Poseidon, para el servidor de la web.
 *
 * ⚠️ ESTO ES UNA COPIA de packages/contracts/src/commitment.ts, que es la
 * fuente. Se copia porque el despliegue de la web solo instala las dependencias
 * de este paquete y no puede importar del otro. El formato (orden de los campos
 * del compromiso, hoja de relleno, alturas) tiene que ser idéntico: si difiere,
 * las raíces que ancla la web no las podrá probar el circuito.
 *
 * Lo que impide que las dos copias se separen sin avisar: ambas se prueban
 * contra los mismos vectores, packages/contracts/test/vectors/commitment.json
 * (commitment.test.ts aquí, commitment-vectors.test.ts allá).
 *
 * Sin literales BigInt (0n): este paquete compila para ES2017.
 */
import { poseidon1, poseidon2, poseidon5 } from 'poseidon-lite';

/** Orden del campo escalar de BN254. */
export const FIELD_SIZE = BigInt(
  '21888242871839275222246405745257275088548364400416034343698204186575808495617',
);

const CERO = BigInt(0);

/** Hoja de relleno. Las posiciones vacías del árbol valen cero. */
export const ZERO_LEAF = CERO;

/** 64 hojas por lote. Cambiarla invalida toda raíz ya anclada. */
export const DEFAULT_TREE_HEIGHT = 6;

/** Hasta 64 proveedores por fondo. */
export const VENDOR_TREE_HEIGHT = 6;

export interface PaymentInput {
  paymentId: string;
  /** Monto en unidades mínimas: pesos × 100. */
  amountMinorUnits: bigint;
  vendorId: string;
  /** 'YYYY-MM-DD' */
  paidOn: string;
  /** Payment.salt, 32 bytes en hexadecimal (acepta 0x…, \x… o sin prefijo). */
  saltHex: string;
}

export interface MerkleTree {
  root: bigint;
  height: number;
  layers: bigint[][];
}

export function toField(value: bigint | string): bigint {
  const n = typeof value === 'bigint' ? value : BigInt(normalizeHex(value));
  const reduced = n % FIELD_SIZE;
  return reduced < CERO ? reduced + FIELD_SIZE : reduced;
}

export function uuidToField(uuid: string): bigint {
  const hex = uuid.replace(/-/g, '');
  if (!/^[0-9a-fA-F]{32}$/.test(hex)) throw new Error(`UUID inválido: ${uuid}`);
  return BigInt('0x' + hex);
}

export function dateToDays(isoDate: string): bigint {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) throw new Error(`Fecha inválida: ${isoDate}`);
  const ms = Date.parse(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(ms)) throw new Error(`Fecha inválida: ${isoDate}`);
  return BigInt(Math.floor(ms / 86_400_000));
}

/** El orden de los campos es parte del formato. No tocar. */
export function paymentCommitment(payment: PaymentInput): bigint {
  if (payment.amountMinorUnits <= CERO) throw new Error('El monto tiene que ser mayor a cero');
  return poseidon5([
    uuidToField(payment.paymentId),
    payment.amountMinorUnits,
    uuidToField(payment.vendorId),
    dateToDays(payment.paidOn),
    toField(payment.saltHex),
  ]);
}

export function vendorLeaf(vendorId: string): bigint {
  return poseidon1([uuidToField(vendorId)]);
}

export function buildVendorSet(vendorIds: string[], height: number = VENDOR_TREE_HEIGHT): MerkleTree {
  return buildMerkleTree(vendorIds.map(vendorLeaf), height);
}

export function buildMerkleTree(leaves: bigint[], height: number = DEFAULT_TREE_HEIGHT): MerkleTree {
  const capacity = 2 ** height;
  if (leaves.length > capacity) {
    throw new Error(
      `El lote tiene ${leaves.length} hojas y un árbol de altura ${height} solo admite ${capacity}`,
    );
  }
  const padded = leaves.slice();
  while (padded.length < capacity) padded.push(ZERO_LEAF);

  const layers: bigint[][] = [padded];
  for (let level = 0; level < height; level++) {
    const below = layers[level];
    const above: bigint[] = [];
    for (let i = 0; i < below.length; i += 2) above.push(poseidon2([below[i], below[i + 1]]));
    layers.push(above);
  }
  return { root: layers[height][0], height, layers };
}

/** La raíz como bytes32 (0x + 64 hexadecimales). */
export function toBytes32(value: bigint): string {
  return '0x' + value.toString(16).padStart(64, '0');
}

/** Pesos con hasta dos decimales (como llegan de NUMERIC(18,2)) → unidades mínimas, sin pasar por float. */
export function pesosToMinorUnits(amount: string | number): bigint {
  const texto = typeof amount === 'number' ? amount.toFixed(2) : amount.trim();
  const r = /^(\d+)(?:\.(\d{1,2}))?$/.exec(texto);
  if (!r) throw new Error(`Monto inválido: ${amount}`);
  return BigInt(r[1]) * BigInt(100) + BigInt((r[2] ?? '').padEnd(2, '0'));
}

function normalizeHex(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith('0x') || trimmed.startsWith('0X')) return trimmed;
  if (trimmed.startsWith('\\x')) return '0x' + trimmed.slice(2);
  if (/^[0-9a-fA-F]+$/.test(trimmed)) return '0x' + trimmed;
  throw new Error(`No es un hexadecimal: ${value}`);
}
