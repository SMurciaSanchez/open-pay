pragma circom 2.1.9;

include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/bitify.circom";
include "merkle.circom";

/// Regla ZK de OpenPay — "pagos autorizados y total dentro del presupuesto".
///
/// LO QUE DEMUESTRA, sin revelar ningún pago:
///   1. El lote anclado con raíz `batchRoot` contiene exactamente los pagos que
///      el probador declara, ni uno más (la raíz se recalcula desde todas las
///      hojas, así que no se puede esconder ninguno).
///   2. Cada uno de esos pagos fue a un proveedor que está en el conjunto
///      autorizado del fondo, cuya raíz `vendorSetRoot` también está anclada.
///   3. La suma de todos los pagos del lote no supera `budgetLimit`.
///
/// LO QUE NO REVELA: ningún monto, ningún proveedor, ninguna fecha, ningún
/// identificador, ni siquiera cuántos pagos tiene el lote. Todo eso son
/// entradas privadas; a la salida solo queda "sí, se cumple".
///
/// LO QUE NO DEMUESTRA: que el dinero se haya movido. Eso lo dice la
/// conciliación bancaria, y el banco sigue siendo la fuente (supuesto S5 de
/// docs/MODELO_AMENAZA.md). Aquí se prueba consistencia de lo registrado.
///
/// batchHeight   — altura del árbol del lote (4 → 16 pagos). Ver el comentario
///                 de DEFAULT_TREE_HEIGHT en contracts/src/commitment.ts: se
///                 bajó de 6 a 4 porque el setup con 64 hojas no terminaba.
/// vendorHeight  — altura del árbol de proveedores (6 → 64 proveedores)
/// amountBits    — cota de cada monto; 64 bits sobran para pesos en centavos
template AuthorizedAndWithinBudget(batchHeight, vendorHeight, amountBits) {
    var N = 1 << batchHeight;

    // ── Entradas públicas: lo que el verificador ya conoce ──
    // batchRoot y vendorSetRoot se contrastan contra CommitmentRegistry;
    // budgetLimit, contra el presupuesto publicado del fondo.
    signal input batchRoot;
    signal input vendorSetRoot;
    signal input budgetLimit;

    // ── Entradas privadas: los pagos ──
    signal input paymentId[N];
    signal input amount[N];
    signal input vendorId[N];
    signal input paidOn[N];
    signal input salt[N];
    // 1 si la posición lleva un pago, 0 si es relleno del árbol.
    signal input isReal[N];
    // Camino de cada proveedor dentro del conjunto autorizado.
    signal input vendorPathElements[N][vendorHeight];
    signal input vendorPathIndices[N][vendorHeight];

    component compromiso[N];
    component hojaProveedor[N];
    component caminoProveedor[N];
    component montoAcotado[N];

    signal hoja[N];
    signal montoReal[N];
    signal acumulado[N + 1];
    acumulado[0] <== 0;

    for (var i = 0; i < N; i++) {
        // isReal es un bit. Sin esta restricción se podría contar un pago
        // "a medias" y burlar la suma.
        isReal[i] * (isReal[i] - 1) === 0;

        // Cada monto cabe en amountBits. Evita que un monto cercano al orden
        // del campo dé la vuelta y haga que la suma parezca pequeña.
        montoAcotado[i] = Num2Bits(amountBits);
        montoAcotado[i].in <== amount[i];

        // El compromiso del pago: el mismo Poseidon, con los mismos campos y en
        // el mismo orden que packages/contracts/src/commitment.ts. Si los dos
        // se separan, nada verifica.
        compromiso[i] = Poseidon(5);
        compromiso[i].inputs[0] <== paymentId[i];
        compromiso[i].inputs[1] <== amount[i];
        compromiso[i].inputs[2] <== vendorId[i];
        compromiso[i].inputs[3] <== paidOn[i];
        compromiso[i].inputs[4] <== salt[i];

        // Posición real → el compromiso; posición de relleno → cero, que es con
        // lo que se rellena el árbol al armarlo.
        hoja[i] <== isReal[i] * compromiso[i].out;

        // El proveedor del pago tiene que estar en el conjunto autorizado.
        // En las posiciones de relleno la comprobación se neutraliza obligando
        // a que el camino reproduzca la raíz igual: para eso el probador pasa
        // el camino de cualquier proveedor real. Multiplicar por isReal deja
        // la igualdad trivialmente cierta cuando la posición está vacía.
        hojaProveedor[i] = Poseidon(1);
        hojaProveedor[i].inputs[0] <== vendorId[i];

        caminoProveedor[i] = MerkleRootFromPath(vendorHeight);
        caminoProveedor[i].leaf <== hojaProveedor[i].out;
        for (var j = 0; j < vendorHeight; j++) {
            caminoProveedor[i].pathElements[j] <== vendorPathElements[i][j];
            caminoProveedor[i].pathIndices[j] <== vendorPathIndices[i][j];
        }
        isReal[i] * (caminoProveedor[i].root - vendorSetRoot) === 0;

        // Solo suman los pagos reales.
        montoReal[i] <== isReal[i] * amount[i];
        acumulado[i + 1] <== acumulado[i] + montoReal[i];
    }

    // ── 1. El lote es exactamente este ──
    component arbol = MerkleRootFromLeaves(batchHeight);
    for (var i = 0; i < N; i++) {
        arbol.leaves[i] <== hoja[i];
    }
    arbol.root === batchRoot;

    // ── 2. El total cabe en el presupuesto ──
    // El total acumula N montos de amountBits, así que necesita amountBits +
    // batchHeight bits. El presupuesto se acota igual para que la comparación
    // no se pueda engañar con un valor enorme.
    var totalBits = amountBits + batchHeight;
    component limiteAcotado = Num2Bits(totalBits);
    limiteAcotado.in <== budgetLimit;

    component cabe = LessEqThan(totalBits);
    cabe.in[0] <== acumulado[N];
    cabe.in[1] <== budgetLimit;
    cabe.out === 1;
}

component main {public [batchRoot, vendorSetRoot, budgetLimit]} =
    AuthorizedAndWithinBudget(4, 6, 64);
