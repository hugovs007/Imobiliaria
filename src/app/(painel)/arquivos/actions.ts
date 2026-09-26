"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const LIMITE_SUPABASE_BYTES = 45 * 1024 * 1024; // deixa margem no free tier (50MB por arquivo)

export async function enviarArquivo(formData: FormData) {
  const supabase = await createClient();

  const file = formData.get("arquivo") as File;
  const entidade_tipo = String(formData.get("entidade_tipo"));
  const entidade_id = String(formData.get("entidade_id"));
  const tipo_arquivo = String(formData.get("tipo_arquivo") || "");

  if (!file || file.size === 0) throw new Error("Selecione um arquivo.");

  let storage_provider: "supabase" | "google_drive" = "supabase";
  let path_ou_url: string;

  if (file.size <= LIMITE_SUPABASE_BYTES) {
    const path = `${entidade_tipo}/${entidade_id}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from("arquivos").upload(path, file);
    if (uploadError) throw new Error(uploadError.message);
    path_ou_url = path;
  } else {
    // Acima do limite do bucket do Supabase: envia para o Google Drive
    // (pasta organizada por entidade/contrato). Ver README para configurar
    // as credenciais da conta de serviço do Google Drive.
    const { enviarParaGoogleDrive } = await import("@/lib/google-drive");
    path_ou_url = await enviarParaGoogleDrive(file, `${entidade_tipo}/${entidade_id}`);
    storage_provider = "google_drive";
  }

  const { error } = await supabase.from("arquivos").insert({
    entidade_tipo,
    entidade_id,
    nome: file.name,
    tipo_arquivo,
    storage_provider,
    path_ou_url,
    tamanho_bytes: file.size,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/arquivos");
}
