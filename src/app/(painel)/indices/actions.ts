"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ActionState = {
  success?: boolean;
  error?: string | null;
};

export async function cadastrarIndice(_prevState: ActionState | null, formData: FormData): Promise<ActionState> {
  try {
    const supabase = await createClient();

    const rawIndice = String(formData.get("indice") || "IGP-M").toUpperCase();
    let indice: "IGP-M" | "IPCA" | "Outro" = "IGP-M";
    if (rawIndice.includes("IPCA")) indice = "IPCA";
    else if (rawIndice.includes("OUTRO")) indice = "Outro";

    const mesReferenciaRaw = String(formData.get("mes_referencia") || formData.get("competencia") || "").trim();
    if (!mesReferenciaRaw || !/^\d{4}-\d{2}$/.test(mesReferenciaRaw)) {
      return { success: false, error: "Informe um mês de referência válido no formato YYYY-MM." };
    }

    const variacaoRaw = String(formData.get("variacao_12m") || formData.get("valor_percentual") || "").replace(",", ".");
    const variacao_12m = parseFloat(variacaoRaw);

    if (isNaN(variacao_12m)) {
      return { success: false, error: "Informe um percentual de variação acumulada válido." };
    }

    const fonte = String(formData.get("fonte") || "Banco Central / FGV / IBGE").trim() || "Banco Central / FGV / IBGE";

    const payload = {
      indice,
      mes_referencia: mesReferenciaRaw,
      variacao_12m,
      fonte,
    };

    const { error } = await supabase.from("indices_economicos").upsert([payload], {
      onConflict: "indice,mes_referencia",
    });

    if (error) {
      console.error("Erro do Supabase ao cadastrar índice:", error);
      return { success: false, error: `Erro no Supabase (${error.code}): ${error.message}` };
    }

    revalidatePath("/indices");
    revalidatePath("/contratos");

    return { success: true, error: null };
  } catch (err: any) {
    console.error("Exceção capturada em cadastrarIndice:", err?.message || err);
    return { success: false, error: err?.message || "Ocorreu um erro interno ao cadastrar o índice." };
  }
}

export async function excluirIndice(formData: FormData): Promise<void> {
  try {
    const supabase = await createClient();
    const id = String(formData.get("id") || "");

    if (!id) return;

    const { error } = await supabase.from("indices_economicos").delete().eq("id", id);
    if (error) {
      console.error("Erro ao excluir índice:", error.message);
      return;
    }

    revalidatePath("/indices");
  } catch (err: any) {
    console.error("Exceção ao excluir índice:", err?.message || err);
  }
}