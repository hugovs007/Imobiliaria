import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button, Card, Field, Money, PageHeader, Select, StatusBadge, Table, Alert } from "@/components/ui";
import { RecordEditor } from "@/components/record-editor";
import { lancarCobranca, lancarCobrancasEmLote, registrarPagamento, marcarIsento, excluirPagamento, atualizarAtrasados } from "./actions";

function formatarEnderecoImovel(imovel: any): string {
  if (!imovel) return "Endereço não informado";
  const rua = imovel.logradouro || imovel.endereco;
  const cidadeUf = [imovel.cidade, imovel.uf || imovel.estado].filter(Boolean).join("/");
  
  const partes = [
    [rua, imovel.numero].filter(Boolean).join(", "),
    imovel.bairro,
    cidadeUf,
  ].filter(Boolean);

  return partes.length > 0 ? partes.join(" - ") : "Endereço não informado";
}

function formatarDataSegura(dataRaw: string | null | undefined, opcoes?: Intl.DateTimeFormatOptions): string {
  if (!dataRaw) return "—";
  try {
    const dataObj = new Date(dataRaw);
    if (isNaN(dataObj.getTime())) return "—";
    return dataObj.toLocaleDateString("pt-BR", opcoes);
  } catch {
    return "—";
  }
}

export default async function PagamentosPage() {
  const supabase = await createClient();

  let pagamentos: any[] = [];
  let contratos: any[] = [];
  let error: string | null = null;

  try {
    const [{ data: pagamentosData, error: pagamentosError }, { data: contratosData, error: contratosError }] = await Promise.all([
      supabase
        .from("pagamentos")
        .select(
          `
          *,
          contratos (
            *,
            imoveis (*),
            inquilinos (*)
          )
        `
        )
        .order("competencia", { ascending: false }),

      supabase
        .from("contratos")
        .select(`
          *,
          imoveis (*),
          inquilinos (*)
        `)
        .eq("ativo", true),
    ]);

    if (pagamentosError) throw pagamentosError;
    if (contratosError) throw contratosError;

    pagamentos = pagamentosData ?? [];
    contratos = contratosData ?? [];
  } catch (err: any) {
    console.error("Erro ao carregar pagamentos:", err);
    error = err.message || "Erro ao carregar dados do banco de dados.";
  }

  const contratosVigentes = contratos.filter((c) => c.ativo !== false);

  // Estatísticas do painel
  const stats = {
    total: pagamentos.length,
    pagos: pagamentos.filter((p) => p.status === "pago").length,
    pendentes: pagamentos.filter((p) => p.status === "pendente").length,
    atrasados: pagamentos.filter((p) => p.status === "atrasado").length,
    isentos: pagamentos.filter((p) => p.status === "isento").length,
    valorTotalDevido: pagamentos.reduce((sum, p) => sum + Number(p.valor_base || 0), 0),
    valorTotalPago: pagamentos.reduce((sum, p) => sum + Number(p.valor_pago || 0), 0),
    valorTotalPendente: pagamentos
      .filter((p) => p.status !== "pago" && p.status !== "isento")
      .reduce((sum, p) => sum + Number(p.valor_base || 0) - Number(p.valor_pago || 0), 0),
  };

  if (error) {
    return (
      <div>
        <PageHeader title="Pagamentos e recibos" subtitle="Lançamento mensal de aluguéis e baixa de pagamentos." />
        <Alert variant="destructive" className="mt-4">
          <strong>Erro ao carregar dados:</strong> {error}
        </Alert>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Pagamentos e recibos" subtitle="Lançamento mensal de aluguéis e baixa de pagamentos." />

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7 mb-6">
        <Card>
          <div className="text-2xl font-semibold" style={{ fontFamily: "var(--font-serif)", color: "var(--color-ink)" }}>
            {stats.total}
          </div>
          <div className="text-sm" style={{ color: "var(--color-ink-soft)" }}>Total de parcelas</div>
        </Card>
        <Card>
          <div className="text-2xl font-semibold" style={{ fontFamily: "var(--font-serif)", color: "var(--color-ok)" }}>
            {stats.pagos}
          </div>
          <div className="text-sm" style={{ color: "var(--color-ink-soft)" }}>Pagos</div>
        </Card>
        <Card>
          <div className="text-2xl font-semibold" style={{ fontFamily: "var(--font-serif)", color: "var(--color-warn)" }}>
            {stats.pendentes}
          </div>
          <div className="text-sm" style={{ color: "var(--color-ink-soft)" }}>Pendentes</div>
        </Card>
        <Card>
          <div className="text-2xl font-semibold" style={{ fontFamily: "var(--font-serif)", color: "var(--color-alert)" }}>
            {stats.atrasados}
          </div>
          <div className="text-sm" style={{ color: "var(--color-ink-soft)" }}>Atrasados</div>
        </Card>
        <Card>
          <div className="text-2xl font-semibold" style={{ fontFamily: "var(--font-serif)", color: "var(--color-ink-soft)" }}>
            {stats.isentos}
          </div>
          <div className="text-sm" style={{ color: "var(--color-ink-soft)" }}>Isentos</div>
        </Card>
        <Card>
          <div className="text-2xl font-semibold" style={{ fontFamily: "var(--font-serif)", color: "var(--color-ink)" }}>
            <Money value={stats.valorTotalPendente} />
          </div>
          <div className="text-sm" style={{ color: "var(--color-ink-soft)" }}>A receber</div>
        </Card>
        <Card>
          <div className="text-2xl font-semibold" style={{ fontFamily: "var(--font-serif)", color: "var(--color-ok)" }}>
            <Money value={stats.valorTotalPago} />
          </div>
          <div className="text-sm" style={{ color: "var(--color-ink-soft)" }}>Recebido no período</div>
        </Card>
      </div>

      {/* Formulários de Lançamento */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6">
        <Card>
          <h3 className="mb-4 font-medium" style={{ color: "var(--color-ink)" }}>Lançar cobrança avulsa</h3>
          <form action={lancarCobranca} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select
              label="Contrato"
              name="contrato_id"
              required
              options={contratosVigentes.map((c) => ({
                value: String(c.id),
                label: `${c.codigo || c.codigo_contrato || c.id.slice(0, 8)} — ${formatarEnderecoImovel(c.imoveis)} — ${(c.inquilinos as any)?.nome || "Inquilino"}`,
              }))}
            />
            <Field label="Competência (mês)" name="competencia" type="month" required />
            <Field label="Valor devido (R$)" name="valor_base" type="number" step="0.01" required />
            <Field label="Data de vencimento" name="data_vencimento" type="date" required />
            <div className="sm:col-span-2">
              <Button>Lançar cobrança</Button>
            </div>
          </form>
        </Card>

        <Card>
          <h3 className="mb-4 font-medium" style={{ color: "var(--color-ink)" }}>Lançar cobranças em lote</h3>
          <form action={lancarCobrancasEmLote} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Competência (mês)" name="competencia" type="month" required defaultValue={new Date().toISOString().slice(0, 7)} />
            <Field label="Dia de vencimento padrão" name="dia_vencimento" type="number" defaultValue={10} step="1" required />
            <div className="sm:col-span-2">
              <p className="text-xs mb-2" style={{ color: "var(--color-ink-soft)" }}>
                Gera cobranças para todos os contratos ativos usando o valor do aluguel e o dia de vencimento cadastrado.
              </p>
              <Button>Gerar cobranças do mês</Button>
            </div>
          </form>
        </Card>

        <Card>
          <h3 className="mb-4 font-medium" style={{ color: "var(--color-ink)" }}>Atualizar atrasados</h3>
          <p className="text-sm mb-4" style={{ color: "var(--color-ink-soft)" }}>
            Marca como "atrasado" todos os pagamentos pendentes com data de vencimento anterior a hoje.
          </p>
          <form action={atualizarAtrasados}>
            <Button variant="ghost">Atualizar status de atrasados</Button>
          </form>
        </Card>
      </div>

      {/* Tabela Principal */}
      <div className="mt-8">
        <Table head={["Competência", "Contrato", "Imóvel", "Inquilino", "Valor base", "Valor pago", "Saldo", "Parcela", "Vencimento", "Pagamento", "Observações", "Status", "Ações"]}>
          {(pagamentos ?? []).map((p) => {
            const contrato = Array.isArray(p.contratos) ? p.contratos[0] : p.contratos;
            const imovel = contrato?.imoveis;
            const inquilino = contrato?.inquilinos;

            const valorBase = Number(p.valor_base || 0);
            const valorPago = Number(p.valor_pago || 0);
            const saldo = Math.max(0, valorBase - valorPago);

            const isPago = p.status === "pago";
            const isPendente = p.status === "pendente";

            // Identificação tratada da parcela
            let identificacaoParcela = "—";
            if (contrato?.data_inicio && contrato?.data_fim && p.competencia) {
              try {
                const dataInicio = new Date(contrato.data_inicio);
                const dataFim = new Date(contrato.data_fim);
                const dataCompetencia = new Date(p.competencia);
                
                if (!isNaN(dataInicio.getTime()) && !isNaN(dataFim.getTime()) && !isNaN(dataCompetencia.getTime())) {
                  const diferencaMeses = (dataFim.getFullYear() - dataInicio.getFullYear()) * 12 + dataFim.getMonth() - dataInicio.getMonth();
                  const mesesContrato = Math.max(1, diferencaMeses + (dataFim.getDate() >= dataInicio.getDate() ? 1 : 0));
                  const parcelaAtual = (dataCompetencia.getFullYear() - dataInicio.getFullYear()) * 12 + dataCompetencia.getMonth() - dataInicio.getMonth() + 1;
                  if (mesesContrato > 0 && parcelaAtual > 0 && parcelaAtual <= mesesContrato) {
                    identificacaoParcela = `${String(parcelaAtual).padStart(2, "0")}/${String(mesesContrato).padStart(2, "0")}`;
                  }
                }
              } catch {
                identificacaoParcela = "—";
              }
            }

            return (
              <tr key={p.id} style={{ borderTop: "1px solid var(--color-line)" }}>
                <td className="px-4 py-2.5 whitespace-nowrap">
                  {formatarDataSegura(p.competencia, { month: "2-digit", year: "numeric" })}
                </td>
                <td className="px-4 py-2.5 font-mono text-xs">
                  {contrato?.codigo || contrato?.codigo_contrato || contrato?.id?.slice(0, 8) || "—"}
                </td>
                <td className="px-4 py-2.5">
                  {formatarEnderecoImovel(imovel)}
                </td>
                <td className="px-4 py-2.5">
                  {inquilino?.nome || "—"}
                </td>
                <td className="px-4 py-2.5 font-semibold">
                  <Money value={valorBase} />
                </td>
                <td className="px-4 py-2.5">
                  {p.valor_pago != null ? <Money value={valorPago} /> : "—"}
                </td>
                <td className="px-4 py-2.5">
                  {saldo > 0.009 ? (
                    <span className="font-medium" style={{ color: isPago ? "var(--color-ok)" : "var(--color-alert)" }}>
                      <Money value={saldo} />
                    </span>
                  ) : (
                    <span style={{ color: "var(--color-ok)" }}>—</span>
                  )}
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap">
                  {identificacaoParcela}
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap font-mono text-xs">
                  {formatarDataSegura(p.data_vencimento)}
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap font-mono text-xs">
                  {formatarDataSegura(p.data_pagamento)}
                </td>
                <td className="px-4 py-2.5 text-xs text-gray-600">
                  {p.observacoes || "—"}
                </td>
                <td className="px-4 py-2.5">
                  <StatusBadge status={p.status} />
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Dar baixa no pagamento */}
                    {!isPago && !p.status?.includes("isento") && (
                      <form action={registrarPagamento} className="flex flex-wrap items-center gap-1">
                        <input type="hidden" name="id" value={String(p.id)} />
                        <input
                          name="valor_pago"
                          type="number"
                          step="0.01"
                          placeholder="Valor"
                          defaultValue={saldo || valorBase}
                          required
                          className="w-24 rounded-sm border px-2 py-1 text-xs"
                          style={{ borderColor: "var(--color-line)" }}
                        />
                        <input
                          name="data_pagamento"
                          type="date"
                          required
                          defaultValue={new Date().toISOString().split("T")[0]}
                          className="rounded-sm border px-2 py-1 text-xs"
                          style={{ borderColor: "var(--color-line)" }}
                        />
                        <Button variant="ghost">Confirmar</Button>
                      </form>
                    )}

                    {/* Marcar como Isento */}
                    {isPendente && (
                      <form action={marcarIsento} className="inline">
                        <input type="hidden" name="id" value={String(p.id)} />
                        <Button variant="ghost">Isentar</Button>
                      </form>
                    )}

                    {/* Link do Recibo */}
                    {isPago && (
                      <Link
                        href={`/recibos/${p.id}`}
                        className="inline-block text-xs font-medium underline"
                        style={{ color: "var(--color-teal)" }}
                      >
                        Recibo
                      </Link>
                    )}

                    {/* Editor de Registro */}
                    <RecordEditor
                      entity="pagamentos"
                      id={String(p.id)}
                      fields={[
                        { name: "competencia", label: "Competência", value: p.competencia ? String(p.competencia).slice(0, 7) : "", type: "month", required: true },
                        { name: "valor_base", label: "Valor base (R$)", value: valorBase, type: "number", step: "0.01", required: true },
                        { name: "valor_pago", label: "Valor pago (R$)", value: valorPago, type: "number", step: "0.01" },
                        { name: "data_vencimento", label: "Vencimento", value: p.data_vencimento, type: "date", required: true },
                        { name: "data_pagamento", label: "Data do pagamento", value: p.data_pagamento, type: "date" },
                        { name: "observacoes", label: "Observações", value: p.observacoes, kind: "textarea" },
                        {
                          name: "status",
                          label: "Status",
                          kind: "select",
                          value: p.status,
                          options: [
                            { value: "pendente", label: "Pendente" },
                            { value: "pago", label: "Pago" },
                            { value: "atrasado", label: "Atrasado" },
                            { value: "isento", label: "Isento" },
                          ],
                        },
                      ]}
                    />

                    {/* Excluir Lançamento */}
                    {isPendente && (
                      <form action={excluirPagamento} className="inline" onSubmit={(e) => { if (!confirm("Excluir este pagamento?")) e.preventDefault(); }}>
                        <input type="hidden" name="id" value={String(p.id)} />
                        <Button variant="ghost">Excluir</Button>
                      </form>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </Table>

        {pagamentos.length === 0 && (
          <div className="mt-8 text-center py-12" style={{ color: "var(--color-ink-soft)" }}>
            Nenhum pagamento encontrado. Use "Lançar cobranças em lote" para gerar as cobranças do mês.
          </div>
        )}
      </div>
    </div>
  );
}