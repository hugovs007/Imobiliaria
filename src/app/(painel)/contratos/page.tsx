import { createClient } from "@/lib/supabase/server";
import { Button, Card, Money, PageHeader, StatusBadge, Table } from "@/components/ui";
import { RecordEditor } from "@/components/record-editor";
import { CloseContractForm } from "./close-contract-form";
import { RenewalForm } from "./renewal-form";
import { FormCriarContrato } from "./form-criar-contrato";
import { aplicarReajuste, gerarReajustesPendentes } from "./actions";

function dataSeguinte(data: string | null) {
  if (!data) return new Date().toISOString().slice(0, 10);
  const proxima = new Date(`${data.slice(0, 10)}T00:00:00Z`);
  proxima.setUTCDate(proxima.getUTCDate() + 1);
  return proxima.toISOString().slice(0, 10);
}

type ImovelContrato = {
  id: string;
  codigo: string | null;
  logradouro?: string | null;
  endereco?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
  estado?: string | null;
  cep?: string | null;
  status?: string | null;
};

function enderecoCompleto(imovel: ImovelContrato | null | undefined) {
  if (!imovel) return "—";
  const rua = imovel.logradouro || imovel.endereco;
  const cidadeUf = [imovel.cidade, imovel.uf || imovel.estado].filter(Boolean).join("/");
  
  const partes = [
    [rua, imovel.numero].filter(Boolean).join(", "),
    imovel.complemento,
    imovel.bairro,
    cidadeUf,
    imovel.cep,
  ].filter(Boolean);

  return partes.length > 0 ? partes.join(" - ") : "Endereço não informado";
}

function extrairCodigoExibicao(c: any): string {
  if (c.clausulas_especiais && c.clausulas_especiais.includes("REN001-")) {
    const match = c.clausulas_especiais.match(/REN001-[A-Za-z0-9]+/);
    if (match) return match[0];
  }
  return c.codigo || c.codigo_contrato || c.id.slice(0, 8);
}

export default async function ContratosPage() {
  const supabase = await createClient();

  // Encerramento automático de contratos vencidos
  const hoje = new Date().toISOString().slice(0, 10);
  const { data: expirados } = await supabase
    .from("contratos")
    .select("id, imovel_id")
    .eq("ativo", true)
    .not("data_fim", "is", null)
    .lt("data_fim", hoje);

  if (expirados && expirados.length > 0) {
    const idsExpirados = expirados.map((e) => e.id);
    const imoveisLiberar = expirados.map((e) => e.imovel_id);

    await supabase.from("contratos").update({ ativo: false }).in("id", idsExpirados);
    await supabase.from("imoveis").update({ status: "disponivel" }).in("id", imoveisLiberar);
  }

  const [resContratos, resImoveis, resInquilinos, resReajustes] = await Promise.all([
    supabase
      .from("contratos")
      .select("*, imoveis(*), inquilinos(nome)")
      .order("created_at", { ascending: false }),
    
    supabase
      .from("imoveis")
      .select("*")
      .order("created_at", { ascending: false }),

    supabase
      .from("inquilinos")
      .select("*")
      .order("nome", { ascending: true }),

    supabase
      .from("reajustes")
      .select("*, contratos(*, imoveis(*))")
      .eq("status", "pendente"),
  ]);

  const listaContratos = resContratos.data ?? [];
  const todosImoveis = resImoveis.data ?? [];
  const listaInquilinos = resInquilinos.data ?? [];
  const listaReajustes = resReajustes.data ?? [];

  const imoveisDisponiveis = todosImoveis.filter(
    (i) => !i.status || i.status.toLowerCase() === "disponivel"
  );
  const imoveisParaExibir = imoveisDisponiveis.length > 0 ? imoveisDisponiveis : todosImoveis;

  return (
    <div>
      <PageHeader
        title="Contratos"
        subtitle="Cadastro de locações e reajuste anual conforme a Lei do Inquilinato (Lei 8.245/91)."
      />

      <Card>
        <FormCriarContrato 
          imoveisParaExibir={imoveisParaExibir} 
          listaInquilinos={listaInquilinos} 
        />
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
                <td className="px-4 py-2.5 whitespace-nowrap font-mono text-xs">
                  <div className="flex flex-col">
                    {imovelReajuste?.codigo && (
                      <span className="font-mono text-xs" style={{ color: "var(--color-ink-soft)" }}>
                        {imovelReajuste.codigo}
                      </span>
                    )}
                    <span>{enderecoCompleto(imovelReajuste)}</span>
                  </div>
                </td>
                <td className="px-4 py-2.5">{r.data_referencia ? new Date(r.data_referencia).toLocaleDateString("pt-BR") : "—"}</td>
                <td className="px-4 py-2.5 uppercase">{r.indice_usado || "—"}</td>
                <td className="px-4 py-2.5">{r.percentual_aplicado ?? 0}%</td>
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
        <Table head={["Código", "Imóvel", "Inquilino", "Início", "Aluguel atual", "Índice", "Status", "Ações"]}>
          {listaContratos.length === 0 ? (
            <tr style={{ borderTop: "1px solid var(--color-line)" }}>
              <td colSpan={8} className="px-4 py-4 text-center" style={{ color: "var(--color-ink-soft)" }}>
                Nenhum contrato cadastrado até o momento.
              </td>
            </tr>
          ) : (
            listaContratos.map((c) => {
              const imovel = c.imoveis as unknown as ImovelContrato;
              const valorExibido = c.valor_aluguel ?? c.valor_atual ?? c.valor_aluguel_atual ?? 0;
              const contratoAtivo = c.ativo !== false;
              const codigoContrato = extrairCodigoExibicao(c);

              return (
                <tr key={c.id} style={{ borderTop: "1px solid var(--color-line)" }}>
                  <td className="px-4 py-2.5 whitespace-nowrap font-mono text-xs font-bold text-emerald-800">
                    {codigoContrato}
                  </td>
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
                  <td className="px-4 py-2.5">{c.data_inicio ? new Date(c.data_inicio).toLocaleDateString("pt-BR") : "—"}</td>
                  <td className="px-4 py-2.5 font-semibold">
                    <Money value={valorExibido} />
                  </td>
                  <td className="px-4 py-2.5 uppercase">{c.indice_reajuste || "—"}</td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={contratoAtivo ? "ativo" : "encerrado"} />
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-col items-start gap-2">
                      {contratoAtivo && (
                        <>
                          <CloseContractForm contractId={c.id} contractCode={codigoContrato} />
                          <RenewalForm
                            contractId={c.id}
                            contractCode={codigoContrato}
                            startDate={dataSeguinte(c.data_fim)}
                            currentRent={valorExibido}
                            index={c.indice_reajuste || "IGP-M"}
                          />
                        </>
                      )}
                      <RecordEditor
                        entity="contratos"
                        id={c.id}
                        fields={[
                          { name: "data_inicio", label: "Data de início", value: c.data_inicio, type: "date", required: true },
                          { name: "data_fim", label: "Data de fim", value: c.data_fim, type: "date" },
                          { name: "dia_vencimento", label: "Dia de vencimento", value: c.dia_vencimento, type: "number", required: true },
                          { name: "valor_aluguel", label: "Aluguel (R$)", value: valorExibido, type: "number", step: "0.01", required: true },
                          {
                            name: "indice_reajuste",
                            label: "Índice de reajuste",
                            kind: "select",
                            value: c.indice_reajuste,
                            options: [{ value: "IGP-M", label: "IGP-M" }, { value: "IPCA", label: "IPCA" }, { value: "Outro", label: "Outro" }],
                          },
                        ]}
                      />
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </Table>
      </div>
    </div>
  );
}