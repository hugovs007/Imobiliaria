import { entrar } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1
          className="mb-1 text-3xl font-semibold"
          style={{ fontFamily: "var(--font-serif)", color: "var(--color-ink)" }}
        >
          Gestão de Aluguéis
        </h1>
        <p className="mb-8 text-sm" style={{ color: "var(--color-ink-soft)" }}>
          Acesso restrito à equipe.
        </p>

        <form action={entrar} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span style={{ color: "var(--color-ink-soft)" }}>E-mail</span>
            <input
              name="email"
              type="email"
              required
              className="rounded-sm border px-3 py-2"
              style={{ borderColor: "var(--color-line)" }}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span style={{ color: "var(--color-ink-soft)" }}>Senha</span>
            <input
              name="senha"
              type="password"
              required
              className="rounded-sm border px-3 py-2"
              style={{ borderColor: "var(--color-line)" }}
            />
          </label>

          {erro && (
            <p className="text-sm" style={{ color: "var(--color-alert)" }}>
              {erro}
            </p>
          )}

          <button
            type="submit"
            className="mt-2 rounded-sm px-4 py-2 text-sm font-medium"
            style={{ background: "var(--color-teal)", color: "var(--color-paper)" }}
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}
