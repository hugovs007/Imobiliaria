"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

/**
 * Lança a cobrança mensal para um contrato específico.
 * Cria um registro de pagamento com status "pendente" para a competência informada.
 */
export async function lancarCobranca(formData: FormData) {
  const supabase = await createClient();
  const competenciaRaw = String(formData.get("competencia") || "").trim(); // Esperado YYYY-MM ou YYYY-MM-DD
  const competencia = competenciaRaw.length === 7 ? `${competenciaRaw}-01` : competenciaRaw;
  const contratoId = String(formData.get("contrato_id") || "").trim();
  const valorBase = parseFloat(String(formData.get("valor_devido") || formData.get("valor_base") || "0")) || 0;
  const dataVencimento = String(formData.get("data_vencimento") || "").trim();

  try {
    if (!contratoId || !competencia || !dataVencimento) {
      throw new Error("Preencha todos os campos obrigatórios do lançamento.");
    }

    // Verifica se já existe pagamento para este contrato e competência
    const { data: existing, error: existingError } = await supabase
      .from("pagamentos")
      .select("id")
      .eq("contrato_id", contratoId)
      .eq("competencia", competencia)
      .maybeSingle();

    if (existingError) {
      throw new Error(`Erro ao verificar pagamento existente: ${existingError.message}`);
    }

    if (existing) {
      throw new Error("Pagamento já registrado para este contrato e competência.");
    }

    const { error } = await supabase.from("pagamentos").insert({
      contrato_id: contratoId,
      competencia,
      valor_base: valorBase,
      data_vencimento: dataVencimento,
      status: "pendente",
    });

    if (error) {
      if (error.message.includes("duplicate key") || error.code === "23505") {
        throw new Error("Já existe um pagamento registrado para este contrato e competência.");
      }
      throw new Error(error.message);
    }

    revalidatePath("/pagamentos");
  } catch (err: any) {
    redirect(`/pagamentos?error=${encodeURIComponent(err.message)}`);
  }
}

/**
 * Lança cobranças em lote para todos os contratos ativos de uma competência.
 * Útil para gerar as cobranças mensais de uma só vez.
 */
export async function lancarCobrancasEmLote(formData: FormData) {
  const supabase = await createClient();

  const competenciaRaw = String(formData.get("competencia") || "").trim();
  const competencia = competenciaRaw.length === 7 ? `${competenciaRaw}-01` : competenciaRaw;

  if (!competenciaRaw) {
    throw new Error("Selecione um mês de referência válido.");
  }

  // Busca todos os contratos ativos
  const { data: contratos, error: contratosError } = await supabase
    .from("contratos")
    .select("id, valor_aluguel, dia_vencimento, ativo")
    .eq("ativo", true);

  if (contratosError) {
    throw new Error(`Erro ao buscar contratos: ${contratosError.message}`);
  }

  if (!contratos || contratos.length === 0) {
    throw new Error("Nenhum contrato ativo encontrado para gerar cobranças.");
  }

  const [anoStr, mesStr] = competencia.split("-");
  const ano = parseInt(anoStr, 10);
  const mes = parseInt(mesStr, 10) - 1; // Mês base 0 no JS

  const pagamentosParaInserir = contratos.map((contrato) => {
    const diaVenc = Math.min(Math.max(contrato.dia_vencimento || 10, 1), 31);
    
    // Trata o último dia de meses mais curtos (ex: fevereiro)
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

  // Insere em lote, ignorando duplicatas existentes
  const { error } = await supabase
    .from("pagamentos")
    .upsert(pagamentosParaInserir, { onConflict: "contrato_id,competencia", ignoreDuplicates: true });

  if (error) {
    throw new Error(`Erro ao lançar cobranças em lote: ${error.message}`);
  }

  revalidatePath("/pagamentos");
}

/**
 * Registra o pagamento de uma cobrança (baixa).
 * Atualiza valor_pago, data_pagamento, desconto, multa e status para "pago".
 */
export async function registrarPagamento(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") || formData.get("pagamento_id") || "");
  const valorPago = parseFloat(String(formData.get("valor_pago") || "0")) || 0;
  const valorDesconto = parseFloat(String(formData.get("valor_desconto") || "0")) || 0;
  const valorMultaJuros = parseFloat(String(formData.get("valor_multa_juros") || "0")) || 0;
  const dataPagamento = String(formData.get("data_pagamento") || new Date().toISOString().slice(0, 10));
  const observacoes = String(formData.get("observacoes") || formData.get("forma_pagamento") || "").trim() || null;

  if (!id) {
    throw new Error("ID do pagamento não informado.");
  }

  // Busca o pagamento atual para validar
  const { data: pagamentoData, error: fetchError } = await supabase
    .from("pagamentos")
    .select("valor_base, valor_pago, status")
    .eq("id", id)
    .single();

  if (fetchError) {
    throw new Error(`Erro ao buscar pagamento: ${fetchError.message}`);
  }

  const valorBase = pagamentoData?.valor_base ?? 0;
  const valorJaPago = pagamentoData?.valor_pago ?? 0;
  const totalPagoEfetivo = valorJaPago + valorPago;

  const novoStatus = (totalPagoEfetivo + valorDesconto) >= (valorBase - 0.01) ? "pago" : "pendente";

  const { error } = await supabase
    .from("pagamentos")
    .update({
      valor_pago: totalPagoEfetivo,
      valor_desconto: valorDesconto,
      valor_multa_juros: valorMultaJuros,
      data_pagamento: dataPagamento,
      observacoes: observacoes,
      status: novoStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/pagamentos");
  revalidatePath("/financeiro");
}

/**
 * Marca um pagamento como isento.
 */
export async function marcarIsento(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id"));

  const { error } = await supabase
    .from("pagamentos")
    .update({ status: "isento", valor_pago: 0, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/pagamentos");
}

/**
 * Atualiza o status de um pagamento (pendente, pago, atrasado, isento).
 */
export async function atualizarStatusPagamento(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const status = String(formData.get("status"));

  const { error } = await supabase
    .from("pagamentos")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/pagamentos");
}

/**
 * Exclui um pagamento (apenas se estiver pendente ou isento).
 */
export async function excluirPagamento(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id"));

  const { data: pagamento, error: fetchError } = await supabase
    .from("pagamentos")
    .select("status")
    .eq("id", id)
    .single();

  if (fetchError) throw new Error(fetchError.message);

  if (pagamento.status === "pago") {
    throw new Error("Não é possível excluir um pagamento já quitado.");
  }

  const { error } = await supabase.from("pagamentos").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/pagamentos");
}

/**
 * Atualiza atrasados: marca como "atrasado" pagamentos pendentes com data_vencimento < hoje.
 */
export async function atualizarAtrasados() {
  const supabase = await createClient();
  const hoje = new Date().toISOString().slice(0, 10);

  const { error } = await supabase
    .from("pagamentos")
    .update({ status: "atrasado", updated_at: new Date().toISOString() })
    .eq("status", "pendente")
    .lt("data_vencimento", hoje);

  if (error) throw new Error(error.message);

  revalidatePath("/pagamentos");
}