import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

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

function formatarDataBR(dataRaw: string | null | undefined): string {
  if (!dataRaw) return "—";
  try {
    const dataObj = new Date(dataRaw + (dataRaw.includes("T") ? "" : "T00:00:00"));
    if (isNaN(dataObj.getTime())) return "—";
    return dataObj.toLocaleDateString("pt-BR");
  } catch {
    return "—";
  }
}

export default async function ReciboPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tipo?: string }>;
}) {
  try {
    const { id } = await params;
    const { tipo } = await searchParams;
    const supabase = await createClient();

    let dadosRecibo: any = null;

    if (tipo === "movimentacao") {
      // 1. Busca a movimentação individual do PDV
      const { data: mov, error: movErr } = await supabase
        .from("movimentacoes_pagamento")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (movErr || !mov) {
        console.error("Erro ao buscar movimentação:", movErr?.message);
        notFound();
      }

      // 2. Busca o pagamento pai e o contrato vinculado
      const { data: pagamento, error: pagErr } = await supabase
        .from("pagamentos")
        .select(`
          *,
          contratos (
            *,
            imoveis (*),
            inquilinos (*)
          )
        `)
        .eq("id", mov.pagamento_id)
        .maybeSingle();

      if (pagErr || !pagamento) {
        console.error("Erro ao buscar pagamento pai:", pagErr?.message);
        notFound();
      }

      const contrato = Array.isArray(pagamento?.contratos) ? pagamento.contratos[0] : pagamento?.contratos;

      dadosRecibo = {
        titulo: "RECIBO DE PAGAMENTO",
        subtitulo: "Comprovante de Entrada Financeira / PDV",
        codigo: contrato?.codigo || contrato?.codigo_contrato || "—",
        inquilino: contrato?.inquilinos?.nome || "Inquilino não informado",
        cpfCnpj: contrato?.inquilinos?.cpf || contrato?.inquilinos?.cnpj || "—",
        enderecoImovel: formatarEnderecoImovel(contrato?.imoveis),
        competencia: formatarDataBR(pagamento?.competencia),
        valorBase: Number(pagamento?.valor_base || 0),
        valorRecebido: Number(mov.valor_pago || 0),
        formaPagamento: mov.forma_pagamento || "PIX",
        dataPagamento: formatarDataBR(mov.data_pagamento),
        saldoAnterior: Number(mov.saldo_anterior || 0),
        saldoRestante: Number(mov.saldo_restante || 0),
        observacoes: mov.observacoes || "—",
      };
    } else {
      // Busca pelo ID geral do pagamento
      const { data: pagamento, error: pagErr } = await supabase
        .from("pagamentos")
        .select(`
          *,
          contratos (
            *,
            imoveis (*),
            inquilinos (*)
          )
        `)
        .eq("id", id)
        .maybeSingle();

      if (pagErr || !pagamento) {
        notFound();
      }

      const contrato = Array.isArray(pagamento?.contratos) ? pagamento.contratos[0] : pagamento?.contratos;
      const valorBase = Number(pagamento?.valor_base || 0);
      const valorPago = Number(pagamento?.valor_pago || 0);

      dadosRecibo = {
        titulo: "RECIBO DE PARCELA / ALUGUEL",
        subtitulo: "Comprovante Geral de Lançamento",
        codigo: contrato?.codigo || contrato?.codigo_contrato || "—",
        inquilino: contrato?.inquilinos?.nome || "Inquilino não informado",
        cpfCnpj: contrato?.inquilinos?.cpf || contrato?.inquilinos?.cnpj || "—",
        enderecoImovel: formatarEnderecoImovel(contrato?.imoveis),
        competencia: formatarDataBR(pagamento?.competencia),
        valorBase,
        valorRecebido: valorPago,
        formaPagamento: "Diversas",
        dataPagamento: formatarDataBR(pagamento?.data_pagamento),
        saldoAnterior: valorBase,
        saldoRestante: Math.max(0, valorBase - valorPago),
        observacoes: pagamento?.observacoes || "—",
      };
    }

    return (
      <div className="min-h-screen bg-gray-100 p-6 print:p-0 print:bg-white flex flex-col items-center">
        {/* Botão de Impressão */}
        <div className="mb-6 print:hidden flex gap-3">
          <button
            onClick={() => window.print()}
            className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-6 py-2.5 rounded shadow transition cursor-pointer"
          >
            🖨️ Imprimir Recibo
          </button>
        </div>

        {/* Modelo de Recibo A4 / Impressora Térmica */}
        <div className="bg-white border-2 border-gray-800 rounded-lg p-8 w-full max-w-2xl shadow-lg print:shadow-none print:border-black print:w-full">
          <div className="border-b-2 border-gray-800 pb-4 mb-6 flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold uppercase tracking-wide text-gray-900">{dadosRecibo.titulo}</h1>
              <p className="text-xs text-gray-600">{dadosRecibo.subtitulo}</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-gray-500 block">Contrato Nº</span>
              <span className="text-sm font-mono font-bold">{dadosRecibo.codigo}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
            <div>
              <span className="text-xs text-gray-500 block">Inquilino (Pagador)</span>
              <strong className="text-gray-900 block">{dadosRecibo.inquilino}</strong>
              <span className="text-xs text-gray-600">CPF/CNPJ: {dadosRecibo.cpfCnpj}</span>
            </div>
            <div>
              <span className="text-xs text-gray-500 block">Imóvel</span>
              <span className="text-gray-900 font-medium block">{dadosRecibo.enderecoImovel}</span>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-300 rounded p-4 mb-6 grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-xs text-gray-500 block">Competência (Mês)</span>
              <strong>{dadosRecibo.competencia}</strong>
            </div>
            <div>
              <span className="text-xs text-gray-500 block">Data do Pagamento</span>
              <strong>{dadosRecibo.dataPagamento}</strong>
            </div>
            <div>
              <span className="text-xs text-gray-500 block">Forma de Pagamento</span>
              <strong className="text-emerald-700">{dadosRecibo.formaPagamento}</strong>
            </div>
            <div>
              <span className="text-xs text-gray-500 block">Valor Total do Aluguel</span>
              <span>R$ {dadosRecibo.valorBase.toFixed(2)}</span>
            </div>
          </div>

          {/* Detalhes da Entrada PDV */}
          <div className="border-2 border-emerald-600 bg-emerald-50 rounded p-4 mb-6 text-center">
            <span className="text-xs font-semibold uppercase text-emerald-800 tracking-wider block">Valor Recebido Nesta Entrada</span>
            <span className="text-3xl font-extrabold text-emerald-900 block my-1">
              R$ {dadosRecibo.valorRecebido.toFixed(2)}
            </span>
            <div className="flex justify-center gap-6 mt-2 pt-2 border-t border-emerald-200 text-xs text-gray-700">
              <span>Saldo Anterior: <strong>R$ {dadosRecibo.saldoAnterior.toFixed(2)}</strong></span>
              <span>Saldo Restante a Pagar: <strong className="text-amber-800">R$ {dadosRecibo.saldoRestante.toFixed(2)}</strong></span>
            </div>
          </div>

          {dadosRecibo.observacoes !== "—" && (
            <div className="mb-6 text-xs text-gray-600 border-l-2 border-gray-400 pl-3 italic">
              Obs: {dadosRecibo.observacoes}
            </div>
          )}

          {/* Assinatura */}
          <div className="mt-12 pt-8 border-t border-gray-400 flex justify-between items-end text-xs text-gray-600">
            <div>
              <span>Data de emissão: {new Date().toLocaleDateString("pt-BR")}</span>
            </div>
            <div className="text-center w-48 border-t border-gray-800 pt-1">
              <span>Assinatura do Recebedor</span>
            </div>
          </div>
        </div>
      </div>
    );
  } catch (err: any) {
    console.error("Erro crítico na renderização do recibo:", err);
    return (
      <div className="p-8 text-center">
        <h2 className="text-lg font-bold text-red-600 mb-2">Erro ao gerar o recibo</h2>
        <p className="text-sm text-gray-700">{err?.message || "Erro desconhecido no servidor."}</p>
      </div>
    );
  }
}