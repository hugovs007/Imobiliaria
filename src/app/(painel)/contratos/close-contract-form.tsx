"use client";

import { useState } from "react";
import { encerrarContrato } from "./actions";

export function CloseContractForm({
  contractId,
  contractCode,
}: {
  contractId: string;
  contractCode: string;
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      action={async (formData) => {
        setIsSaving(true);
        setError(null);
        try {
          const result = await encerrarContrato(formData);
          if (result.error) setError(result.error);
        } finally {
          setIsSaving(false);
        }
      }}
      onSubmit={(event) => {
        if (!window.confirm(`Confirma o encerramento do contrato ${contractCode}?`)) {
          event.preventDefault();
        }
      }}
      className="flex flex-col items-start gap-1"
    >
      <input type="hidden" name="id" value={contractId} />
      <button
        type="submit"
        disabled={isSaving}
        className="text-xs font-medium underline disabled:opacity-60"
        style={{ color: "var(--color-alert)" }}
      >
        {isSaving ? "Encerrando..." : "Encerrar"}
      </button>
      {error && (
        <span role="alert" className="max-w-48 text-xs" style={{ color: "var(--color-alert)" }}>
          {error}
        </span>
      )}
    </form>
  );
}
