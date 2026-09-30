import { createClient } from "@/lib/supabase/server";
import { Button, Card, Field, PageHeader, Table, TextArea } from "@/components/ui";
import { RecordEditor } from "@/components/record-editor";
import { criarProprietario } from "./actions";

export default async function ProprietariosPage() {
  const supabase = await createClient();

  const { data: proprietarios } = await supabase
    .from("proprietarios")
    .select("*")
    .order("created_at", { ascending: false });

  const listaProprietarios = proprietarios ?? [];

  return (
    <div>
      <PageHeader title="Proprietários" subtitle="Donos dos imóveis administrados." />

      <Card>
        <form action={criarProprietario} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nome *" name="nome" required />
          <Field label="CPF/CNPJ" name="cpf_cnpj" />
          <Field label="Telefone" name="telefone" />
          <Field label="E-mail" name="email" type="email" />
          <TextArea label="Observações" name="observacoes" className="sm:col-span-2" />
          <div className="sm:col-span-2">
            <Button>Cadastrar proprietário</Button>
          </div>
        </form>
      </Card>

      <div className="mt-8">
        <Table head={["Nome", "CPF/CNPJ", "Telefone", "E-mail", "Actions"]}>
          {listaProprietarios.map((p) => (
            <tr key={p.id} style={{ borderTop: "1px solid var(--color-line)" }}>
              <td className="px-4 py-2.5 font-medium">{p.nome}</td>
              <td className="px-4 py-2.5">{p.cpf_cnpj ?? "—"}</td>
              <td className="px-4 py-2.5">{p.telefone ?? "—"}</td>
              <td className="px-4 py-2.5">{p.email ?? "—"}</td>
              <td className="px-4 py-2.5">
                <RecordEditor
                  entity="proprietarios"
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