/**
 * Compromisos y árboles de Merkle con Poseidon.
 *
 * Esto es lo que corre fuera de la cadena: toma los pagos ya conciliados de un
 * fondo, calcula un compromiso por pago, arma el árbol y devuelve la raíz. Al
 * contrato solo sube la raíz (ver contracts/CommitmentRegistry.sol).
 *
 * Por qué Poseidon y no keccak: adentro de un circuito ZK, keccak cuesta
 * decenas de miles de restricciones y Poseidon unos cientos. La prueba de la
 * Fase 3 ("este pago fue a un proveedor autorizado") tiene que recorrer el
 * camino de Merkle dentro del circuito, así que la función de hash del árbol
 * decide si esa prueba es viable o no.
 *
 * Por qué la sal: sin ella, un compromiso se rompe probando. Los montos, las
 * fechas y la lista de proveedores de un fondo son pocos y adivinables; quien
 * tuviera la raíz podría probar combinaciones hasta dar con la hoja. La sal de
 * 32 bytes vive en Payment.salt (nivel N4), que ningún rol de cliente puede
 * leer, y sin ella el compromiso no dice nada.
 */
import { poseidon1, poseidon2, poseidon5 } from 'poseidon-lite';

/** Orden del campo escalar de BN254: el cuerpo en el que trabaja Poseidon. */
export const FIELD_SIZE =
  21888242871839275222246405745257275088548364400416034343698204186575808495617n;

/** Hoja de relleno. Las posiciones vacías del árbol valen cero. */
export const ZERO_LEAF = 0n;

/**
 * Altura por defecto: 16 hojas por lote.
 *
 * El circuito de la Fase 3 recalcula la raíz desde TODAS las hojas, que es lo
 * que le permite afirmar que ningún pago quedó afuera del lote. Esa garantía se
 * paga en restricciones, y el costo crece con el número de hojas: el coste de
 * la ceremonia, no el de verificar.
 *
 * Se bajó de 1024 a 64 (2026-09-17) y de 64 a 16 (2026-09-18). El motivo del
 * segundo recorte fue medido, no teórico: con 64 hojas el circuito da 147.100
 * restricciones, el dominio se redondea a 2^18 y el `groth16 setup` de snarkjs
 * corrió 15,4 horas en la máquina de desarrollo sin llegar a escribir el .zkey.
 * Con 16 hojas quedan ~36.800 restricciones y el dominio cae a 2^16.
 *
 * Lo que se cede: la raíz delata que el lote tenía a lo sumo 16 pagos, y un
 * fondo con más de 16 pagos en el período necesita varios lotes, lo que deja
 * ver que hubo más de 16. Fuga acotada: la vista pública
 * PublicReconciliationStatus ya publica el porcentaje conciliado cuando hay 10
 * o más pagos en el mes.
 *
 * Cambiar esta altura invalida toda raíz ya anclada. Hoy no hay ninguna anclada
 * — por eso el recorte todavía es gratis.
 */
export const DEFAULT_TREE_HEIGHT = 4;

/** Altura del árbol de proveedores autorizados: hasta 64 por fondo. */
export const VENDOR_TREE_HEIGHT = 6;

export interface PaymentInput {
  /** Payment.id (UUID). */
  paymentId: string;
  /** Monto en unidades mínimas: pesos sin decimales × 100. */
  amountMinorUnits: bigint;
  /** AuthorizedVendor.id (UUID). */
  vendorId: string;
  /** Fecha del pago, 'YYYY-MM-DD'. */
  paidOn: string;
  /** Payment.salt, 32 bytes en hexadecimal. */
  saltHex: string;
}

export interface MerkleTree {
  root: bigint;
  height: number;
  /** layers[0] son las hojas; el último nivel es la raíz. */
  layers: bigint[][];
}

export interface MerkleProof {
  /** Hermano en cada nivel, de la hoja hacia la raíz. */
  siblings: bigint[];
  /** 0 si la hoja va a la izquierda en ese nivel, 1 si va a la derecha. */
  pathIndices: number[];
}

/** Reduce un valor al campo de Poseidon. */
export function toField(value: bigint | string): bigint {
  const n = typeof value === 'bigint' ? value : BigInt(normalizeHex(value));
  const reduced = n % FIELD_SIZE;
  return reduced < 0n ? reduced + FIELD_SIZE : reduced;
}

/** Un UUID son 128 bits: entra al campo sin reducir nada. */
export function uuidToField(uuid: string): bigint {
  const hex = uuid.replace(/-/g, '');
  if (!/^[0-9a-fA-F]{32}$/.test(hex)) {
    throw new Error(`UUID inválido: ${uuid}`);
  }
  return BigInt('0x' + hex);
}

/** 'YYYY-MM-DD' → días desde 1970-01-01, en UTC. */
export function dateToDays(isoDate: string): bigint {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    throw new Error(`Fecha inválida: ${isoDate}`);
  }
  const ms = Date.parse(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(ms)) throw new Error(`Fecha inválida: ${isoDate}`);
  return BigInt(Math.floor(ms / 86_400_000));
}

/**
 * Compromiso de un pago.
 *
 * El orden de los campos es parte del formato: cambiarlo cambia todas las
 * raíces ya ancladas y deja sin verificar lo que se publicó antes.
 */
export function paymentCommitment(payment: PaymentInput): bigint {
  if (payment.amountMinorUnits <= 0n) {
    throw new Error('El monto tiene que ser mayor a cero');
  }
  return poseidon5([
    uuidToField(payment.paymentId),
    payment.amountMinorUnits,
    uuidToField(payment.vendorId),
    dateToDays(payment.paidOn),
    toField(payment.saltHex),
  ]);
}

/**
 * Hoja del conjunto de proveedores autorizados de un fondo.
 *
 * Sin sal, a diferencia del compromiso de un pago, y es deliberado: el id de un
 * proveedor es un UUID, o sea 128 bits impredecibles. Un NIT sí se podría
 * adivinar —son públicos en Colombia—, pero el UUID no, así que la raíz del
 * conjunto no permite ir probando proveedores a ver cuáles están.
 */
export function vendorLeaf(vendorId: string): bigint {
  return poseidon1([uuidToField(vendorId)]);
}

/** El conjunto autorizado de un fondo, listo para anclar su raíz. */
export function buildVendorSet(
  vendorIds: string[],
  height: number = VENDOR_TREE_HEIGHT,
): MerkleTree {
  return buildMerkleTree(vendorIds.map(vendorLeaf), height);
}

/**
 * Árbol binario de altura fija.
 *
 * La altura es fija a propósito: si el árbol creciera con la cantidad de pagos,
 * la raíz de un lote de tres pagos se distinguiría de la de uno de trescientos,
 * y el tamaño de un lote ya dice algo sobre el fondo. Rellenando siempre hasta
 * 2^height, todos los lotes se ven igual.
 */
export function buildMerkleTree(
  leaves: bigint[],
  height: number = DEFAULT_TREE_HEIGHT,
): MerkleTree {
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
    for (let i = 0; i < below.length; i += 2) {
      above.push(poseidon2([below[i], below[i + 1]]));
    }
    layers.push(above);
  }

  return { root: layers[height][0], height, layers };
}

/** Camino de una hoja hasta la raíz. */
export function merkleProof(tree: MerkleTree, leafIndex: number): MerkleProof {
  if (leafIndex < 0 || leafIndex >= tree.layers[0].length) {
    throw new Error(`Índice fuera del árbol: ${leafIndex}`);
  }

  const siblings: bigint[] = [];
  const pathIndices: number[] = [];
  let index = leafIndex;

  for (let level = 0; level < tree.height; level++) {
    const isRight = index % 2 === 1;
    siblings.push(tree.layers[level][isRight ? index - 1 : index + 1]);
    pathIndices.push(isRight ? 1 : 0);
    index = Math.floor(index / 2);
  }

  return { siblings, pathIndices };
}

/**
 * Rehace el camino y compara con la raíz.
 *
 * Es la misma cuenta que hará el circuito de la Fase 3; tenerla aquí permite
 * comprobar el formato antes de escribir el circuito.
 */
export function verifyMerkleProof(leaf: bigint, proof: MerkleProof, root: bigint): boolean {
  if (proof.siblings.length !== proof.pathIndices.length) return false;

  let node = leaf;
  for (let level = 0; level < proof.siblings.length; level++) {
    const sibling = proof.siblings[level];
    node =
      proof.pathIndices[level] === 1
        ? poseidon2([sibling, node])
        : poseidon2([node, sibling]);
  }
  return node === root;
}

/** La raíz como `bytes32` para pasársela al contrato. */
export function toBytes32(value: bigint): string {
  return '0x' + value.toString(16).padStart(64, '0');
}

function normalizeHex(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith('0x') || trimmed.startsWith('0X')) return trimmed;
  if (trimmed.startsWith('\\x')) return '0x' + trimmed.slice(2); // formato BYTEA de Postgres
  if (/^[0-9a-fA-F]+$/.test(trimmed)) return '0x' + trimmed;
  throw new Error(`No es un hexadecimal: ${value}`);
}
