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
    imoveis: {
      endereco: string;
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
      "id, competencia, valor_devido, valor_pago, data_pagamento, forma_pagamento, status, contratos(imoveis(endereco, proprietarios(nome)), inquilinos(nome, cpf_cnpj))"
    )
    .eq("id", id)
    .maybeSingle();

  const pagamento = data as unknown as PagamentoRecibo | null;
  if (!pagamento || pagamento.status !== "pago") notFound();

  const contrato = pagamento.contratos;
  const imovel = contrato?.imoveis;
  const inquilino = contrato?.inquilinos;
  const valorPago = pagamento.valor_pago ?? pagamento.valor_devido;
  const competencia = new Date(`${pagamento.competencia.slice(0, 10)}T00:00:00`).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  return (
    <main className="min-h-screen bg-white px-4 py-8 text-neutral-900 sm:py-12 print:min-h-0 print:px-0 print:py-0">
      <div className="mx-auto max-w-3xl">
        <div className="mb-5 flex items-center justify-between gap-4 print:hidden">
          <Link href="/pagamentos" className="text-sm underline" style={{ color: "var(--color-ink-soft)" }}>
            Voltar aos pagamentos
          </Link>
          <PrintButton />
        </div>

        <article className="border border-neutral-300 bg-white p-6 sm:p-12 print:border-0 print:p-0">
          <header className="flex flex-wrap items-start justify-between gap-4 border-b border-neutral-300 pb-6">
            <div>
              <p className="text-xs font-semibold uppercase text-neutral-500">Gestão de Aluguéis</p>
              <h1 className="mt-2 text-3xl font-semibold">Recibo de pagamento</h1>
              <p className="mt-2 text-sm text-neutral-600">Recibo de aluguel</p>
            </div>
            <p className="text-sm text-neutral-500">Nº {pagamento.id.slice(0, 8).toUpperCase()}</p>
          </header>

          <section className="space-y-6 py-8">
            <p className="text-base leading-7">
              Recebemos de <strong>{inquilino?.nome ?? "Inquilino"}</strong>
              {inquilino?.cpf_cnpj ? `, CPF/CNPJ ${inquilino.cpf_cnpj},` : ""} a importância de{" "}
              <strong>{moeda(valorPago)}</strong>, referente ao aluguel do imóvel localizado em{" "}
              <strong>{imovel?.endereco ?? "endereço não informado"}</strong>, competência de{" "}
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
                <dt className="text-xs uppercase text-neutral-500">Valor recebido</dt>
                <dd className="mt-1 text-lg font-semibold">{moeda(valorPago)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-neutral-500">Competência</dt>
                <dd className="mt-1 font-medium">{competencia}</dd>
              </div>
            </dl>

            <p className="text-sm leading-6 text-neutral-700">
              Para os devidos fins, declaramos que o valor acima foi recebido integralmente para a competência indicada.
            </p>
          </section>

          <footer className="mt-16 grid grid-cols-1 gap-10 text-center sm:grid-cols-2">
            <div className="border-t border-neutral-400 pt-2">
              <p className="text-sm">{inquilino?.nome ?? "Inquilino"}</p>
              <p className="mt-1 text-xs text-neutral-500">Pagador</p>
            </div>
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
