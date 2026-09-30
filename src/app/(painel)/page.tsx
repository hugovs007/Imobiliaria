import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();

  // Buscar totais de pagamentos
  const { data: pagamentos } = await supabase.from('pagamentos').select('*')
  
  const totalPago = pagamentos?.filter(p => p.status === 'pago').reduce((acc, curr) => acc + Number(curr.valor_pago), 0) || 0
  const totalPendente = pagamentos?.filter(p => p.status === 'pendente').reduce((acc, curr) => acc + Number(curr.valor_base), 0) || 0
  const totalAtrasado = pagamentos?.filter(p => p.status === 'atrasado').reduce((acc, curr) => acc + Number(curr.valor_base), 0) || 0

  return (
    <div className="p-8 space-y-6 bg-slate-50 min-h-screen font-sans text-slate-800">
      <header className="border-b pb-4 border-slate-300">
        <h1 className="text-3xl font-serif font-bold text-slate-900">Livro-Razão & Financeiro</h1>
        <p className="text-sm text-slate-600">Painel Geral da Carteira de Imóveis e Recebimentos</p>
      </header>

      {/* Indicadores do Livro Razão */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-300 p-6 rounded shadow-sm">
          <span className="text-xs uppercase font-semibold text-emerald-600 tracking-wider">Recebido / Pago</span>
          <p className="text-2xl font-mono font-bold mt-2 text-emerald-800">
            R$ {totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-white border border-slate-300 p-6 rounded shadow-sm">
          <span className="text-xs uppercase font-semibold text-amber-600 tracking-wider">A Vencer / Pendente</span>
          <p className="text-2xl font-mono font-bold mt-2 text-amber-800">
            R$ {totalPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-white border border-slate-300 p-6 rounded shadow-sm">
          <span className="text-xs uppercase font-semibold text-rose-600 tracking-wider">Atrasado</span>
          <p className="text-2xl font-mono font-bold mt-2 text-rose-800">
            R$ {totalAtrasado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Tabela de Lançamentos Recentes */}
      <section className="bg-white border border-slate-300 rounded shadow-sm overflow-hidden">
        <div className="bg-slate-100 p-4 border-b border-slate-300 font-semibold font-serif text-slate-800">
          Últimos Lançamentos
        </div>
        <table className="w-full text-left text-sm font-mono">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
            <tr>
              <th className="p-3">Competência</th>
              <th className="p-3">Vencimento</th>
              <th className="p-3">Valor Base</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {pagamentos?.slice(0, 10).map((p) => (
              <tr key={p.id} className="border-b border-slate-100 hover:bg-amber-50/40">
                <td className="p-3">{p.competencia}</td>
                <td className="p-3">{p.data_vencimento}</td>
                <td className="p-3">R$ {Number(p.valor_base).toFixed(2)}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 text-xs font-sans rounded ${
                    p.status === 'pago' ? 'bg-emerald-100 text-emerald-800' :
                    p.status === 'atrasado' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {p.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
