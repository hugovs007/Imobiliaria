"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function criarContrato(formData: FormData) {
  const supabase = await createClient();

  const imovel_id = String(formData.get("imovel_id"));
  const valor = Number(formData.get("valor_aluguel_atual"));

  const { error } = await supabase.from("contratos").insert({
    imovel_id,
    inquilino_id: String(formData.get("inquilino_id")),
    data_inicio: String(formData.get("data_inicio")),
    data_fim: String(formData.get("data_fim") || "") || null,
    dia_vencimento: Number(formData.get("dia_vencimento")),
    valor_aluguel_atual: valor,
    indice_reajuste: String(formData.get("indice_reajuste")),
    periodicidade_reajuste_meses: Number(formData.get("periodicidade_reajuste_meses")) || 12,
    deposito_caucao: Number(formData.get("deposito_caucao")) || null,
    clausulas_especiais: String(formData.get("clausulas_especiais") || ""),
  });

  if (error) throw new Error(error.message);

  // marca o imóvel como alugado
  await supabase.from("imoveis").update({ status: "alugado" }).eq("id", imovel_id);

  revalidatePath("/contratos");
  revalidatePath("/imoveis");
}

export async function gerarReajustesPendentes() {
  const supabase = await createClient();
  const { error } = await supabase.rpc("gerar_reajustes_pendentes");
  if (error) throw new Error(error.message);
  revalidatePath("/contratos");
}

export async function aplicarReajuste(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const { error } = await supabase.rpc("aplicar_reajuste", { p_reajuste_id: id });
  if (error) throw new Error(error.message);
  revalidatePath("/contratos");
}

export async function renovarContrato(formData: FormData): Promise<{ error: string | null }> {
  try {
    const supabase = await createClient();
    const contratoId = String(formData.get("contrato_id") || "");
    const dataInicio = String(formData.get("data_inicio") || "");
    const dataFim = String(formData.get("data_fim") || "") || null;

    const { error } = await supabase.rpc("renovar_contrato", {
      p_contrato_id: contratoId,
      p_data_inicio: dataInicio,
      p_data_fim: dataFim,
    });
    if (error) {
      console.error("Falha na RPC renovar_contrato:", error);
      return { error: error.message };
    }

    revalidatePath("/contratos");
    revalidatePath("/imoveis");
    revalidatePath("/pagamentos");
    return { error: null };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Não foi possível renovar o contrato.";
    console.error("Falha ao renovar contrato:", cause);
    return { error: message };
  }
}

export async function encerrarContrato(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const imovel_id = String(formData.get("imovel_id"));

  const { error } = await supabase.from("contratos").update({ status: "encerrado" }).eq("id", id);
  if (error) throw new Error(error.message);

  await supabase.from("imoveis").update({ status: "disponivel" }).eq("id", imovel_id);
  revalidatePath("/contratos");
  revalidatePath("/imoveis");
}
