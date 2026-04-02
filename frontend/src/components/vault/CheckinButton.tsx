"use client";

import { useState } from "react";
import { useCheckin } from "@/hooks/useCheckin";
import { Check, Loader2 } from "lucide-react";

interface CheckinButtonProps {
  vaultId: string;
  onSuccess?: () => void;
  className?: string;
}

export function CheckinButton({ vaultId, onSuccess, className }: CheckinButtonProps) {
  const { checkin, isChecking, lastTxHash, error } = useCheckin();
  const [showSuccess, setShowSuccess] = useState(false);

  const handleCheckin = async () => {
    try {
      await checkin(vaultId);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      onSuccess?.();
    } catch {}
  };

  return (
    <div>
      <button
        onClick={handleCheckin}
        disabled={isChecking}
        className={className ?? "flex items-center gap-2 px-5 py-2.5 bg-green-600/20 border border-green-500/30 text-green-400 rounded-xl font-medium hover:bg-green-600/30 disabled:opacity-50 transition-colors"}
      >
        {isChecking ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : showSuccess ? (
          <Check className="w-4 h-4" />
        ) : (
          <Check className="w-4 h-4" />
        )}
        {isChecking ? "Checking in..." : showSuccess ? "Checked in!" : "Check In"}
      </button>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
