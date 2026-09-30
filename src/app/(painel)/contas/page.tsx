import { createClient } from "@/lib/supabase/server";
import { Button, Card, Field, PageHeader, Select, StatusBadge, Table } from "@/components/ui";
import { RecordEditor } from "@/components/record-editor";
import { criarConta } from "./actions";

export default async function ContasPage() {
  const supabase = await createClient();

  const [{ data: contas }, { data: imoveis }] = await Promise.all([
    supabase.from("contas_consumo").select("*, imoveis(codigo, logradouro)").order("created_at", { ascending: false }),
    supabase.from("imoveis").select("id, codigo, logradouro").order("codigo"),
  ]);

  const listaContas = contas ?? [];
  const listaImoveis = imoveis ?? [];

  return (
    <div>
      <PageHeader title="Contas de água e energia" subtitle="Controle de consumo por imóvel." />

      <Card>
        <form action={criarConta} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Imóvel *"
            name="imovel_id"
            required
            options={[
              { value: "", label: "— selecione um imóvel —" },
              ...listaImoveis.map((i) => ({ value: i.id, label: `${i.codigo} - ${i.logradouro}` })),
            ]}
          />
          <Select
            label="Tipo"
            name="tipo"
            defaultValue="Água"
            options={[
              { value: "Água", label: "Água" },
              { value: "Energia", label: "Energia" },
              { value: "Gás", label: "Gás" },
              { value: "IPTU", label: "IPTU" },
              { value: "Condomínio", label: "Condomínio" },
            ]}
          />
          <Field label="Competência (mês)" name="competencia" type="month" required />
          <Field label="Valor (R$) *" name="valor" type="number" step="0.01" required />
          <Field label="Vencimento *" name="data_vencimento" type="date" required />
          <Select
            label="Responsável pelo pagamento"
            name="responsavel"
            defaultValue="Inquilino"
            options={[
              { value: "Inquilino", label: "Inquilino" },
              { value: "Proprietário", label: "Proprietário" },
            ]}
          />
          <div className="sm:col-span-2">
            <Button>Registrar conta</Button>
          </div>
        </form>
      </Card>

      <div className="mt-8">
        <Table head={["Imóvel", "Tipo", "Competência", "Valor", "Vencimento", "Responsável", "Status", ""]}>
          {listaContas.map((c) => (
            <tr key={c.id} style={{ borderTop: "1px solid var(--color-line)" }}>
              <td className="px-4 py-2.5">{(c.imoveis as unknown as { codigo: string; logradouro: string })?.logradouro ?? "—"}</td>
              <td className="px-4 py-2.5">{c.tipo}</td>
              <td className="px-4 py-2.5">{c.competencia}</td>
              <td className="px-4 py-2.5">R$ {Number(c.valor || 0).toFixed(2)}</td>
              <td className="px-4 py-2.5">{new Date(c.data_vencimento).toLocaleDateString("pt-BR")}</td>
              <td className="px-4 py-2.5">{c.responsavel}</td>
              <td className="px-4 py-2.5"><StatusBadge status={c.paga ? "pago" : "pendente"} /></td>
              <td className="px-4 py-2.5">
                <RecordEditor
                  entity="contas_consumo"
                  id={c.id}
                  fields={[
                    { name: "valor", label: "Valor (R$)", value: c.valor, type: "number", step: "0.01", required: true },
                    { name: "data_vencimento", label: "Vencimento", value: c.data_vencimento, type: "date", required: true },
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