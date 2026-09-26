"use client";

import { useRef, useState } from "react";
import { renovarContrato } from "./actions";

function moeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function RenewalForm({
  contractId,
  startDate,
  currentRent,
  index,
}: {
  contractId: string;
  startDate: string;
  currentRent: number;
  index: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function closeDialog() {
    dialogRef.current?.close();
    setError(null);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="text-xs font-medium underline"
        style={{ color: "var(--color-teal)" }}
      >
        Renovar
      </button>
      <dialog
        ref={dialogRef}
        onClose={() => setError(null)}
        className="m-auto max-h-[90vh] w-[min(34rem,calc(100vw-2rem))] overflow-y-auto rounded-md border bg-white p-0 shadow-2xl backdrop:bg-black/50"
        style={{ borderColor: "var(--color-line)" }}
      >
        <div className="p-5 sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold" style={{ color: "var(--color-ink)" }}>
                Renovar contrato
              </h2>
              <p className="mt-1 text-sm" style={{ color: "var(--color-ink-soft)" }}>
                O contrato atual será encerrado como renovado e um novo período será criado.
              </p>
            </div>
            <button
              type="button"
              onClick={closeDialog}
              aria-label="Fechar"
              className="rounded-sm px-2 py-1 text-lg leading-none"
              style={{ color: "var(--color-ink-soft)" }}
            >
              ×
            </button>
          </div>

          <div className="mb-5 grid grid-cols-2 gap-3 rounded-sm border p-3 text-sm" style={{ borderColor: "var(--color-line)" }}>
            <div>
              <p className="text-xs uppercase" style={{ color: "var(--color-ink-soft)" }}>Aluguel vigente</p>
              <p className="mt-1 font-semibold">{moeda(currentRent)}</p>
            </div>
            <div>
              <p className="text-xs uppercase" style={{ color: "var(--color-ink-soft)" }}>Índice do contrato</p>
              <p className="mt-1 font-semibold">{index.toUpperCase()}</p>
            </div>
            <p className="col-span-2 text-xs leading-5" style={{ color: "var(--color-ink-soft)" }}>
              O aluguel vigente, com reajustes já aplicados, será mantido. Se um novo reajuste anual vencer na data da renovação, o índice cadastrado será aplicado uma vez antes da criação do novo contrato.
            </p>
          </div>

          <form
            action={async (formData) => {
              setIsSaving(true);
              setError(null);
              try {
                await renovarContrato(formData);
                closeDialog();
              } catch (cause) {
                setError(cause instanceof Error ? cause.message : "Não foi possível renovar o contrato.");
              } finally {
                setIsSaving(false);
              }
            }}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2"
          >
            <input type="hidden" name="contrato_id" value={contractId} />
            <label className="flex flex-col gap-1 text-sm">
              <span style={{ color: "var(--color-ink-soft)" }}>Início do novo período</span>
              <input
                name="data_inicio"
                type="date"
                required
                defaultValue={startDate}
                className="rounded-sm border px-3 py-2"
                style={{ borderColor: "var(--color-line)" }}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span style={{ color: "var(--color-ink-soft)" }}>Fim do novo período (opcional)</span>
              <input
                name="data_fim"
                type="date"
                className="rounded-sm border px-3 py-2"
                style={{ borderColor: "var(--color-line)" }}
              />
            </label>
            {error && (
              <p role="alert" className="text-sm sm:col-span-2" style={{ color: "var(--color-alert)" }}>
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2 border-t pt-4 sm:col-span-2" style={{ borderColor: "var(--color-line)" }}>
              <button
                type="button"
                onClick={closeDialog}
                className="rounded-sm border px-4 py-2 text-sm"
                style={{ borderColor: "var(--color-line)", color: "var(--color-ink)" }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="rounded-sm px-4 py-2 text-sm font-medium disabled:opacity-60"
                style={{ background: "var(--color-teal)", color: "var(--color-paper)" }}
              >
                {isSaving ? "Renovando..." : "Confirmar renovação"}
              </button>
            </div>
          </form>
        </div>
      </dialog>
    </>
  );
}
