/**
 * DEADLOCK Protocol — Timelock Condition Lit Action
 *
 * Evaluates whether a TIMELOCK vault has reached its scheduled release time.
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

  const TRIGGER_TIMELOCK = 1;

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
  const triggerValue = Number(vault[6]); // scheduled unlock timestamp
  const beneficiaries = vault[9] || [];

  if (triggerType !== TRIGGER_TIMELOCK) {
    LitActions.setResponse({
      response: JSON.stringify({ success: false, reason: "Vault is not a TIMELOCK type." }),
    });
    return;
  }

  const now = Math.floor(Date.now() / 1000);

  if (!conditionMet && now < triggerValue) {
    LitActions.setResponse({
      response: JSON.stringify({
        success: false,
        reason: "Timelock has not elapsed yet.",
        scheduledRelease: triggerValue,
        secondsRemaining: triggerValue - now,
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
        [vaultId, beneficiaryAddress, triggerValue]
      )
    )
  );

  await Lit.Actions.signEcdsa({ toSign: messageToSign, publicKey: pkpPublicKey, sigName: "timelockRelease" });

  LitActions.setResponse({
    response: JSON.stringify({
      success: true,
      condition: "TIMELOCK",
      vaultId,
      beneficiary: beneficiaryAddress,
      scheduledRelease: triggerValue,
      encryptedCID: vault[3],
    }),
  });
};

go();
