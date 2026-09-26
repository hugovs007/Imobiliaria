"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Convida um novo membro por e-mail (Supabase Auth) e cria o perfil com o papel escolhido.
// Requer a service role key configurada apenas em ambiente de servidor seguro (ver README).
export async function atualizarPapel(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const papel = String(formData.get("papel"));

  const { error } = await supabase.from("profiles").update({ papel }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/equipe");
}

export async function alternarAtivo(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const ativo = formData.get("ativo") === "true";

  const { error } = await supabase.from("profiles").update({ ativo: !ativo }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/equipe");
}
