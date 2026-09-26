import { createClient } from "@/lib/supabase/server";
import { Button, Card, Field, Money, PageHeader, Select, StatusBadge, Table, TextArea } from "@/components/ui";
import { aplicarReajuste, criarContrato, encerrarContrato, gerarReajustesPendentes } from "./actions";

export default async function ContratosPage() {
  const supabase = await createClient();

  const [{ data: contratos }, { data: imoveisDisponiveis }, { data: inquilinos }, { data: reajustesPendentes }] =
    await Promise.all([
      supabase
        .from("contratos")
        .select(
          "id, data_inicio, data_fim, valor_aluguel_atual, indice_reajuste, status, imoveis(id, codigo, endereco), inquilinos(nome)"
        )
        .order("created_at", { ascending: false }),
      supabase.from("imoveis").select("id, codigo, endereco").eq("status", "disponivel"),
      supabase.from("inquilinos").select("id, nome").order("nome"),
      supabase
        .from("reajustes")
        .select("id, data_referencia, indice_usado, percentual_aplicado, valor_anterior, valor_novo, contratos(imoveis(endereco))")
        .eq("status", "pendente"),
    ]);

  return (
    <div>
      <PageHeader
        title="Contratos"
        subtitle="Cadastro de locações e reajuste anual conforme a Lei do Inquilinato (Lei 8.245/91)."
      />

      <Card>
        <form action={criarContrato} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Imóvel (disponíveis)"
            name="imovel_id"
            required
            options={(imoveisDisponiveis ?? []).map((i) => ({
              value: i.id,
              label: `${i.codigo ?? ""} ${i.endereco}`.trim(),
            }))}
          />
          <Select
            label="Inquilino"
            name="inquilino_id"
            required
            options={(inquilinos ?? []).map((i) => ({ value: i.id, label: i.nome }))}
          />
          <Field label="Data de início" name="data_inicio" type="date" required />
          <Field label="Data de fim (opcional)" name="data_fim" type="date" />
          <Field label="Dia de vencimento (1-31)" name="dia_vencimento" type="number" required />
          <Field label="Valor do aluguel (R$)" name="valor_aluguel_atual" type="number" step="0.01" required />
          <Select
            label="Índice de reajuste"
            name="indice_reajuste"
            defaultValue="igpm"
            options={[
              { value: "igpm", label: "IGP-M" },
              { value: "ipca", label: "IPCA" },
              { value: "outro", label: "Outro (definir em cláusula)" },
            ]}
          />
          <Field label="Periodicidade do reajuste (meses)" name="periodicidade_reajuste_meses" type="number" defaultValue={12} />
          <Field label="Caução/depósito (R$)" name="deposito_caucao" type="number" step="0.01" />
          <TextArea label="Cláusulas especiais" name="clausulas_especiais" />
          <div className="sm:col-span-2">
            <Button>Cadastrar contrato</Button>
          </div>
        </form>
      </Card>

      <div className="mt-10 flex items-center justify-between">
        <h2 className="text-lg font-semibold" style={{ fontFamily: "var(--font-serif)" }}>
          Reajustes pendentes
        </h2>
        <form action={gerarReajustesPendentes}>
          <Button variant="ghost">Verificar reajustes devidos</Button>
        </form>
      </div>
      <p className="mt-1 mb-4 text-sm" style={{ color: "var(--color-ink-soft)" }}>
        Calcula, para cada contrato ativo, se já passou 1 ano desde o último reajuste e aplica o índice
        pactuado em contrato usando os valores cadastrados em "Índices econômicos".
      </p>

      {(reajustesPendentes ?? []).length === 0 ? (
        <p className="text-sm" style={{ color: "var(--color-ink-soft)" }}>
          Nenhum reajuste pendente no momento.
        </p>
      ) : (
        <Table head={["Imóvel", "Data de referência", "Índice", "% aplicado", "Valor atual", "Novo valor", ""]}>
          {(reajustesPendentes ?? []).map((r) => (
            <tr key={r.id} style={{ borderTop: "1px solid var(--color-line)" }}>
              <td className="px-4 py-2.5">
                {(r.contratos as unknown as { imoveis: { endereco: string } })?.imoveis?.endereco}
              </td>
              <td className="px-4 py-2.5">{new Date(r.data_referencia).toLocaleDateString("pt-BR")}</td>
              <td className="px-4 py-2.5 uppercase">{r.indice_usado}</td>
              <td className="px-4 py-2.5">{r.percentual_aplicado}%</td>
              <td className="px-4 py-2.5">
                <Money value={r.valor_anterior} />
              </td>
              <td className="px-4 py-2.5">
                <Money value={r.valor_novo} />
              </td>
              <td className="px-4 py-2.5">
                <form action={aplicarReajuste}>
                  <input type="hidden" name="id" value={r.id} />
                  <Button variant="ghost">Aplicar</Button>
                </form>
              </td>
            </tr>
          ))}
        </Table>
      )}

      <div className="mt-10">
        <Table head={["Imóvel", "Inquilino", "Início", "Aluguel atual", "Índice", "Status", ""]}>
          {(contratos ?? []).map((c) => {
            const imovel = c.imoveis as unknown as { id: string; codigo: string | null; endereco: string };
            return (
              <tr key={c.id} style={{ borderTop: "1px solid var(--color-line)" }}>
                <td className="px-4 py-2.5">{imovel?.endereco}</td>
                <td className="px-4 py-2.5">{(c.inquilinos as unknown as { nome: string })?.nome}</td>
                <td className="px-4 py-2.5">{new Date(c.data_inicio).toLocaleDateString("pt-BR")}</td>
                <td className="px-4 py-2.5">
                  <Money value={c.valor_aluguel_atual} />
                </td>
                <td className="px-4 py-2.5 uppercase">{c.indice_reajuste}</td>
                <td className="px-4 py-2.5">
                  <StatusBadge status={c.status} />
                </td>
                <td className="px-4 py-2.5">
                  {c.status === "ativo" && (
                    <form action={encerrarContrato}>
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="imovel_id" value={imovel?.id} />
                      <Button variant="ghost">Encerrar</Button>
                    </form>
                  )}
                </td>
              </tr>
            );
          })}
        </Table>
      </div>
    </div>
  );
}
