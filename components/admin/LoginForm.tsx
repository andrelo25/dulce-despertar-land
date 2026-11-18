"use client";

import { useActionState } from "react";
import { login, type LoginResult } from "@/lib/actions/auth";

export function LoginForm() {
  const [state, formAction, isPending] = useActionState<LoginResult, FormData>(login, null);

  return (
    <form action={formAction} noValidate>
      <div className="field">
        <label htmlFor="email">Correo</label>
        <input id="email" name="email" type="email" autoComplete="username" required />
      </div>
      <div className="field">
        <label htmlFor="password">Clave</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      {state?.error && (
        <p role="alert" className="hint" style={{ color: "var(--accent-dark)" }}>
          {state.error}
        </p>
      )}
      <button type="submit" className="btn btn-primary full" disabled={isPending}>
        {isPending ? "Ingresando…" : "Ingresar"}
      </button>
    </form>
  );
}
