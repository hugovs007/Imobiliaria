"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function criarImovel(formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase.from("imoveis").insert({
    proprietario_id: String(formData.get("proprietario_id") || "") || null,
    codigo: String(formData.get("codigo") || "") || null,
    endereco: String(formData.get("endereco")),
    numero: String(formData.get("numero") || ""),
    complemento: String(formData.get("complemento") || ""),
    bairro: String(formData.get("bairro") || ""),
    cidade: String(formData.get("cidade")),
    estado: String(formData.get("estado")),
    cep: String(formData.get("cep") || ""),
    tipo: String(formData.get("tipo")),
    quartos: Number(formData.get("quartos")) || null,
    area_m2: Number(formData.get("area_m2")) || null,
    valor_aluguel_base: Number(formData.get("valor_aluguel_base")),
    status: String(formData.get("status")),
    observacoes: String(formData.get("observacoes") || ""),
  });

  if (error) throw new Error(error.message);
  revalidatePath("/imoveis");
}
