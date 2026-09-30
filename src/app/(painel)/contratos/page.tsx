import { createClient } from "@/lib/supabase/server";
import { Button, Card, Field, Money, PageHeader, Select, StatusBadge, Table, TextArea } from "@/components/ui";
import { RecordEditor } from "@/components/record-editor";
import { CloseContractForm } from "./close-contract-form";
import { RenewalForm } from "./renewal-form";
import { aplicarReajuste, criarContrato, gerarReajustesPendentes } from "./actions";

function dataSeguinte(data: string | null) {
  if (!data) return new Date().toISOString().slice(0, 10);
  const proxima = new Date(`${data.slice(0, 10)}T00:00:00Z`);
  proxima.setUTCDate(proxima.getUTCDate() + 1);
  return proxima.toISOString().slice(0, 10);
}

type ImovelContrato = {
  id: string;
  codigo: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  cep: string | null;
};

function enderecoCompleto(imovel: ImovelContrato | null | undefined) {
  if (!imovel) return "—";
  const partes = [
    [imovel.logradouro, imovel.numero].filter(Boolean).join(", "),
    imovel.complemento,
    imovel.bairro,
    [imovel.cidade, imovel.uf].filter(Boolean).join("/"),
    imovel.cep,
  ].filter(Boolean);
  return partes.join(" - ");
}

export default async function ContratosPage() {
  const supabase = await createClient();

  const [{ data: contratos }, { data: imoveisDisponiveis }, { data: inquilinos }, { data: reajustesPendentes }] =
    await Promise.all([
      supabase
        .from("contratos")
        .select(
          "id, codigo_contrato, imovel_id, inquilino_id, contrato_anterior_id, data_inicio, data_fim, dia_vencimento, valor_aluguel_atual, indice_reajuste, periodicidade_reajuste_meses, deposito_caucao, clausulas_especiais, status, imoveis(id, codigo, logradouro, numero, complemento, bairro, cidade, uf, cep), inquilinos(nome)"
        )
        .order("created_at", { ascending: false }),
      // Busca imóveis disponíveis (aceitando variações de case no status)
      supabase
        .from("imoveis")
        .select("id, codigo, logradouro, numero, complemento, bairro, cidade, uf, cep")
        .or("status.eq.disponivel,status.eq.Disponível"),
      supabase.from("inquilinos").select("id, nome").order("nome"),
      supabase
        .from("reajustes")
        .select("id, data_referencia, indice_usado, percentual_aplicado, valor_anterior, valor_novo, contratos(imoveis(id, codigo, logradouro, numero, complemento, bairro, cidade, uf, cep))")
        .eq("status", "pendente"),
    ]);

  const listaContratos = contratos ?? [];
  const listaImoveis = imoveisDisponiveis ?? [];
  const listaInquilinos = inquilinos ?? [];
  const listaReajustes = reajustesPendentes ?? [];

  const contratosComSucessor = new Set(
    listaContratos.flatMap((contrato) => contrato.contrato_anterior_id ? [contrato.contrato_anterior_id] : [])
  );

  return (
    <div>
      <PageHeader
        title="Contratos"
        subtitle="Cadastro de locações e reajuste anual conforme a Lei do Inquilinato (Lei 8.245/91)."
      />

      <Card>
        <form action={criarContrato} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Imóvel (disponíveis)"
            name="imovel_id"
            required
            options={[
              { value: "", label: "— selecione um imóvel —" },
              ...listaImoveis.map((i) => {
                const partes = [
                  i.codigo,
                  i.logradouro,
                  i.numero,
                  i.complemento,
                  i.bairro,
                  `${i.cidade}/${i.uf}`,
                  i.cep,
                ].filter(Boolean);
                return {
                  value: i.id,
                  label: partes.join(" - "),
                };
              })
            ]}
          />
          <Select
            label="Inquilino"
            name="inquilino_id"
            required
            options={[
              { value: "", label: "— selecione um inquilino —" },
              ...listaInquilinos.map((i) => ({ value: i.id, label: i.nome }))
            ]}
          />
          <Field label="Data de início" name="data_inicio" type="date" required />
          <Field label="Data de fim (opcional)" name="data_fim" type="date" />
          <Field label="Dia de vencimento (1-31)" name="dia_vencimento" type="number" required />
          <Field label="Valor do aluguel (R$)" name="valor_aluguel_atual" type="number" step="0.01" required />
          <Select
            label="Índice de reajuste"
            name="indice_reajuste"
            defaultValue="igpm"
            options={[
              { value: "igpm", label: "IGP-M" },
              { value: "ipca", label: "IPCA" },
              { value: "outro", label: "Outro (definir em cláusula)" },
            ]}
          />
          <Field label="Periodicidade do reajuste (meses)" name="periodicidade_reajuste_meses" type="number" defaultValue={12} />
          <Field label="Caução/depósito (R$)" name="deposito_caucao" type="number" step="0.01" />
          <TextArea label="Cláusulas especiais" name="clausulas_especiais" />
          <div className="sm:col-span-2">
            <Button>Cadastrar contrato</Button>
          </div>
        </form>
      </Card>

      <div className="mt-10 flex items-center justify-between">
        <h2 className="text-lg font-semibold" style={{ fontFamily: "var(--font-serif)" }}>
          Reajustes pendentes
        </h2>
        <form action={gerarReajustesPendentes}>
          <Button variant="ghost">Verificar reajustes devidos</Button>
        </form>
      </div>
      <p className="mt-1 mb-4 text-sm" style={{ color: "var(--color-ink-soft)" }}>
        Calcula, para cada contrato ativo, se já passou 1 ano desde o último reajuste e aplica o índice
        pactuado em contrato usando os valores cadastrados em &quot;Índices econômicos&quot;.
      </p>

      {listaReajustes.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--color-ink-soft)" }}>
          Nenhum reajuste pendente no momento.
        </p>
      ) : (
        <Table head={["Imóvel", "Data de referência", "Índice", "% aplicado", "Valor atual", "Novo valor", ""]}>
          {listaReajustes.map((r) => {
            const imovelReajuste = (r.contratos as unknown as { imoveis: ImovelContrato })?.imoveis;
            return (
              <tr key={r.id} style={{ borderTop: "1px solid var(--color-line)" }}>
                <td className="px-4 py-2.5">
                  <div className="flex flex-col">
                    {imovelReajuste?.codigo && (
                      <span className="font-mono text-xs" style={{ color: "var(--color-ink-soft)" }}>
                        {imovelReajuste.codigo}
                      </span>
                    )}
                    <span>{enderecoCompleto(imovelReajuste)}</span>
                  </div>
                </td>
                <td className="px-4 py-2.5">{new Date(r.data_referencia).toLocaleDateString("pt-BR")}</td>
                <td className="px-4 py-2.5 uppercase">{r.indice_usado}</td>
                <td className="px-4 py-2.5">{r.percentual_aplicado}%</td>
                <td className="px-4 py-2.5">
                  <Money value={r.valor_anterior} />
                </td>
                <td className="px-4 py-2.5">
                  <Money value={r.valor_novo} />
                </td>
                <td className="px-4 py-2.5">
                  <form action={aplicarReajuste}>
                    <input type="hidden" name="id" value={r.id} />
                    <Button variant="ghost">Aplicar</Button>
                  </form>
                </td>
              </tr>
            );
          })}
        </Table>
      )}

      <div className="mt-10">
        <Table head={["ID", "Imóvel", "Inquilino", "Início", "Aluguel atual", "Índice", "Status", "Ações"]}>
          {listaContratos.map((c) => {
            const imovel = c.imoveis as unknown as ImovelContrato;
            const possuiRenovacao = contratosComSucessor.has(c.id);
            const contratoVigente = ["ativo", "renovado"].includes(c.status) && !possuiRenovacao;
            const statusExibido = possuiRenovacao ? "encerrado" : c.status;
            return (
              <tr key={c.id} style={{ borderTop: "1px solid var(--color-line)" }}>
                <td className="px-4 py-2.5 whitespace-nowrap font-mono text-xs">{c.codigo_contrato}</td>
                <td className="px-4 py-2.5">
                  <div className="flex flex-col">
                    {imovel?.codigo && (
                      <span className="font-mono text-xs" style={{ color: "var(--color-ink-soft)" }}>
                        {imovel.codigo}
                      </span>
                    )}
                    <span>{enderecoCompleto(imovel)}</span>
                  </div>
                </td>
                <td className="px-4 py-2.5">{(c.inquilinos as unknown as { nome: string })?.nome ?? "—"}</td>
                <td className="px-4 py-2.5">{new Date(c.data_inicio).toLocaleDateString("pt-BR")}</td>
                <td className="px-4 py-2.5">
                  <Money value={c.valor_aluguel_atual} />
                </td>
                <td className="px-4 py-2.5 uppercase">{c.indice_reajuste}</td>
                <td className="px-4 py-2.5">
                  <StatusBadge status={statusExibido} />
                </td>
                <td className="px-4 py-2.5">
                  {contratoVigente && (
                    <div className="flex flex-col items-start gap-2">
                      <CloseContractForm contractId={c.id} contractCode={c.codigo_contrato} />
                      <RenewalForm
                        contractId={c.id}
                        contractCode={c.codigo_contrato}
                        startDate={dataSeguinte(c.data_fim)}
                        currentRent={c.valor_aluguel_atual}
                        index={c.indice_reajuste}
                      />
                    </div>
                  )}
                  <RecordEditor
                    entity="contratos"
                    id={c.id}
                    fields={[
                      { name: "data_inicio", label: "Data de início", value: c.data_inicio, type: "date", required: true },
                      { name: "data_fim", label: "Data de fim", value: c.data_fim, type: "date" },
                      { name: "dia_vencimento", label: "Dia de vencimento", value: c.dia_vencimento, type: "number", required: true },
                      { name: "valor_aluguel_atual", label: "Aluguel atual (R$)", value: c.valor_aluguel_atual, type: "number", step: "0.01", required: true },
                      {
                        name: "indice_reajuste",
                        label: "Índice de reajuste",
                        kind: "select",
                        value: c.indice_reajuste,
                        options: [{ value: "igpm", label: "IGP-M" }, { value: "ipca", label: "IPCA" }, { value: "outro", label: "Outro" }],
                      },
                    ]}
                  />
                </td>
              </tr>
            );
          })}
        </Table>
      </div>
    </div>
  );
}