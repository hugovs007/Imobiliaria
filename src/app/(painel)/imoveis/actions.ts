"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function criarImovel(formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase.from("imoveis").insert({
    proprietario_id: String(formData.get("proprietario_id") || "") || null,
    codigo: String(formData.get("codigo") || "") || null,
    tipo: String(formData.get("tipo")),
    finalidade: String(formData.get("finalidade") || ""),
    status: String(formData.get("status") || "disponivel"),
    endereco: String(formData.get("endereco")),
    numero: String(formData.get("numero") || ""),
    complemento: String(formData.get("complemento") || ""),
    bairro: String(formData.get("bairro") || ""),
    cidade: String(formData.get("cidade")),
    estado: String(formData.get("estado")),
    cep: String(formData.get("cep") || ""),
    quartos: Number(formData.get("quartos")) || null,
    banheiros: Number(formData.get("banheiros")) || null,
    garagem: Number(formData.get("garagem")) || null,
    area_util: Number(formData.get("area_util")) || null,
    valor_venda: Number(formData.get("valor_venda")) || null,
    valor_aluguel: Number(formData.get("valor_aluguel")) || null,
    valor_iptu: Number(formData.get("valor_iptu")) || null,
    propriedade: String(formData.get("propriedade") || ""),
    observacoes: String(formData.get("observacoes") || ""),
  });

  if (error) throw new Error(error.message);
  revalidatePath("/imoveis");
}
