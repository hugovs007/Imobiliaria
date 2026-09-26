"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function criarManutencao(formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase.from("manutencoes").insert({
    imovel_id: String(formData.get("imovel_id")),
    tipo: String(formData.get("tipo")),
    descricao: String(formData.get("descricao")),
    custo: Number(formData.get("custo")) || null,
    responsavel: String(formData.get("responsavel") || ""),
    data_solicitacao: String(formData.get("data_solicitacao")),
  });

  if (error) throw new Error(error.message);
  revalidatePath("/manutencoes");
}

export async function atualizarStatusManutencao(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const status = String(formData.get("status"));

  const update: Record<string, unknown> = { status };
  if (status === "concluida") update.data_conclusao = new Date().toISOString().slice(0, 10);

  const { error } = await supabase.from("manutencoes").update(update).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/manutencoes");
}
