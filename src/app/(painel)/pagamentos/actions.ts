"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function lancarPagamento(formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase.from("pagamentos").insert({
    contrato_id: String(formData.get("contrato_id")),
    competencia: String(formData.get("competencia")) + "-01",
    valor_devido: Number(formData.get("valor_devido")),
    data_vencimento: String(formData.get("data_vencimento")),
    status: "pendente",
  });

  if (error) throw new Error(error.message);
  revalidatePath("/pagamentos");
}

export async function registrarPagamento(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id"));

  const { error } = await supabase
    .from("pagamentos")
    .update({
      valor_pago: Number(formData.get("valor_pago")),
      data_pagamento: String(formData.get("data_pagamento")),
      forma_pagamento: String(formData.get("forma_pagamento") || ""),
      status: "pago",
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/pagamentos");
}
