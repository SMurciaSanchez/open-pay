pragma circom 2.1.9;

include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/mux1.circom";

/// Un nivel del camino de Merkle: ordena el par según de qué lado va la hoja.
/// `side` vale 0 si el nodo actual es el hijo izquierdo y 1 si es el derecho.
template MerkleLevel() {
    signal input node;
    signal input sibling;
    signal input side;
    signal output out;

    // side tiene que ser 0 o 1: sin esto, un valor intermedio dejaría elegir
    // una combinación lineal cualquiera de los dos órdenes.
    side * (side - 1) === 0;

    component izq = Mux1();
    izq.c[0] <== node;
    izq.c[1] <== sibling;
    izq.s <== side;

    component der = Mux1();
    der.c[0] <== sibling;
    der.c[1] <== node;
    der.s <== side;

    component h = Poseidon(2);
    h.inputs[0] <== izq.out;
    h.inputs[1] <== der.out;
    out <== h.out;
}

/// Recorre el camino de una hoja hasta la raíz y devuelve la raíz que resulta.
/// Quien llama decide si la compara o no.
template MerkleRootFromPath(height) {
    signal input leaf;
    signal input pathElements[height];
    signal input pathIndices[height];
    signal output root;

    component nivel[height];
    signal nodo[height + 1];
    nodo[0] <== leaf;

    for (var i = 0; i < height; i++) {
        nivel[i] = MerkleLevel();
        nivel[i].node <== nodo[i];
        nivel[i].sibling <== pathElements[i];
        nivel[i].side <== pathIndices[i];
        nodo[i + 1] <== nivel[i].out;
    }

    root <== nodo[height];
}

/// Recalcula la raíz de un árbol completo a partir de TODAS sus hojas.
///
/// Es más caro que verificar un camino, y es el punto: solo recorriendo el
/// árbol entero se puede afirmar que no hay ninguna hoja además de las que se
/// declararon. Con caminos sueltos se probaría "estos pagos están", que deja
/// lugar a esconder los incómodos.
template MerkleRootFromLeaves(height) {
    var N = 1 << height;
    signal input leaves[N];
    signal output root;

    // nodos[i] guarda el nivel i; el nivel 0 son las hojas.
    component h[N - 1];
    signal nodos[2 * N - 1];

    for (var i = 0; i < N; i++) {
        nodos[i] <== leaves[i];
    }

    var escritos = N;
    var leidos = 0;
    for (var i = 0; i < N - 1; i++) {
        h[i] = Poseidon(2);
        h[i].inputs[0] <== nodos[leidos];
        h[i].inputs[1] <== nodos[leidos + 1];
        nodos[escritos] <== h[i].out;
        leidos += 2;
        escritos += 1;
    }

    root <== nodos[2 * N - 2];
}
