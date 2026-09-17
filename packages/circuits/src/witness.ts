/**
 * Arma las entradas del circuito a partir de los datos de un fondo.
 *
 * Importa a propósito desde packages/contracts/src/commitment.ts, en vez de
 * repetir la cuenta: el circuito y el constructor de lotes tienen que usar el
 * mismo Poseidon, con los mismos campos y en el mismo orden. Si se copiaran y
 * uno de los dos cambiara, las pruebas dejarían de verificar sin que nada
 * avisara.
 */
import {
  DEFAULT_TREE_HEIGHT,
  VENDOR_TREE_HEIGHT,
  buildMerkleTree,
  buildVendorSet,
  dateToDays,
  merkleProof,
  paymentCommitment,
  toField,
  uuidToField,
  vendorLeaf,
  type PaymentInput,
} from '../../contracts/src/commitment';

export interface CircuitInput {
  batchRoot: string;
  vendorSetRoot: string;
  budgetLimit: string;
  paymentId: string[];
  amount: string[];
  vendorId: string[];
  paidOn: string[];
  salt: string[];
  isReal: string[];
  vendorPathElements: string[][];
  vendorPathIndices: string[][];
}

export interface BatchWitness {
  input: CircuitInput;
  /** La raíz del lote, para anclarla y para mostrarla en el portal. */
  batchRoot: bigint;
  vendorSetRoot: bigint;
}

export interface BuildWitnessArgs {
  /** Los pagos del lote, en el orden en que ocupan las hojas. */
  payments: PaymentInput[];
  /** El conjunto autorizado del fondo, en el orden con que se ancló su raíz. */
  vendorIds: string[];
  /** Tope del rubro, en unidades mínimas. */
  budgetLimit: bigint;
  batchHeight?: number;
  vendorHeight?: number;
}

/**
 * Construye el testigo del circuito.
 *
 * Las posiciones que sobran del árbol van con isReal = 0. Sus caminos de
 * proveedor no importan (el circuito anula la comprobación multiplicándola por
 * isReal), pero se llenan con ceros para que el archivo sea determinista.
 */
export function buildWitness({
  payments,
  vendorIds,
  budgetLimit,
  batchHeight = DEFAULT_TREE_HEIGHT,
  vendorHeight = VENDOR_TREE_HEIGHT,
}: BuildWitnessArgs): BatchWitness {
  const slots = 2 ** batchHeight;

  if (payments.length === 0) {
    throw new Error('Un lote sin pagos no tiene nada que probar');
  }
  if (payments.length > slots) {
    throw new Error(
      `El lote trae ${payments.length} pagos y el árbol de altura ${batchHeight} admite ${slots}`,
    );
  }
  if (vendorIds.length > 2 ** vendorHeight) {
    throw new Error(
      `El fondo tiene ${vendorIds.length} proveedores y el árbol de altura ${vendorHeight} admite ${2 ** vendorHeight}`,
    );
  }

  const vendorSet = buildVendorSet(vendorIds, vendorHeight);
  const posiciónDeProveedor = new Map(vendorIds.map((id, i) => [id, i]));

  const batchTree = buildMerkleTree(payments.map(paymentCommitment), batchHeight);

  const input: CircuitInput = {
    batchRoot: batchTree.root.toString(),
    vendorSetRoot: vendorSet.root.toString(),
    budgetLimit: budgetLimit.toString(),
    paymentId: [],
    amount: [],
    vendorId: [],
    paidOn: [],
    salt: [],
    isReal: [],
    vendorPathElements: [],
    vendorPathIndices: [],
  };

  for (let i = 0; i < slots; i++) {
    const pago = payments[i];

    if (!pago) {
      input.paymentId.push('0');
      input.amount.push('0');
      input.vendorId.push('0');
      input.paidOn.push('0');
      input.salt.push('0');
      input.isReal.push('0');
      input.vendorPathElements.push(Array(vendorHeight).fill('0'));
      input.vendorPathIndices.push(Array(vendorHeight).fill('0'));
      continue;
    }

    const posición = posiciónDeProveedor.get(pago.vendorId);
    if (posición === undefined) {
      throw new Error(
        `El pago ${pago.paymentId} fue a un proveedor que no está en el conjunto autorizado. ` +
          'La regla no se cumple: no hay prueba que dar.',
      );
    }

    const camino = merkleProof(vendorSet, posición);

    input.paymentId.push(uuidToField(pago.paymentId).toString());
    input.amount.push(pago.amountMinorUnits.toString());
    input.vendorId.push(uuidToField(pago.vendorId).toString());
    input.paidOn.push(dateToDays(pago.paidOn).toString());
    input.salt.push(toField(pago.saltHex).toString());
    input.isReal.push('1');
    input.vendorPathElements.push(camino.siblings.map(String));
    input.vendorPathIndices.push(camino.pathIndices.map(String));
  }

  const total = payments.reduce((acc, p) => acc + p.amountMinorUnits, 0n);
  if (total > budgetLimit) {
    throw new Error(
      `Los pagos suman ${total} y el presupuesto es ${budgetLimit}. ` +
        'La regla no se cumple: no hay prueba que dar.',
    );
  }

  return { input, batchRoot: batchTree.root, vendorSetRoot: vendorSet.root };
}

/** La hoja de un proveedor, reexportada para las pruebas. */
export { vendorLeaf };
