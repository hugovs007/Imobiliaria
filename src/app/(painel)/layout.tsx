import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { sair } from "./actions";

const nav = [
  { href: "/", label: "Painel" },
  { href: "/imoveis", label: "Imóveis" },
  { href: "/proprietarios", label: "Proprietários" },
  { href: "/inquilinos", label: "Inquilinos" },
  { href: "/contratos", label: "Contratos" },
  { href: "/pagamentos", label: "Pagamentos" },
  { href: "/manutencoes", label: "Manutenções" },
  { href: "/contas", label: "Contas (água/energia)" },
  { href: "/arquivos", label: "Arquivos" },
  { href: "/indices", label: "Índices (IGP-M/IPCA)" },
  { href: "/equipe", label: "Equipe" },
];

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let nome = user?.email ?? "";
  let papel = "";
  if (user) {
    const { data: perfil } = await supabase
      .from("profiles")
      .select("nome, papel")
      .eq("id", user.id)
      .maybeSingle();
    if (perfil) {
      nome = perfil.nome;
      papel = perfil.papel;
    }
  }

  return (
    <div className="flex min-h-screen">
      <aside
        className="hidden w-60 shrink-0 flex-col border-r px-4 py-6 sm:flex"
        style={{ borderColor: "var(--color-line)", background: "var(--color-paper-dim)" }}
      >
        <div
          className="mb-8 px-2 text-lg font-semibold"
          style={{ fontFamily: "var(--font-serif)", color: "var(--color-ink)" }}
        >
          Gestão de Aluguéis
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-sm px-2 py-2 text-sm hover:bg-black/5"
              style={{ color: "var(--color-ink-soft)" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t pt-4 text-xs" style={{ borderColor: "var(--color-line)" }}>
          <div style={{ color: "var(--color-ink)" }}>{nome}</div>
          {papel && <div style={{ color: "var(--color-ink-soft)" }}>{papel}</div>}
          <form action={sair} className="mt-2">
            <button className="text-xs underline" style={{ color: "var(--color-ink-soft)" }}>
              Sair
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 px-6 py-8 sm:px-10">{children}</main>
    </div>
  );
}
