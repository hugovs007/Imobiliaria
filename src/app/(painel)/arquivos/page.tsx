import { createClient } from "@/lib/supabase/server";
import { Card, PageHeader, Table } from "@/components/ui";
import { RecordEditor } from "@/components/record-editor";
import { UploadForm } from "./upload-form";

export default async function ArquivosPage() {
  const supabase = await createClient();
  const { data: arquivos } = await supabase
    .from("arquivos")
    .select("id, nome, entidade_tipo, entidade_id, tipo_arquivo, storage_provider, path_ou_url, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div>
      <PageHeader
        title="Arquivos"
        subtitle="Fotos, contratos digitalizados, recibos e comprovantes. O limite é de 40 MB por arquivo."
      />

      <Card>
        <UploadForm />
      </Card>

      <div className="mt-8">
        <Table head={["Nome", "Vinculado a", "Tipo", "Armazenamento", "Enviado em", ""]}>
          {(arquivos ?? []).map((a) => (
            <tr key={a.id} style={{ borderTop: "1px solid var(--color-line)" }}>
              <td className="px-4 py-2.5">{a.nome}</td>
              <td className="px-4 py-2.5 capitalize">{a.entidade_tipo}</td>
              <td className="px-4 py-2.5">{a.tipo_arquivo ?? "—"}</td>
              <td className="px-4 py-2.5">{a.storage_provider === "google_drive" ? "Google Drive" : "Supabase"}</td>
              <td className="px-4 py-2.5">{new Date(a.created_at).toLocaleDateString("pt-BR")}</td>
              <td className="px-4 py-2.5">
                <RecordEditor
                  entity="arquivos"
                  id={a.id}
                  fields={[
                    { name: "nome", label: "Nome exibido", value: a.nome, required: true },
                    {
                      name: "entidade_tipo",
                      label: "Vinculado a",
                      kind: "select",
                      value: a.entidade_tipo,
                      options: [
                        { value: "contrato", label: "Contrato" },
                        { value: "imovel", label: "Imóvel" },
                        { value: "manutencao", label: "Manutenção" },
                        { value: "pagamento", label: "Pagamento" },
                        { value: "conta", label: "Conta" },
                        { value: "inquilino", label: "Inquilino" },
                        { value: "proprietario", label: "Proprietário" },
                      ],
                    },
                    { name: "entidade_id", label: "ID do registro vinculado", value: a.entidade_id, required: true },
                    { name: "tipo_arquivo", label: "Tipo de arquivo", value: a.tipo_arquivo },
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
