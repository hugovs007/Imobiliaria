"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function lancarPagamento(formData: FormData) {
  const supabase = await createClient();

  // Check if a payment for this contract and month already exists
  const competencia = String(formData.get("competencia")) + "-01";
  const contratoId = String(formData.get("contrato_id"));
  const { data: existing } = await supabase
    .from("pagamentos")
    .select("id")
    .eq("contrato_id", contratoId)
    .eq("competencia", competencia)
    .maybeSingle();
  if (existing) {
    throw new Error("Pagamento já registrado para este contrato e competência.");
  }
  try {
    const { error } = await supabase.from("pagamentos").insert({
      contrato_id: contratoId,
      competencia,
      valor_devido: Number(formData.get("valor_devido")),
      data_vencimento: String(formData.get("data_vencimento")),
      status: "pendente",
    });
    if (error) {
      if (error.message.includes("duplicate key")) {
        throw new Error("Já existe um pagamento registrado para este contrato e competência.");
      }
      throw new Error(error.message);
    }
  } catch (err: any) {
    throw new Error(err.message || "Erro ao lançar pagamento.");
  }
  revalidatePath("/pagamentos");
}

export async function registrarPagamento(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id"));

  // Fetch current pagamento to validate full payment
  const { data: pagamentoData } = await supabase
    .from("pagamentos")
    .select("valor_devido, valor_pago")
    .eq("id", id)
    .single();
  const valorDevido = pagamentoData?.valor_devido ?? 0;
  const valorPago = Number(formData.get("valor_pago"));
  if (valorPago < valorDevido) {
    throw new Error("Pagamento parcial não permitido. Complete o valor devido antes de avançar para a próxima parcela.");
  }
  const { error } = await supabase
    .from("pagamentos")
    .update({
      valor_pago: valorPago,
      data_pagamento: String(formData.get("data_pagamento")),
      forma_pagamento: String(formData.get("forma_pagamento") || ""),
      status: "pago",
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/pagamentos");
}
