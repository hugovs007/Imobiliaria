"use client";

import { useActionState } from "react";
import { Button, Field, Select, TextArea } from "@/components/ui";
import { criarContrato } from "./actions";

interface FormCriarContratoProps {
  imoveisParaExibir: any[];
  listaInquilinos: any[];
}

export function FormCriarContrato({ imoveisParaExibir, listaInquilinos }: FormCriarContratoProps) {
  const [state, formAction, isPending] = useActionState(criarContrato, null);

  return (
    <form action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {state?.error && (
        <div className="sm:col-span-2 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {state.error}
        </div>
      )}

      <Select
        label="Imóvel (disponíveis)"
        name="imovel_id"
        required
        options={[
          { value: "", label: "— selecione um imóvel —" },
          ...imoveisParaExibir.map((i) => {
            const rotuloEndereco = [
              i.codigo,
              i.logradouro || i.endereco,
              i.numero,
              i.cidade ? `${i.cidade}/${i.uf || i.estado}` : null,
            ]
              .filter(Boolean)
              .join(" - ");

            return {
              value: i.id,
              label: rotuloEndereco || `Imóvel ID: ${i.id.slice(0, 8)}`,
            };
          }),
        ]}
      />

      <Select
        label="Inquilino"
        name="inquilino_id"
        required
        options={[
          { value: "", label: "— selecione um inquilino —" },
          ...listaInquilinos.map((i) => ({ value: i.id, label: i.nome })),
        ]}
      />

      <Field label="Data de início" name="data_inicio" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
      <Field label="Data de fim (opcional)" name="data_fim" type="date" />
      <Field label="Dia de vencimento (1-31)" name="dia_vencimento" type="number" required placeholder="Ex: 10" />
      <Field label="Valor do aluguel (R$)" name="valor_aluguel" type="number" step="0.01" required />

      <Select
        label="Índice de reajuste"
        name="indice_reajuste"
        defaultValue="IGP-M"
        options={[
          { value: "IGP-M", label: "IGP-M" },
          { value: "IPCA", label: "IPCA" },
          { value: "Outro", label: "Outro (definir em cláusula)" },
        ]}
      />

      <Field label="Periodicidade do reajuste (meses)" name="periodicidade_reajuste_meses" type="number" defaultValue={12} />
      <Field label="Caução/depósito (R$)" name="valor_caucao" type="number" step="0.01" />
      <TextArea label="Cláusulas especiais" name="clausulas_especiais" />

      <div className="sm:col-span-2">
        <Button type="submit">
          {isPending ? "Cadastrando..." : "Cadastrar contrato"}
        </Button>
      </div>
    </form>
  );
}