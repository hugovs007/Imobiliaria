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

  return partes.length > 0 ? partes.join(", ") : "Endereço não informado";
}

function numeroParaExtenso(valor: number): string {
  if (isNaN(valor) || valor <= 0) return "ZERO REAIS";
  
  const unidades = ["", "UM", "DOIS", "TRÊS", "QUATRO", "CINCO", "SEIS", "SETE", "OITO", "NOVE", "DEZ", "ONZE", "DOZE", "TREZE", "CATORZE", "QUINZE", "DEZESSEIS", "DEZESSETE", "DEZOITO", "DEZENOVE"];
  const dezenas = ["", "", "VINTE", "TRINTA", "QUARENTA", "CINQUENTA", "SESSENTA", "SETENTA", "OITENTA", "NOVENTA"];
  const centenas = ["", "CENTO", "DUZENTOS", "TREZENTOS", "QUATROCENTOS", "QUINHENTOS", "SEISCENTOS", "SETECENTOS", "OITOCENTOS", "NOVECENTOS"];

  function converterInteiro(num: number): string {
    if (num === 0) return "";
    if (num === 100) return "CEM";
    if (num < 20) return unidades[num];
    if (num < 100) {
      const d = Math.floor(num / 10);
      const u = num % 10;
      return dezenas[d] + (u > 0 ? " E " + unidades[u] : "");
    }
    const c = Math.floor(num / 100);
    const resto = num % 100;
    return centenas[c] + (resto > 0 ? " E " + converterInteiro(resto) : "");
  }

  const parteInteira = Math.floor(valor);
  const centavos = Math.round((valor - parteInteira) * 100);

  let resultado = "";
  if (parteInteira === 1) {
    resultado = "UM REAL";
  } else if (parteInteira > 0) {
    resultado = converterInteiro(parteInteira) + " REAIS";
  }

  if (centavos > 0) {
    resultado += (resultado ? " E " : "") + converterInteiro(centavos) + (centavos === 1 ? " CENTAVO" : " CENTAVOS");
  }

  return resultado;
}

function formatarDataPorExtenso(dataRaw: string | null | undefined): string {
  if (!dataRaw) return "—";
  try {
    const dataObj = new Date(dataRaw + (dataRaw.includes("T") ? "" : "T00:00:00"));
    if (isNaN(dataObj.getTime())) return "—";
    
    const meses = [
      "JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO",
      "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"
    ];
    
    const dia = String(dataObj.getDate()).padStart(2, "0");
    const mes = meses[dataObj.getMonth()];
    const ano = dataObj.getFullYear();
    
    return `${dia} de ${mes} de ${ano}`;
  } catch {
    return "—";
  }
}

function calcularIdentificacaoParcela(contrato: any, competencia: string): string {
  if (!contrato?.data_inicio || !contrato?.data_fim || !competencia) return "01/12";
  try {
    const dataInicio = new Date(contrato.data_inicio);
    const dataFim = new Date(contrato.data_fim);
    const dataCompetencia = new Date(competencia);
    
    if (isNaN(dataInicio.getTime()) || isNaN(dataFim.getTime()) || isNaN(dataCompetencia.getTime())) {
      return "01/12";
    }

    const diferencaMeses = (dataFim.getFullYear() - dataInicio.getFullYear()) * 12 + dataFim.getMonth() - dataInicio.getMonth();
    const mesesContrato = Math.max(1, diferencaMeses + (dataFim.getDate() >= dataInicio.getDate() ? 1 : 0));
    const parcelaAtual = (dataCompetencia.getFullYear() - dataInicio.getFullYear()) * 12 + dataCompetencia.getMonth() - dataInicio.getMonth() + 1;
    
    if (mesesContrato > 0 && parcelaAtual > 0 && parcelaAtual <= mesesContrato) {
      return `${String(parcelaAtual).padStart(2, "0")}/${String(mesesContrato).padStart(2, "0")}`;
    }
  } catch {
    return "01/12";
  }
  return "01/12";
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
      const valorRecebido = Number(mov.valor_pago || 0);

      dadosRecibo = {
        parcela: parcelaFormatada,
        valor: valorRecebido,
        valorExtenso: numeroParaExtenso(valorRecebido),
        inquilino: inquilino?.nome || "Inquilino não informado",
        competenciaTexto: formatarDataPorExtenso(pagamento?.competencia),
        enderecoImovel: formatarEnderecoImovel(imovel),
        tipoImovel: imovel?.tipo || "residencial",
        cidadeUf: `${imovel?.cidade || "Santa Luzia"} – ${imovel?.uf || imovel?.estado || "PB"}`,
        dataEmissao: formatarDataPorExtenso(mov.data_pagamento || new Date().toISOString().split("T")[0]),
        recebedor: "Paulo Sérgio de Souza Côrres",
        dataInicioPeriodo: pagamento?.competencia ? new Date(pagamento.competencia).toLocaleDateString("pt-BR") : "—",
        dataFimPeriodo: pagamento?.data_vencimento ? new Date(pagamento.data_vencimento).toLocaleDateString("pt-BR") : "—",
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

      const valorPago = Number(pagamento?.valor_pago || pagamento?.valor_base || 0);
      const parcelaFormatada = calcularIdentificacaoParcela(contrato, pagamento?.competencia);

      dadosRecibo = {
        parcela: parcelaFormatada,
        valor: valorPago,
        valorExtenso: numeroParaExtenso(valorPago),
        inquilino: inquilino?.nome || "Inquilino não informado",
        competenciaTexto: formatarDataPorExtenso(pagamento?.competencia),
        enderecoImovel: formatarEnderecoImovel(imovel),
        tipoImovel: imovel?.tipo || "residencial",
        cidadeUf: `${imovel?.cidade || "Santa Luzia"} – ${imovel?.uf || imovel?.estado || "PB"}`,
        dataEmissao: formatarDataPorExtenso(pagamento?.data_pagamento || new Date().toISOString().split("T")[0]),
        recebedor: "Paulo Sérgio de Souza Côrres",
        dataInicioPeriodo: pagamento?.competencia ? new Date(pagamento.competencia).toLocaleDateString("pt-BR") : "—",
        dataFimPeriodo: pagamento?.data_vencimento ? new Date(pagamento.data_vencimento).toLocaleDateString("pt-BR") : "—",
      };
    }

    return (
      <div className="min-h-screen bg-gray-100 p-6 print:p-0 print:m-0 print:bg-white flex flex-col items-center">
        {/* Botão de Impressão */}
        <div className="mb-6 print:hidden flex gap-3">
          <PrintButton />
        </div>

        {/* Recibo com o layout exato solicitado */}
        <div className="bg-white border-2 border-gray-400 rounded-md p-10 w-full max-w-2xl shadow-lg print:shadow-none print:border-none print:w-full print:m-0 print:absolute print:inset-0 font-serif text-black">
          
          {/* Cabeçalho */}
          <div className="flex justify-between items-center text-lg font-bold mb-10">
            <span>RECIBO {dadosRecibo.parcela}</span>
            <span>R$ {dadosRecibo.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
          </div>

          {/* Corpo do Recibo (Declaração) */}
          <div className="text-justify text-base leading-relaxed my-8 font-sans">
            Recebi de <span className="uppercase font-bold">{dadosRecibo.inquilino}</span> a quantia de{" "}
            <strong>R$ {dadosRecibo.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} ({dadosRecibo.valorExtenso})</strong>, referente ao aluguel do mês de <span className="uppercase font-bold">{dadosRecibo.competenciaTexto}</span>, de um imóvel {dadosRecibo.tipoImovel} localizado na {dadosRecibo.enderecoImovel}.
          </div>

          {/* Fechamento */}
          <div className="text-center text-base font-semibold my-12 font-sans">
            Para clareza, firmo o presente dando plena e total quitação.
          </div>

          {/* Cidade e Data */}
          <div className="text-center text-base my-12 font-sans">
            {dadosRecibo.cidadeUf}, {dadosRecibo.dataEmissao}
          </div>

          {/* Assinatura */}
          <div className="mt-16 pt-6 flex flex-col items-center">
            <div className="w-96 border-t-2 border-black mb-2"></div>
            <span className="font-bold text-base font-sans">{dadosRecibo.recebedor}</span>
          </div>

          {/* Período de Competência no Rodapé */}
          <div className="mt-16 text-right text-xs font-mono font-bold leading-tight">
            <div>De: {dadosRecibo.dataInicioPeriodo}</div>
            <div>A: {dadosRecibo.dataFimPeriodo}</div>
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