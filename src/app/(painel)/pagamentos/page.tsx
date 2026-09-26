import { createClient } from "@/lib/supabase/server";
import { Button, Card, Field, Money, PageHeader, Select, StatusBadge, Table } from "@/components/ui";
import { RecordEditor } from "@/components/record-editor";
import { lancarPagamento, registrarPagamento } from "./actions";

export default async function PagamentosPage() {
  const supabase = await createClient();

  const [{ data: pagamentos }, { data: contratos }] = await Promise.all([
    supabase
      .from("pagamentos")
      .select(
        "id, competencia, valor_devido, valor_pago, data_vencimento, data_pagamento, forma_pagamento, status, contratos(imoveis(endereco), inquilinos(nome))"
      )
      .order("competencia", { ascending: false }),
    supabase
      .from("contratos")
      .select("id, valor_aluguel_atual, imoveis(endereco), inquilinos(nome)")
      .eq("status", "ativo"),
  ]);

  return (
    <div>
      <PageHeader title="Pagamentos e recibos" subtitle="Lançamento mensal de aluguéis e baixa de pagamentos." />

      <Card>
        <form action={lancarPagamento} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Contrato"
            name="contrato_id"
            required
            options={(contratos ?? []).map((c) => ({
              value: c.id,
              label: `${(c.imoveis as unknown as { endereco: string })?.endereco} — ${(c.inquilinos as unknown as { nome: string })?.nome}`,
            }))}
          />
          <Field label="Competência (mês)" name="competencia" type="month" required />
          <Field label="Valor devido (R$)" name="valor_devido" type="number" step="0.01" required />
          <Field label="Data de vencimento" name="data_vencimento" type="date" required />
          <div className="sm:col-span-2">
            <Button>Lançar cobrança do mês</Button>
          </div>
        </form>
      </Card>

      <div className="mt-8">
        <Table head={["Competência", "Imóvel", "Inquilino", "Valor devido", "Vencimento", "Status", "Baixa"]}>
          {(pagamentos ?? []).map((p) => (
            <tr key={p.id} style={{ borderTop: "1px solid var(--color-line)" }}>
              <td className="px-4 py-2.5">
                {new Date(p.competencia).toLocaleDateString("pt-BR", { month: "2-digit", year: "numeric" })}
              </td>
              <td className="px-4 py-2.5">
                {(p.contratos as unknown as { imoveis: { endereco: string } })?.imoveis?.endereco}
              </td>
              <td className="px-4 py-2.5">
                {(p.contratos as unknown as { inquilinos: { nome: string } })?.inquilinos?.nome}
              </td>
              <td className="px-4 py-2.5">
                <Money value={p.valor_devido} />
              </td>
              <td className="px-4 py-2.5">{new Date(p.data_vencimento).toLocaleDateString("pt-BR")}</td>
              <td className="px-4 py-2.5">
                <StatusBadge status={p.status} />
              </td>
              <td className="px-4 py-2.5">
                {p.status !== "pago" && (
                  <form action={registrarPagamento} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="id" value={p.id} />
                    <input
                      name="valor_pago"
                      type="number"
                      step="0.01"
                      placeholder="Valor pago"
                      required
                      className="w-28 rounded-sm border px-2 py-1 text-xs"
                      style={{ borderColor: "var(--color-line)" }}
                    />
                    <input
                      name="data_pagamento"
                      type="date"
                      required
                      className="rounded-sm border px-2 py-1 text-xs"
                      style={{ borderColor: "var(--color-line)" }}
                    />
                    <input
                      name="forma_pagamento"
                      placeholder="Forma"
                      className="w-24 rounded-sm border px-2 py-1 text-xs"
                      style={{ borderColor: "var(--color-line)" }}
                    />
                    <Button variant="ghost">Confirmar</Button>
                  </form>
                )}
                <RecordEditor
                  entity="pagamentos"
                  id={p.id}
                  fields={[
                    { name: "competencia", label: "Competência", value: p.competencia.slice(0, 7), type: "month", required: true },
                    { name: "valor_devido", label: "Valor devido (R$)", value: p.valor_devido, type: "number", step: "0.01", required: true },
                    { name: "valor_pago", label: "Valor pago (R$)", value: p.valor_pago, type: "number", step: "0.01" },
                    { name: "data_vencimento", label: "Vencimento", value: p.data_vencimento, type: "date", required: true },
                    { name: "data_pagamento", label: "Data do pagamento", value: p.data_pagamento, type: "date" },
                    { name: "forma_pagamento", label: "Forma de pagamento", value: p.forma_pagamento },
                    {
                      name: "status",
                      label: "Status",
                      kind: "select",
                      value: p.status,
                      options: [{ value: "pendente", label: "Pendente" }, { value: "pago", label: "Pago" }, { value: "atrasado", label: "Atrasado" }, { value: "isento", label: "Isento" }],
                    },
                  ]}
                />
              </td>
            </tr>
          ))}
        </Table>
      </div>
    </div>
  );
}
