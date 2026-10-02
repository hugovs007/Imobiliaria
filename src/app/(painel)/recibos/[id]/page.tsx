import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { PrintButton } from "./print-button";

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

function calcularIdentificacaoParcela(contrato: any, competencia: string): string {
  if (!contrato?.data_inicio || !contrato?.data_fim || !competencia) return "—";
  try {
    const dataInicio = new Date(contrato.data_inicio);
    const dataFim = new Date(contrato.data_fim);
    const dataCompetencia = new Date(competencia);
    
    if (isNaN(dataInicio.getTime()) || isNaN(dataFim.getTime()) || isNaN(dataCompetencia.getTime())) {
      return "—";
    }

    const diferencaMeses = (dataFim.getFullYear() - dataInicio.getFullYear()) * 12 + dataFim.getMonth() - dataInicio.getMonth();
    const mesesContrato = Math.max(1, diferencaMeses + (dataFim.getDate() >= dataInicio.getDate() ? 1 : 0));
    const parcelaAtual = (dataCompetencia.getFullYear() - dataInicio.getFullYear()) * 12 + dataCompetencia.getMonth() - dataInicio.getMonth() + 1;
    
    if (mesesContrato > 0 && parcelaAtual > 0 && parcelaAtual <= mesesContrato) {
      return `${String(parcelaAtual).padStart(2, "0")}/${String(mesesContrato).padStart(2, "0")}`;
    }
  } catch {
    return "—";
  }
  return "—";
}

export default async function ReciboPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  try {
    const params = await props.params;
    const searchParams = await props.searchParams;
    
    const id = params?.id;
    const tipo = searchParams?.tipo;

    if (!id) {
      notFound();
    }

    const supabase = await createClient();
    let dadosRecibo: any = null;

    if (tipo === "movimentacao") {
      const { data: mov, error: movErr } = await supabase
        .from("movimentacoes_pagamento")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (movErr || !mov) {
        notFound();
      }

      const { data: pagamento, error: pagErr } = await supabase
        .from("pagamentos")
        .select("*")
        .eq("id", mov.pagamento_id)
        .maybeSingle();

      if (pagErr || !pagamento) {
        notFound();
      }

      const { data: contrato } = await supabase
        .from("contratos")
        .select("*")
        .eq("id", pagamento.contrato_id)
        .maybeSingle();

      let imovel = null;
      if (contrato?.imovel_id) {
        const { data: imovData } = await supabase.from("imoveis").select("*").eq("id", contrato.imovel_id).maybeSingle();
        imovel = imovData;
      }

      let inquilino = null;
      if (contrato?.inquilino_id) {
        const { data: inqData } = await supabase.from("inquilinos").select("*").eq("id", contrato.inquilino_id).maybeSingle();
        inquilino = inqData;
      }

      const parcelaFormatada = calcularIdentificacaoParcela(contrato, pagamento?.competencia);

      dadosRecibo = {
        titulo: "RECIBO DE PAGAMENTO",
        subtitulo: `Comprovante de Entrada Financeira / PDV (Parcela ${parcelaFormatada})`,
        codigo: contrato?.codigo || contrato?.codigo_contrato || contrato?.id?.slice(0, 8) || "—",
        inquilino: inquilino?.nome || "Inquilino não informado",
        cpfCnpj: inquilino?.cpf || inquilino?.cnpj || "—",
        enderecoImovel: formatarEnderecoImovel(imovel),
        competencia: formatarDataBR(pagamento?.competencia),
        parcela: parcelaFormatada,
        valorBase: Number(pagamento?.valor_base || 0),
        valorRecebido: Number(mov.valor_pago || 0),
        formaPagamento: mov.forma_pagamento || "PIX",
        dataPagamento: formatarDataBR(mov.data_pagamento),
        saldoAnterior: Number(mov.saldo_anterior || 0),
        saldoRestante: Number(mov.saldo_restante || 0),
        observacoes: mov.observacoes || "—",
      };
    } else {
      const { data: pagamento, error: pagErr } = await supabase
        .from("pagamentos")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (pagErr || !pagamento) {
        notFound();
      }

      let contrato = null;
      if (pagamento.contrato_id) {
        const { data: contData } = await supabase.from("contratos").select("*").eq("id", pagamento.contrato_id).maybeSingle();
        contrato = contData;
      }

      let imovel = null;
      if (contrato?.imovel_id) {
        const { data: imovData } = await supabase.from("imoveis").select("*").eq("id", contrato.imovel_id).maybeSingle();
        imovel = imovData;
      }

      let inquilino = null;
      if (contrato?.inquilino_id) {
        const { data: inqData } = await supabase.from("inquilinos").select("*").eq("id", contrato.inquilino_id).maybeSingle();
        inquilino = inqData;
      }

      const valorBase = Number(pagamento?.valor_base || 0);
      const valorPago = Number(pagamento?.valor_pago || 0);
      const parcelaFormatada = calcularIdentificacaoParcela(contrato, pagamento?.competencia);

      dadosRecibo = {
        titulo: "RECIBO DE PARCELA / ALUGUEL",
        subtitulo: `Comprovante Geral de Lançamento (Parcela ${parcelaFormatada})`,
        codigo: contrato?.codigo || contrato?.codigo_contrato || contrato?.id?.slice(0, 8) || "—",
        inquilino: inquilino?.nome || "Inquilino não informado",
        cpfCnpj: inquilino?.cpf || inquilino?.cnpj || "—",
        enderecoImovel: formatarEnderecoImovel(imovel),
        competencia: formatarDataBR(pagamento?.competencia),
        parcela: parcelaFormatada,
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
      <div className="min-h-screen bg-gray-100 p-6 print:p-0 print:m-0 print:bg-white flex flex-col items-center">
        {/* Botão de Impressão (Oculto na Impressão) */}
        <div className="mb-6 print:hidden flex gap-3">
          <PrintButton />
        </div>

        {/* Modelo de Recibo */}
        <div className="bg-white border-2 border-gray-800 rounded-lg p-8 w-full max-w-2xl shadow-lg print:shadow-none print:border-black print:w-full print:m-0 print:absolute print:inset-0 print:rounded-none">
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

          <div className="bg-gray-50 border border-gray-300 rounded p-4 mb-6 grid grid-cols-3 gap-4 text-sm print:bg-white print:border-black">
            <div>
              <span className="text-xs text-gray-500 block">Parcela</span>
              <strong className="text-emerald-700 text-base">{dadosRecibo.parcela}</strong>
            </div>
            <div>
              <span className="text-xs text-gray-500 block">Competência (Mês)</span>
              <strong>{dadosRecibo.competencia}</strong>
            </div>
            <div>
              <span className="text-xs text-gray-500 block">Data do Pagamento</span>
              <strong>{dadosRecibo.dataPagamento}</strong>
            </div>
            <div className="col-span-1.5">
              <span className="text-xs text-gray-500 block">Forma de Pagamento</span>
              <strong className="text-emerald-700">{dadosRecibo.formaPagamento}</strong>
            </div>
            <div className="col-span-1.5">
              <span className="text-xs text-gray-500 block">Valor Total do Aluguel</span>
              <span>R$ {dadosRecibo.valorBase.toFixed(2)}</span>
            </div>
          </div>

          <div className="border-2 border-emerald-600 bg-emerald-50 rounded p-4 mb-6 text-center print:bg-white print:border-black">
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
    console.error("Erro interno ao renderizar recibo:", err);
    return (
      <div className="p-8 text-center bg-white min-h-screen flex flex-col items-center justify-center">
        <h2 className="text-xl font-bold text-red-600 mb-2">Erro ao carregar o recibo</h2>
        <p className="text-sm text-gray-600 max-w-md">Detalhes: {err?.message || "Ocorreu um erro inesperado ao processar os dados do recibo."}</p>
      </div>
    );
  }
}