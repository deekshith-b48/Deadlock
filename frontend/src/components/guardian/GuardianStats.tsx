"use client";

import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import { Activity, Shield, Zap } from "lucide-react";
import { DEADLOCK_REGISTRY_ABI } from "@/lib/contracts/abis";
import { CONTRACT_ADDRESSES } from "@/lib/contracts/addresses";

interface GuardianStatsProps {
  className?: string;
}

export function GuardianStats({ className }: GuardianStatsProps) {
  const publicClient = usePublicClient();
  const [totalVaults, setTotalVaults] = useState<number | null>(null);
  const [triggerCount, setTriggerCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!publicClient) return;

    const load = async () => {
      try {
        const total = await publicClient.readContract({
          address: CONTRACT_ADDRESSES.REGISTRY,
          abi: DEADLOCK_REGISTRY_ABI,
          functionName: "totalVaults",
        });
        setTotalVaults(Number(total));

        const logs = await publicClient.getLogs({
          address: CONTRACT_ADDRESSES.REGISTRY,
          event: {
            name: "GuardianTrigger",
            type: "event",
            inputs: [
              { name: "vaultId", type: "bytes32", indexed: true },
              { name: "guardian", type: "address", indexed: true },
            ],
          },
          fromBlock: "earliest",
          toBlock: "latest",
        });
        setTriggerCount(logs.length);
      } catch (err) {
        console.error("[GuardianStats] Load failed:", err);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [publicClient]);

  const stats = [
    {
      label: "Vaults Monitored",
      value: isLoading ? "..." : (totalVaults ?? 0).toString(),
      icon: <Shield className="w-5 h-5" />,
      color: "text-primary",
    },
    {
      label: "Triggers Executed",
      value: isLoading ? "..." : (triggerCount ?? 0).toString(),
      icon: <Zap className="w-5 h-5" />,
      color: "text-orange-400",
    },
    {
      label: "Network Status",
      value: "Active",
      icon: <Activity className="w-5 h-5" />,
      color: "text-green-400",
    },
  ];

  return (
    <div className={`grid grid-cols-3 gap-4 ${className}`}>
      {stats.map((stat) => (
        <div key={stat.label} className="glass rounded-xl p-4 border border-border text-center">
          <div className={`flex justify-center mb-2 ${stat.color}`}>{stat.icon}</div>
          <div className={`text-2xl font-bold font-mono ${stat.color}`}>{stat.value}</div>
          <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}
