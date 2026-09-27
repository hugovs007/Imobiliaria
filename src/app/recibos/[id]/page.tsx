import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/components/print-button";

type PagamentoRecibo = {
  id: string;
  competencia: string;
  valor_devido: number;
  valor_pago: number | null;
  data_pagamento: string | null;
  forma_pagamento: string | null;
  status: string;
  contratos: {
    data_inicio: string;
    data_fim: string | null;
    imoveis: {
      endereco: string;
      numero: string | null;
      complemento: string | null;
      bairro: string | null;
      cidade: string;
      estado: string;
      cep: string | null;
      proprietarios: { nome: string } | null;
    } | null;
    inquilinos: { nome: string; cpf_cnpj: string | null } | null;
  } | null;
};

function moeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function dataPtBr(valor: string) {
  return new Date(`${valor.slice(0, 10)}T00:00:00`).toLocaleDateString("pt-BR");
}

export default async function ReciboPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("pagamentos")
    .select(
      "id, competencia, valor_devido, valor_pago, data_pagamento, forma_pagamento, status, contratos(data_inicio, data_fim, imoveis(endereco, numero, complemento, bairro, cidade, estado, cep, proprietarios(nome)), inquilinos(nome, cpf_cnpj))"
    )
    .eq("id", id)
    .maybeSingle();

  const pagamento = data as unknown as PagamentoRecibo | null;
  if (!pagamento || pagamento.status !== "pago") notFound();

  const contrato = pagamento.contratos;
  const imovel = contrato?.imoveis;
  const inquilino = contrato?.inquilinos;
  const valorPago = pagamento.valor_pago ?? pagamento.valor_devido;
  const saldoRestante = Math.max(0, pagamento.valor_devido - valorPago);
  const pagamentoParcial = saldoRestante > 0.009;
  const enderecoCompleto = [
    imovel?.endereco,
    imovel?.numero,
    imovel?.complemento,
    imovel?.bairro,
    imovel ? `${imovel.cidade}/${imovel.estado}` : null,
    imovel?.cep ? `CEP ${imovel.cep}` : null,
  ]
    .filter(Boolean)
    .join(", ");
  const competencia = new Date(`${pagamento.competencia.slice(0, 10)}T00:00:00`).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
  const dataCompetencia = new Date(`${pagamento.competencia.slice(0, 10)}T00:00:00`);
  const dataInicio = contrato ? new Date(`${contrato.data_inicio.slice(0, 10)}T00:00:00`) : null;
  const dataFim = contrato?.data_fim ? new Date(`${contrato.data_fim.slice(0, 10)}T00:00:00`) : null;
  const diferencaMeses =
    dataInicio && dataFim
      ? (dataFim.getFullYear() - dataInicio.getFullYear()) * 12 + dataFim.getMonth() - dataInicio.getMonth()
      : null;
  const mesesContrato =
    diferencaMeses !== null && dataInicio && dataFim
      ? Math.max(1, diferencaMeses + (dataFim.getDate() >= dataInicio.getDate() ? 1 : 0))
      : null;
  const parcelaAtual = dataInicio
    ? (dataCompetencia.getFullYear() - dataInicio.getFullYear()) * 12 + dataCompetencia.getMonth() - dataInicio.getMonth() + 1
    : null;
  const identificacaoParcela =
    mesesContrato && mesesContrato > 0 && parcelaAtual && parcelaAtual > 0 && parcelaAtual <= mesesContrato
      ? `${String(parcelaAtual).padStart(2, "0")}/${String(mesesContrato).padStart(2, "0")}`
      : null;
  const parcelasRestantes = mesesContrato && parcelaAtual ? mesesContrato - parcelaAtual : null;

  return (
    <main className="min-h-screen bg-white px-4 py-8 text-neutral-900 sm:py-12 print:min-h-0 print:px-0 print:py-0">
      <div className="mx-auto max-w-3xl">
        <div className="mb-5 flex items-center justify-between gap-4 print:hidden">
          <Link href="/" className="text-sm underline" style={{ color: "var(--color-ink-soft)" }}>
            Voltar ao painel
          </Link>
          <PrintButton />
        </div>

        <article className="border border-neutral-300 bg-white p-6 sm:p-12 print:border-0 print:p-0">
          <header className="border-b border-neutral-300 pb-6">
            <div className="flex items-start justify-between gap-4">
              <p className="text-xs font-semibold uppercase text-neutral-500">Gestão de Aluguéis</p>
              <p className="text-sm text-neutral-500">Nº {pagamento.id.slice(0, 8).toUpperCase()}</p>
            </div>
            <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h1 className="text-3xl font-semibold">Recibo de pagamento</h1>
                <p className="mt-1 text-sm text-neutral-600">Recibo de aluguel</p>
              </div>
              {identificacaoParcela && (
                <p className="text-right text-sm text-neutral-700">
                  {identificacaoParcela}
                </p>
              )}
              {parcelasRestantes !== null && (
                <p className="text-right text-sm text-neutral-700">
                  Parcelas restantes: {parcelasRestantes}
                </p>
              )}
            </div>
          </header>

          <section className="space-y-6 py-8">
            <p className="text-base leading-7">
              Recebemos de <strong>{inquilino?.nome ?? "Inquilino"}</strong>
              {inquilino?.cpf_cnpj ? `, CPF/CNPJ ${inquilino.cpf_cnpj},` : ""} a importância de{" "}
              <strong>{moeda(valorPago)}</strong>, referente ao aluguel do imóvel localizado em{" "}
              <strong>{enderecoCompleto || "endereço não informado"}</strong>, competência de{" "}
              <strong>{competencia}</strong>.
            </p>

            <dl className="grid grid-cols-1 gap-4 border-y border-neutral-200 py-5 sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase text-neutral-500">Pagador</dt>
                <dd className="mt-1 font-medium">{inquilino?.nome ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-neutral-500">Recebedor</dt>
                <dd className="mt-1 font-medium">{imovel?.proprietarios?.nome ?? "Proprietário do imóvel"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-neutral-500">Data do pagamento</dt>
                <dd className="mt-1 font-medium">{pagamento.data_pagamento ? dataPtBr(pagamento.data_pagamento) : "—"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-neutral-500">Forma de pagamento</dt>
                <dd className="mt-1 font-medium">{pagamento.forma_pagamento || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-neutral-500">Valor devido</dt>
                <dd className="mt-1 font-medium">{moeda(pagamento.valor_devido)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-neutral-500">Valor recebido</dt>
                <dd className="mt-1 text-lg font-semibold">{moeda(valorPago)}</dd>
              </div>
              {pagamentoParcial && (
                <div>
                  <dt className="text-xs uppercase text-neutral-500">Saldo restante</dt>
                  <dd className="mt-1 text-lg font-semibold text-red-700">{moeda(saldoRestante)}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs uppercase text-neutral-500">Competência</dt>
                <dd className="mt-1 font-medium">{competencia}</dd>
              </div>
            </dl>

            <p className="text-sm leading-6 text-neutral-700">
              {pagamentoParcial
                ? `Para os devidos fins, declaramos que o valor acima foi recebido como pagamento parcial da competência indicada, restando o saldo de ${moeda(saldoRestante)} a quitar.`
                : "Para os devidos fins, declaramos que o valor acima foi recebido integralmente para a competência indicada."}
            </p>
          </section>

          <footer className="mx-auto mt-16 max-w-sm text-center">
            <div className="border-t border-neutral-400 pt-2">
              <p className="text-sm">{imovel?.proprietarios?.nome ?? "Proprietário do imóvel"}</p>
              <p className="mt-1 text-xs text-neutral-500">Recebedor</p>
            </div>
          </footer>
        </article>
      </div>
    </main>
  );
}
