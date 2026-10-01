"use client";

import { useActionState } from "react";
import { Button, Field, Select } from "@/components/ui";
import { cadastrarIndice } from "./actions";

export function FormCriarIndice() {
  const [state, formAction, isPending] = useActionState(cadastrarIndice, null);

  const mesAtual = new Date().toISOString().slice(0, 7); // YYYY-MM

  return (
    <form action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {state?.error && (
        <div className="sm:col-span-2 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {state.error}
        </div>
      )}

      <Select
        label="Índice"
        name="indice"
        defaultValue="IGP-M"
        options={[
          { value: "IGP-M", label: "IGP-M (FGV)" },
          { value: "IPCA", label: "IPCA (IBGE)" },
          { value: "Outro", label: "Outro" },
        ]}
      />

      <Field
        label="Mês de referência (YYYY-MM)"
        name="mes_referencia"
        type="month"
        required
        defaultValue={mesAtual}
      />

      <Field
        label="Variação acumulada 12m (%)"
        name="variacao_12m"
        type="number"
        step="0.0001"
        placeholder="Ex: 4.52"
        required
      />

      <Field
        label="Fonte das informações"
        name="fonte"
        type="text"
        defaultValue="Banco Central / FGV / IBGE"
      />

      <div className="sm:col-span-2">
        <Button type="submit">
          {isPending ? "Salvando..." : "Salvar índice do mês"}
        </Button>
      </div>
    </form>
  );
}