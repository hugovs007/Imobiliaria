"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui";
import { renovarContrato } from "./actions";

interface RenewalFormProps {
  contractId: string;
  contractCode: string;
  startDate: string;
  currentRent: number;
  index: string;
  periodicidadeMeses?: number;
}

export function RenewalForm({
  contractId,
  contractCode,
  startDate,
  currentRent,
  index,
  periodicidadeMeses = 12,
}: RenewalFormProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Soma a periodicidade em meses diretamente à data de início do contrato selecionado
  const calcularDataInicioRenovacao = () => {
    try {
      if (startDate) {
        const [ano, mes, dia] = startDate.split("T")[0].split("-").map(Number);
        if (ano && mes && dia) {
          const dataObj = new Date(ano, (mes - 1) + Number(periodicidadeMeses || 12), dia);
          return dataObj.toISOString().split("T")[0];
        }
      }
    } catch {
      // Fallback
    }
    return new Date().toISOString().split("T")[0];
  };

  const dataSugerida = calcularDataInicioRenovacao();

  function handleOpen() {
    dialogRef.current?.showModal();
    setError(null);
  }

  function handleClose() {
    dialogRef.current?.close();
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);
    setError(null);

    try {
      const formData = new FormData(e.currentTarget);
      const res = await renovarContrato(formData);

      if (res?.error) {
        setError(res.error);
        return;
      }

      handleClose();
    } catch (err: any) {
      setError(err instanceof Error ? err.message : "Não foi possível renovar o contrato.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="text-xs font-medium underline cursor-pointer"
        style={{ color: "var(--color-teal)" }}
      >
        Renovar
      </button>

      <dialog
        ref={dialogRef}
        onClose={handleClose}
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
                Contrato {contractCode}. O registro atual ficará intacto e um novo período de {periodicidadeMeses} meses será criado.
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Fechar"
              className="rounded-sm px-2 py-1 text-lg leading-none cursor-pointer"
              style={{ color: "var(--color-ink-soft)" }}
            >
              ×
            </button>
          </div>

          <div className="mb-5 grid grid-cols-2 gap-3 rounded-sm border p-3 text-sm" style={{ borderColor: "var(--color-line)" }}>
            <div>
              <p className="text-xs uppercase" style={{ color: "var(--color-ink-soft)" }}>
                Aluguel vigente
              </p>
              <p className="mt-1 font-semibold">
                {currentRent.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase" style={{ color: "var(--color-ink-soft)" }}>
                Índice do contrato
              </p>
              <p className="mt-1 font-semibold">{index.toUpperCase()}</p>
            </div>
            <p className="col-span-2 text-xs leading-5" style={{ color: "var(--color-ink-soft)" }}>
              O índice cadastrado será aplicado ao aluguel vigente. O novo valor será arredondado para cima ao próximo múltiplo de R$ 5; o contrato anterior não será alterado.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
            <input type="hidden" name="contrato_id" value={contractId} />

            <label className="flex flex-col gap-1 text-sm">
              <span style={{ color: "var(--color-ink-soft)" }}>Início do novo período</span>
              <input
                name="data_inicio"
                type="date"
                required
                defaultValue={dataSugerida}
                className="rounded-sm border px-3 py-2"
                style={{ borderColor: "var(--color-line)" }}
              />
            </label>

            {error && (
              <p role="alert" className="text-sm" style={{ color: "var(--color-alert)" }}>
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2 border-t pt-4" style={{ borderColor: "var(--color-line)" }}>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-sm border px-4 py-2 text-sm font-medium cursor-pointer"
                style={{ borderColor: "var(--color-line)", color: "var(--color-ink)" }}
              >
                Cancelar
              </button>
              <Button type="submit">
                {isPending ? "Renovando..." : "Confirmar renovação"}
              </Button>
            </div>
          </form>
        </div>
      </dialog>
    </>
  );
}