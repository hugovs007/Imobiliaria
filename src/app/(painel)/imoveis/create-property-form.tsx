"use client";

import { useRef, useState } from "react";
import { Button, Field, Select, TextArea } from "@/components/ui";
import { criarImovel } from "./actions";

type Option = { value: string; label: string };
type Proprietario = { id: string; nome: string };

export function CreatePropertyForm({
  proprietarios,
  tipos,
}: {
  proprietarios: Proprietario[];
  tipos: Option[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        setSaving(true);
        setError(null);
        setSuccess(false);
        try {
          const result = await criarImovel(formData);
          if (result.error) {
            setError(result.error);
            return;
          }
          formRef.current?.reset();
          setSuccess(true);
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "Não foi possível cadastrar o imóvel.");
        } finally {
          setSaving(false);
        }
      }}
      className="grid grid-cols-1 gap-4 sm:grid-cols-2"
    >
      <Field label="Código interno" name="codigo" placeholder="IM-0001" />
      <Select
        label="Proprietário"
        name="proprietario_id"
        options={[{ value: "", label: "— não vinculado —" }, ...proprietarios.map((p) => ({ value: p.id, label: p.nome }))]}
      />
      <Field label="Endereço" name="endereco" required />
      <Field label="Número" name="numero" />
      <Field label="Complemento" name="complemento" placeholder="Apto, bloco, casa dos fundos..." />
      <Field label="Bairro" name="bairro" />
      <Field label="Cidade" name="cidade" required />
      <Field label="Estado (UF)" name="estado" required />
      <Field label="CEP" name="cep" />
      <Select label="Tipo" name="tipo" defaultValue="residencial" options={tipos} />
      <Field label="Quartos" name="quartos" type="number" />
      <Field label="Área (m²)" name="area_m2" type="number" step="0.01" />
      <Field label="Valor de aluguel base (R$)" name="valor_aluguel_base" type="number" step="0.01" required />
      <Select
        label="Status"
        name="status"
        defaultValue="disponivel"
        options={[
          { value: "disponivel", label: "Disponível" },
          { value: "alugado", label: "Alugado" },
          { value: "manutencao", label: "Em manutenção" },
          { value: "inativo", label: "Inativo" },
        ]}
      />
      <TextArea label="Observações" name="observacoes" />
      {(error || success) && (
        <p
          role={error ? "alert" : "status"}
          className="text-sm sm:col-span-2"
          style={{ color: error ? "var(--color-alert)" : "var(--color-ok)" }}
        >
          {error ?? "Imóvel cadastrado com sucesso."}
        </p>
      )}
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-sm px-4 py-2 text-sm font-medium disabled:opacity-60"
          style={{ background: "var(--color-teal)", color: "var(--color-paper)" }}
        >
          {saving ? "Cadastrando..." : "Cadastrar imóvel"}
        </button>
      </div>
    </form>
  );
}
