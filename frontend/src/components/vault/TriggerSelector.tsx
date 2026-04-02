"use client";

import { TriggerType } from "@/lib/utils/vaultSchema";

const TRIGGER_OPTIONS = [
  {
    type: TriggerType.INACTIVITY,
    icon: "🕐",
    label: "Inactivity",
    description: "Release if I don't check in for N days",
  },
  {
    type: TriggerType.TIMELOCK,
    icon: "📅",
    label: "Time Lock",
    description: "Release on a specific date and time",
  },
  {
    type: TriggerType.DEATH_QUORUM,
    icon: "⚰️",
    label: "Death Quorum",
    description: "Release when N witnesses attest my death",
  },
  {
    type: TriggerType.GEOPOLITICAL,
    icon: "🌍",
    label: "Geopolitical",
    description: "Release if I'm silenced or go dark",
  },
];

interface TriggerSelectorProps {
  value: TriggerType;
  onChange: (type: TriggerType) => void;
}

export function TriggerSelector({ value, onChange }: TriggerSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {TRIGGER_OPTIONS.map(({ type, icon, label, description }) => (
        <button
          key={type}
          onClick={() => onChange(type)}
          className={`p-5 rounded-xl border text-left transition-all ${
            value === type
              ? "border-primary bg-primary/10 shadow-lg shadow-primary/10"
              : "border-border hover:border-primary/40 hover:bg-primary/5"
          }`}
        >
          <div className="text-3xl mb-3">{icon}</div>
          <div className="font-semibold mb-1">{label}</div>
          <div className="text-xs text-muted-foreground">{description}</div>
        </button>
      ))}
    </div>
  );
}
