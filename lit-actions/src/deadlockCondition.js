/**
 * DEADLOCK Protocol — Core Lit Action
 *
 * This Lit Action runs inside the Lit Protocol's decentralized node network.
 * It evaluates whether a vault's release conditions are met on-chain (Filecoin FVM)
 * and signs authorization for the beneficiary to decrypt the vault contents.
 *
 * Injected by Lit: ethers, LitActions, Lit.Actions
 * Parameters: vaultId, beneficiaryAddress, registryAddress, chainId, pkpPublicKey
 */

const go = async () => {
  const iface = new ethers.utils.Interface([
    "function isReleaseConditionMet(bytes32 vaultId) external view returns (bool)",
    "function getVault(bytes32 vaultId) external view returns (tuple(bytes32 vaultId, address owner, uint256 worldIdNullifier, string encryptedCID, string litActionCID, uint8 triggerType, uint256 triggerValue, uint256 lastCheckin, uint256 inactivityWindow, address[] beneficiaries, address[] witnesses, uint256 witnessQuorum, uint256 witnessVoteCount, uint8 status, uint256 createdAt, uint256 releasedAt))",
  ]);

  const provider = new ethers.providers.JsonRpcProvider(
    "https://api.calibration.node.glif.io/rpc/v1"
  );

  const registry = new ethers.Contract(registryAddress, iface, provider);

  let conditionMet;
  let vault;

  try {
    [conditionMet, vault] = await Promise.all([
      registry.isReleaseConditionMet(vaultId),
      registry.getVault(vaultId),
    ]);
  } catch (err) {
    LitActions.setResponse({
      response: JSON.stringify({
        success: false,
        reason: `Failed to query contract: ${err.message}`,
      }),
    });
    return;
  }

  // Verify vault exists
  if (vault.owner === ethers.constants.AddressZero) {
    LitActions.setResponse({
      response: JSON.stringify({
        success: false,
        reason: "Vault does not exist.",
      }),
    });
    return;
  }

  // Verify release condition is met on-chain
  if (!conditionMet) {
    LitActions.setResponse({
      response: JSON.stringify({
        success: false,
        reason: "Release conditions not yet met. Vault is still locked.",
        vaultStatus: vault.status,
      }),
    });
    return;
  }

  // Verify requester is a legitimate beneficiary
  const beneficiaries = vault.beneficiaries || [];
  const isBeneficiary = beneficiaries
    .map((b) => b.toLowerCase())
    .includes(beneficiaryAddress.toLowerCase());

  if (!isBeneficiary) {
    LitActions.setResponse({
      response: JSON.stringify({
        success: false,
        reason: "Address is not a registered beneficiary of this vault.",
        beneficiaryAddress,
        registeredBeneficiaries: beneficiaries,
      }),
    });
    return;
  }

  // Conditions met — sign to authorize decryption
  // The PKP signs vaultId + beneficiary + releasedAt as authorization
  const messageToSign = ethers.utils.arrayify(
    ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(
        ["bytes32", "address", "uint256"],
        [vaultId, beneficiaryAddress, vault.releasedAt]
      )
    )
  );

  const sigShare = await Lit.Actions.signEcdsa({
    toSign: messageToSign,
    publicKey: pkpPublicKey,
    sigName: "deadlockRelease",
  });

  LitActions.setResponse({
    response: JSON.stringify({
      success: true,
      vaultId,
      beneficiary: beneficiaryAddress,
      owner: vault.owner,
      releasedAt: vault.releasedAt.toString(),
      encryptedCID: vault.encryptedCID,
      triggerType: vault.triggerType,
    }),
  });
};

go();
