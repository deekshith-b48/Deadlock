"use client";

// This is a reusable form component wrapper around the create vault flow.
// The main implementation lives in src/app/vault/create/page.tsx
// This component can be used to embed the form in other contexts.

import { useState } from "react";
import { TriggerType } from "@/lib/utils/vaultSchema";
import { TriggerSelector } from "./TriggerSelector";
import { BeneficiaryInput } from "./BeneficiaryInput";
import { WitnessInput } from "./WitnessInput";
import { FileUploader } from "./FileUploader";

interface CreateVaultFormProps {
  onComplete: (data: {
    files: File[];
    message: string;
    credentials: string;
    triggerType: TriggerType;
    inactivityDays: number;
    unlockDate: string;
    beneficiaries: { address: string; nickname: string }[];
    witnesses: { address: string }[];
    quorum: number;
  }) => void;
}

export function CreateVaultForm({ onComplete }: CreateVaultFormProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [message, setMessage] = useState("");
  const [credentials, setCredentials] = useState("");
  const [triggerType, setTriggerType] = useState<TriggerType>(TriggerType.INACTIVITY);
  const [inactivityDays, setInactivityDays] = useState(30);
  const [unlockDate, setUnlockDate] = useState("");
  const [beneficiaries, setBeneficiaries] = useState([{ address: "", nickname: "" }]);
  const [witnesses, setWitnesses] = useState([{ address: "" }]);
  const [quorum, setQuorum] = useState(1);

  const handleSubmit = () => {
    onComplete({
      files,
      message,
      credentials,
      triggerType,
      inactivityDays,
      unlockDate,
      beneficiaries,
      witnesses,
      quorum,
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold mb-4">Files & Content</h3>
        <FileUploader files={files} onChange={setFiles} />
        <div className="mt-4 space-y-4">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Message to beneficiaries..."
            rows={3}
            className="w-full bg-muted border border-border rounded-xl p-3 text-sm resize-none focus:outline-none focus:border-primary"
          />
          <textarea
            value={credentials}
            onChange={(e) => setCredentials(e.target.value)}
            placeholder="Seed phrases, credentials..."
            rows={3}
            className="w-full bg-muted border border-border rounded-xl p-3 text-sm font-mono resize-none focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Trigger</h3>
        <TriggerSelector value={triggerType} onChange={setTriggerType} />
        {(triggerType === TriggerType.INACTIVITY || triggerType === TriggerType.GEOPOLITICAL) && (
          <div className="mt-4">
            <label className="block text-sm font-medium mb-2">Inactivity window: {inactivityDays} days</label>
            <input
              type="range"
              min={7}
              max={365}
              step={7}
              value={inactivityDays}
              onChange={(e) => setInactivityDays(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>
        )}
        {triggerType === TriggerType.TIMELOCK && (
          <div className="mt-4">
            <label className="block text-sm font-medium mb-2">Unlock date</label>
            <input
              type="datetime-local"
              value={unlockDate}
              onChange={(e) => setUnlockDate(e.target.value)}
              className="w-full bg-muted border border-border rounded-xl p-3 text-sm focus:outline-none focus:border-primary"
            />
          </div>
        )}
        {triggerType === TriggerType.DEATH_QUORUM && (
          <div className="mt-4">
            <WitnessInput witnesses={witnesses} quorum={quorum} onChange={setWitnesses as any} />
          </div>
        )}
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Beneficiaries</h3>
        <BeneficiaryInput beneficiaries={beneficiaries} onChange={setBeneficiaries} />
      </div>

      <button
        onClick={handleSubmit}
        className="w-full py-4 bg-primary text-white rounded-xl font-semibold hover:bg-primary-700 transition-colors"
      >
        Continue to Deploy
      </button>
    </div>
  );
}
