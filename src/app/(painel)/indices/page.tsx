import { createClient } from "@/lib/supabase/server";
import { Button, Card, PageHeader, Table } from "@/components/ui";
import { RecordEditor } from "@/components/record-editor";
import { FormCriarIndice } from "./form-criar-indice";
import { excluirIndice } from "./actions";

type IndiceEconomico = {
  id: string;
  indice: string;
  mes_referencia: string;
  variacao_12m: number;
  fonte: string | null;
  created_at: string;
};

export default async function IndicesPage() {
  const supabase = await createClient();

  const { data: listaIndices, error } = await supabase
    .from("indices_economicos")
    .select("*")
    .order("mes_referencia", { ascending: false })
    .limit(24);

  if (error) {
    console.error("Erro ao buscar índices econômicos:", error.message);
  }

  const indices: IndiceEconomico[] = listaIndices ?? [];

  return (
    <div>
      <PageHeader
        title="Índices econômicos"
        subtitle="Variação acumulada de 12 meses do IGP-M e IPCA, usada no cálculo automático de reajuste. Consulte o valor mais recente no site do Banco Central (SGS) ou da FGV/IBGE."
      />

      <Card>
        <FormCriarIndice />
      </Card>

      <div className="mt-8">
        <Table head={["Índice", "Mês de referência", "Variação (%)", "Fonte", "Ações"]}>
          {indices.length === 0 ? (
            <tr style={{ borderTop: "1px solid var(--color-line)" }}>
              <td colSpan={5} className="px-4 py-4 text-center" style={{ color: "var(--color-ink-soft)" }}>
                Nenhum índice econômico cadastrado até o momento.
              </td>
            </tr>
          ) : (
            indices.map((i) => {
              const mesExibicao = i.mes_referencia
                ? `${i.mes_referencia.slice(5, 7)}/${i.mes_referencia.slice(0, 4)}`
                : "—";

              return (
                <tr key={i.id} style={{ borderTop: "1px solid var(--color-line)" }}>
                  <td className="px-4 py-2.5 font-bold uppercase">{i.indice}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{mesExibicao}</td>
                  <td className="px-4 py-2.5 font-semibold text-emerald-700">
                    {Number(i.variacao_12m).toFixed(2)}%
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-600">{i.fonte || "—"}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <RecordEditor
                        entity="indices_economicos"
                        id={i.id}
                        fields={[
                          {
                            name: "indice",
                            label: "Índice",
                            kind: "select",
                            value: i.indice,
                            options: [
                              { value: "IGP-M", label: "IGP-M" },
                              { value: "IPCA", label: "IPCA" },
                              { value: "Outro", label: "Outro" },
                            ],
                          },
                          {
                            name: "mes_referencia",
                            label: "Mês de referência",
                            value: i.mes_referencia,
                            type: "month",
                            required: true,
                          },
                          {
                            name: "variacao_12m",
                            label: "Variação acumulada (%)",
                            value: i.variacao_12m,
                            type: "number",
                            step: "0.0001",
                            required: true,
                          },
                          { name: "fonte", label: "Fonte", value: i.fonte },
                        ]}
                      />
                      <form action={excluirIndice}>
                        <input type="hidden" name="id" value={i.id} />
                        <Button variant="ghost">Excluir</Button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </Table>
      </div>
    </div>
  );
}