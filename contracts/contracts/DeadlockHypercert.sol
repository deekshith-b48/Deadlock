
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @title DeadlockHypercert
/// @notice Records inheritance events on-chain for Hypercerts indexing.
/// @dev Emits structured events when vaults are released. The Hypercerts SDK
///      indexes these events to create immutable proof of digital inheritance.
contract DeadlockHypercert is Ownable {
    // ─────────────────────────────────────────────────────────────────────────
    // Structs
    // ─────────────────────────────────────────────────────────────────────────

    struct InheritanceRecord {
        bytes32 vaultId;
        address owner;
        address[] beneficiaries;
        uint256 releasedAt;
        string encryptedCID;
        uint8 triggerType;       // Matches DeadlockRegistry.TriggerType enum
        uint256 hypercertId;
        bool exists;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // State Variables
    // ─────────────────────────────────────────────────────────────────────────

    mapping(bytes32 => InheritanceRecord) public inheritanceRecords;
    mapping(bytes32 => uint256) public vaultToHypercert;
    mapping(address => bytes32[]) public ownerInheritances;
    mapping(address => bytes32[]) public beneficiaryInheritances;

    uint256 public totalInheritances;
    uint256 private _hypercertIdCounter;

    address public registryAddress;

    // ─────────────────────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Emitted when an inheritance event is recorded. Indexed by Hypercerts SDK.
    event InheritanceRecorded(
        bytes32 indexed vaultId,
        address indexed owner,
        address[] beneficiaries,
        uint256 releasedAt,
        string encryptedCID,
        uint8 triggerType,
        uint256 hypercertId
    );

    event HypercertMinted(
        uint256 indexed hypercertId,
        bytes32 indexed vaultId,
        address indexed claimedBy,
        uint256 timestamp
    );

    // ─────────────────────────────────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────────────────────────────────

    constructor(address _registryAddress) Ownable(msg.sender) {
        registryAddress = _registryAddress;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // External Functions
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Record an inheritance event after vault release.
    /// @dev Called by the frontend or registry after vault release is confirmed.
    /// @param vaultId The released vault ID
    /// @param owner The vault owner address
    /// @param beneficiaries Array of beneficiary addresses
    /// @param releasedAt Timestamp when the vault was released
    /// @param encryptedCID The IPFS CID of the encrypted vault payload
    /// @param triggerType The trigger type that caused the release
    /// @return hypercertId The generated Hypercert identifier
    function recordInheritance(
        bytes32 vaultId,
        address owner,
        address[] calldata beneficiaries,
        uint256 releasedAt,
        string calldata encryptedCID,
        uint8 triggerType
    ) external returns (uint256 hypercertId) {
        require(!inheritanceRecords[vaultId].exists, "DeadlockHypercert: Already recorded");
        require(beneficiaries.length > 0, "DeadlockHypercert: No beneficiaries");
        require(owner != address(0), "DeadlockHypercert: Zero owner address");

        hypercertId = ++_hypercertIdCounter;
        totalInheritances++;

        InheritanceRecord storage record = inheritanceRecords[vaultId];
        record.vaultId = vaultId;
        record.owner = owner;
        record.releasedAt = releasedAt;
        record.encryptedCID = encryptedCID;
        record.triggerType = triggerType;
        record.hypercertId = hypercertId;
        record.exists = true;

        for (uint256 i = 0; i < beneficiaries.length; i++) {
            record.beneficiaries.push(beneficiaries[i]);
            beneficiaryInheritances[beneficiaries[i]].push(vaultId);
        }

        vaultToHypercert[vaultId] = hypercertId;
        ownerInheritances[owner].push(vaultId);

        emit InheritanceRecorded(
            vaultId,
            owner,
            beneficiaries,
            releasedAt,
            encryptedCID,
            triggerType,
            hypercertId
        );
    }

    /// @notice Record that a beneficiary claimed their inheritance (for Hypercert attestation).
    /// @param vaultId The vault that was claimed
    function recordClaim(bytes32 vaultId) external {
        InheritanceRecord storage record = inheritanceRecords[vaultId];
        require(record.exists, "DeadlockHypercert: No inheritance record for vault");

        emit HypercertMinted(record.hypercertId, vaultId, msg.sender, block.timestamp);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // View Functions
    // ─────────────────────────────────────────────────────────────────────────

    function getInheritanceRecord(bytes32 vaultId) external view returns (InheritanceRecord memory) {
        return inheritanceRecords[vaultId];
    }

    function getOwnerInheritances(address owner) external view returns (bytes32[] memory) {
        return ownerInheritances[owner];
    }

    function getBeneficiaryInheritances(address beneficiary) external view returns (bytes32[] memory) {
        return beneficiaryInheritances[beneficiary];
    }

    function getHypercertId(bytes32 vaultId) external view returns (uint256) {
        return vaultToHypercert[vaultId];
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Admin
    // ─────────────────────────────────────────────────────────────────────────

    function setRegistryAddress(address _registryAddress) external onlyOwner {
        registryAddress = _registryAddress;
    }
}
