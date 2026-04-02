// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/// @title DeadlockWitnessNFT
/// @notice Soulbound (non-transferable) ERC-721 credential minted to witnesses and guardians.
/// @dev Token metadata is fully on-chain as a base64-encoded SVG. Cannot be transferred.
contract DeadlockWitnessNFT is ERC721, Ownable {
    using Strings for uint256;
    using Strings for address;

    // ─────────────────────────────────────────────────────────────────────────
    // State Variables
    // ─────────────────────────────────────────────────────────────────────────

    uint256 private _tokenIdCounter;
    address public registryAddress;

    struct WitnessCredential {
        bytes32 vaultId;
        address grantor;
        string role; // "WITNESS" or "GUARDIAN"
        uint256 mintedAt;
    }

    mapping(uint256 => WitnessCredential) public credentials;
    // Track which (vaultId, witness) pairs have already been minted
    mapping(bytes32 => mapping(address => uint256)) public vaultWitnessToken;

    // ─────────────────────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────────────────────

    event WitnessMinted(uint256 indexed tokenId, address indexed witness, bytes32 indexed vaultId, string role);

    // ─────────────────────────────────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────────────────────────────────

    constructor(address _registryAddress) ERC721("Deadlock Witness", "DLWIT") Ownable(msg.sender) {
        registryAddress = _registryAddress;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Minting
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Mint a witness credential to an address for a specific vault.
    /// @param to The witness/guardian address to receive the credential
    /// @param vaultId The vault this credential is for
    /// @param role Either "WITNESS" or "GUARDIAN"
    function mintWitness(
        address to,
        bytes32 vaultId,
        string calldata role
    ) external returns (uint256 tokenId) {
        require(
            msg.sender == owner() || msg.sender == registryAddress,
            "DeadlockWitnessNFT: Only registry or owner can mint"
        );
        require(
            keccak256(bytes(role)) == keccak256(bytes("WITNESS")) ||
            keccak256(bytes(role)) == keccak256(bytes("GUARDIAN")),
            "DeadlockWitnessNFT: Invalid role"
        );
        require(
            vaultWitnessToken[vaultId][to] == 0,
            "DeadlockWitnessNFT: Already minted for this vault"
        );

        tokenId = ++_tokenIdCounter;

        credentials[tokenId] = WitnessCredential({
            vaultId: vaultId,
            grantor: msg.sender,
            role: role,
            mintedAt: block.timestamp
        });

        vaultWitnessToken[vaultId][to] = tokenId;
        _safeMint(to, tokenId);

        emit WitnessMinted(tokenId, to, vaultId, role);
    }

    /// @notice Batch mint witness credentials for multiple witnesses.
    function batchMintWitnesses(
        address[] calldata witnesses,
        bytes32 vaultId,
        string calldata role
    ) external {
        require(
            msg.sender == owner() || msg.sender == registryAddress,
            "DeadlockWitnessNFT: Only registry or owner can mint"
        );
        for (uint256 i = 0; i < witnesses.length; i++) {
            if (vaultWitnessToken[vaultId][witnesses[i]] == 0) {
                uint256 tokenId = ++_tokenIdCounter;
                credentials[tokenId] = WitnessCredential({
                    vaultId: vaultId,
                    grantor: msg.sender,
                    role: role,
                    mintedAt: block.timestamp
                });
                vaultWitnessToken[vaultId][witnesses[i]] = tokenId;
                _safeMint(witnesses[i], tokenId);
                emit WitnessMinted(tokenId, witnesses[i], vaultId, role);
            }
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Soulbound: Block All Transfers
    // ─────────────────────────────────────────────────────────────────────────

    function transferFrom(address, address, uint256) public pure override {
        revert("Soulbound: non-transferable");
    }

    function safeTransferFrom(address, address, uint256, bytes memory) public pure override {
        revert("Soulbound: non-transferable");
    }

    function approve(address, uint256) public pure override {
        revert("Soulbound: non-transferable");
    }

    function setApprovalForAll(address, bool) public pure override {
        revert("Soulbound: non-transferable");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // On-chain SVG Token URI
    // ─────────────────────────────────────────────────────────────────────────

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "DeadlockWitnessNFT: Token does not exist");

        WitnessCredential memory cred = credentials[tokenId];
        string memory roleColor = keccak256(bytes(cred.role)) == keccak256(bytes("GUARDIAN"))
            ? "#f59e0b"
            : "#7c3aed";
        string memory roleIcon = keccak256(bytes(cred.role)) == keccak256(bytes("GUARDIAN"))
            ? "&#9881;"
            : "&#9760;";

        string memory vaultIdShort = _bytes32ToHexShort(cred.vaultId);

        string memory svg = string(abi.encodePacked(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300">',
            '<rect width="400" height="300" fill="#0a0a0f" rx="16"/>',
            '<rect x="1" y="1" width="398" height="298" fill="none" stroke="', roleColor, '" stroke-width="2" rx="16"/>',
            '<text x="200" y="60" text-anchor="middle" font-family="monospace" font-size="40" fill="', roleColor, '">', roleIcon, '</text>',
            '<text x="200" y="110" text-anchor="middle" font-family="monospace" font-size="18" font-weight="bold" fill="white">DEADLOCK PROTOCOL</text>',
            '<text x="200" y="140" text-anchor="middle" font-family="monospace" font-size="14" fill="', roleColor, '">', cred.role, ' CREDENTIAL</text>',
            '<text x="200" y="175" text-anchor="middle" font-family="monospace" font-size="10" fill="#888">Vault: 0x', vaultIdShort, '</text>',
            '<text x="200" y="200" text-anchor="middle" font-family="monospace" font-size="10" fill="#888">Token #', tokenId.toString(), '</text>',
            '<text x="200" y="225" text-anchor="middle" font-family="monospace" font-size="9" fill="#555">Soulbound Non-Transferable</text>',
            '<text x="200" y="270" text-anchor="middle" font-family="monospace" font-size="8" fill="#333">Filecoin FEVM | Calibration Testnet</text>',
            '</svg>'
        ));

        string memory json = Base64.encode(bytes(string(abi.encodePacked(
            '{"name":"DEADLOCK ', cred.role, ' #', tokenId.toString(), '",',
            '"description":"Soulbound credential for DEADLOCK Protocol. This address is designated as a ', cred.role, ' for vault 0x', vaultIdShort, '.",',
            '"image":"data:image/svg+xml;base64,', Base64.encode(bytes(svg)), '",',
            '"attributes":[',
            '{"trait_type":"Role","value":"', cred.role, '"},',
            '{"trait_type":"Vault ID","value":"0x', vaultIdShort, '"},',
            '{"trait_type":"Token Type","value":"Soulbound"}',
            ']}'
        ))));

        return string(abi.encodePacked("data:application/json;base64,", json));
    }

    function totalSupply() external view returns (uint256) {
        return _tokenIdCounter;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Admin
    // ─────────────────────────────────────────────────────────────────────────

    function setRegistryAddress(address _registryAddress) external onlyOwner {
        registryAddress = _registryAddress;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    function _bytes32ToHexShort(bytes32 b) internal pure returns (string memory) {
        bytes memory hexChars = "0123456789abcdef";
        bytes memory result = new bytes(8);
        for (uint256 i = 0; i < 4; i++) {
            result[i * 2] = hexChars[uint8(b[i] >> 4)];
            result[i * 2 + 1] = hexChars[uint8(b[i] & 0x0f)];
        }
        return string(result);
    }
}
