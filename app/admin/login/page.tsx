import { LoginForm } from "@/components/admin/LoginForm";

export default function AdminLoginPage() {
  return (
    <main className="wrap admin" style={{ maxWidth: 420 }}>
      <h1>Ingresar</h1>
      <p className="hint">Acceso solo para administración.</p>
      <LoginForm />
    </main>
  );
}
