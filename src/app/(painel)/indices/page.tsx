import { createClient } from "@/lib/supabase/server";
import { Button, Card, Field, PageHeader, Select, Table } from "@/components/ui";
import { RecordEditor } from "@/components/record-editor";
import { cadastrarIndice } from "./actions";

export default async function IndicesPage() {
  const supabase = await createClient();
  const { data: indices } = await supabase
    .from("indices_economicos")
    .select("id, indice, competencia, valor_percentual, fonte")
    .order("competencia", { ascending: false })
    .limit(24);

  return (
    <div>
      <PageHeader
        title="Índices econômicos"
        subtitle="Variação acumulada de 12 meses do IGP-M e IPCA, usada no cálculo automático de reajuste. Consulte o valor mais recente no site do Banco Central (SGS) ou da FGV/IBGE."
      />

      <Card>
        <form action={cadastrarIndice} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Índice"
            name="indice"
            options={[
              { value: "igpm", label: "IGP-M" },
              { value: "ipca", label: "IPCA" },
            ]}
          />
          <Field label="Mês de referência" name="competencia" type="month" required />
          <Field
            label="Variação acumulada 12 meses (%)"
            name="valor_percentual"
            type="number"
            step="0.01"
            required
          />
          <div className="sm:col-span-2">
            <Button>Salvar índice do mês</Button>
          </div>
        </form>
      </Card>

      <div className="mt-8">
        <Table head={["Índice", "Mês de referência", "Variação (%)", "Fonte", ""]}>
          {(indices ?? []).map((i) => (
            <tr key={i.id} style={{ borderTop: "1px solid var(--color-line)" }}>
              <td className="px-4 py-2.5 uppercase">{i.indice}</td>
              <td className="px-4 py-2.5">
                {new Date(i.competencia).toLocaleDateString("pt-BR", { month: "2-digit", year: "numeric" })}
              </td>
              <td className="px-4 py-2.5">{i.valor_percentual}%</td>
              <td className="px-4 py-2.5">{i.fonte}</td>
              <td className="px-4 py-2.5">
                <RecordEditor
                  entity="indices_economicos"
                  id={i.id}
                  fields={[
                    {
                      name: "indice",
                      label: "Índice",
                      kind: "select",
                      value: i.indice,
                      options: [{ value: "igpm", label: "IGP-M" }, { value: "ipca", label: "IPCA" }, { value: "outro", label: "Outro" }],
                    },
                    { name: "competencia", label: "Mês de referência", value: i.competencia.slice(0, 7), type: "month", required: true },
                    { name: "valor_percentual", label: "Variação acumulada (%)", value: i.valor_percentual, type: "number", step: "0.01", required: true },
                    { name: "fonte", label: "Fonte", value: i.fonte },
                  ]}
                />
              </td>
            </tr>
          ))}
        </Table>
      </div>
    </div>
  );
}
