"use client";

import { Plus, X } from "lucide-react";
import { ethers } from "ethers";

interface Beneficiary {
  address: string;
  nickname: string;
}

interface BeneficiaryInputProps {
  beneficiaries: Beneficiary[];
  onChange: (beneficiaries: Beneficiary[]) => void;
  max?: number;
}

export function BeneficiaryInput({ beneficiaries, onChange, max = 10 }: BeneficiaryInputProps) {
  const add = () => onChange([...beneficiaries, { address: "", nickname: "" }]);
  const remove = (i: number) => onChange(beneficiaries.filter((_, idx) => idx !== i));
  const update = (i: number, field: keyof Beneficiary, value: string) =>
    onChange(beneficiaries.map((b, idx) => (idx === i ? { ...b, [field]: value } : b)));

  return (
    <div className="space-y-3">
      {beneficiaries.map((b, i) => (
        <div key={i} className="flex gap-2">
          <div className="flex-1">
            <input
              value={b.address}
              onChange={(e) => update(i, "address", e.target.value)}
              placeholder="0x... wallet address"
              className={`w-full bg-muted border rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-primary ${
                b.address && !ethers.isAddress(b.address) ? "border-red-500" : "border-border"
              }`}
            />
            {b.address && !ethers.isAddress(b.address) && (
              <p className="text-xs text-red-400 mt-1">Invalid Ethereum address</p>
            )}
          </div>
          <input
            value={b.nickname}
            onChange={(e) => update(i, "nickname", e.target.value)}
            placeholder="Nickname (optional)"
            className="w-32 bg-muted border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary"
          />
          {beneficiaries.length > 1 && (
            <button
              onClick={() => remove(i)}
              className="p-2.5 text-muted-foreground hover:text-white border border-border rounded-xl hover:border-red-500/50 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      ))}

      {beneficiaries.length < max && (
        <button
          onClick={add}
          className="flex items-center gap-2 text-sm text-primary hover:text-primary-400 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add beneficiary
        </button>
      )}

      <div className="text-xs text-muted-foreground">
        {beneficiaries.filter((b) => ethers.isAddress(b.address)).length} valid address(es)
      </div>
    </div>
  );
}
