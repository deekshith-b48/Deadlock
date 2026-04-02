/**
 * DEADLOCK Protocol — Inactivity Condition Lit Action
 *
 * Evaluates specifically whether an INACTIVITY vault has exceeded its window.
 * More granular check than the main deadlockCondition.js.
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

  const TRIGGER_INACTIVITY = 0;
  const TRIGGER_GEOPOLITICAL = 3;
  const STATUS_RELEASED = 1;

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

  const triggerType = Number(vault[5]); // triggerType index in tuple
  const lastCheckin = Number(vault[7]);
  const inactivityWindow = Number(vault[8]);
  const status = Number(vault[13]);
  const beneficiaries = vault[9] || [];

  // Check trigger type
  if (triggerType !== TRIGGER_INACTIVITY && triggerType !== TRIGGER_GEOPOLITICAL) {
    LitActions.setResponse({
      response: JSON.stringify({ success: false, reason: "Vault is not an INACTIVITY type." }),
    });
    return;
  }

  const now = Math.floor(Date.now() / 1000);
  const inactivityElapsed = now > lastCheckin + inactivityWindow;

  if (!conditionMet && !inactivityElapsed) {
    LitActions.setResponse({
      response: JSON.stringify({
        success: false,
        reason: "Inactivity window has not elapsed yet.",
        lastCheckin,
        inactivityWindow,
        secondsRemaining: (lastCheckin + inactivityWindow) - now,
      }),
    });
    return;
  }

  // Check beneficiary
  const isBeneficiary = beneficiaries.map((b) => b.toLowerCase()).includes(beneficiaryAddress.toLowerCase());
  if (!isBeneficiary) {
    LitActions.setResponse({
      response: JSON.stringify({ success: false, reason: "Not a registered beneficiary." }),
    });
    return;
  }

  // Sign authorization
  const messageToSign = ethers.utils.arrayify(
    ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(
        ["bytes32", "address", "uint256"],
        [vaultId, beneficiaryAddress, vault[15]] // releasedAt
      )
    )
  );

  await Lit.Actions.signEcdsa({ toSign: messageToSign, publicKey: pkpPublicKey, sigName: "inactivityRelease" });

  LitActions.setResponse({
    response: JSON.stringify({
      success: true,
      condition: "INACTIVITY",
      vaultId,
      beneficiary: beneficiaryAddress,
      encryptedCID: vault[3],
    }),
  });
};

go();
