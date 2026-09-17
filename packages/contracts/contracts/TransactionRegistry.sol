// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title OpenPay Transaction Registry
/// @notice Anchors hashes of OpenPay P2P transactions on-chain for public verification.
///         Only authorized signers (OpenPay backend) can anchor — but ANY user can read events.
/// @dev Uses events (not storage) for ~10x gas savings. Data is indexed by block explorers.
contract TransactionRegistry {
    address public owner;
    mapping(address => bool) public authorizedSigners;

    /// @notice Emitted when a P2P transaction is anchored.
    /// @param txHash    keccak256(senderId || receiverId || amount || timestamp) computed off-chain.
    /// @param amount    Amount in minor units (e.g. cents). uint128 covers ~3.4e38, plenty.
    /// @param timestamp UNIX timestamp of the off-chain transaction.
    /// @param signer    Address that anchored this record.
    event TransactionAnchored(
        bytes32 indexed txHash,
        uint128 amount,
        uint64 timestamp,
        address indexed signer
    );

    /// @notice Emitted when a payment to a registered entity (tax authority, charity, etc.) is anchored.
    /// @param txHash    Same hash convention as P2P.
    /// @param entityId  keccak256 of the entity identifier (e.g. "DIAN-IMPUESTOS-2026").
    /// @param amount    Amount in minor units.
    /// @param timestamp UNIX timestamp.
    /// @param metadata  Public metadata for auditability (e.g. concept, reference).
    event EntityPaymentAnchored(
        bytes32 indexed txHash,
        bytes32 indexed entityId,
        uint128 amount,
        uint64 timestamp,
        string metadata
    );

    event SignerAuthorized(address indexed signer);
    event SignerRevoked(address indexed signer);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    error NotOwner();
    error NotAuthorizedSigner();
    error ZeroAddress();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlySigner() {
        if (!authorizedSigners[msg.sender]) revert NotAuthorizedSigner();
        _;
    }

    constructor() {
        owner = msg.sender;
        authorizedSigners[msg.sender] = true;
        emit SignerAuthorized(msg.sender);
    }

    function anchorTransaction(
        bytes32 txHash,
        uint128 amount,
        uint64 timestamp
    ) external onlySigner {
        emit TransactionAnchored(txHash, amount, timestamp, msg.sender);
    }

    function anchorEntityPayment(
        bytes32 txHash,
        bytes32 entityId,
        uint128 amount,
        uint64 timestamp,
        string calldata metadata
    ) external onlySigner {
        emit EntityPaymentAnchored(txHash, entityId, amount, timestamp, metadata);
    }

    function authorizeSigner(address signer) external onlyOwner {
        if (signer == address(0)) revert ZeroAddress();
        authorizedSigners[signer] = true;
        emit SignerAuthorized(signer);
    }

    function revokeSigner(address signer) external onlyOwner {
        authorizedSigners[signer] = false;
        emit SignerRevoked(signer);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}
