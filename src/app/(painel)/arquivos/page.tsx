import { createClient } from "@/lib/supabase/server";
import { Button, Card, Field, PageHeader, Select, Table } from "@/components/ui";
import { enviarArquivo } from "./actions";

export default async function ArquivosPage() {
  const supabase = await createClient();
  const { data: arquivos } = await supabase
    .from("arquivos")
    .select("id, nome, entidade_tipo, tipo_arquivo, storage_provider, path_ou_url, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div>
      <PageHeader
        title="Arquivos"
        subtitle="Fotos, contratos digitalizados, recibos e comprovantes de contas. Arquivos grandes vão automaticamente para o Google Drive quando o armazenamento do Supabase não comporta."
      />

      <Card>
        <form action={enviarArquivo} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Vinculado a"
            name="entidade_tipo"
            options={[
              { value: "contrato", label: "Contrato" },
              { value: "imovel", label: "Imóvel" },
              { value: "manutencao", label: "Manutenção" },
              { value: "pagamento", label: "Pagamento" },
              { value: "conta", label: "Conta de água/energia" },
              { value: "inquilino", label: "Inquilino" },
              { value: "proprietario", label: "Proprietário" },
            ]}
          />
          <Field label="ID do registro vinculado" name="entidade_id" required placeholder="cole o ID do contrato/imóvel/etc." />
          <Field label="Tipo de arquivo" name="tipo_arquivo" placeholder="foto, contrato, recibo, comprovante..." />
          <label className="flex flex-col gap-1 text-sm">
            <span style={{ color: "var(--color-ink-soft)" }}>Arquivo</span>
            <input name="arquivo" type="file" required className="text-sm" />
          </label>
          <div className="sm:col-span-2">
            <Button>Enviar arquivo</Button>
          </div>
        </form>
      </Card>

      <div className="mt-8">
        <Table head={["Nome", "Vinculado a", "Tipo", "Armazenamento", "Enviado em"]}>
          {(arquivos ?? []).map((a) => (
            <tr key={a.id} style={{ borderTop: "1px solid var(--color-line)" }}>
              <td className="px-4 py-2.5">{a.nome}</td>
              <td className="px-4 py-2.5 capitalize">{a.entidade_tipo}</td>
              <td className="px-4 py-2.5">{a.tipo_arquivo ?? "—"}</td>
              <td className="px-4 py-2.5">{a.storage_provider === "google_drive" ? "Google Drive" : "Supabase"}</td>
              <td className="px-4 py-2.5">{new Date(a.created_at).toLocaleDateString("pt-BR")}</td>
            </tr>
          ))}
        </Table>
      </div>
    </div>
  );
}
