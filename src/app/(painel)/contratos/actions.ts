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

    // 1. Busca dados do imóvel
    const { data: imovel } = await supabase
      .from("imoveis")
      .select("codigo")
      .eq("id", imovel_id)
      .maybeSingle();

    const imovelCodigo = imovel?.codigo ?? "IMV";
    const dataInicio = String(formData.get("data_inicio") || "").trim();
    
    if (!dataInicio) {
      return { success: false, error: "Informe a data de início do contrato." };
    }

    const anoMes = dataInicio.replace(/-/g, "").slice(0, 6);
    const sulfixoRandom = Math.floor(1000 + Math.random() * 9000);
    const codigoGerado = `${imovelCodigo}-${anoMes || "202610"}-${sulfixoRandom}`;

    // 2. Mapeamento do Enum de reajuste
    const rawIndice = String(formData.get("indice_reajuste") || "IGP-M").toUpperCase();
    let indice_reajuste: "IGP-M" | "IPCA" | "Outro" = "IGP-M";
    if (rawIndice.includes("IPCA")) indice_reajuste = "IPCA";
    else if (rawIndice.includes("OUTRO")) indice_reajuste = "Outro";

    // 3. Sanitização dos dados numéricos
    const valorRaw = formData.get("valor_atual") || formData.get("valor_aluguel_atual");
    const valor_atual = parseFloat(String(valorRaw || "0")) || 0;

    const diaVencimentoParsed = parseInt(String(formData.get("dia_vencimento") || "10"), 10);
    const dia_vencimento = isNaN(diaVencimentoParsed) ? 10 : Math.min(Math.max(diaVencimentoParsed, 1), 31);

    const periodicidadeParsed = parseInt(String(formData.get("periodicidade_reajuste_meses") || "12"), 10);
    const periodicidade_reajuste_meses = isNaN(periodicidadeParsed) ? 12 : periodicidadeParsed;

    const caucaoRaw = String(formData.get("valor_caucao") || formData.get("deposito_caucao") || "").trim();
    const valor_caucao = caucaoRaw !== "" && !isNaN(parseFloat(caucaoRaw)) ? parseFloat(caucaoRaw) : null;

    const dataFimRaw = String(formData.get("data_fim") || "").trim();
    const data_fim = dataFimRaw !== "" ? dataFimRaw : null;

    // 4. Montagem base do payload
    const payload: Record<string, any> = {
      imovel_id,
      inquilino_id,
      data_inicio: dataInicio,
      data_fim,
      dia_vencimento,
      valor_atual,
      indice_reajuste,
      periodicidade_reajuste_meses,
      valor_caucao,
      clausulas_especiais: String(formData.get("clausulas_especiais") || "").trim() || null,
      ativo: true,
      status: "ativo",
    };

    // Tenta primeiro sem coluna de código (caso seja autogerada ou trigger)
    let { error: insertError } = await supabase.from("contratos").insert([payload]);

    // Se exigir código, testa as duas nomenclaturas possíveis
    if (insertError && insertError.code === "PGRST204") {
      // Tentativa 1: 'codigo'
      payload.codigo = codigoGerado;
      let res = await supabase.from("contratos").insert([payload]);
      
      if (res.error && res.error.code === "PGRST204") {
        // Tentativa 2: 'codigo_contrato'
        delete payload.codigo;
        payload.codigo_contrato = codigoGerado;
        res = await supabase.from("contratos").insert([payload]);
      }

      insertError = res.error;
    }

    if (insertError) {
      console.error("Erro do Supabase ao inserir contrato:", insertError);
      return { success: false, error: `Erro no Supabase (${insertError.code}): ${insertError.message}` };
    }

    // 5. Atualiza o status do imóvel
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

    const { error } = await supabase.rpc("renovar_contrato", {
      p_contrato_id: contratoId,
      p_data_inicio: dataInicio,
      p_data_fim: dataFim,
    });
    if (error) return { error: error.message };

    revalidatePath("/contratos");
    revalidatePath("/imoveis");
    revalidatePath("/");
    return { error: null };
  } catch (cause: any) {
    return { error: cause?.message || "Não foi possível renovar o contrato." };
  }
}

export async function encerrarContrato(formData: FormData): Promise<{ error: string | null }> {
  try {
    const supabase = await createClient();
    const contratoId = String(formData.get("id") || "");
    const { error } = await supabase.rpc("encerrar_contrato", { p_contrato_id: contratoId });
    if (error) return { error: error.message };

    revalidatePath("/contratos");
    revalidatePath("/imoveis");
    revalidatePath("/");
    return { error: null };
  } catch (cause: any) {
    return { error: cause?.message || "Não foi possível encerrar o contrato." };
  }
}