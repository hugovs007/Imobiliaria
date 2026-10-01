"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ActionState = {
  success?: boolean;
  error?: string | null;
};

/**
 * Lança a cobrança mensal para um contrato específico.
 */
export async function lancarCobranca(formData: FormData): Promise<ActionState> {
  try {
    const supabase = await createClient();

    const competenciaRaw = String(formData.get("competencia") || "").trim();
    const competencia = competenciaRaw.length === 7 ? `${competenciaRaw}-01` : competenciaRaw;
    const contratoId = String(formData.get("contrato_id") || "").trim();
    const valorBase = parseFloat(String(formData.get("valor_base") || formData.get("valor_devido") || "0")) || 0;
    const dataVencimento = String(formData.get("data_vencimento") || "").trim();

    if (!contratoId || !competencia || !dataVencimento) {
      return { success: false, error: "Preencha todos os campos obrigatórios." };
    }

    if (valorBase <= 0) {
      return { success: false, error: "Informe um valor devido válido." };
    }

    // Verifica se já existe cobrança para esta competência e contrato
    const { data: existing, error: existingError } = await supabase
      .from("pagamentos")
      .select("id")
      .eq("contrato_id", contratoId)
      .eq("competencia", competencia)
      .maybeSingle();

    if (existingError) {
      console.error("Erro ao verificar pagamento existente:", existingError);
      return { success: false, error: existingError.message };
    }

    if (existing) {
      return { success: false, error: "Já existe uma cobrança lançada para esta competência." };
    }

    const { error: insertError } = await supabase.from("pagamentos").insert({
      contrato_id: contratoId,
      competencia,
      valor_base: valorBase,
      data_vencimento: dataVencimento,
      status: "pendente",
    });

    if (insertError) {
      console.error("Erro ao inserir cobrança avulsa:", insertError);
      return { success: false, error: insertError.message };
    }

    revalidatePath("/pagamentos");
    revalidatePath("/financeiro");
    revalidatePath("/");
    return { success: true, error: null };
  } catch (err: any) {
    console.error("Exceção capturada em lancarCobranca:", err);
    return { success: false, error: err?.message || "Ocorreu um erro ao lançar a cobrança." };
  }
}

/**
 * Lança cobranças em lote para todos os contratos ativos na competência selecionada.
 */
export async function lancarCobrancasEmLote(formData: FormData): Promise<ActionState> {
  try {
    const supabase = await createClient();

    const competenciaRaw = String(formData.get("competencia") || "").trim();
    if (!competenciaRaw) {
      return { success: false, error: "Selecione um mês de referência válido." };
    }

    const competencia = competenciaRaw.length === 7 ? `${competenciaRaw}-01` : competenciaRaw;

    // Busca todos os contratos ativos
    const { data: contratos, error: contratosError } = await supabase
      .from("contratos")
      .select("id, valor_aluguel, dia_vencimento, ativo")
      .eq("ativo", true);

    if (contratosError) {
      console.error("Erro ao buscar contratos ativos:", contratosError);
      return { success: false, error: contratosError.message };
    }

    if (!contratos || contratos.length === 0) {
      return { success: false, error: "Nenhum contrato ativo encontrado para gerar cobranças." };
    }

    const [anoStr, mesStr] = competenciaRaw.split("-");
    const ano = parseInt(anoStr, 10);
    const mes = parseInt(mesStr, 10) - 1;

    const pagamentosParaInserir = contratos.map((contrato) => {
      const diaVenc = Math.min(Math.max(contrato.dia_vencimento || 10, 1), 31);
      const ultimoDiaDoMes = new Date(ano, mes + 1, 0).getDate();
      const diaEfetivo = Math.min(diaVenc, ultimoDiaDoMes);
      const vencimentoStr = `${ano}-${String(mes + 1).padStart(2, "0")}-${String(diaEfetivo).padStart(2, "0")}`;

      return {
        contrato_id: contrato.id,
        competencia,
        valor_base: contrato.valor_aluguel || 0,
        data_vencimento: vencimentoStr,
        status: "pendente" as const,
      };
    });

    const { error: upsertError } = await supabase
      .from("pagamentos")
      .upsert(pagamentosParaInserir, { onConflict: "contrato_id,competencia", ignoreDuplicates: true });

    if (upsertError) {
      console.error("Erro no upsert em lote:", upsertError);
      return { success: false, error: upsertError.message };
    }

    revalidatePath("/pagamentos");
    revalidatePath("/financeiro");
    revalidatePath("/");
    return { success: true, error: null };
  } catch (err: any) {
    console.error("Exceção capturada em lancarCobrancasEmLote:", err);
    return { success: false, error: err?.message || "Ocorreu um erro ao gerar cobranças em lote." };
  }
}

/**
 * Registra a baixa de um pagamento.
 */
export async function registrarPagamento(formData: FormData): Promise<ActionState> {
  try {
    const supabase = await createClient();

    const id = String(formData.get("id") || formData.get("pagamento_id") || "").trim();
    if (!id) {
      return { success: false, error: "ID do pagamento não informado." };
    }

    const valorPago = parseFloat(String(formData.get("valor_pago") || "0")) || 0;
    if (valorPago <= 0) {
      return { success: false, error: "Informe um valor pago válido." };
    }

    const valorDesconto = parseFloat(String(formData.get("valor_desconto") || "0")) || 0;
    const valorMultaJuros = parseFloat(String(formData.get("valor_multa_juros") || "0")) || 0;
    const dataPagamento = String(formData.get("data_pagamento") || new Date().toISOString().slice(0, 10)).trim();
    const observacoes = String(formData.get("observacoes") || "").trim() || null;

    const { data: pagamentoData, error: fetchError } = await supabase
      .from("pagamentos")
      .select("valor_base, valor_pago")
      .eq("id", id)
      .single();

    if (fetchError) {
      console.error("Erro ao buscar pagamento para baixa:", fetchError);
      return { success: false, error: fetchError.message };
    }

    const valorBase = pagamentoData?.valor_base ?? 0;
    const valorJaPago = pagamentoData?.valor_pago ?? 0;
    const totalPagoEfetivo = valorJaPago + valorPago;

    const novoStatus = (totalPagoEfetivo + valorDesconto) >= (valorBase - 0.01) ? "pago" : "pendente";

    const { error: updateError } = await supabase
      .from("pagamentos")
      .update({
        valor_pago: totalPagoEfetivo,
        valor_desconto: valorDesconto,
        valor_multa_juros: valorMultaJuros,
        data_pagamento: dataPagamento,
        observacoes,
        status: novoStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      console.error("Erro ao atualizar pagamento:", updateError);
      return { success: false, error: updateError.message };
    }

    revalidatePath("/pagamentos");
    revalidatePath("/financeiro");
    revalidatePath("/");
    return { success: true, error: null };
  } catch (err: any) {
    console.error("Exceção capturada em registrarPagamento:", err);
    return { success: false, error: err?.message || "Ocorreu um erro ao registrar o pagamento." };
  }
}

/**
 * Marca um pagamento como isento.
 */
export async function marcarIsento(formData: FormData): Promise<ActionState> {
  try {
    const supabase = await createClient();
    const id = String(formData.get("id") || "").trim();

    if (!id) return { success: false, error: "ID não informado." };

    const { error } = await supabase
      .from("pagamentos")
      .update({ status: "isento", valor_pago: 0, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) return { success: false, error: error.message };

    revalidatePath("/pagamentos");
    revalidatePath("/financeiro");
    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err?.message || "Ocorreu um erro ao isentar pagamento." };
  }
}

/**
 * Atualiza o status de um pagamento.
 */
export async function atualizarStatusPagamento(formData: FormData): Promise<ActionState> {
  try {
    const supabase = await createClient();
    const id = String(formData.get("id") || "").trim();
    const status = String(formData.get("status") || "").trim();

    if (!id || !status) return { success: false, error: "Dados inválidos." };

    const { error } = await supabase
      .from("pagamentos")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) return { success: false, error: error.message };

    revalidatePath("/pagamentos");
    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err?.message || "Ocorreu um erro ao atualizar status." };
  }
}

/**
 * Exclui um pagamento pendente ou isento.
 */
export async function excluirPagamento(formData: FormData): Promise<ActionState> {
  try {
    const supabase = await createClient();
    const id = String(formData.get("id") || "").trim();

    if (!id) return { success: false, error: "ID não informado." };

    const { data: pagamento, error: fetchError } = await supabase
      .from("pagamentos")
      .select("status")
      .eq("id", id)
      .single();

    if (fetchError) return { success: false, error: fetchError.message };

    if (pagamento?.status === "pago") {
      return { success: false, error: "Não é possível excluir um pagamento já quitado." };
    }

    const { error } = await supabase.from("pagamentos").delete().eq("id", id);
    if (error) return { success: false, error: error.message };

    revalidatePath("/pagamentos");
    revalidatePath("/financeiro");
    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err?.message || "Ocorreu um erro ao excluir pagamento." };
  }
}

/**
 * Atualiza pagamentos pendentes com vencimento ultrapassado para "atrasado".
 */
export async function atualizarAtrasados(): Promise<ActionState> {
  try {
    const supabase = await createClient();
    const hoje = new Date().toISOString().slice(0, 10);

    const { error } = await supabase
      .from("pagamentos")
      .update({ status: "atrasado", updated_at: new Date().toISOString() })
      .eq("status", "pendente")
      .lt("data_vencimento", hoje);

    if (error) return { success: false, error: error.message };

    revalidatePath("/pagamentos");
    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err?.message || "Ocorreu um erro ao atualizar atrasados." };
  }
}