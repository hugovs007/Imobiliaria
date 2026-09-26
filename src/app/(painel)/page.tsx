import { createClient } from "@/lib/supabase/server";
import { Card, PageHeader } from "@/components/ui";

export default async function DashboardPage() {
  const supabase = await createClient();

  const [imoveis, contratosAtivos, pagamentosAtrasados, manutencoesAbertas, reajustesPendentes] =
    await Promise.all([
      supabase.from("imoveis").select("*", { count: "exact", head: true }),
      supabase
        .from("contratos")
        .select("*", { count: "exact", head: true })
        .eq("status", "ativo"),
      supabase
        .from("pagamentos")
        .select("*", { count: "exact", head: true })
        .eq("status", "atrasado"),
      supabase
        .from("manutencoes")
        .select("*", { count: "exact", head: true })
        .in("status", ["aberta", "em_andamento"]),
      supabase
        .from("reajustes")
        .select("*", { count: "exact", head: true })
        .eq("status", "pendente"),
    ]);

  const cards = [
    { label: "Imóveis cadastrados", value: imoveis.count ?? 0 },
    { label: "Contratos ativos", value: contratosAtivos.count ?? 0 },
    { label: "Pagamentos em atraso", value: pagamentosAtrasados.count ?? 0, alert: true },
    { label: "Manutenções em aberto", value: manutencoesAbertas.count ?? 0 },
    { label: "Reajustes pendentes", value: reajustesPendentes.count ?? 0 },
  ];

  return (
    <div>
      <PageHeader
        title="Painel geral"
        subtitle="Visão consolidada da carteira de imóveis e contratos."
      />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((c) => (
          <Card key={c.label}>
            <div
              className="text-3xl font-semibold"
              style={{
                fontFamily: "var(--font-serif)",
                color: c.alert && c.value > 0 ? "var(--color-alert)" : "var(--color-ink)",
              }}
            >
              {c.value}
            </div>
            <div className="mt-1 text-sm" style={{ color: "var(--color-ink-soft)" }}>
              {c.label}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
