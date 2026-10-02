import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { entity, id, data } = await request.json();

    if (!entity || !id || !data) {
      return NextResponse.json({ error: "Dados incompletos para atualização." }, { status: 400 });
    }

    let payload: Record<string, any> = { ...data };

    // Tratamento específico para a entidade 'imoveis'
    if (entity === "imoveis") {
      payload = {
        codigo: data.codigo || data.codigo_interno || null,
        proprietario_id: data.proprietario_id && data.proprietario_id.trim() !== "" ? data.proprietario_id : null,
        tipo: data.tipo || "Residencial",
        finalidade: data.finalidade || "Residencial",
        status: data.status || "Disponível",
        cep: data.cep || null,
        logradouro: data.logradouro || data.endereco || null,
        numero: data.numero || null,
        complemento: data.complemento || null,
        bairro: data.bairro || null,
        cidade: data.cidade || null,
        uf: data.uf || data.estado || null,
        area_total: data.area_total ? parseFloat(data.area_total) : null,
        area_util: data.area_util ? parseFloat(data.area_util) : null,
        valor_aluguel: parseFloat(data.valor_aluguel || data.valor_aluguel_base || "0") || 0,
        valor_condominio: data.valor_condominio ? parseFloat(data.valor_condominio) : 0,
        iptu_mensal: data.iptu_mensal ? parseFloat(data.iptu_mensal) : 0,
        matricula: data.matricula || null,
        observacoes: data.observacoes || null,
      };
    }

    const { error } = await supabase.from(entity).update(payload).eq("id", id);

    if (error) {
      console.error(`Erro ao atualizar ${entity}:`, error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Exceção na API de update:", err);
    return NextResponse.json({ error: err?.message || "Erro interno ao atualizar registro." }, { status: 500 });
  }
}