import { createClient } from "@/lib/supabase/server";
import { Button, Card, Field, PageHeader, Table, TextArea } from "@/components/ui";
import { RecordEditor } from "@/components/record-editor";
import { criarInquilino } from "./actions";

export default async function InquilinosPage() {
  const supabase = await createClient();
  const { data: inquilinos } = await supabase
    .from("inquilinos")
    .select("id, nome, cpf_cnpj, telefone, email, observacoes")
    .order("nome");

  return (
    <div>
      <PageHeader title="Inquilinos" subtitle="Pessoas que ocupam os imóveis administrados." />

      <Card>
        <form action={criarInquilino} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nome" name="nome" required />
          <Field label="CPF/CNPJ" name="cpf_cnpj" />
          <Field label="Telefone" name="telefone" />
          <Field label="E-mail" name="email" type="email" />
          <TextArea label="Observações" name="observacoes" />
          <div className="sm:col-span-2">
            <Button>Cadastrar inquilino</Button>
          </div>
        </form>
      </Card>

      <div className="mt-8">
        <Table head={["Nome", "CPF/CNPJ", "Telefone", "E-mail", ""]}>
          {(inquilinos ?? []).map((p) => (
            <tr key={p.id} style={{ borderTop: "1px solid var(--color-line)" }}>
              <td className="px-4 py-2.5">{p.nome}</td>
              <td className="px-4 py-2.5">{p.cpf_cnpj ?? "—"}</td>
              <td className="px-4 py-2.5">{p.telefone ?? "—"}</td>
              <td className="px-4 py-2.5">{p.email ?? "—"}</td>
              <td className="px-4 py-2.5">
                <RecordEditor
                  entity="inquilinos"
                  id={p.id}
                  fields={[
                    { name: "nome", label: "Nome", value: p.nome, required: true },
                    { name: "cpf_cnpj", label: "CPF/CNPJ", value: p.cpf_cnpj },
                    { name: "telefone", label: "Telefone", value: p.telefone },
                    { name: "email", label: "E-mail", value: p.email, type: "email" },
                    { name: "observacoes", label: "Observações", value: p.observacoes, kind: "textarea" },
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
