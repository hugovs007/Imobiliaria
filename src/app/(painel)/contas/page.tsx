import { createClient } from "@/lib/supabase/server";
import { Button, Card, Field, Money, PageHeader, Select, StatusBadge, Table } from "@/components/ui";
import { RecordEditor } from "@/components/record-editor";
import { criarConta, marcarContaPaga } from "./actions";

export default async function ContasPage() {
  const supabase = await createClient();

  const [{ data: contas }, { data: imoveis }] = await Promise.all([
    supabase
      .from("contas_consumo")
      .select("id, imovel_id, tipo, competencia, valor, vencimento, status, responsavel_pagamento, imoveis(endereco)")
      .order("vencimento", { ascending: false }),
    supabase.from("imoveis").select("id, codigo, endereco").order("endereco"),
  ]);

  return (
    <div>
      <PageHeader title="Contas de água e energia" subtitle="Controle de consumo por imóvel." />

      <Card>
        <form action={criarConta} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Imóvel"
            name="imovel_id"
            required
            options={(imoveis ?? []).map((i) => ({ value: i.id, label: `${i.codigo ?? ""} ${i.endereco}`.trim() }))}
          />
          <Select
            label="Tipo"
            name="tipo"
            defaultValue="agua"
            options={[
              { value: "agua", label: "Água" },
              { value: "energia", label: "Energia" },
              { value: "outra", label: "Outra" },
            ]}
          />
          <Field label="Competência (mês)" name="competencia" type="month" required />
          <Field label="Valor (R$)" name="valor" type="number" step="0.01" required />
          <Field label="Vencimento" name="vencimento" type="date" required />
          <Select
            label="Responsável pelo pagamento"
            name="responsavel_pagamento"
            defaultValue="inquilino"
            options={[
              { value: "inquilino", label: "Inquilino" },
              { value: "proprietario", label: "Proprietário" },
            ]}
          />
          <div className="sm:col-span-2">
            <Button>Registrar conta</Button>
          </div>
        </form>
      </Card>

      <div className="mt-8">
        <Table head={["Imóvel", "Tipo", "Competência", "Valor", "Vencimento", "Responsável", "Status", ""]}>
          {(contas ?? []).map((c) => (
            <tr key={c.id} style={{ borderTop: "1px solid var(--color-line)" }}>
              <td className="px-4 py-2.5">{(c.imoveis as unknown as { endereco: string })?.endereco}</td>
              <td className="px-4 py-2.5 capitalize">{c.tipo}</td>
              <td className="px-4 py-2.5">
                {new Date(c.competencia).toLocaleDateString("pt-BR", { month: "2-digit", year: "numeric" })}
              </td>
              <td className="px-4 py-2.5">
                <Money value={c.valor} />
              </td>
              <td className="px-4 py-2.5">{new Date(c.vencimento).toLocaleDateString("pt-BR")}</td>
              <td className="px-4 py-2.5 capitalize">{c.responsavel_pagamento}</td>
              <td className="px-4 py-2.5">
                <StatusBadge status={c.status} />
              </td>
              <td className="px-4 py-2.5">
                {c.status !== "pago" && (
                  <form action={marcarContaPaga}>
                    <input type="hidden" name="id" value={c.id} />
                    <Button variant="ghost">Marcar paga</Button>
                  </form>
                )}
                <RecordEditor
                  entity="contas_consumo"
                  id={c.id}
                  fields={[
                    {
                      name: "imovel_id",
                      label: "Imóvel",
                      kind: "select",
                      value: c.imovel_id,
                      options: (imoveis ?? []).map((i) => ({ value: i.id, label: `${i.codigo ?? ""} ${i.endereco}`.trim() })),
                    },
                    {
                      name: "tipo",
                      label: "Tipo",
                      kind: "select",
                      value: c.tipo,
                      options: [{ value: "agua", label: "Água" }, { value: "energia", label: "Energia" }, { value: "outra", label: "Outra" }],
                    },
                    { name: "competencia", label: "Competência", value: c.competencia.slice(0, 7), type: "month", required: true },
                    { name: "valor", label: "Valor (R$)", value: c.valor, type: "number", step: "0.01", required: true },
                    { name: "vencimento", label: "Vencimento", value: c.vencimento, type: "date", required: true },
                    {
                      name: "responsavel_pagamento",
                      label: "Responsável",
                      kind: "select",
                      value: c.responsavel_pagamento,
                      options: [{ value: "inquilino", label: "Inquilino" }, { value: "proprietario", label: "Proprietário" }],
                    },
                    {
                      name: "status",
                      label: "Status",
                      kind: "select",
                      value: c.status,
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
