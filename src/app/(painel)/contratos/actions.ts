"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ActionState = {
  success?: boolean;
  error?: string | null;
};

export async function criarContrato(_prevState: ActionState | null, formData: FormData): Promise<ActionState> {
  try {
    const supabase = await createClient();

    const imovel_id = String(formData.get("imovel_id") || "").trim();
    const inquilino_id = String(formData.get("inquilino_id") || "").trim();

    if (!imovel_id || !inquilino_id) {
      return { success: false, error: "Selecione um imóvel e um inquilino válidos." };
    }

    const dataInicio = String(formData.get("data_inicio") || "").trim();
    if (!dataInicio) {
      return { success: false, error: "Informe a data de início do contrato." };
    }

    // 1. Mapeamento do Enum reajuste_indice
    const rawIndice = String(formData.get("indice_reajuste") || "IGP-M").toUpperCase();
    let indice_reajuste: "IGP-M" | "IPCA" | "Outro" = "IGP-M";
    if (rawIndice.includes("IPCA")) indice_reajuste = "IPCA";
    else if (rawIndice.includes("OUTRO")) indice_reajuste = "Outro";

    // 2. Sanitização do valor do aluguel (valor_aluguel no schema)
    const valorRaw = formData.get("valor_aluguel") || formData.get("valor_atual") || formData.get("valor_aluguel_atual");
    const valor_aluguel = parseFloat(String(valorRaw || "0")) || 0;

    if (valor_aluguel <= 0) {
      return { success: false, error: "Informe um valor de aluguel válido." };
    }

    // 3. Validação do dia de vencimento (conforme restrição check: 1 a 31)
    const diaVencimentoParsed = parseInt(String(formData.get("dia_vencimento") || "10"), 10);
    const dia_vencimento = isNaN(diaVencimentoParsed) ? 10 : Math.min(Math.max(diaVencimentoParsed, 1), 31);

    // 4. Tratamento de periodicidade e valor de caução
    const periodicidadeParsed = parseInt(String(formData.get("periodicidade_reajuste_meses") || "12"), 10);
    const periodicidade_reajuste_meses = isNaN(periodicidadeParsed) ? 12 : periodicidadeParsed;

    const caucaoRaw = String(formData.get("valor_caucao") || "").trim();
    const valor_caucao = caucaoRaw !== "" && !isNaN(parseFloat(caucaoRaw)) ? parseFloat(caucaoRaw) : 0;

    const dataFimRaw = String(formData.get("data_fim") || "").trim();
    const data_fim = dataFimRaw !== "" ? dataFimRaw : null;

    // 5. Payload exato correspondente ao DDL da tabela contratos
    const payload = {
      imovel_id,
      inquilino_id,
      data_inicio: dataInicio,
      data_fim,
      dia_vencimento,
      valor_aluguel,
      indice_reajuste,
      periodicidade_reajuste_meses,
      valor_caucao,
      clausulas_especiais: String(formData.get("clausulas_especiais") || "").trim() || null,
      ativo: true,
    };

    const { error: insertError } = await supabase.from("contratos").insert([payload]);

    if (insertError) {
      console.error("Erro do Supabase ao inserir contrato:", insertError);
      return { success: false, error: `Erro no Supabase (${insertError.code}): ${insertError.message}` };
    }

    // 6. Atualiza o status do imóvel cadastrado para alugado
    await supabase.from("imoveis").update({ status: "alugado" }).eq("id", imovel_id);

    revalidatePath("/contratos");
    revalidatePath("/imoveis");
    revalidatePath("/");

    return { success: true, error: null };
  } catch (err: any) {
    console.error("Exceção capturada em criarContrato:", err?.message || err);
    return { success: false, error: err?.message || "Ocorreu um erro interno ao cadastrar o contrato." };
  }
}

export async function gerarReajustesPendentes() {
  const supabase = await createClient();
  const { error } = await supabase.rpc("gerar_reajustes_pendentes");
  if (error) console.error("Erro em gerarReajustesPendentes:", error.message);
  revalidatePath("/contratos");
}

export async function aplicarReajuste(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const { error } = await supabase.rpc("aplicar_reajuste", { p_reajuste_id: id });
  if (error) console.error("Erro em aplicarReajuste:", error.message);
  revalidatePath("/contratos");
}

export async function renovarContrato(formData: FormData): Promise<{ error: string | null }> {
  try {
    const supabase = await createClient();
    const contratoId = String(formData.get("contrato_id") || "");
    const dataInicio = String(formData.get("data_inicio") || "");
    const dataFim = String(formData.get("data_fim") || "") || null;

    if (!contratoId || !dataInicio) {
      return { error: "Parâmetros de renovação inválidos." };
    }

    // Passa os parâmetros na ordem estrita esperada pela RPC PostgreSQL
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
  } catch (cause: any) {
    console.error("Exceção ao renovar contrato:", cause);
    return { error: cause?.message || "Não foi possível renovar o contrato." };
  }
}

export async function encerrarContrato(formData: FormData): Promise<{ error: string | null }> {
  try {
    const supabase = await createClient();
    const contratoId = String(formData.get("id") || "");

    if (!contratoId) {
      return { error: "ID do contrato não informado." };
    }

    // Busca o imóvel associado para liberar status
    const { data: contrato } = await supabase
      .from("contratos")
      .select("imovel_id")
      .eq("id", contratoId)
      .single();

    const { error } = await supabase
      .from("contratos")
      .update({ ativo: false })
      .eq("id", contratoId);

    if (error) return { error: error.message };

    if (contrato?.imovel_id) {
      await supabase.from("imoveis").update({ status: "disponivel" }).eq("id", contrato.imovel_id);
    }

    revalidatePath("/contratos");
    revalidatePath("/imoveis");
    revalidatePath("/");
    return { error: null };
  } catch (cause: any) {
    return { error: cause?.message || "Não foi possível encerrar o contrato." };
  }
}