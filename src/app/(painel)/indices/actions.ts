"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function cadastrarIndice(formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase.from("indices_economicos").upsert(
    {
      indice: String(formData.get("indice")),
      competencia: String(formData.get("competencia")) + "-01",
      valor_percentual: Number(formData.get("valor_percentual")),
    },
    { onConflict: "indice,competencia" }
  );

  if (error) throw new Error(error.message);
  revalidatePath("/indices");
}
