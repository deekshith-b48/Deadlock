import { ethers } from "hardhat";
import { expect } from "chai";
import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";

describe("DeadlockRegistry", function () {
  const INACTIVITY = 0;
  const TIMELOCK = 1;
  const DEATH_QUORUM = 2;
  const GEOPOLITICAL = 3;
  const MUTUAL = 4;

  const STATUS_ACTIVE = 0;
  const STATUS_RELEASED = 1;
  const STATUS_CANCELLED = 2;

  const ONE_DAY = 86400;
  const THIRTY_DAYS = 30 * ONE_DAY;

  async function deployRegistryFixture() {
    const [owner, beneficiary1, beneficiary2, witness1, witness2, witness3, guardian, stranger] =
      await ethers.getSigners();

    const DeadlockRegistry = await ethers.getContractFactory("DeadlockRegistry");
    const registry = await DeadlockRegistry.deploy(owner.address);

    const DUMMY_NULLIFIER = 12345678n;
    const DUMMY_PROOF: [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint] = [
      1n, 2n, 3n, 4n, 5n, 6n, 7n, 8n,
    ];
    const ENCRYPTED_CID = "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi";
    const LIT_ACTION_CID = "bafkreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzgivvoluef7dm4";

    return {
      registry,
      owner,
      beneficiary1,
      beneficiary2,
      witness1,
      witness2,
      witness3,
      guardian,
      stranger,
      DUMMY_NULLIFIER,
      DUMMY_PROOF,
      ENCRYPTED_CID,
      LIT_ACTION_CID,
    };
  }

  async function createBasicVaultFixture() {
    const base = await deployRegistryFixture();
    const { registry, owner, beneficiary1, DUMMY_NULLIFIER, DUMMY_PROOF, ENCRYPTED_CID, LIT_ACTION_CID } = base;

    const tx = await registry.createVault(
      DUMMY_NULLIFIER,
      DUMMY_PROOF,
      ENCRYPTED_CID,
      LIT_ACTION_CID,
      INACTIVITY,
      0,
      THIRTY_DAYS,
      [beneficiary1.address],
      [],
      0
    );
    const receipt = await tx.wait();
    const event = receipt?.logs.find((log) => {
      try {
        return registry.interface.parseLog(log as any)?.name === "VaultCreated";
      } catch {
        return false;
      }
    });
    const parsedEvent = registry.interface.parseLog(event as any);
    const vaultId = parsedEvent?.args.vaultId;

    return { ...base, vaultId };
  }

  // ─── Deployment ────────────────────────────────────────────────────────────

  describe("Deployment", function () {
    it("Should deploy with correct guardian quorum address", async function () {
      const { registry, owner } = await loadFixture(deployRegistryFixture);
      expect(await registry.guardianQuorumContract()).to.equal(owner.address);
    });

    it("Should start with zero vaults", async function () {
      const { registry } = await loadFixture(deployRegistryFixture);
      expect(await registry.totalVaults()).to.equal(0n);
    });
  });

  // ─── Vault Creation ────────────────────────────────────────────────────────

  describe("createVault", function () {
    it("Should create a vault with valid parameters", async function () {
      const { registry, owner, beneficiary1, DUMMY_NULLIFIER, DUMMY_PROOF, ENCRYPTED_CID, LIT_ACTION_CID } =
        await loadFixture(deployRegistryFixture);

      const tx = await registry.createVault(
        DUMMY_NULLIFIER,
        DUMMY_PROOF,
        ENCRYPTED_CID,
        LIT_ACTION_CID,
        INACTIVITY,
        0,
        THIRTY_DAYS,
        [beneficiary1.address],
        [],
        0
      );

      await expect(tx).to.emit(registry, "VaultCreated");
      await expect(tx).to.emit(registry, "BeneficiaryAdded").withArgs(anyValue, beneficiary1.address);
      expect(await registry.totalVaults()).to.equal(1n);
    });

    it("Should mark nullifier as used after vault creation", async function () {
      const { registry, DUMMY_NULLIFIER, DUMMY_PROOF, ENCRYPTED_CID, LIT_ACTION_CID, beneficiary1 } =
        await loadFixture(deployRegistryFixture);

      await registry.createVault(
        DUMMY_NULLIFIER, DUMMY_PROOF, ENCRYPTED_CID, LIT_ACTION_CID,
        INACTIVITY, 0, THIRTY_DAYS, [beneficiary1.address], [], 0
      );

      expect(await registry.usedNullifiers(DUMMY_NULLIFIER)).to.be.true;
    });

    it("Should REVERT if same nullifier used twice (one vault per human)", async function () {
      const { registry, owner, beneficiary1, DUMMY_NULLIFIER, DUMMY_PROOF, ENCRYPTED_CID, LIT_ACTION_CID } =
        await loadFixture(deployRegistryFixture);

      await registry.createVault(
        DUMMY_NULLIFIER, DUMMY_PROOF, ENCRYPTED_CID, LIT_ACTION_CID,
        INACTIVITY, 0, THIRTY_DAYS, [beneficiary1.address], [], 0
      );

      await expect(
        registry.createVault(
          DUMMY_NULLIFIER, DUMMY_PROOF, ENCRYPTED_CID, LIT_ACTION_CID,
          INACTIVITY, 0, THIRTY_DAYS, [beneficiary1.address], [], 0
        )
      ).to.be.revertedWith("DeadlockRegistry: World ID already used");
    });

    it("Should REVERT if no beneficiaries provided", async function () {
      const { registry, DUMMY_NULLIFIER, DUMMY_PROOF, ENCRYPTED_CID, LIT_ACTION_CID } =
        await loadFixture(deployRegistryFixture);

      await expect(
        registry.createVault(
          DUMMY_NULLIFIER, DUMMY_PROOF, ENCRYPTED_CID, LIT_ACTION_CID,
          INACTIVITY, 0, THIRTY_DAYS, [], [], 0
        )
      ).to.be.revertedWith("DeadlockRegistry: At least one beneficiary required");
    });

    it("Should correctly set vault initial state", async function () {
      const { registry, vaultId, beneficiary1 } = await loadFixture(createBasicVaultFixture);

      const vault = await registry.getVault(vaultId);
      expect(vault.status).to.equal(STATUS_ACTIVE);
      expect(vault.triggerType).to.equal(INACTIVITY);
      expect(vault.inactivityWindow).to.equal(THIRTY_DAYS);
      expect(vault.beneficiaries).to.deep.equal([beneficiary1.address]);
    });

    it("Should register vault in owner and beneficiary mappings", async function () {
      const { registry, owner, beneficiary1, vaultId } = await loadFixture(createBasicVaultFixture);

      const ownerVaults = await registry.getOwnerVaults(owner.address);
      expect(ownerVaults).to.include(vaultId);

      const beneficiaryVaults = await registry.getBeneficiaryVaults(beneficiary1.address);
      expect(beneficiaryVaults).to.include(vaultId);
    });

    it("Should REVERT timelock in the past", async function () {
      const { registry, DUMMY_NULLIFIER, DUMMY_PROOF, ENCRYPTED_CID, LIT_ACTION_CID, beneficiary1 } =
        await loadFixture(deployRegistryFixture);

      const pastTimestamp = (await time.latest()) - ONE_DAY;

      await expect(
        registry.createVault(
          DUMMY_NULLIFIER, DUMMY_PROOF, ENCRYPTED_CID, LIT_ACTION_CID,
          TIMELOCK, pastTimestamp, 0, [beneficiary1.address], [], 0
        )
      ).to.be.revertedWith("DeadlockRegistry: Timelock must be in the future");
    });
  });

  // ─── Check-in ──────────────────────────────────────────────────────────────

  describe("checkin", function () {
    it("Should update lastCheckin timestamp", async function () {
      const { registry, owner, vaultId } = await loadFixture(createBasicVaultFixture);

      const before = (await registry.getVault(vaultId)).lastCheckin;
      await time.increase(ONE_DAY);
      await registry.connect(owner).checkin(vaultId);
      const after = (await registry.getVault(vaultId)).lastCheckin;

      expect(after).to.be.greaterThan(before);
    });

    it("Should emit CheckinRecorded", async function () {
      const { registry, owner, vaultId } = await loadFixture(createBasicVaultFixture);

      await expect(registry.connect(owner).checkin(vaultId))
        .to.emit(registry, "CheckinRecorded")
        .withArgs(vaultId, owner.address, anyValue);
    });

    it("Should REVERT if called by non-owner", async function () {
      const { registry, stranger, vaultId } = await loadFixture(createBasicVaultFixture);

      await expect(registry.connect(stranger).checkin(vaultId))
        .to.be.revertedWith("DeadlockRegistry: Not vault owner");
    });

    it("Should REVERT if vault not active", async function () {
      const { registry, owner, vaultId } = await loadFixture(createBasicVaultFixture);

      await registry.connect(owner).cancelVault(vaultId);
      await expect(registry.connect(owner).checkin(vaultId))
        .to.be.revertedWith("DeadlockRegistry: Vault not active");
    });
  });

  // ─── Inactivity Trigger ────────────────────────────────────────────────────

  describe("guardianTriggerInactivity", function () {
    it("Should REVERT before inactivity window elapses", async function () {
      const { registry, guardian, vaultId } = await loadFixture(createBasicVaultFixture);

      await time.increase(THIRTY_DAYS - ONE_DAY);

      await expect(registry.connect(guardian).guardianTriggerInactivity(vaultId))
        .to.be.revertedWith("DeadlockRegistry: Inactivity window not elapsed");
    });

    it("Should release vault after inactivity window elapses", async function () {
      const { registry, guardian, vaultId } = await loadFixture(createBasicVaultFixture);

      await time.increase(THIRTY_DAYS + ONE_DAY);

      await expect(registry.connect(guardian).guardianTriggerInactivity(vaultId))
        .to.emit(registry, "VaultReleased");

      const vault = await registry.getVault(vaultId);
      expect(vault.status).to.equal(STATUS_RELEASED);
    });

    it("Should set releasedAt correctly", async function () {
      const { registry, guardian, vaultId } = await loadFixture(createBasicVaultFixture);

      await time.increase(THIRTY_DAYS + ONE_DAY);
      await registry.connect(guardian).guardianTriggerInactivity(vaultId);

      const vault = await registry.getVault(vaultId);
      expect(vault.releasedAt).to.be.greaterThan(0);
    });

    it("Should REVERT for non-INACTIVITY vault type", async function () {
      const { registry, guardian, beneficiary1, DUMMY_NULLIFIER, DUMMY_PROOF, ENCRYPTED_CID, LIT_ACTION_CID } =
        await loadFixture(deployRegistryFixture);

      const futureTime = (await time.latest()) + THIRTY_DAYS;
      const tx = await registry.createVault(
        DUMMY_NULLIFIER, DUMMY_PROOF, ENCRYPTED_CID, LIT_ACTION_CID,
        TIMELOCK, futureTime, 0, [beneficiary1.address], [], 0
      );
      const receipt = await tx.wait();
      const event = receipt?.logs.find((log) => {
        try { return registry.interface.parseLog(log as any)?.name === "VaultCreated"; }
        catch { return false; }
      });
      const vaultId = registry.interface.parseLog(event as any)?.args.vaultId;

      await expect(registry.connect(guardian).guardianTriggerInactivity(vaultId))
        .to.be.revertedWith("DeadlockRegistry: Invalid trigger type for inactivity");
    });
  });

  // ─── Timelock Trigger ──────────────────────────────────────────────────────

  describe("guardianTriggerTimelock", function () {
    async function createTimelockVaultFixture() {
      const base = await deployRegistryFixture();
      const { registry, beneficiary1, DUMMY_NULLIFIER, DUMMY_PROOF, ENCRYPTED_CID, LIT_ACTION_CID } = base;

      const futureTimestamp = (await time.latest()) + THIRTY_DAYS;
      const tx = await registry.createVault(
        DUMMY_NULLIFIER, DUMMY_PROOF, ENCRYPTED_CID, LIT_ACTION_CID,
        TIMELOCK, futureTimestamp, 0, [beneficiary1.address], [], 0
      );
      const receipt = await tx.wait();
      const event = receipt?.logs.find((log) => {
        try { return registry.interface.parseLog(log as any)?.name === "VaultCreated"; }
        catch { return false; }
      });
      const vaultId = registry.interface.parseLog(event as any)?.args.vaultId;

      return { ...base, vaultId, futureTimestamp };
    }

    it("Should REVERT before timelock expires", async function () {
      const { registry, guardian, vaultId } = await loadFixture(createTimelockVaultFixture);

      await expect(registry.connect(guardian).guardianTriggerTimelock(vaultId))
        .to.be.revertedWith("DeadlockRegistry: Timelock not elapsed");
    });

    it("Should release vault at correct timestamp", async function () {
      const { registry, guardian, vaultId, futureTimestamp } = await loadFixture(createTimelockVaultFixture);

      await time.increaseTo(futureTimestamp);

      await expect(registry.connect(guardian).guardianTriggerTimelock(vaultId))
        .to.emit(registry, "VaultReleased");

      const vault = await registry.getVault(vaultId);
      expect(vault.status).to.equal(STATUS_RELEASED);
    });
  });

  // ─── Death Quorum ──────────────────────────────────────────────────────────

  describe("attestDeath (DEATH_QUORUM)", function () {
    async function createDeathQuorumVaultFixture() {
      const base = await deployRegistryFixture();
      const { registry, beneficiary1, witness1, witness2, witness3, DUMMY_NULLIFIER, DUMMY_PROOF, ENCRYPTED_CID, LIT_ACTION_CID } = base;

      const tx = await registry.createVault(
        DUMMY_NULLIFIER, DUMMY_PROOF, ENCRYPTED_CID, LIT_ACTION_CID,
        DEATH_QUORUM, 0, 0,
        [beneficiary1.address],
        [witness1.address, witness2.address, witness3.address],
        2 // quorum of 2
      );
      const receipt = await tx.wait();
      const event = receipt?.logs.find((log) => {
        try { return registry.interface.parseLog(log as any)?.name === "VaultCreated"; }
        catch { return false; }
      });
      const vaultId = registry.interface.parseLog(event as any)?.args.vaultId;

      return { ...base, vaultId };
    }

    it("Should increment witness vote count on attestation", async function () {
      const { registry, witness1, vaultId } = await loadFixture(createDeathQuorumVaultFixture);

      await registry.connect(witness1).attestDeath(vaultId);
      const vault = await registry.getVault(vaultId);
      expect(vault.witnessVoteCount).to.equal(1n);
    });

    it("Should prevent double voting by same witness", async function () {
      const { registry, witness1, vaultId } = await loadFixture(createDeathQuorumVaultFixture);

      await registry.connect(witness1).attestDeath(vaultId);
      await expect(registry.connect(witness1).attestDeath(vaultId))
        .to.be.revertedWith("DeadlockRegistry: Already voted");
    });

    it("Should REVERT if caller is not a witness", async function () {
      const { registry, stranger, vaultId } = await loadFixture(createDeathQuorumVaultFixture);

      await expect(registry.connect(stranger).attestDeath(vaultId))
        .to.be.revertedWith("DeadlockRegistry: Not a registered witness");
    });

    it("Should release vault when quorum is reached", async function () {
      const { registry, witness1, witness2, vaultId } = await loadFixture(createDeathQuorumVaultFixture);

      await registry.connect(witness1).attestDeath(vaultId);
      await expect(registry.connect(witness2).attestDeath(vaultId))
        .to.emit(registry, "VaultReleased");

      const vault = await registry.getVault(vaultId);
      expect(vault.status).to.equal(STATUS_RELEASED);
    });

    it("Should NOT release vault before quorum is reached", async function () {
      const { registry, witness1, vaultId } = await loadFixture(createDeathQuorumVaultFixture);

      await registry.connect(witness1).attestDeath(vaultId);
      const vault = await registry.getVault(vaultId);
      expect(vault.status).to.equal(STATUS_ACTIVE);
    });
  });

  // ─── Beneficiary Claim ─────────────────────────────────────────────────────

  describe("claimVault", function () {
    it("Should emit VaultClaimed for valid beneficiary on released vault", async function () {
      const { registry, guardian, beneficiary1, vaultId } = await loadFixture(createBasicVaultFixture);

      await time.increase(THIRTY_DAYS + ONE_DAY);
      await registry.connect(guardian).guardianTriggerInactivity(vaultId);

      await expect(registry.connect(beneficiary1).claimVault(vaultId))
        .to.emit(registry, "VaultClaimed")
        .withArgs(vaultId, beneficiary1.address, anyValue);
    });

    it("Should REVERT claim on active vault", async function () {
      const { registry, beneficiary1, vaultId } = await loadFixture(createBasicVaultFixture);

      await expect(registry.connect(beneficiary1).claimVault(vaultId))
        .to.be.revertedWith("DeadlockRegistry: Vault not released");
    });

    it("Should REVERT claim by non-beneficiary", async function () {
      const { registry, guardian, stranger, vaultId } = await loadFixture(createBasicVaultFixture);

      await time.increase(THIRTY_DAYS + ONE_DAY);
      await registry.connect(guardian).guardianTriggerInactivity(vaultId);

      await expect(registry.connect(stranger).claimVault(vaultId))
        .to.be.revertedWith("DeadlockRegistry: Not a beneficiary");
    });
  });

  // ─── Vault Cancellation ────────────────────────────────────────────────────

  describe("cancelVault", function () {
    it("Should cancel an active vault", async function () {
      const { registry, owner, vaultId } = await loadFixture(createBasicVaultFixture);

      await expect(registry.connect(owner).cancelVault(vaultId))
        .to.emit(registry, "VaultCancelled")
        .withArgs(vaultId, owner.address);

      const vault = await registry.getVault(vaultId);
      expect(vault.status).to.equal(STATUS_CANCELLED);
    });

    it("Should REVERT cancel by non-owner", async function () {
      const { registry, stranger, vaultId } = await loadFixture(createBasicVaultFixture);

      await expect(registry.connect(stranger).cancelVault(vaultId))
        .to.be.revertedWith("DeadlockRegistry: Not vault owner");
    });
  });

  // ─── isReleaseConditionMet ─────────────────────────────────────────────────

  describe("isReleaseConditionMet", function () {
    it("Should return false for ACTIVE vault", async function () {
      const { registry, vaultId } = await loadFixture(createBasicVaultFixture);
      expect(await registry.isReleaseConditionMet(vaultId)).to.be.false;
    });

    it("Should return true for RELEASED vault", async function () {
      const { registry, guardian, vaultId } = await loadFixture(createBasicVaultFixture);

      await time.increase(THIRTY_DAYS + ONE_DAY);
      await registry.connect(guardian).guardianTriggerInactivity(vaultId);

      expect(await registry.isReleaseConditionMet(vaultId)).to.be.true;
    });

    it("Should return false for CANCELLED vault", async function () {
      const { registry, owner, vaultId } = await loadFixture(createBasicVaultFixture);

      await registry.connect(owner).cancelVault(vaultId);
      expect(await registry.isReleaseConditionMet(vaultId)).to.be.false;
    });
  });

  // ─── Guardian Trigger Flow ─────────────────────────────────────────────────

  describe("Guardian trigger flow", function () {
    it("Should emit GuardianTrigger event", async function () {
      const { registry, guardian, vaultId } = await loadFixture(createBasicVaultFixture);

      await time.increase(THIRTY_DAYS + ONE_DAY);

      await expect(registry.connect(guardian).guardianTriggerInactivity(vaultId))
        .to.emit(registry, "GuardianTrigger")
        .withArgs(vaultId, guardian.address);
    });

    it("Should allow any address to trigger inactivity (permissionless guardian)", async function () {
      const { registry, stranger, vaultId } = await loadFixture(createBasicVaultFixture);

      await time.increase(THIRTY_DAYS + ONE_DAY);

      await expect(registry.connect(stranger).guardianTriggerInactivity(vaultId))
        .to.emit(registry, "VaultReleased");
    });
  });
});
