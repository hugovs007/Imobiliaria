"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function criarInquilino(formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase.from("inquilinos").insert({
    nome: String(formData.get("nome")),
    cpf_cnpj: String(formData.get("cpf_cnpj") || ""),
    telefone: String(formData.get("telefone") || ""),
    email: String(formData.get("email") || ""),
    observacoes: String(formData.get("observacoes") || ""),
  });

  if (error) throw new Error(error.message);
  revalidatePath("/inquilinos");
}
