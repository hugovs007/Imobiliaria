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
  const competencia = String(formData.get("competencia")) + "-01";
  const contratoId = String(formData.get("contrato_id"));
  const valorDevido = Number(formData.get("valor_devido"));
  const dataVencimento = String(formData.get("data_vencimento"));
  try {
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
      valor_devido: valorDevido,
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
    // Redirect back with error message
    redirect(`/pagamentos?error=${encodeURIComponent(err.message)}`);
  }
}

/**
 * Lança cobranças em lote para todos os contratos ativos de uma competência.
 * Útil para gerar as cobranças mensais de uma só vez.
 */
export async function lancarCobrancasEmLote(formData: FormData) {
  const supabase = await createClient();

  const competencia = String(formData.get("competencia")) + "-01";
  const diaVencimento = Number(formData.get("dia_vencimento")) || 10;

  // Busca todos os contratos ativos/renovados que não têm sucessor
  const { data: contratos, error: contratosError } = await supabase
    .from("contratos")
    .select("id, valor_aluguel_atual, dia_vencimento, data_inicio, data_fim, status, contrato_anterior_id")
    .in("status", ["ativo", "renovado"]);

  if (contratosError) {
    throw new Error(`Erro ao buscar contratos: ${contratosError.message}`);
  }

  // Filtra contratos vigentes (sem sucessor)
  const contratosComSucessor = new Set(
    (contratos ?? []).flatMap((c) => c.contrato_anterior_id ? [c.contrato_anterior_id] : [])
  );
  const contratosVigentes = (contratos ?? []).filter(
    (c) => ["ativo", "renovado"].includes(c.status) && !contratosComSucessor.has(c.id)
  );

  if (contratosVigentes.length === 0) {
    throw new Error("Nenhum contrato vigente encontrado para gerar cobranças.");
  }

  // Calcula a data de vencimento para cada contrato
  const competenciaDate = new Date(competencia);
  const ano = competenciaDate.getFullYear();
  const mes = competenciaDate.getMonth();

  const pagamentosParaInserir = contratosVigentes.map((contrato) => {
    const vencimento = new Date(ano, mes, contrato.dia_vencimento);
    // Se o dia não existe no mês (ex: 31 em fevereiro), usa o último dia do mês
    if (vencimento.getMonth() !== mes) {
      vencimento.setDate(0); // último dia do mês anterior
    }

    return {
      contrato_id: contrato.id,
      competencia,
      valor_devido: contrato.valor_aluguel_atual,
      data_vencimento: vencimento.toISOString().split("T")[0],
      status: "pendente" as const,
    };
  });

  // Insere em lote, ignorando duplicatas
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
 * Atualiza valor_pago, data_pagamento, forma_pagamento e status para "pago".
 */
export async function registrarPagamento(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const valorPago = Number(formData.get("valor_pago"));
  const dataPagamento = String(formData.get("data_pagamento"));
  const formaPagamento = String(formData.get("forma_pagamento") || "");

  // Busca o pagamento atual para validar
  const { data: pagamentoData, error: fetchError } = await supabase
    .from("pagamentos")
    .select("valor_devido, valor_pago, status")
    .eq("id", id)
    .single();

  if (fetchError) {
    throw new Error(`Erro ao buscar pagamento: ${fetchError.message}`);
  }

  const valorDevido = pagamentoData?.valor_devido ?? 0;
  const valorJaPago = pagamentoData?.valor_pago ?? 0;
  const totalPago = valorJaPago + valorPago;

  if (totalPago > valorDevido + 0.01) {
    throw new Error(`Valor excede o devido. Devido: ${valorDevido.toFixed(2)}, Já pago: ${valorJaPago.toFixed(2)}, Tentativa: ${valorPago.toFixed(2)}`);
  }

  const novoStatus = totalPago >= valorDevido - 0.01 ? "pago" : "pendente";

  const { error } = await supabase
    .from("pagamentos")
    .update({
      valor_pago: totalPago,
      data_pagamento: dataPagamento,
      forma_pagamento: formaPagamento,
      status: novoStatus,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/pagamentos");
}

/**
 * Marca um pagamento como isento.
 */
export async function marcarIsento(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id"));

  const { error } = await supabase
    .from("pagamentos")
    .update({ status: "isento", valor_pago: 0 })
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
    .update({ status })
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
  const hoje = new Date().toISOString().split("T")[0];

  const { error } = await supabase
    .from("pagamentos")
    .update({ status: "atrasado" })
    .eq("status", "pendente")
    .lt("data_vencimento", hoje);

  if (error) throw new Error(error.message);

  revalidatePath("/pagamentos");
}