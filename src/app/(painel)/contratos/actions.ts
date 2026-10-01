"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function criarContrato(formData: FormData): Promise<void> {
  try {
    const supabase = await createClient();

    const imovel_id = String(formData.get("imovel_id") || "").trim();
    const inquilino_id = String(formData.get("inquilino_id") || "").trim();

    if (!imovel_id || !inquilino_id) {
      throw new Error("Selecione um imóvel e um inquilino válidos.");
    }

    // 1. Busca o código do imóvel para gerar o identificador único
    const { data: imovel } = await supabase
      .from("imoveis")
      .select("codigo")
      .eq("id", imovel_id)
      .maybeSingle();

    const imovelCodigo = imovel?.codigo ?? "IMV";
    const dataInicio = String(formData.get("data_inicio") || "").trim();
    const anoMes = dataInicio.replace(/-/g, "").slice(0, 6);
    const codigo = `${imovelCodigo}-${anoMes || "202601"}`;

    // 2. Normalização do Enum exato exigido pelo Postgres
    const rawIndice = String(formData.get("indice_reajuste") || "IGP-M").toUpperCase();
    let indice_reajuste: "IGP-M" | "IPCA" | "Outro" = "IGP-M";
    if (rawIndice.includes("IPCA")) indice_reajuste = "IPCA";
    else if (rawIndice.includes("OUTRO")) indice_reajuste = "Outro";

    // 3. Leitura e tratamento dos campos conforme o schema da tabela "contratos"
    const valor_atual = parseFloat(
      String(formData.get("valor_aluguel_atual") || formData.get("valor_atual") || "0")
    );
    const dia_vencimento = Math.min(
      Math.max(parseInt(String(formData.get("dia_vencimento") || "10"), 10), 1),
      31
    );
    const periodicidade_reajuste_meses = parseInt(
      String(formData.get("periodicidade_reajuste_meses") || "12"),
      10
    );

    const caucaoRaw = String(
      formData.get("deposito_caucao") || formData.get("valor_caucao") || ""
    ).trim();
    const valor_caucao = caucaoRaw !== "" ? parseFloat(caucaoRaw) : null;

    const dataFimRaw = String(formData.get("data_fim") || "").trim();
    const data_fim = dataFimRaw !== "" ? dataFimRaw : null;

    // 4. Inserção estrita utilizando as colunas existentes no banco
    const { error: insertError } = await supabase.from("contratos").insert([{
      codigo,
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
    }]);

    if (insertError) {
      console.error("Erro Supabase ao salvar contrato:", insertError.message);
      throw new Error(insertError.message);
    }

    // 5. Atualiza o status do imóvel para alugado
    await supabase.from("imoveis").update({ status: "alugado" }).eq("id", imovel_id);

    revalidatePath("/contratos");
    revalidatePath("/imoveis");
    revalidatePath("/");
  } catch (err: any) {
    console.error("Erro na Server Action criarContrato:", err);
    throw new Error(err?.message || "Ocorreu um erro interno ao cadastrar o contrato.");
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