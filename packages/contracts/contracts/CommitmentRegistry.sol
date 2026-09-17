// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title OpenPay Commitment Registry
/// @notice Ancla raíces de Merkle. Nada más.
///
/// Lo que este contrato NO acepta, por construcción: montos, nombres,
/// descripciones, NIT, identificadores de personas. Sus funciones solo reciben
/// `bytes32`, así que ningún dato de esos cabe aquí ni por error de quien
/// integre. Ese es el criterio de terminado de la Fase 2 del plan.
///
/// Cada raíz resume un conjunto construido fuera de la cadena con Poseidon:
///  - PaymentBatch: los compromisos de un lote de pagos ya conciliados. Cada
///    hoja es Poseidon(pago, monto, proveedor, fecha, sal). Sin la sal, que
///    nunca sale de la base, una hoja no se puede adivinar probando montos.
///  - VendorSet: la lista de proveedores autorizados de un fondo, con fecha.
///  - RuleSet: las reglas vigentes del fondo, con fecha.
///  - VerificationKey: la huella SHA-256 de la clave con la que se verifican
///    las pruebas ZK. No es una raíz de Merkle, y está acá por una razón
///    concreta: sin ella, quien entra al portal público a verificar una prueba
///    está confiando en que la página le sirvió la clave correcta. Con la
///    huella anclada puede compararla en el explorador de bloques y dejar de
///    confiar en el portal.
///
/// Los árboles se publican con altura fija y se rellenan con hojas vacías, de
/// modo que la raíz tampoco revela cuántos pagos hubo.
///
/// Qué prueba y qué no: que un conjunto existía y no cambió desde la fecha en
/// que se ancló. No prueba que el dinero se movió: eso lo dice el extracto
/// bancario conciliado, y el banco sigue siendo la fuente (supuesto S5 de
/// docs/MODELO_AMENAZA.md).
contract CommitmentRegistry {
    enum RootKind {
        PaymentBatch,
        VendorSet,
        RuleSet,
        VerificationKey
    }

    struct Root {
        bytes32 value;
        /// @dev Identificador público del fondo (no es su id interno ni nada
        ///      personal): lo publica el portal de verificación para que
        ///      cualquiera encuentre las raíces de ese fondo.
        bytes32 subject;
        RootKind kind;
        uint64 publishedAt;
        address publisher;
    }

    address public owner;
    address public pendingOwner;
    mapping(address => bool) public isPublisher;

    Root[] private _roots;
    /// @dev raíz => índice + 1. El 0 significa "no está".
    mapping(bytes32 => uint256) private _indexOfRoot;

    event RootPublished(
        uint256 indexed index,
        bytes32 indexed value,
        bytes32 indexed subject,
        RootKind kind,
        uint64 publishedAt,
        address publisher
    );
    event PublisherAuthorized(address indexed publisher);
    event PublisherRevoked(address indexed publisher);
    event OwnershipTransferStarted(address indexed from, address indexed to);
    event OwnershipTransferred(address indexed from, address indexed to);

    error NotOwner();
    error NotPublisher();
    error NotPendingOwner();
    error ZeroAddress();
    error ZeroRoot();
    error RootAlreadyPublished(bytes32 value);
    error NoSuchRoot();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor() {
        owner = msg.sender;
        isPublisher[msg.sender] = true;
        emit OwnershipTransferred(address(0), msg.sender);
        emit PublisherAuthorized(msg.sender);
    }

    // ── Publicar ────────────────────────────────────────────────

    /// @notice Ancla una raíz. Una vez anclada no se puede cambiar ni borrar:
    ///         no existe función para hacerlo, ni siquiera para el dueño.
    /// @param kind    Qué conjunto resume la raíz.
    /// @param subject Identificador público del fondo al que pertenece.
    /// @param value   La raíz de Merkle, calculada fuera de la cadena.
    /// @return index  Posición de la raíz en el registro.
    function publishRoot(RootKind kind, bytes32 subject, bytes32 value)
        external
        returns (uint256 index)
    {
        if (!isPublisher[msg.sender]) revert NotPublisher();
        if (value == bytes32(0)) revert ZeroRoot();
        if (_indexOfRoot[value] != 0) revert RootAlreadyPublished(value);

        index = _roots.length;
        _roots.push(
            Root({
                value: value,
                subject: subject,
                kind: kind,
                publishedAt: uint64(block.timestamp),
                publisher: msg.sender
            })
        );
        _indexOfRoot[value] = index + 1;

        emit RootPublished(index, value, subject, kind, uint64(block.timestamp), msg.sender);
    }

    // ── Leer (cualquiera, sin cuenta) ───────────────────────────

    /// @notice Si una raíz fue anclada alguna vez. Es lo que consultará el
    ///         verificador de pruebas ZK de la Fase 3.
    function isKnownRoot(bytes32 value) external view returns (bool) {
        return _indexOfRoot[value] != 0;
    }

    function rootCount() external view returns (uint256) {
        return _roots.length;
    }

    function rootAt(uint256 index) external view returns (Root memory) {
        if (index >= _roots.length) revert NoSuchRoot();
        return _roots[index];
    }

    /// @notice Cuándo se ancló una raíz. Cero si nunca se ancló.
    function publishedAt(bytes32 value) external view returns (uint64) {
        uint256 slot = _indexOfRoot[value];
        if (slot == 0) return 0;
        return _roots[slot - 1].publishedAt;
    }

    // ── Quién puede publicar ────────────────────────────────────

    function authorizePublisher(address publisher) external onlyOwner {
        if (publisher == address(0)) revert ZeroAddress();
        if (isPublisher[publisher]) return;
        isPublisher[publisher] = true;
        emit PublisherAuthorized(publisher);
    }

    function revokePublisher(address publisher) external onlyOwner {
        if (!isPublisher[publisher]) return;
        isPublisher[publisher] = false;
        emit PublisherRevoked(publisher);
    }

    /// @notice Traspaso en dos pasos: si se teclea mal la dirección, el
    ///         registro no queda sin dueño.
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        pendingOwner = newOwner;
        emit OwnershipTransferStarted(owner, newOwner);
    }

    function acceptOwnership() external {
        if (msg.sender != pendingOwner) revert NotPendingOwner();
        address previous = owner;
        owner = pendingOwner;
        pendingOwner = address(0);
        emit OwnershipTransferred(previous, owner);
    }
}
