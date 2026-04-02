// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title DeadlockRegistry
/// @notice Core vault registry for the DEADLOCK trustless dead man's switch protocol
/// @dev Deployed on Filecoin Calibration Testnet (FEVM). Vault contents are encrypted
///      via Lit Protocol and stored on IPFS/Filecoin via Storacha. This contract only
///      stores metadata and triggers — never plaintext vault contents.
contract DeadlockRegistry {
    // ─────────────────────────────────────────────────────────────────────────
    // Enums
    // ─────────────────────────────────────────────────────────────────────────

    enum TriggerType {
        INACTIVITY,    // Released if owner doesn't check in within inactivityWindow
        TIMELOCK,      // Released at a specific unix timestamp (triggerValue)
        DEATH_QUORUM,  // Released when witnessQuorum witnesses attest death
        GEOPOLITICAL,  // Like INACTIVITY but triggered by guardian network
        MUTUAL         // Cross-linked vaults that release each other
    }

    enum VaultStatus {
        ACTIVE,    // Vault is live and locked
        RELEASED,  // Vault has been released — decryption authorized
        CANCELLED  // Owner cancelled the vault
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Structs
    // ─────────────────────────────────────────────────────────────────────────

    struct Vault {
        bytes32 vaultId;
        address owner;
        uint256 worldIdNullifier;      // World ID nullifier hash (proves unique human)
        string encryptedCID;           // IPFS CID of Lit-encrypted vault payload
        string litActionCID;           // IPFS CID of the Lit Action script
        TriggerType triggerType;
        uint256 triggerValue;          // INACTIVITY: unused. TIMELOCK: unix timestamp. DEATH_QUORUM: unused.
        uint256 lastCheckin;           // Unix timestamp of last heartbeat
        uint256 inactivityWindow;      // Seconds of silence before inactivity trigger fires
        address[] beneficiaries;       // Who receives the vault
        address[] witnesses;           // For DEATH_QUORUM: who can attest death
        uint256 witnessQuorum;         // How many witnesses needed to trigger
        uint256 witnessVoteCount;      // Current witness vote count
        VaultStatus status;
        uint256 createdAt;
        uint256 releasedAt;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // State Variables
    // ─────────────────────────────────────────────────────────────────────────

    mapping(bytes32 => Vault) public vaults;
    mapping(address => bytes32[]) public ownerVaults;
    mapping(address => bytes32[]) public beneficiaryVaults;
    mapping(bytes32 => mapping(address => bool)) public witnessVoted;
    mapping(uint256 => bool) public usedNullifiers;
    mapping(bytes32 => mapping(address => bool)) public isBeneficiary;
    mapping(bytes32 => mapping(address => bool)) public isWitness;
    uint256 public totalVaults;
    address public guardianQuorumContract;

    // ─────────────────────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────────────────────

    event VaultCreated(bytes32 indexed vaultId, address indexed owner, TriggerType triggerType);
    event CheckinRecorded(bytes32 indexed vaultId, address indexed owner, uint256 timestamp);
    event WitnessAttestation(bytes32 indexed vaultId, address indexed witness, uint256 voteCount);
    event VaultReleased(bytes32 indexed vaultId, address indexed triggeredBy, uint256 timestamp);
    event VaultCancelled(bytes32 indexed vaultId, address indexed owner);
    event BeneficiaryAdded(bytes32 indexed vaultId, address indexed beneficiary);
    event GuardianTrigger(bytes32 indexed vaultId, address indexed guardian);
    event VaultClaimed(bytes32 indexed vaultId, address indexed beneficiary, uint256 timestamp);
    event VaultCIDUpdated(bytes32 indexed vaultId, string newCID);

    // ─────────────────────────────────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────────────────────────────────

    constructor(address _guardianQuorumContract) {
        guardianQuorumContract = _guardianQuorumContract;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // External Functions
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Create a new vault. One vault per unique human (enforced by World ID nullifier).
    /// @param worldIdNullifier The World ID nullifier hash for proof-of-humanity
    /// @param worldIdProof The World ID ZK proof (verified off-chain by frontend, nullifier stored here)
    /// @param encryptedCID IPFS CID of the Lit-encrypted vault payload
    /// @param litActionCID IPFS CID of the Lit Action that governs decryption
    /// @param triggerType The type of trigger condition
    /// @param triggerValue For TIMELOCK: unix timestamp. Otherwise unused (set 0).
    /// @param inactivityWindow Seconds of inactivity before INACTIVITY trigger fires
    /// @param beneficiaries Array of wallet addresses that receive the vault
    /// @param witnesses Array of wallet addresses that can attest death (DEATH_QUORUM only)
    /// @param witnessQuorum Number of witness attestations required (DEATH_QUORUM only)
    /// @return vaultId The generated vault identifier
    function createVault(
        uint256 worldIdNullifier,
        uint256[8] calldata worldIdProof,
        string calldata encryptedCID,
        string calldata litActionCID,
        TriggerType triggerType,
        uint256 triggerValue,
        uint256 inactivityWindow,
        address[] calldata beneficiaries,
        address[] calldata witnesses,
        uint256 witnessQuorum
    ) external returns (bytes32 vaultId) {
        require(!usedNullifiers[worldIdNullifier], "DeadlockRegistry: World ID already used");
        require(beneficiaries.length > 0, "DeadlockRegistry: At least one beneficiary required");
        require(bytes(encryptedCID).length > 0, "DeadlockRegistry: encryptedCID cannot be empty");
        require(bytes(litActionCID).length > 0, "DeadlockRegistry: litActionCID cannot be empty");

        if (triggerType == TriggerType.TIMELOCK) {
            require(triggerValue > block.timestamp, "DeadlockRegistry: Timelock must be in the future");
        }

        if (triggerType == TriggerType.DEATH_QUORUM) {
            require(witnesses.length >= witnessQuorum, "DeadlockRegistry: Not enough witnesses for quorum");
            require(witnessQuorum > 0, "DeadlockRegistry: Witness quorum must be > 0");
        }

        // Generate unique vault ID
        vaultId = keccak256(abi.encodePacked(msg.sender, block.timestamp, worldIdNullifier));
        require(vaults[vaultId].createdAt == 0, "DeadlockRegistry: Vault ID collision");

        // Mark nullifier as used
        usedNullifiers[worldIdNullifier] = true;
        totalVaults++;

        // Initialize vault
        Vault storage vault = vaults[vaultId];
        vault.vaultId = vaultId;
        vault.owner = msg.sender;
        vault.worldIdNullifier = worldIdNullifier;
        vault.encryptedCID = encryptedCID;
        vault.litActionCID = litActionCID;
        vault.triggerType = triggerType;
        vault.triggerValue = triggerValue;
        vault.lastCheckin = block.timestamp;
        vault.inactivityWindow = inactivityWindow;
        vault.witnessQuorum = witnessQuorum;
        vault.witnessVoteCount = 0;
        vault.status = VaultStatus.ACTIVE;
        vault.createdAt = block.timestamp;
        vault.releasedAt = 0;

        // Register beneficiaries
        for (uint256 i = 0; i < beneficiaries.length; i++) {
            require(beneficiaries[i] != address(0), "DeadlockRegistry: Zero address beneficiary");
            vault.beneficiaries.push(beneficiaries[i]);
            isBeneficiary[vaultId][beneficiaries[i]] = true;
            beneficiaryVaults[beneficiaries[i]].push(vaultId);
            emit BeneficiaryAdded(vaultId, beneficiaries[i]);
        }

        // Register witnesses
        for (uint256 i = 0; i < witnesses.length; i++) {
            require(witnesses[i] != address(0), "DeadlockRegistry: Zero address witness");
            vault.witnesses.push(witnesses[i]);
            isWitness[vaultId][witnesses[i]] = true;
        }

        // Register owner
        ownerVaults[msg.sender].push(vaultId);

        emit VaultCreated(vaultId, msg.sender, triggerType);
    }

    /// @notice Record a heartbeat check-in. Resets the inactivity timer.
    /// @param vaultId The vault to check in for
    function checkin(bytes32 vaultId) external {
        Vault storage vault = vaults[vaultId];
        require(vault.owner == msg.sender, "DeadlockRegistry: Not vault owner");
        require(vault.status == VaultStatus.ACTIVE, "DeadlockRegistry: Vault not active");

        vault.lastCheckin = block.timestamp;
        emit CheckinRecorded(vaultId, msg.sender, block.timestamp);
    }

    /// @notice Witness attests to the death of the vault owner (DEATH_QUORUM trigger only).
    /// @param vaultId The vault to attest for
    function attestDeath(bytes32 vaultId) external {
        Vault storage vault = vaults[vaultId];
        require(vault.status == VaultStatus.ACTIVE, "DeadlockRegistry: Vault not active");
        require(vault.triggerType == TriggerType.DEATH_QUORUM, "DeadlockRegistry: Not a death quorum vault");
        require(isWitness[vaultId][msg.sender], "DeadlockRegistry: Not a registered witness");
        require(!witnessVoted[vaultId][msg.sender], "DeadlockRegistry: Already voted");

        witnessVoted[vaultId][msg.sender] = true;
        vault.witnessVoteCount++;

        emit WitnessAttestation(vaultId, msg.sender, vault.witnessVoteCount);

        if (vault.witnessVoteCount >= vault.witnessQuorum) {
            _releaseVault(vaultId, msg.sender);
        }
    }

    /// @notice Guardian network triggers inactivity release. Callable by anyone.
    /// @param vaultId The vault to trigger
    function guardianTriggerInactivity(bytes32 vaultId) external {
        Vault storage vault = vaults[vaultId];
        require(vault.status == VaultStatus.ACTIVE, "DeadlockRegistry: Vault not active");
        require(
            vault.triggerType == TriggerType.INACTIVITY || vault.triggerType == TriggerType.GEOPOLITICAL,
            "DeadlockRegistry: Invalid trigger type for inactivity"
        );
        require(
            block.timestamp > vault.lastCheckin + vault.inactivityWindow,
            "DeadlockRegistry: Inactivity window not elapsed"
        );

        emit GuardianTrigger(vaultId, msg.sender);
        _releaseVault(vaultId, msg.sender);
    }

    /// @notice Guardian network triggers timelock release. Callable by anyone.
    /// @param vaultId The vault to trigger
    function guardianTriggerTimelock(bytes32 vaultId) external {
        Vault storage vault = vaults[vaultId];
        require(vault.status == VaultStatus.ACTIVE, "DeadlockRegistry: Vault not active");
        require(vault.triggerType == TriggerType.TIMELOCK, "DeadlockRegistry: Not a timelock vault");
        require(block.timestamp >= vault.triggerValue, "DeadlockRegistry: Timelock not elapsed");

        emit GuardianTrigger(vaultId, msg.sender);
        _releaseVault(vaultId, msg.sender);
    }

    /// @notice Beneficiary records their claim on-chain. Actual decryption happens off-chain via Lit.
    /// @param vaultId The released vault to claim
    function claimVault(bytes32 vaultId) external {
        Vault storage vault = vaults[vaultId];
        require(vault.status == VaultStatus.RELEASED, "DeadlockRegistry: Vault not released");
        require(isBeneficiary[vaultId][msg.sender], "DeadlockRegistry: Not a beneficiary");

        emit VaultClaimed(vaultId, msg.sender, block.timestamp);
    }

    /// @notice Owner cancels their vault.
    /// @param vaultId The vault to cancel
    function cancelVault(bytes32 vaultId) external {
        Vault storage vault = vaults[vaultId];
        require(vault.owner == msg.sender, "DeadlockRegistry: Not vault owner");
        require(vault.status == VaultStatus.ACTIVE, "DeadlockRegistry: Vault not active");

        vault.status = VaultStatus.CANCELLED;
        emit VaultCancelled(vaultId, msg.sender);
    }

    /// @notice Owner updates the list of beneficiaries.
    /// @param vaultId The vault to update
    /// @param newBeneficiaries New list of beneficiary addresses
    function updateBeneficiaries(bytes32 vaultId, address[] calldata newBeneficiaries) external {
        Vault storage vault = vaults[vaultId];
        require(vault.owner == msg.sender, "DeadlockRegistry: Not vault owner");
        require(vault.status == VaultStatus.ACTIVE, "DeadlockRegistry: Vault not active");
        require(newBeneficiaries.length > 0, "DeadlockRegistry: At least one beneficiary required");

        // Clear old beneficiary lookups
        for (uint256 i = 0; i < vault.beneficiaries.length; i++) {
            isBeneficiary[vaultId][vault.beneficiaries[i]] = false;
        }
        delete vault.beneficiaries;

        // Set new beneficiaries
        for (uint256 i = 0; i < newBeneficiaries.length; i++) {
            require(newBeneficiaries[i] != address(0), "DeadlockRegistry: Zero address beneficiary");
            vault.beneficiaries.push(newBeneficiaries[i]);
            isBeneficiary[vaultId][newBeneficiaries[i]] = true;
            emit BeneficiaryAdded(vaultId, newBeneficiaries[i]);
        }
    }

    /// @notice Owner updates the encrypted vault contents (re-encrypt + re-upload to IPFS).
    /// @param vaultId The vault to update
    /// @param newEncryptedCID New IPFS CID of the re-encrypted payload
    function updateCID(bytes32 vaultId, string calldata newEncryptedCID) external {
        Vault storage vault = vaults[vaultId];
        require(vault.owner == msg.sender, "DeadlockRegistry: Not vault owner");
        require(vault.status == VaultStatus.ACTIVE, "DeadlockRegistry: Vault not active");
        require(bytes(newEncryptedCID).length > 0, "DeadlockRegistry: CID cannot be empty");

        vault.encryptedCID = newEncryptedCID;
        emit VaultCIDUpdated(vaultId, newEncryptedCID);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // View Functions
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Used by Lit Action to check on-chain whether vault release conditions are met.
    /// @param vaultId The vault to check
    /// @return bool True if vault is in RELEASED state
    function isReleaseConditionMet(bytes32 vaultId) external view returns (bool) {
        return vaults[vaultId].status == VaultStatus.RELEASED;
    }

    /// @notice Get full vault data.
    function getVault(bytes32 vaultId) external view returns (Vault memory) {
        return vaults[vaultId];
    }

    /// @notice Get all vault IDs owned by an address.
    function getOwnerVaults(address owner) external view returns (bytes32[] memory) {
        return ownerVaults[owner];
    }

    /// @notice Get all vault IDs where address is a beneficiary.
    function getBeneficiaryVaults(address beneficiary) external view returns (bytes32[] memory) {
        return beneficiaryVaults[beneficiary];
    }

    /// @notice Check if inactivity trigger can fire right now.
    function canTriggerInactivity(bytes32 vaultId) external view returns (bool) {
        Vault storage vault = vaults[vaultId];
        return vault.status == VaultStatus.ACTIVE
            && (vault.triggerType == TriggerType.INACTIVITY || vault.triggerType == TriggerType.GEOPOLITICAL)
            && block.timestamp > vault.lastCheckin + vault.inactivityWindow;
    }

    /// @notice Check if timelock trigger can fire right now.
    function canTriggerTimelock(bytes32 vaultId) external view returns (bool) {
        Vault storage vault = vaults[vaultId];
        return vault.status == VaultStatus.ACTIVE
            && vault.triggerType == TriggerType.TIMELOCK
            && block.timestamp >= vault.triggerValue;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Internal Functions
    // ─────────────────────────────────────────────────────────────────────────

    function _releaseVault(bytes32 vaultId, address triggeredBy) internal {
        Vault storage vault = vaults[vaultId];
        vault.status = VaultStatus.RELEASED;
        vault.releasedAt = block.timestamp;
        emit VaultReleased(vaultId, triggeredBy, block.timestamp);
    }
}
