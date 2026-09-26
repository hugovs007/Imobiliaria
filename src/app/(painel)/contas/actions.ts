"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function criarConta(formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase.from("contas_consumo").insert({
    imovel_id: String(formData.get("imovel_id")),
    tipo: String(formData.get("tipo")),
    competencia: String(formData.get("competencia")) + "-01",
    valor: Number(formData.get("valor")),
    vencimento: String(formData.get("vencimento")),
    responsavel_pagamento: String(formData.get("responsavel_pagamento")),
  });

  if (error) throw new Error(error.message);
  revalidatePath("/contas");
}

export async function marcarContaPaga(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const { error } = await supabase.from("contas_consumo").update({ status: "pago" }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/contas");
}
