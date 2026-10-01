"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Lança a cobrança mensal para um contrato específico.
 */
export async function lancarCobranca(formData: FormData): Promise<void> {
  try {
    const supabase = await createClient();

    const competenciaRaw = String(formData.get("competencia") || "").trim();
    const competencia = competenciaRaw.length === 7 ? `${competenciaRaw}-01` : competenciaRaw;
    const contratoId = String(formData.get("contrato_id") || "").trim();
    let valorBase = parseFloat(String(formData.get("valor_base") || formData.get("valor_devido") || "0")) || 0;
    let dataVencimento = String(formData.get("data_vencimento") || "").trim();

    if (!contratoId || !competencia) return;

    if (valorBase <= 0 || !dataVencimento) {
      const { data: contratoData, error: contratoError } = await supabase
        .from("contratos")
        .select("valor_aluguel, dia_vencimento")
        .eq("id", contratoId)
        .single();

      if (contratoError || !contratoData) return;

      if (valorBase <= 0) valorBase = Number(contratoData.valor_aluguel || 0);

      if (!dataVencimento) {
        const [anoStr, mesStr] = competencia.split("-");
        const ano = parseInt(anoStr, 10);
        const mes = parseInt(mesStr, 10) - 1;
        const diaVenc = Math.min(Math.max(contratoData.dia_vencimento || 10, 1), 31);
        const ultimoDiaDoMes = new Date(ano, mes + 1, 0).getDate();
        const diaEfetivo = Math.min(diaVenc, ultimoDiaDoMes);
        dataVencimento = `${ano}-${String(mes + 1).padStart(2, "0")}-${String(diaEfetivo).padStart(2, "0")}`;
      }
    }

    const { data: existing } = await supabase
      .from("pagamentos")
      .select("id")
      .eq("contrato_id", contratoId)
      .eq("competencia", competencia)
      .maybeSingle();

    if (existing) return;

    const { error: insertError } = await supabase.from("pagamentos").insert({
      contrato_id: contratoId,
      competencia,
      valor_base: valorBase,
      data_vencimento: dataVencimento,
      status: "pendente",
    });

    if (insertError) {
      console.error("Erro ao inserir cobrança avulsa:", insertError.message);
      return;
    }

    revalidatePath("/pagamentos");
    revalidatePath("/financeiro");
    revalidatePath("/");
  } catch (err: any) {
    console.error("Exceção em lancarCobranca:", err?.message || err);
  }
}

/**
 * Lança cobranças em lote para todos os contratos ativos na competência selecionada.
 */
export async function lancarCobrancasEmLote(formData: FormData): Promise<void> {
  try {
    const supabase = await createClient();

    const competenciaRaw = String(formData.get("competencia") || "").trim();
    if (!competenciaRaw) return;

    const competencia = competenciaRaw.length === 7 ? `${competenciaRaw}-01` : competenciaRaw;

    const { data: contratos, error: contratosError } = await supabase
      .from("contratos")
      .select("id, valor_aluguel, dia_vencimento, ativo")
      .eq("ativo", true);

    if (contratosError || !contratos || contratos.length === 0) return;

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
      console.error("Erro no upsert em lote:", upsertError.message);
      return;
    }

    revalidatePath("/pagamentos");
    revalidatePath("/financeiro");
    revalidatePath("/");
  } catch (err: any) {
    console.error("Exceção em lancarCobrancasEmLote:", err?.message || err);
  }
}

/**
 * Registra a baixa de entrada do pagamento, grava o recibo individual e atualiza o saldo restante.
 */
export async function registrarPagamento(formData: FormData): Promise<void> {
  try {
    const supabase = await createClient();

    const id = String(formData.get("id") || formData.get("pagamento_id") || "").trim();
    if (!id) return;

    const valorEntrada = parseFloat(String(formData.get("valor_pago") || "0")) || 0;
    if (valorEntrada <= 0) return;

    const valorDesconto = parseFloat(String(formData.get("valor_desconto") || "0")) || 0;
    const valorMultaJuros = parseFloat(String(formData.get("valor_multa_juros") || "0")) || 0;
    const dataPagamento = String(formData.get("data_pagamento") || new Date().toISOString().slice(0, 10)).trim();
    const observacaoNova = String(formData.get("observacoes") || "").trim();

    // Busca o lançamento atual do banco
    const { data: pagamentoAtual, error: fetchError } = await supabase
      .from("pagamentos")
      .select("valor_base, valor_pago, data_vencimento, observacoes")
      .eq("id", id)
      .single();

    if (fetchError || !pagamentoAtual) {
      console.error("Erro ao buscar pagamento para baixa:", fetchError?.message);
      return;
    }

    const valorBase = Number(pagamentoAtual.valor_base || 0);
    const valorJaPagoAnterior = Number(pagamentoAtual.valor_pago || 0);
    const totalPagoEfetivo = valorJaPagoAnterior + valorEntrada;

    const dataFormatada = new Date(dataPagamento + "T00:00:00").toLocaleDateString("pt-BR");
    const registroRecibo = `[Recibo de R$ ${valorEntrada.toFixed(2)} em ${dataFormatada}]${
      observacaoNova ? ` — ${observacaoNova}` : ""
    }`;

    const historicoAtual = pagamentoAtual.observacoes ? `${pagamentoAtual.observacoes}\n` : "";
    const historicoAtualizado = `${historicoAtual}${registroRecibo}`;

    const quitado = (totalPagoEfetivo + valorDesconto) >= (valorBase - 0.01);
    const hoje = new Date().toISOString().slice(0, 10);
    const vencido = pagamentoAtual.data_vencimento < hoje;

    const novoStatus = quitado ? "pago" : (vencido ? "atrasado" : "pendente");

    const { error: updateError } = await supabase
      .from("pagamentos")
      .update({
        valor_pago: totalPagoEfetivo,
        valor_desconto: valorDesconto,
        valor_multa_juros: valorMultaJuros,
        data_pagamento: dataPagamento,
        observacoes: historicoAtualizado,
        status: novoStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      console.error("Erro ao registrar entrada:", updateError.message);
      return;
    }

    revalidatePath("/pagamentos");
    revalidatePath("/recibos");
    revalidatePath("/financeiro");
    revalidatePath("/");
  } catch (err: any) {
    console.error("Exceção em registrarPagamento:", err?.message || err);
  }
}

/**
 * Marca um pagamento como isento.
 */
export async function marcarIsento(formData: FormData): Promise<void> {
  try {
    const supabase = await createClient();
    const id = String(formData.get("id") || "").trim();

    if (!id) return;

    const { error } = await supabase
      .from("pagamentos")
      .update({ status: "isento", valor_pago: 0, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) return;

    revalidatePath("/pagamentos");
    revalidatePath("/financeiro");
  } catch (err: any) {
    console.error("Exceção em marcarIsento:", err?.message || err);
  }
}

/**
 * Atualiza o status de um pagamento.
 */
export async function atualizarStatusPagamento(formData: FormData): Promise<void> {
  try {
    const supabase = await createClient();
    const id = String(formData.get("id") || "").trim();
    const status = String(formData.get("status") || "").trim();

    if (!id || !status) return;

    const { error } = await supabase
      .from("pagamentos")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) return;

    revalidatePath("/pagamentos");
  } catch (err: any) {
    console.error("Exceção em atualizarStatusPagamento:", err?.message || err);
  }
}

/**
 * Exclui um pagamento pendente ou isento.
 */
export async function excluirPagamento(formData: FormData): Promise<void> {
  try {
    const supabase = await createClient();
    const id = String(formData.get("id") || "").trim();

    if (!id) return;

    const { data: pagamento, error: fetchError } = await supabase
      .from("pagamentos")
      .select("status")
      .eq("id", id)
      .single();

    if (fetchError || pagamento?.status === "pago") return;

    const { error } = await supabase.from("pagamentos").delete().eq("id", id);
    if (error) return;

    revalidatePath("/pagamentos");
    revalidatePath("/financeiro");
  } catch (err: any) {
    console.error("Exceção em excluirPagamento:", err?.message || err);
  }
}

/**
 * Atualiza pagamentos pendentes com vencimento ultrapassado para "atrasado".
 */
export async function atualizarAtrasados(): Promise<void> {
  try {
    const supabase = await createClient();
    const hoje = new Date().toISOString().slice(0, 10);

    const { error } = await supabase
      .from("pagamentos")
      .update({ status: "atrasado", updated_at: new Date().toISOString() })
      .eq("status", "pendente")
      .lt("data_vencimento", hoje);

    if (error) return;

    revalidatePath("/pagamentos");
  } catch (err: any) {
    console.error("Exceção em atualizarAtrasados:", err?.message || err);
  }
}