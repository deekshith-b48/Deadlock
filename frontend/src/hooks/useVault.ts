"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount, useReadContract, useWriteContract, usePublicClient } from "wagmi";
import { DEADLOCK_REGISTRY_ABI } from "@/lib/contracts/abis";
import { CONTRACT_ADDRESSES } from "@/lib/contracts/addresses";
import { type Vault, TriggerType, VaultStatus } from "@/lib/utils/vaultSchema";
import type { CreateVaultParams } from "@/lib/utils/vaultSchema";

function rawToVault(raw: readonly unknown[]): Vault {
  const r = raw as any[];
  return {
    vaultId: r[0] as string,
    owner: r[1] as string,
    worldIdNullifier: BigInt(r[2]),
    encryptedCID: r[3] as string,
    litActionCID: r[4] as string,
    triggerType: Number(r[5]) as TriggerType,
    triggerValue: BigInt(r[6]),
    lastCheckin: BigInt(r[7]),
    inactivityWindow: BigInt(r[8]),
    beneficiaries: r[9] as string[],
    witnesses: r[10] as string[],
    witnessQuorum: BigInt(r[11]),
    witnessVoteCount: BigInt(r[12]),
    status: Number(r[13]) as VaultStatus,
    createdAt: BigInt(r[14]),
    releasedAt: BigInt(r[15]),
  };
}

export function useVault(vaultId?: string) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [ownerVaultIds, setOwnerVaultIds] = useState<string[]>([]);
  const [beneficiaryVaultIds, setBeneficiaryVaultIds] = useState<string[]>([]);
  const [ownerVaults, setOwnerVaults] = useState<Vault[]>([]);
  const [beneficiaryVaults, setBeneficiaryVaults] = useState<Vault[]>([]);
  const [vault, setVault] = useState<Vault | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const registry = CONTRACT_ADDRESSES.REGISTRY;

  // ─── Load single vault ───────────────────────────────────────────────────
  const loadVault = useCallback(async (id: string) => {
    if (!publicClient || !id) return;
    try {
      const raw = await publicClient.readContract({
        address: registry,
        abi: DEADLOCK_REGISTRY_ABI,
        functionName: "getVault",
        args: [id as `0x${string}`],
      });
      setVault(rawToVault(raw as readonly unknown[]));
    } catch (err) {
      console.error("[useVault] Failed to load vault:", err);
    }
  }, [publicClient, registry]);

  // ─── Load owner vaults ───────────────────────────────────────────────────
  const loadOwnerVaults = useCallback(async () => {
    if (!publicClient || !address) return;
    try {
      const ids = await publicClient.readContract({
        address: registry,
        abi: DEADLOCK_REGISTRY_ABI,
        functionName: "getOwnerVaults",
        args: [address],
      }) as string[];

      setOwnerVaultIds(ids);

      const vaults = await Promise.all(
        ids.map(async (id) => {
          const raw = await publicClient.readContract({
            address: registry,
            abi: DEADLOCK_REGISTRY_ABI,
            functionName: "getVault",
            args: [id as `0x${string}`],
          });
          return rawToVault(raw as readonly unknown[]);
        })
      );
      setOwnerVaults(vaults);
    } catch (err) {
      console.error("[useVault] Failed to load owner vaults:", err);
    }
  }, [publicClient, address, registry]);

  // ─── Load beneficiary vaults ─────────────────────────────────────────────
  const loadBeneficiaryVaults = useCallback(async () => {
    if (!publicClient || !address) return;
    try {
      const ids = await publicClient.readContract({
        address: registry,
        abi: DEADLOCK_REGISTRY_ABI,
        functionName: "getBeneficiaryVaults",
        args: [address],
      }) as string[];

      setBeneficiaryVaultIds(ids);

      const vaults = await Promise.all(
        ids.map(async (id) => {
          const raw = await publicClient.readContract({
            address: registry,
            abi: DEADLOCK_REGISTRY_ABI,
            functionName: "getVault",
            args: [id as `0x${string}`],
          });
          return rawToVault(raw as readonly unknown[]);
        })
      );
      setBeneficiaryVaults(vaults);
    } catch (err) {
      console.error("[useVault] Failed to load beneficiary vaults:", err);
    }
  }, [publicClient, address, registry]);

  // ─── Initial load + polling ───────────────────────────────────────────────
  useEffect(() => {
    if (vaultId) loadVault(vaultId);
    if (address) {
      loadOwnerVaults();
      loadBeneficiaryVaults();
    }

    const interval = setInterval(() => {
      if (vaultId) loadVault(vaultId);
      if (address) {
        loadOwnerVaults();
        loadBeneficiaryVaults();
      }
    }, 30_000);

    return () => clearInterval(interval);
  }, [vaultId, address, loadVault, loadOwnerVaults, loadBeneficiaryVaults]);

  // ─── Write Functions ──────────────────────────────────────────────────────

  const createVault = useCallback(async (params: CreateVaultParams): Promise<string> => {
    setIsLoading(true);
    setError(null);
    try {
      const hash = await writeContractAsync({
        address: registry,
        abi: DEADLOCK_REGISTRY_ABI,
        functionName: "createVault",
        args: [
          params.worldIdNullifier,
          params.worldIdProof,
          params.encryptedCID,
          params.litActionCID,
          params.triggerType,
          params.triggerValue,
          params.inactivityWindow,
          params.beneficiaries as `0x${string}`[],
          params.witnesses as `0x${string}`[],
          params.witnessQuorum,
        ],
      });

      // Wait for receipt and extract vaultId from events
      if (publicClient) {
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        // Parse VaultCreated event to get vaultId
        for (const log of receipt.logs) {
          try {
            const event = publicClient.decodeEventLog({
              abi: DEADLOCK_REGISTRY_ABI,
              eventName: "VaultCreated",
              data: log.data,
              topics: log.topics,
            });
            if (event && (event as any).args?.vaultId) {
              await loadOwnerVaults();
              return (event as any).args.vaultId as string;
            }
          } catch {}
        }
      }

      await loadOwnerVaults();
      return hash;
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [writeContractAsync, registry, publicClient, loadOwnerVaults]);

  const checkin = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await writeContractAsync({
        address: registry,
        abi: DEADLOCK_REGISTRY_ABI,
        functionName: "checkin",
        args: [id as `0x${string}`],
      });
      if (vaultId === id) await loadVault(id);
      await loadOwnerVaults();
    } catch (err) {
      setError((err as Error).message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [writeContractAsync, registry, vaultId, loadVault, loadOwnerVaults]);

  const cancelVault = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await writeContractAsync({
        address: registry,
        abi: DEADLOCK_REGISTRY_ABI,
        functionName: "cancelVault",
        args: [id as `0x${string}`],
      });
      if (vaultId === id) await loadVault(id);
      await loadOwnerVaults();
    } catch (err) {
      setError((err as Error).message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [writeContractAsync, registry, vaultId, loadVault, loadOwnerVaults]);

  const attestDeath = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await writeContractAsync({
        address: registry,
        abi: DEADLOCK_REGISTRY_ABI,
        functionName: "attestDeath",
        args: [id as `0x${string}`],
      });
      if (vaultId === id) await loadVault(id);
    } catch (err) {
      setError((err as Error).message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [writeContractAsync, registry, vaultId, loadVault]);

  return {
    vault,
    ownerVaults,
    beneficiaryVaults,
    ownerVaultIds,
    beneficiaryVaultIds,
    createVault,
    checkin,
    cancelVault,
    attestDeath,
    isLoading,
    error,
    refresh: () => {
      if (vaultId) loadVault(vaultId);
      if (address) { loadOwnerVaults(); loadBeneficiaryVaults(); }
    },
  };
}
