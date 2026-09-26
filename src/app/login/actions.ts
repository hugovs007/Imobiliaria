"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function entrar(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const senha = String(formData.get("senha") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });

  if (error) {
    redirect(`/login?erro=${encodeURIComponent(error.message)}`);
  }

  redirect("/");
}
