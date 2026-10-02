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

function formatarMesAnoExtenso(dataRaw: string | null | undefined): string {
  if (!dataRaw) return "—";
  try {
    const dataObj = new Date(dataRaw + (dataRaw.includes("T") ? "" : "T00:00:00"));
    if (isNaN(dataObj.getTime())) return "—";
    
    const meses = [
      "JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO",
      "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"
    ];
    
    const mes = meses[dataObj.getMonth()];
    const ano = dataObj.getFullYear();
    
    return `${mes} DE ${ano}`;
  } catch {
    return "—";
  }
}

function calcularIdentificacaoParcela(contrato: any, competencia: string): string {
  if (!contrato?.data_inicio || !competencia) return "01/12";
  try {
    const dataInicio = new Date(contrato.data_inicio + "T00:00:00");
    const dataCompetencia = new Date(competencia + "T00:00:00");
    
    if (isNaN(dataInicio.getTime()) || isNaN(dataCompetencia.getTime())) {
      return "01/12";
    }

    const diffAnos = dataCompetencia.getFullYear() - dataInicio.getFullYear();
    const diffMeses = dataCompetencia.getMonth() - dataInicio.getMonth();
    const parcelaAtual = diffAnos * 12 + diffMeses + 1;
    
    // Total de meses do contrato (padrão 12 meses por período)
    const mesesContrato = Number(contrato.periodicidade_reajuste_meses || 12);
    const parcelaExibida = Math.max(1, parcelaAtual <= mesesContrato ? parcelaAtual : ((parcelaAtual - 1) % mesesContrato) + 1);

    return `${String(parcelaExibida).padStart(2, "0")}/${String(mesesContrato).padStart(2, "0")}`;
  } catch {
    return "01/12";
  }
}

function calcularPeriodoMesVigente(competenciaRaw: string | null | undefined, diaVencimento: number = 10): { inicio: string; fim: string } {
  if (!competenciaRaw) return { inicio: "—", fim: "—" };
  try {
    const [anoStr, mesStr] = competenciaRaw.slice(0, 7).split("-");
    const ano = parseInt(anoStr, 10);
    const mes = parseInt(mesStr, 10) - 1; // 0 indexado

    // O período do mês vigente geralmente começa no dia de vencimento do mês anterior e vai até o vencimento do mês atual (ou do dia 1 ao fim do mês)
    const dataInicio = new Date(ano, mes - 1, diaVencimento);
    const dataFim = new Date(ano, mes, diaVencimento);
    dataFim.setDate(dataFim.getDate() - 1); // Dia anterior ao vencimento do mês atual

    return {
      inicio: dataInicio.toLocaleDateString("pt-BR"),
      fim: dataFim.toLocaleDateString("pt-BR"),
    };
  } catch {
    return { inicio: "—", fim: "—" };
  }
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
      const periodoVigencia = calcularPeriodoMesVigente(pagamento?.competencia, contrato?.dia_vencimento || 10);
      const valorBase = Number(pagamento?.valor_base || 0);
      const valorPago = Number(mov.valor_pago || 0);

      dadosRecibo = {
        titulo: `RECIBO ${parcelaFormatada}`,
        codigo: contrato?.codigo || contrato?.codigo_contrato || contrato?.id?.slice(0, 8) || "—",
        inquilino: inquilino?.nome || "Inquilino não informado",
        cpfCnpj: inquilino?.cpf || inquilino?.cnpj || "—",
        enderecoImovel: formatarEnderecoImovel(imovel),
        competenciaTexto: formatarMesAnoExtenso(pagamento?.competencia),
        tipoImovel: imovel?.tipo || "residencial",
        valorBase,
        valorRecebido: valorPago,
        valorRecebidoExtenso: numeroParaExtenso(valorPago),
        formaPagamento: mov.forma_pagamento || "PIX",
        dataPagamento: formatarDataBR(mov.data_pagamento),
        dataPagamentoExtenso: formatarDataBR(mov.data_pagamento),
        saldoAnterior: Number(mov.saldo_anterior || 0),
        saldoRestante: Number(mov.saldo_restante || 0),
        observacoes: mov.observacoes || "—",
        periodoInicio: periodoVigencia.inicio,
        periodoFim: periodoVigencia.fim,
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
      const valorPago = Number(pagamento?.valor_pago || valorBase);
      const parcelaFormatada = calcularIdentificacaoParcela(contrato, pagamento?.competencia);
      const periodoVigencia = calcularPeriodoMesVigente(pagamento?.competencia, contrato?.dia_vencimento || 10);

      dadosRecibo = {
        titulo: `RECIBO ${parcelaFormatada}`,
        codigo: contrato?.codigo || contrato?.codigo_contrato || contrato?.id?.slice(0, 8) || "—",
        inquilino: inquilino?.nome || "Inquilino não informado",
        cpfCnpj: inquilino?.cpf || inquilino?.cnpj || "—",
        enderecoImovel: formatarEnderecoImovel(imovel),
        competenciaTexto: formatarMesAnoExtenso(pagamento?.competencia),
        tipoImovel: imovel?.tipo || "residencial",
        valorBase,
        valorRecebido: valorPago,
        valorRecebidoExtenso: numeroParaExtenso(valorPago),
        formaPagamento: "Diversas",
        dataPagamento: formatarDataBR(pagamento?.data_pagamento),
        dataPagamentoExtenso: formatarDataBR(pagamento?.data_pagamento),
        saldoAnterior: valorBase,
        saldoRestante: Math.max(0, valorBase - valorPago),
        observacoes: pagamento?.observacoes || "—",
        periodoInicio: periodoVigencia.inicio,
        periodoFim: periodoVigencia.fim,
      };
    }

    return (
      <div className="min-h-screen bg-gray-100 p-6 print:p-0 print:m-0 print:bg-white flex flex-col items-center">
        {/* Botão de Impressão (Oculto na Impressão) */}
        <div className="mb-6 print:hidden flex gap-3">
          <PrintButton />
        </div>

        {/* Recibo Unificado (Caixas + Texto Clássico) */}
        <div className="bg-white border-2 border-gray-800 rounded-lg p-8 w-full max-w-2xl shadow-lg print:shadow-none print:border-black print:w-full print:m-0 print:absolute print:inset-0 print:rounded-none">
          
          {/* Cabeçalho */}
          <div className="border-b-2 border-gray-800 pb-4 mb-6 flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold uppercase tracking-wide text-gray-900">{dadosRecibo.titulo}</h1>
              <p className="text-xs text-gray-600">Comprovante Oficial de Aluguel e Quitação</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-gray-500 block">Contrato Nº</span>
              <span className="text-sm font-mono font-bold">{dadosRecibo.codigo}</span>
            </div>
          </div>

          {/* Dados do Inquilino e Imóvel */}
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

          {/* Bloco de Declaração Corrida (Texto Clássico Solicitado) */}
          <div className="bg-gray-50 border border-gray-300 rounded p-5 mb-6 text-justify text-base leading-relaxed font-sans print:bg-white print:border-black">
            Recebi da Sr(a). <strong className="uppercase">{dadosRecibo.inquilino}</strong> a quantia de{" "}
            <strong>R$ {dadosRecibo.valorRecebido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} ({dadosRecibo.valorRecebidoExtenso})</strong>, referente ao aluguel do mês de <strong className="uppercase">{dadosRecibo.competenciaTexto}</strong>, de um imóvel {dadosRecibo.tipoImovel} localizado na {dadosRecibo.enderecoImovel}.
          </div>

          {/* Resumo Financeiro em Caixa */}
          <div className="border-2 border-emerald-600 bg-emerald-50 rounded p-4 mb-6 text-center print:bg-white print:border-black">
            <div className="flex justify-around items-center text-xs text-gray-700 mb-2 pb-2 border-b border-emerald-200">
              <span>Forma de Pagamento: <strong className="text-emerald-800">{dadosRecibo.formaPagamento}</strong></span>
              <span>Data do Pagamento: <strong>{dadosRecibo.dataPagamento}</strong></span>
              <span>Valor Total Aluguel: <strong>R$ {dadosRecibo.valorBase.toFixed(2)}</strong></span>
            </div>
            <span className="text-xs font-semibold uppercase text-emerald-800 tracking-wider block">Valor Recebido Nesta Entrada</span>
            <span className="text-2xl font-extrabold text-emerald-900 block my-1">
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

          {/* Fechamento e Quitação */}
          <div className="text-center text-sm font-semibold my-6 font-sans text-gray-800">
            Para clareza, firmo o presente dando plena e total quitação.
          </div>

          {/* Cidade, Data e Assinatura */}
          <div className="mt-8 pt-6 border-t border-gray-400 flex justify-between items-end text-xs text-gray-700">
            <div>
              <span>Santa Luzia – PB, {dadosRecibo.dataPagamento}</span>
            </div>
            <div className="text-center w-52 pt-1">
              <div className="border-t border-gray-800 pt-1 font-bold">
                Paulo Sérgio de Souza Tôrres (RECEBEDOR)
              </div>
            </div>
          </div>

          {/* Período de Referência no Rodapé */}
          <div className="mt-8 pt-3 border-t border-gray-200 flex justify-between text-[11px] font-mono text-gray-500">
            <span>Período Vigente do Mês:</span>
            <span>De: {dadosRecibo.periodoInicio} &nbsp;&nbsp;|&nbsp;&nbsp; Até: {dadosRecibo.periodoFim}</span>
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