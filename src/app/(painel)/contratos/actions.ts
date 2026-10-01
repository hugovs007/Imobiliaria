"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function criarContrato(formData: FormData) {
  try {
    const supabase = await createClient();

    const imovel_id = String(formData.get("imovel_id") || "").trim();
    const inquilino_id = String(formData.get("inquilino_id") || "").trim();

    if (!imovel_id || !inquilino_id) {
      throw new Error("Selecione um imóvel e um inquilino válidos.");
    }

    // Busca o código do imóvel para gerar o código do contrato
    const { data: imovel } = await supabase
      .from("imoveis")
      .select("codigo")
      .eq("id", imovel_id)
      .single();

    const imovelCodigo = imovel?.codigo ?? "IMV";
    const dataInicio = String(formData.get("data_inicio") || "").trim();
    const anoMes = dataInicio.replace(/-/g, "").slice(0, 6);
    const codigoContrato = `${imovelCodigo}-${anoMes || "202601"}`;

    // Mapeamento do Enum do índice de reajuste do Supabase
    const rawIndice = String(formData.get("indice_reajuste") || "IGP-M").toUpperCase();
    let indice_reajuste = "IGP-M";
    if (rawIndice.includes("IPCA")) indice_reajuste = "IPCA";
    else if (rawIndice.includes("OUTRO")) indice_reajuste = "Outro";

    // Tratamento de valores numéricos e datas
    const valor = Number(formData.get("valor_aluguel_atual") || formData.get("valor_atual") || 0);
    const diaVencimento = Number(formData.get("dia_vencimento") || 1);
    const periodicidade = Number(formData.get("periodicidade_reajuste_meses") || 12);
    
    const caucaoRaw = formData.get("deposito_caucao") || formData.get("valor_caucao");
    const valorCaucao = caucaoRaw ? Number(caucaoRaw) : null;

    const dataFimRaw = String(formData.get("data_fim") || "").trim();
    const dataFim = dataFimRaw !== "" ? dataFimRaw : null;

    // Inserção compatível com as variações de colunas da tabela "contratos"
    const { error } = await supabase.from("contratos").insert({
      codigo: codigoContrato,
      codigo_contrato: codigoContrato,
      imovel_id,
      inquilino_id,
      data_inicio: dataInicio,
      data_fim: dataFim,
      dia_vencimento: diaVencimento,
      valor_atual: valor,
      valor_aluguel_atual: valor,
      indice_reajuste: indice_reajuste as "IGP-M" | "IPCA" | "Outro",
      periodicidade_reajuste_meses: periodicidade,
      valor_caucao: valorCaucao,
      deposito_caucao: valorCaucao,
      clausulas_especiais: String(formData.get("clausulas_especiais") || ""),
    });

    if (error) {
      console.error("Erro no Supabase ao inserir contrato:", error.message);
      throw new Error(error.message);
    }

    // Marca o imóvel como alugado
    await supabase.from("imoveis").update({ status: "alugado" }).eq("id", imovel_id);

    revalidatePath("/contratos");
    revalidatePath("/imoveis");
    revalidatePath("/");
  } catch (err: any) {
    console.error("Falha na ação criarContrato:", err);
    throw new Error(err.message || "Erro ao cadastrar contrato.");
  }
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
    revalidatePath("/");
    return { error: null };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Não foi possível renovar o contrato.";
    console.error("Falha ao renovar contrato:", cause);
    return { error: message };
  }
}

export async function encerrarContrato(formData: FormData): Promise<{ error: string | null }> {
  try {
    const supabase = await createClient();
    const contratoId = String(formData.get("id") || "");
    const { error } = await supabase.rpc("encerrar_contrato", { p_contrato_id: contratoId });
    if (error) {
      console.error("Falha ao encerrar contrato:", error);
      return { error: error.message };
    }

    revalidatePath("/contratos");
    revalidatePath("/imoveis");
    revalidatePath("/");
    return { error: null };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Não foi possível encerrar o contrato.";
    console.error("Falha ao encerrar contrato:", cause);
    return { error: message };
  }
}