import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button, Card, Field, Money, PageHeader, Select, StatusBadge, Table, Alert } from "@/components/ui";
import { RecordEditor } from "@/components/record-editor";
import { lancarCobranca, lancarCobrancasEmLote, registrarPagamento, marcarIsento, atualizarStatusPagamento, excluirPagamento, atualizarAtrasados } from "./actions";

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
          "id, competencia, valor_devido, valor_pago, data_vencimento, data_pagamento, forma_pagamento, status, observacoes, contratos(id, codigo_contrato, data_inicio, data_fim, valor_aluguel_atual, dia_vencimento, imoveis(endereco, numero, bairro, cidade, estado), inquilinos(nome, cpf_cnpj))"
        )
        .order("competencia", { ascending: false }),
      supabase
        .from("contratos")
        .select("id, codigo_contrato, status, contrato_anterior_id, valor_aluguel_atual, dia_vencimento, data_inicio, data_fim, imoveis(endereco, numero, bairro, cidade, estado), inquilinos(nome, cpf_cnpj)"),
    ]);

    if (pagamentosError) throw pagamentosError;
    if (contratosError) throw contratosError;

    pagamentos = pagamentosData ?? [];
    contratos = contratosData ?? [];
  } catch (err: any) {
    console.error("Erro ao carregar pagamentos:", err);
    error = err.message || "Erro ao carregar dados. Verifique as variáveis de ambiente do Supabase.";
  }

  const contratosComSucessor = new Set(
    (contratos ?? []).flatMap((contrato) => contrato.contrato_anterior_id ? [contrato.contrato_anterior_id] : [])
  );
  const contratosVigentes = (contratos ?? []).filter(
    (contrato) => ["ativo", "renovado"].includes(contrato.status) && !contratosComSucessor.has(contrato.id)
  );

  // Estatísticas
  const stats = {
    total: pagamentos.length,
    pagos: pagamentos.filter(p => p.status === "pago").length,
    pendentes: pagamentos.filter(p => p.status === "pendente").length,
    atrasados: pagamentos.filter(p => p.status === "atrasado").length,
    isentos: pagamentos.filter(p => p.status === "isento").length,
    valorTotalDevido: pagamentos.reduce((sum, p) => sum + (p.valor_devido || 0), 0),
    valorTotalPago: pagamentos.reduce((sum, p) => sum + (p.valor_pago || 0), 0),
    valorTotalPendente: pagamentos
      .filter(p => p.status !== "pago" && p.status !== "isento")
      .reduce((sum, p) => sum + (p.valor_devido || 0) - (p.valor_pago || 0), 0),
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

      {/* Estatísticas */}
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

      {/* Ações rápidas */}
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
                label: `${c.codigo_contrato} — ${(c.imoveis as any)?.endereco}, ${(c.imoveis as any)?.numero} — ${(c.inquilinos as any)?.nome}`,
              }))}
            />
            <Field label="Competência (mês)" name="competencia" type="month" required />
            <Field label="Valor devido (R$)" name="valor_devido" type="number" step="0.01" required />
            <Field label="Data de vencimento" name="data_vencimento" type="date" required />
            <div className="sm:col-span-2">
              <Button>Lançar cobrança</Button>
            </div>
          </form>
        </Card>

        <Card>
          <h3 className="mb-4 font-medium" style={{ color: "var(--color-ink)" }}>Lançar cobranças em lote</h3>
          <form action={lancarCobrancasEmLote} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Competência (mês)" name="competencia" type="month" required />
            <Field label="Dia de vencimento padrão" name="dia_vencimento" type="number" defaultValue={10} step="1" required />
            <div className="sm:col-span-2">
              <p className="text-xs mb-2" style={{ color: "var(--color-ink-soft)" }}>
                Gera cobranças para todos os contratos vigentes usando o valor atual do aluguel e o dia de vencimento de cada contrato.
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

      {/* Tabela de pagamentos */}
      <div className="mt-8">
        <Table head={["Competência", "Contrato", "Imóvel", "Inquilino", "Valor devido", "Valor pago", "Saldo", "Parcela", "Vencimento", "Pagamento", "Forma", "Status", "Ações"]}>
          {(pagamentos ?? []).map((p) => {
            const contrato = Array.isArray(p.contratos) ? p.contratos[0] : p.contratos;
            const imovel = contrato?.imoveis;
            const inquilino = contrato?.inquilinos;
            const saldo = Math.max(0, (p.valor_devido || 0) - (p.valor_pago || 0));
            const isPago = p.status === "pago";
            const isAtrasado = p.status === "atrasado";
            const isPendente = p.status === "pendente";

            // Calcula identificação da parcela (ex: 03/12)
            let identificacaoParcela = "—";
            if (contrato?.data_inicio && contrato?.data_fim) {
              const dataInicio = new Date(contrato.data_inicio);
              const dataFim = new Date(contrato.data_fim);
              const dataCompetencia = new Date(p.competencia);
              const diferencaMeses = (dataFim.getFullYear() - dataInicio.getFullYear()) * 12 + dataFim.getMonth() - dataInicio.getMonth();
              const mesesContrato = Math.max(1, diferencaMeses + (dataFim.getDate() >= dataInicio.getDate() ? 1 : 0));
              const parcelaAtual = (dataCompetencia.getFullYear() - dataInicio.getFullYear()) * 12 + dataCompetencia.getMonth() - dataInicio.getMonth() + 1;
              if (mesesContrato > 0 && parcelaAtual > 0 && parcelaAtual <= mesesContrato) {
                identificacaoParcela = `${String(parcelaAtual).padStart(2, "0")}/${String(mesesContrato).padStart(2, "0")}`;
              }
            }

            return (
              <tr key={p.id} style={{ borderTop: "1px solid var(--color-line)" }}>
                <td className="px-4 py-2.5 whitespace-nowrap">
                  {new Date(p.competencia).toLocaleDateString("pt-BR", { month: "2-digit", year: "numeric" })}
                </td>
                <td className="px-4 py-2.5">
                  {contrato?.codigo_contrato}
                </td>
                <td className="px-4 py-2.5">
                  {imovel?.endereco}{imovel?.numero && `, ${imovel.numero}`}
                  {imovel?.bairro && ` - ${imovel.bairro}`}
                  {imovel?.cidade && ` - ${imovel.cidade}/${imovel.estado}`}
                </td>
                <td className="px-4 py-2.5">
                  {inquilino?.nome}
                </td>
                <td className="px-4 py-2.5">
                  <Money value={p.valor_devido} />
                </td>
                <td className="px-4 py-2.5">
                  {p.valor_pago != null ? <Money value={p.valor_pago} /> : "—"}
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
                <td className="px-4 py-2.5 whitespace-nowrap">
                  {new Date(p.data_vencimento).toLocaleDateString("pt-BR")}
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap">
                  {p.data_pagamento ? new Date(p.data_pagamento).toLocaleDateString("pt-BR") : "—"}
                </td>
                <td className="px-4 py-2.5">
                  {p.forma_pagamento || "—"}
                </td>
                <td className="px-4 py-2.5">
                  <StatusBadge status={p.status} />
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Baixa de pagamento */}
                    {!isPago && !p.status.includes("isento") && (
                      <form action={registrarPagamento} className="flex flex-wrap items-center gap-1">
                        <input type="hidden" name="id" value={String(p.id)} />
                        <input
                          name="valor_pago"
                          type="number"
                          step="0.01"
                          placeholder="Valor"
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
                        <input
                          name="forma_pagamento"
                          placeholder="Forma (opcional)"
                          className="w-28 rounded-sm border px-2 py-1 text-xs"
                          style={{ borderColor: "var(--color-line)" }}
                        />
                        <Button variant="ghost">Confirmar</Button>
                      </form>
                    )}

                    {/* Marcar isento */}
                    {isPendente && (
                      <form action={marcarIsento} className="inline">
                        <input type="hidden" name="id" value={String(p.id)} />
                        <Button variant="ghost">
                          Isentar
                        </Button>
                      </form>
                    )}

                    {/* Recibo */}
                    {isPago && (
                      <Link
                        href={`/recibos/${p.id}`}
                        className="inline-block text-xs font-medium underline"
                        style={{ color: "var(--color-teal)" }}
                      >
                        Recibo
                      </Link>
                    )}

                    {/* Editor de registro */}
                    <RecordEditor
                      entity="pagamentos"
                      id={String(p.id)}
                      fields={[
                        { name: "competencia", label: "Competência", value: p.competencia.slice(0, 7), type: "month", required: true },
                        { name: "valor_devido", label: "Valor devido (R$)", value: p.valor_devido, type: "number", step: "0.01", required: true },
                        { name: "valor_pago", label: "Valor pago (R$)", value: p.valor_pago, type: "number", step: "0.01" },
                        { name: "data_vencimento", label: "Vencimento", value: p.data_vencimento, type: "date", required: true },
                        { name: "data_pagamento", label: "Data do pagamento", value: p.data_pagamento, type: "date" },
                        { name: "forma_pagamento", label: "Forma de pagamento", value: p.forma_pagamento },
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

                    {/* Excluir */}
                    {isPendente && (
                      <form action={excluirPagamento} className="inline" onSubmit={(e) => { if (!confirm("Excluir este pagamento?")) e.preventDefault(); }}>
                        <input type="hidden" name="id" value={String(p.id)} />
                        <Button variant="ghost">
                          Excluir
                        </Button>
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