"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function criarImovel(formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase.from("imoveis").insert({
    proprietario_id: String(formData.get("proprietario_id") || "") || null,
    codigo: String(formData.get("codigo") || "") || null,
    tipo: String(formData.get("tipo")),
    finalidade: String(formData.get("finalidade") || "residencial"),
    status: String(formData.get("status") || "disponivel"),
    cep: String(formData.get("cep") || ""),
    logradouro: String(formData.get("logradouro")),
    numero: String(formData.get("numero") || ""),
    complemento: String(formData.get("complemento") || ""),
    bairro: String(formData.get("bairro") || ""),
    cidade: String(formData.get("cidade")),
    uf: String(formData.get("uf")),
    area_total: Number(formData.get("area_total")) || null,
    area_util: Number(formData.get("area_util")) || null,
    valor_aluguel: Number(formData.get("valor_aluguel")) || 0,
    valor_condominio: Number(formData.get("valor_condominio")) || 0,
    iptu_mensal: Number(formData.get("iptu_mensal")) || 0,
    matricula: String(formData.get("matricula") || ""),
    observacoes: String(formData.get("observacoes") || ""),
  });

  if (error) throw new Error(error.message);
  revalidatePath("/imoveis");
}
