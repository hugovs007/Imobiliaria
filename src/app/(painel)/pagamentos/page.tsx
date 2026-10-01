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
        <PageHeader title="PDV — Recebimento e Caixa" subtitle="Caixa de recebimentos de aluguéis e emissão de recibos." />
        <Alert variant="destructive" className="mt-4">
          <strong>Erro ao carregar dados:</strong> {error}
        </Alert>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="PDV — Recebimento e Caixa" subtitle="Lançamento de movimentações financeiras, caixa e impressão de recibos." />

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
                label: `${c.codigo || c.codigo_contrato || c.id.slice(0, 8)} — R$ ${Number(c.valor_aluguel || 0).toFixed(2)} — ${(c.inquilinos as any)?.nome || "Inquilino"}`,
              }))}
            />
            <Field label="Competência (mês)" name="competencia" type="month" required />
            <Field label="Valor base (opcional)" name="valor_base" type="number" step="0.01" placeholder="Automático do contrato" />
            <Field label="Data de vencimento (opcional)" name="data_vencimento" type="date" />
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
                Gera cobranças para todos os contratos ativos usando o valor do aluguel cadastrado.
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

      {/* Tabela de Recebimento PDV */}
      <div className="mt-8">
        <Table head={["Competência", "Contrato / Imóvel", "Inquilino", "Valor aluguel", "Total pago", "Saldo a pagar", "Status", "Lançar Entrada PDV (Recebimento)", "Recibo Impresso"]}>
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
                <td className="px-4 py-2.5">
                  {!isPago && !p.status?.includes("isento") ? (
                    <form action={registrarPagamento} className="flex flex-col gap-1.5 p-2 bg-slate-50 border rounded-md">
                      <input type="hidden" name="id" value={String(p.id)} />
                      <div className="flex items-center gap-1">
                        <input
                          name="valor_pago"
                          type="number"
                          step="0.01"
                          placeholder="Valor recebido"
                          defaultValue={saldoRestante || valorBase}
                          required
                          className="w-28 rounded border px-2 py-1 text-xs bg-white font-bold"
                        />
                        <select
                          name="forma_pagamento"
                          className="rounded border px-2 py-1 text-xs bg-white"
                          defaultValue="PIX"
                        >
                          <option value="PIX">PIX</option>
                          <option value="Dinheiro">Dinheiro</option>
                          <option value="Cartão de Débito">Débito</option>
                          <option value="Cartão de Crédito">Crédito</option>
                          <option value="Transferência Bancária">Transferência</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-1">
                        <input
                          name="data_pagamento"
                          type="date"
                          required
                          defaultValue={new Date().toISOString().split("T")[0]}
                          className="rounded border px-1.5 py-1 text-xs bg-white"
                        />
                        <input
                          name="observacoes"
                          type="text"
                          placeholder="Obs (opcional)"
                          className="w-full rounded border px-1.5 py-1 text-xs bg-white"
                        />
                        <Button variant="primary">Confirmar e Gerar Recibo</Button>
                      </div>
                    </form>
                  ) : (
                    <span className="text-xs text-gray-500 italic">Lançamentos finalizados</span>
                  )}
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
              </tr>
            );
          })}
        </Table>

        {pagamentos.length === 0 && (
          <div className="mt-8 text-center py-12" style={{ color: "var(--color-ink-soft)" }}>
            Nenhum lançamento encontrado no caixa.
          </div>
        )}
      </div>
    </div>
  );
}