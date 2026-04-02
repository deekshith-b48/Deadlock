/**
 * DEADLOCK Protocol — Death Quorum Condition Lit Action
 *
 * Evaluates whether the witness quorum has been met for a DEATH_QUORUM vault.
 * Parameters: vaultId, beneficiaryAddress, registryAddress, pkpPublicKey
 */

const go = async () => {
  const iface = new ethers.utils.Interface([
    "function getVault(bytes32 vaultId) external view returns (tuple(bytes32,address,uint256,string,string,uint8,uint256,uint256,uint256,address[],address[],uint256,uint256,uint8,uint256,uint256))",
    "function isReleaseConditionMet(bytes32 vaultId) external view returns (bool)",
  ]);

  const provider = new ethers.providers.JsonRpcProvider(
    "https://api.calibration.node.glif.io/rpc/v1"
  );
  const registry = new ethers.Contract(registryAddress, iface, provider);

  const TRIGGER_DEATH_QUORUM = 2;

  let vault, conditionMet;
  try {
    [vault, conditionMet] = await Promise.all([
      registry.getVault(vaultId),
      registry.isReleaseConditionMet(vaultId),
    ]);
  } catch (err) {
    LitActions.setResponse({
      response: JSON.stringify({ success: false, reason: `Contract call failed: ${err.message}` }),
    });
    return;
  }

  const triggerType = Number(vault[5]);
  const witnessQuorum = Number(vault[11]);
  const witnessVoteCount = Number(vault[12]);
  const beneficiaries = vault[9] || [];
  const releasedAt = vault[15];

  if (triggerType !== TRIGGER_DEATH_QUORUM) {
    LitActions.setResponse({
      response: JSON.stringify({ success: false, reason: "Vault is not a DEATH_QUORUM type." }),
    });
    return;
  }

  if (!conditionMet) {
    LitActions.setResponse({
      response: JSON.stringify({
        success: false,
        reason: "Death quorum not yet reached.",
        currentVotes: witnessVoteCount,
        requiredQuorum: witnessQuorum,
        votesNeeded: witnessQuorum - witnessVoteCount,
      }),
    });
    return;
  }

  const isBeneficiary = beneficiaries.map((b) => b.toLowerCase()).includes(beneficiaryAddress.toLowerCase());
  if (!isBeneficiary) {
    LitActions.setResponse({
      response: JSON.stringify({ success: false, reason: "Not a registered beneficiary." }),
    });
    return;
  }

  const messageToSign = ethers.utils.arrayify(
    ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(
        ["bytes32", "address", "uint256"],
        [vaultId, beneficiaryAddress, releasedAt]
      )
    )
  );

  await Lit.Actions.signEcdsa({ toSign: messageToSign, publicKey: pkpPublicKey, sigName: "deathQuorumRelease" });

  LitActions.setResponse({
    response: JSON.stringify({
      success: true,
      condition: "DEATH_QUORUM",
      vaultId,
      beneficiary: beneficiaryAddress,
      witnessVoteCount,
      witnessQuorum,
      encryptedCID: vault[3],
    }),
  });
};

go();
