import { createClient } from "@/lib/supabase/server";
import { Button, Card, Field, PageHeader, Select, StatusBadge, Table, TextArea } from "@/components/ui";
import { RecordEditor } from "@/components/record-editor";
import { criarManutencao } from "./actions";

export default async function ManutencoesPage() {
  const supabase = await createClient();

  const [{ data: manutencoes }, { data: imoveis }] = await Promise.all([
    supabase.from("manutencoes").select("*, imoveis(codigo, logradouro)").order("created_at", { ascending: false }),
    supabase.from("imoveis").select("id, codigo, logradouro").order("codigo"),
  ]);

  const listaManutencoes = manutencoes ?? [];
  const listaImoveis = imoveis ?? [];

  return (
    <div>
      <PageHeader title="Manutenções" subtitle="Solicitações e histórico de manutenção dos imóveis." />

      <Card>
        <form action={criarManutencao} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Imóvel *"
            name="imovel_id"
            required
            options={[
              { value: "", label: "— selecione um imóvel —" },
              ...listaImoveis.map((i) => ({ value: i.id, label: `${i.codigo} - ${i.logradouro}` })),
            ]}
          />
          <Field label="Tipo (elétrica, hidráulica, pintura...)" name="tipo" required />
          <Field label="Data da solicitação *" name="data_solicitacao" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
          <Field label="Custo estimado/real (R$)" name="custo" type="number" step="0.01" />
          <Field label="Responsável / prestador" name="responsavel" />
          <TextArea label="Descrição" name="descricao" className="sm:col-span-2" />
          <div className="sm:col-span-2">
            <Button>Registrar manutenção</Button>
          </div>
        </form>
      </Card>

      <div className="mt-8">
        <Table head={["Imóvel", "Tipo", "Descrição", "Custo", "Status", ""]}>
          {listaManutencoes.map((m) => (
            <tr key={m.id} style={{ borderTop: "1px solid var(--color-line)" }}>
              <td className="px-4 py-2.5">{(m.imoveis as unknown as { codigo: string; logradouro: string })?.logradouro ?? "—"}</td>
              <td className="px-4 py-2.5">{m.tipo}</td>
              <td className="px-4 py-2.5">{m.descricao ?? "—"}</td>
              <td className="px-4 py-2.5">R$ {Number(m.custo || 0).toFixed(2)}</td>
              <td className="px-4 py-2.5"><StatusBadge status={m.status || "Aberta"} /></td>
              <td className="px-4 py-2.5">
                <RecordEditor
                  entity="manutencoes"
                  id={m.id}
                  fields={[
                    { name: "tipo", label: "Tipo", value: m.tipo, required: true },
                    { name: "custo", label: "Custo", value: m.custo, type: "number", step: "0.01" },
                    { name: "responsavel", label: "Responsável", value: m.responsavel },
                    { name: "descricao", label: "Descrição", value: m.descricao, kind: "textarea" },
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