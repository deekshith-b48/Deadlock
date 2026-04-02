"use client";

import { Plus, X } from "lucide-react";
import { ethers } from "ethers";

interface WitnessInputProps {
  witnesses: { address: string }[];
  quorum: number;
  onChange: (witnesses: { address: string }[], quorum: number) => void;
}

export function WitnessInput({ witnesses, quorum, onChange }: WitnessInputProps) {
  const add = () => onChange([...witnesses, { address: "" }], quorum);
  const remove = (i: number) => {
    const updated = witnesses.filter((_, idx) => idx !== i);
    onChange(updated, Math.min(quorum, Math.max(1, updated.length)));
  };
  const update = (i: number, value: string) =>
    onChange(witnesses.map((w, idx) => (idx === i ? { address: value } : w)), quorum);

  const validCount = witnesses.filter((w) => ethers.isAddress(w.address)).length;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {witnesses.map((w, i) => (
          <div key={i} className="flex gap-2">
            <input
              value={w.address}
              onChange={(e) => update(i, e.target.value)}
              placeholder="0x... witness wallet address"
              className={`flex-1 bg-muted border rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-primary ${
                w.address && !ethers.isAddress(w.address) ? "border-red-500" : "border-border"
              }`}
            />
            {witnesses.length > 1 && (
              <button
                onClick={() => remove(i)}
                className="p-2.5 text-muted-foreground hover:text-white border border-border rounded-xl hover:border-red-500/50 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}

        <button
          onClick={add}
          className="flex items-center gap-2 text-sm text-primary hover:text-primary-400 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add witness
        </button>
      </div>

      {validCount > 0 && (
        <div>
          <label className="block text-sm font-medium mb-2">
            Quorum: {quorum} of {validCount} witnesses must attest
          </label>
          <input
            type="range"
            min={1}
            max={validCount}
            value={Math.min(quorum, validCount)}
            onChange={(e) => onChange(witnesses, Number(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>1</span>
            <span>{validCount}</span>
          </div>
        </div>
      )}
    </div>
  );
}
