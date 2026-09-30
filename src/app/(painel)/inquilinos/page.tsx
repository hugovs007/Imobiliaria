import { buscarInquilinos, criarInquilino } from './actions'

export default async function InquilinosPage() {
  const inquilinos = await buscarInquilinos()

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-1">Inquilinos</h1>
      <p className="text-sm text-slate-500 mb-6">Pessoas que ocupam os imóveis administrados.</p>

      {/* Formulário */}
      <form action={criarInquilino} className="bg-white p-4 border rounded-lg mb-8 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1">Nome *</label>
            <input name="nome" required className="w-full border p-2 rounded" />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">CPF/CNPJ</label>
            <input name="cpf_cnpj" className="w-full border p-2 rounded" />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Telefone</label>
            <input name="telefone" className="w-full border p-2 rounded" />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">E-mail</label>
            <input name="email" type="email" className="w-full border p-2 rounded" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1">Observações</label>
          <textarea name="observacoes" rows={3} className="w-full border p-2 rounded" />
        </div>
        <button type="submit" className="bg-emerald-800 text-white px-4 py-2 rounded text-sm hover:bg-emerald-900">
          Cadastrar inquilino
        </button>
      </form>

      {/* Tabela de Listagem */}
      <div className="border rounded-lg overflow-hidden bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100 border-b">
            <tr>
              <th className="p-3">Nome</th>
              <th className="p-3">CPF/CNPJ</th>
              <th className="p-3">Telefone</th>
              <th className="p-3">E-mail</th>
            </tr>
          </thead>
          <tbody>
            {inquilinos.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-4 text-center text-slate-500">Nenhum inquilino cadastrado.</td>
              </tr>
            ) : (
              inquilinos.map((item) => (
                <tr key={item.id} className="border-b hover:bg-slate-50">
                  <td className="p-3 font-medium">{item.nome}</td>
                  <td className="p-3">{item.cpf_cnpj || '-'}</td>
                  <td className="p-3">{item.telefone || '-'}</td>
                  <td className="p-3">{item.email || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}