import { createClient } from "@/lib/supabase/server";
import { Button, Card, Field, Money, PageHeader, Select, StatusBadge, Table, TextArea } from "@/components/ui";
import { RecordEditor } from "@/components/record-editor";
import { atualizarStatusManutencao, criarManutencao } from "./actions";

export default async function ManutencoesPage() {
  const supabase = await createClient();

  const [{ data: manutencoes }, { data: imoveis }] = await Promise.all([
    supabase
      .from("manutencoes")
      .select("id, imovel_id, tipo, descricao, status, custo, responsavel, data_solicitacao, data_conclusao, observacoes, imoveis(endereco)")
      .order("data_solicitacao", { ascending: false }),
    supabase.from("imoveis").select("id, codigo, endereco").order("endereco"),
  ]);

  return (
    <div>
      <PageHeader title="Manutenções" subtitle="Solicitações e histórico de manutenção dos imóveis." />

      <Card>
        <form action={criarManutencao} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Imóvel"
            name="imovel_id"
            required
            options={(imoveis ?? []).map((i) => ({ value: i.id, label: `${i.codigo ?? ""} ${i.endereco}`.trim() }))}
          />
          <Field label="Tipo (elétrica, hidráulica, pintura...)" name="tipo" required />
          <Field label="Data da solicitação" name="data_solicitacao" type="date" required />
          <Field label="Custo estimado/real (R$)" name="custo" type="number" step="0.01" />
          <Field label="Responsável / prestador" name="responsavel" />
          <TextArea label="Descrição" name="descricao" />
          <div className="sm:col-span-2">
            <Button>Registrar manutenção</Button>
          </div>
        </form>
      </Card>

      <div className="mt-8">
        <Table head={["Imóvel", "Tipo", "Descrição", "Custo", "Status", ""]}>
          {(manutencoes ?? []).map((m) => (
            <tr key={m.id} style={{ borderTop: "1px solid var(--color-line)" }}>
              <td className="px-4 py-2.5">{(m.imoveis as unknown as { endereco: string })?.endereco}</td>
              <td className="px-4 py-2.5">{m.tipo}</td>
              <td className="px-4 py-2.5 max-w-xs truncate">{m.descricao}</td>
              <td className="px-4 py-2.5">
                <Money value={m.custo} />
              </td>
              <td className="px-4 py-2.5">
                <StatusBadge status={m.status} />
              </td>
              <td className="px-4 py-2.5">
                {m.status !== "concluida" && (
                  <form action={atualizarStatusManutencao} className="flex gap-2">
                    <input type="hidden" name="id" value={m.id} />
                    <button
                      formAction={atualizarStatusManutencao}
                      name="status"
                      value="em_andamento"
                      className="text-xs underline"
                      style={{ color: "var(--color-warn)" }}
                    >
                      Em andamento
                    </button>
                    <button
                      formAction={atualizarStatusManutencao}
                      name="status"
                      value="concluida"
                      className="text-xs underline"
                      style={{ color: "var(--color-ok)" }}
                    >
                      Concluir
                    </button>
                  </form>
                )}
                <RecordEditor
                  entity="manutencoes"
                  id={m.id}
                  fields={[
                    {
                      name: "imovel_id",
                      label: "Imóvel",
                      kind: "select",
                      value: m.imovel_id,
                      options: (imoveis ?? []).map((i) => ({ value: i.id, label: `${i.codigo ?? ""} ${i.endereco}`.trim() })),
                    },
                    { name: "tipo", label: "Tipo", value: m.tipo, required: true },
                    { name: "descricao", label: "Descrição", value: m.descricao, kind: "textarea" },
                    { name: "custo", label: "Custo (R$)", value: m.custo, type: "number", step: "0.01" },
                    { name: "responsavel", label: "Responsável", value: m.responsavel },
                    { name: "data_solicitacao", label: "Data da solicitação", value: m.data_solicitacao, type: "date", required: true },
                    { name: "data_conclusao", label: "Data da conclusão", value: m.data_conclusao, type: "date" },
                    {
                      name: "status",
                      label: "Status",
                      kind: "select",
                      value: m.status,
                      options: [{ value: "aberta", label: "Aberta" }, { value: "em_andamento", label: "Em andamento" }, { value: "concluida", label: "Concluída" }, { value: "cancelada", label: "Cancelada" }],
                    },
                    { name: "observacoes", label: "Observações", value: m.observacoes, kind: "textarea" },
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
