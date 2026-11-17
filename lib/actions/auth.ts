"use server";

import { redirect } from "next/navigation";
import { createClient } from "../supabase/server";

export type LoginResult = { error: string } | null;

const INVALID: LoginResult = { error: "Credenciales inválidas" };

export async function login(_prev: LoginResult, formData: FormData): Promise<LoginResult> {
  const email = formData.get("email");
  const password = formData.get("password");
  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    !email.trim() ||
    !password ||
    email.length > 254 ||
    password.length > 200
  ) {
    return INVALID;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error || data.user?.app_metadata?.role !== "admin") {
    // Un usuario válido pero sin rol admin no conserva sesión.
    if (!error) await supabase.auth.signOut();
    return INVALID;
  }

  redirect("/admin");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
