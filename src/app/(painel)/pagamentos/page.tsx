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

  // Cobranças pendentes ou com saldo a pagar para o formulário de Entrada PDV
  const cobrancasAbertas = pagamentos.filter((p) => {
    const vBase = Number(p.valor_base || 0);
    const vPago = Number(p.valor_pago || 0);
    return (vBase - vPago) > 0.009 && p.status !== "isento";
  });

  // Estatísticas
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
        <PageHeader title="PDV — Recebimento e Caixa" subtitle="Lançamento de movimentações financeiras e recibos." />
        <Alert variant="destructive" className="mt-4">
          <strong>Erro ao carregar dados:</strong> {error}
        </Alert>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
        <PageHeader title="PDV — Recebimento e Caixa" subtitle="Lançamento de movimentações financeiras, caixa e impressão de recibos." />
        <form action={atualizarAtrasados}>
          <Button variant="ghost">🔄 Atualizar status de atrasados</Button>
        </form>
      </div>

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
          <div className="text-sm" style={{ color: "var(--color-ink-soft)" }}>Caixa recebido</div>
        </Card>
      </div>

      {/* Painel Superior do PDV */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 mb-6">
        
        {/* 1. Lançar Entrada PDV */}
        <Card>
          <div className="p-1">
            <h3 className="mb-3 font-semibold text-emerald-800 flex items-center gap-1.5">
              💳 Lançar Entrada PDV (Recebimento)
            </h3>
            {cobrancasAbertas.length > 0 ? (
              <form action={registrarPagamento} className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Select
                    label="Selecione o Contrato / Parcela em Aberto"
                    name="id"
                    required
                    options={cobrancasAbertas.map((p) => {
                      const c = Array.isArray(p.contratos) ? p.contratos[0] : p.contratos;
                      const inq = c?.inquilinos?.nome || "Inquilino";
                      const saldo = Math.max(0, Number(p.valor_base || 0) - Number(p.valor_pago || 0));
                      const comp = formatarDataSegura(p.competencia, { month: "2-digit", year: "numeric" });
                      return {
                        value: String(p.id),
                        label: `${comp} — ${c?.codigo || c?.codigo_contrato || c?.id?.slice(0, 6)} — ${inq} (Saldo: R$ ${saldo.toFixed(2)})`,
                      };
                    })}
                  />
                </div>
                <Field label="Valor Recebido (R$)" name="valor_pago" type="number" step="0.01" required placeholder="0.00" />
                <Select
                  label="Forma de Pagamento"
                  name="forma_pagamento"
                  defaultValue="PIX"
                  options={[
                    { value: "PIX", label: "PIX" },
                    { value: "Dinheiro", label: "Dinheiro" },
                    { value: "Cartão de Débito", label: "Cartão de Débito" },
                    { value: "Cartão de Crédito", label: "Cartão de Crédito" },
                    { value: "Transferência Bancária", label: "Transferência" },
                  ]}
                />
                <Field label="Data do Pagamento" name="data_pagamento" type="date" required defaultValue={new Date().toISOString().split("T")[0]} />
                <Field label="Observação (opcional)" name="observacoes" placeholder="Ex: Entrada 1/2" />
                <div className="sm:col-span-2 mt-1">
                  <Button variant="primary">
                    Confirmar e Gerar Recibo
                  </Button>
                </div>
              </form>
            ) : (
              <p className="text-xs text-gray-500 py-6 text-center">Nenhum débito ou parcela pendente no momento.</p>
            )}
          </div>
        </Card>

        {/* 2. Lançar Cobranças em Lote */}
        <Card>
          <h3 className="mb-3 font-medium" style={{ color: "var(--color-ink)" }}>Lançar cobranças em lote</h3>
          <form action={lancarCobrancasEmLote} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Competência (mês)" name="competencia" type="month" required defaultValue={new Date().toISOString().slice(0, 7)} />
            <Field label="Dia de vencimento padrão" name="dia_vencimento" type="number" defaultValue={10} step="1" required />
            <div className="sm:col-span-2">
              <p className="text-xs mb-3" style={{ color: "var(--color-ink-soft)" }}>
                Gera cobranças mensais para todos os contratos ativos com o valor do aluguel.
              </p>
              <Button variant="ghost">Gerar cobranças do mês</Button>
            </div>
          </form>
        </Card>

        {/* 3. Lançar Cobrança Avulsa */}
        <Card>
          <h3 className="mb-3 font-medium" style={{ color: "var(--color-ink)" }}>Lançar cobrança avulsa</h3>
          <form action={lancarCobranca} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select
              label="Contrato"
              name="contrato_id"
              required
              options={contratosVigentes.map((c) => ({
                value: String(c.id),
                label: `${c.codigo || c.codigo_contrato || c.id.slice(0, 8)} — R$ ${Number(c.valor_aluguel || 0).toFixed(2)} — ${(c.inquilinos as any)?.nome || "Inquilino"}`,
              }))}
            />
            <Field label="Competência (mês)" name="competencia" type="month" required />
            <Field label="Valor base (opcional)" name="valor_base" type="number" step="0.01" placeholder="Automático" />
            <Field label="Vencimento (opcional)" name="data_vencimento" type="date" />
            <div className="sm:col-span-2">
              <Button variant="ghost">Lançar cobrança</Button>
            </div>
          </form>
        </Card>

      </div>

      {/* Tabela de Histórico e Movimentações */}
      <div className="mt-8">
        <h3 className="text-base font-semibold mb-3 text-gray-800">Histórico de Movimentações e Caixa</h3>
        <Table head={["Competência", "Contrato / Imóvel", "Inquilino", "Valor aluguel", "Total pago", "Saldo a pagar", "Status", "Histórico de entradas / Recibos PDV", "Recibo Impresso", "Ações"]}>
          {(pagamentos ?? []).map((p) => {
            const contrato = Array.isArray(p.contratos) ? p.contratos[0] : p.contratos;
            const imovel = contrato?.imoveis;
            const inquilino = contrato?.inquilinos;

            const valorBase = Number(p.valor_base || 0);
            const valorPago = Number(p.valor_pago || 0);
            const saldoRestante = Math.max(0, valorBase - valorPago);

            const isPago = p.status === "pago";
            const isPendente = p.status === "pendente" || p.status === "atrasado";

            return (
              <tr key={p.id} style={{ borderTop: "1px solid var(--color-line)" }}>
                <td className="px-4 py-2.5 whitespace-nowrap font-medium">
                  {formatarDataSegura(p.competencia, { month: "2-digit", year: "numeric" })}
                </td>
                <td className="px-4 py-2.5 text-xs">
                  <div className="font-bold">{contrato?.codigo || contrato?.codigo_contrato || contrato?.id?.slice(0, 8) || "—"}</div>
                  <div className="text-gray-500">{formatarEnderecoImovel(imovel)}</div>
                </td>
                <td className="px-4 py-2.5 text-xs font-medium">
                  {inquilino?.nome || "—"}
                </td>
                <td className="px-4 py-2.5 font-semibold">
                  <Money value={valorBase} />
                </td>
                <td className="px-4 py-2.5 font-medium text-emerald-600">
                  {valorPago > 0 ? <Money value={valorPago} /> : "—"}
                </td>
                <td className="px-4 py-2.5">
                  {saldoRestante > 0.009 ? (
                    <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      <Money value={saldoRestante} />
                    </span>
                  ) : (
                    <span className="text-emerald-700 font-semibold">R$ 0,00 (Quitado)</span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <StatusBadge status={p.status} />
                </td>
                <td className="px-4 py-2.5 text-xs text-gray-600 whitespace-pre-line max-w-xs">
                  {p.observacoes || "Nenhuma entrada lançada"}
                </td>
                <td className="px-4 py-2.5 text-center">
                  {valorPago > 0 ? (
                    <Link
                      href={`/recibos/${p.id}`}
                      target="_blank"
                      className="inline-flex items-center gap-1 bg-teal-600 text-white font-medium text-xs px-3 py-1.5 rounded hover:bg-teal-700 transition"
                    >
                      🖨️ Imprimir Recibo
                    </Link>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-1">
                    {/* Isentar */}
                    {isPendente && (
                      <form action={marcarIsento} className="inline">
                        <input type="hidden" name="id" value={String(p.id)} />
                        <Button variant="ghost">Isentar</Button>
                      </form>
                    )}

                    {/* Editor */}
                    <RecordEditor
                      entity="pagamentos"
                      id={String(p.id)}
                      fields={[
                        { name: "competencia", label: "Competência", value: p.competencia ? String(p.competencia).slice(0, 7) : "", type: "month", required: true },
                        { name: "valor_base", label: "Valor aluguel (R$)", value: valorBase, type: "number", step: "0.01", required: true },
                        { name: "valor_pago", label: "Valor pago (R$)", value: valorPago, type: "number", step: "0.01" },
                        { name: "data_vencimento", label: "Vencimento", value: p.data_vencimento, type: "date", required: true },
                        { name: "data_pagamento", label: "Data do pagamento", value: p.data_pagamento, type: "date" },
                        { name: "observacoes", label: "Histórico de Recibos / Obs", value: p.observacoes, kind: "textarea" },
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

                    {/* Excluir */}
                    {isPendente && (
                      <form action={excluirPagamento} className="inline">
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
            Nenhum lançamento no caixa.
          </div>
        )}
      </div>
    </div>
  );
}