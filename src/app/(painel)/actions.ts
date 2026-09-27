"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function sair() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

type EditableFieldKind = "text" | "nullableText" | "number" | "date" | "month";

const editableFields: Record<string, { path: string; fields: Record<string, EditableFieldKind> }> = {
  proprietarios: {
    path: "/proprietarios",
    fields: { nome: "text", cpf_cnpj: "text", telefone: "text", email: "nullableText", observacoes: "nullableText" },
  },
  inquilinos: {
    path: "/inquilinos",
    fields: { nome: "text", cpf_cnpj: "text", telefone: "text", email: "nullableText", observacoes: "nullableText" },
  },
  imoveis: {
    path: "/imoveis",
    fields: {
      proprietario_id: "nullableText", codigo: "nullableText", endereco: "text", numero: "nullableText", complemento: "nullableText",
      bairro: "nullableText", cidade: "text", estado: "text", cep: "nullableText", tipo: "text",
      quartos: "number", area_m2: "number", valor_aluguel_base: "number", status: "text", observacoes: "nullableText",
    },
  },
  contratos: {
    path: "/contratos",
    fields: {
      data_inicio: "date", data_fim: "date", dia_vencimento: "number", valor_aluguel_atual: "number",
      indice_reajuste: "text", periodicidade_reajuste_meses: "number", deposito_caucao: "number",
      clausulas_especiais: "nullableText",
    },
  },
  contas_consumo: {
    path: "/contas",
    fields: {
      imovel_id: "text", tipo: "text", competencia: "month", valor: "number", vencimento: "date",
      responsavel_pagamento: "text", status: "text",
    },
  },
  manutencoes: {
    path: "/manutencoes",
    fields: {
      imovel_id: "text", tipo: "text", descricao: "text", status: "text", custo: "number",
      responsavel: "nullableText", data_solicitacao: "date", data_conclusao: "date", observacoes: "nullableText",
    },
  },
  indices_economicos: {
    path: "/indices",
    fields: { indice: "text", competencia: "month", valor_percentual: "number", fonte: "text" },
  },
  arquivos: {
    path: "/arquivos",
    fields: { nome: "text", entidade_tipo: "text", entidade_id: "text", tipo_arquivo: "nullableText" },
  },
  profiles: {
    path: "/equipe",
    fields: { nome: "text" },
  },
};

export async function atualizarRegistro(formData: FormData) {
  const entity = String(formData.get("entity") || "");
  const id = String(formData.get("id") || "");
  const config = editableFields[entity];

  if (!config || !id) throw new Error("Registro inválido.");

  const values: Record<string, string | number | null> = {};
  for (const [field, kind] of Object.entries(config.fields)) {
    const rawValue = formData.get(field);
    if (rawValue === null) continue;
    const value = String(rawValue);

    if (kind === "number") values[field] = value === "" ? null : Number(value);
    else if (kind === "date") values[field] = value || null;
    else if (kind === "month") values[field] = value ? `${value}-01` : null;
    else if (kind === "nullableText") values[field] = value || null;
    else values[field] = value;
  }

  const supabase = await createClient();
  const { error } = await supabase.from(entity).update(values).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath(config.path);
}
