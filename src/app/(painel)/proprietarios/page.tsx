import { createClient } from "@/lib/supabase/server";
import { Button, Card, Field, PageHeader, Table, TextArea } from "@/components/ui";
import { criarProprietario } from "./actions";

export default async function ProprietariosPage() {
  const supabase = await createClient();
  const { data: proprietarios } = await supabase
    .from("proprietarios")
    .select("id, nome, cpf_cnpj, telefone, email")
    .order("nome");

  return (
    <div>
      <PageHeader title="Proprietários" subtitle="Donos dos imóveis administrados." />

      <Card>
        <form action={criarProprietario} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nome" name="nome" required />
          <Field label="CPF/CNPJ" name="cpf_cnpj" />
          <Field label="Telefone" name="telefone" />
          <Field label="E-mail" name="email" type="email" />
          <TextArea label="Observações" name="observacoes" />
          <div className="sm:col-span-2">
            <Button>Cadastrar proprietário</Button>
          </div>
        </form>
      </Card>

      <div className="mt-8">
        <Table head={["Nome", "CPF/CNPJ", "Telefone", "E-mail"]}>
          {(proprietarios ?? []).map((p) => (
            <tr key={p.id} style={{ borderTop: "1px solid var(--color-line)" }}>
              <td className="px-4 py-2.5">{p.nome}</td>
              <td className="px-4 py-2.5">{p.cpf_cnpj ?? "—"}</td>
              <td className="px-4 py-2.5">{p.telefone ?? "—"}</td>
              <td className="px-4 py-2.5">{p.email ?? "—"}</td>
            </tr>
          ))}
        </Table>
      </div>
    </div>
  );
}
