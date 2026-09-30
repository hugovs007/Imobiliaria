import { createClient } from "@/lib/supabase/server";
import { Button, Card, Field, PageHeader, Table, TextArea } from "@/components/ui";
import { RecordEditor } from "@/components/record-editor";
import { criarInquilino } from "./actions";

export default async function InquilinosPage() {
  const supabase = await createClient();

  const { data: inquilinos } = await supabase
    .from("inquilinos")
    .select("*")
    .order("nome", { ascending: true });

  const listaInquilinos = inquilinos ?? [];

  return (
    <div>
      <PageHeader
        title="Inquilinos"
        subtitle="Pessoas que ocupam os imóveis administrados."
      />

      <Card>
        <form action={criarInquilino} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nome *" name="nome" required />
          <Field label="CPF/CNPJ" name="cpf_cnpj" />
          <Field label="Telefone" name="telefone" />
          <Field label="E-mail" name="email" type="email" />
          <TextArea label="Observações" name="observacoes" className="sm:col-span-2" />
          <div className="sm:col-span-2">
            <Button>Cadastrar inquilino</Button>
          </div>
        </form>
      </Card>

      <div className="mt-8">
        <Table head={["Nome", "CPF/CNPJ", "Telefone", "E-mail", ""]}>
          {listaInquilinos.length === 0 ? (
            <tr style={{ borderTop: "1px solid var(--color-line)" }}>
              <td colSpan={5} className="px-4 py-4 text-center" style={{ color: "var(--color-ink-soft)" }}>
                Nenhum inquilino cadastrado.
              </td>
            </tr>
          ) : (
            listaInquilinos.map((i) => (
              <tr key={i.id} style={{ borderTop: "1px solid var(--color-line)" }}>
                <td className="px-4 py-2.5 font-medium">{i.nome}</td>
                <td className="px-4 py-2.5">{i.cpf_cnpj || "—"}</td>
                <td className="px-4 py-2.5">{i.telefone || "—"}</td>
                <td className="px-4 py-2.5">{i.email || "—"}</td>
                <td className="px-4 py-2.5">
                  <RecordEditor
                    entity="inquilinos"
                    id={i.id}
                    fields={[
                      { name: "nome", label: "Nome", value: i.nome, required: true },
                      { name: "cpf_cnpj", label: "CPF/CNPJ", value: i.cpf_cnpj },
                      { name: "telefone", label: "Telefone", value: i.telefone },
                      { name: "email", label: "E-mail", value: i.email, type: "email" },
                      { name: "observacoes", label: "Observações", value: i.observacoes, kind: "textarea" },
                    ]}
                  />
                </td>
              </tr>
            ))
          )}
        </Table>
      </div>
    </div>
  );
}