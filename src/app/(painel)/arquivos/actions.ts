"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function registrarArquivo(formData: FormData) {
  const supabase = await createClient();

  const entidade_tipo = String(formData.get("entidade_tipo"));
  const entidade_id = String(formData.get("entidade_id"));
  const tipo_arquivo = String(formData.get("tipo_arquivo") || "");
  const nome = String(formData.get("nome") || "");
  const path_ou_url = String(formData.get("path_ou_url") || "");
  const tamanho_bytes = Number(formData.get("tamanho_bytes"));

  if (!entidade_tipo || !entidade_id || !nome || !path_ou_url || !Number.isFinite(tamanho_bytes)) {
    throw new Error("Dados do arquivo inválidos.");
  }

  const { error } = await supabase.from("arquivos").insert({
    entidade_tipo,
    entidade_id,
    nome,
    tipo_arquivo,
    path_ou_url,
    tamanho_bytes,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/arquivos");
}
