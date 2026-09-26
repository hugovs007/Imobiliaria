import { createClient } from "@/lib/supabase/server";
import { PageHeader, Table } from "@/components/ui";
import { alternarAtivo, atualizarPapel } from "./actions";

export default async function EquipePage() {
  const supabase = await createClient();
  const { data: membros } = await supabase.from("profiles").select("id, nome, email, papel, ativo").order("nome");

  return (
    <div>
      <PageHeader
        title="Equipe"
        subtitle="Convide novos membros pelo painel do Supabase (Authentication → Invite user). O perfil é criado automaticamente aqui, desativado até você aprovar o papel."
      />

      <Table head={["Nome", "E-mail", "Papel", "Ativo", ""]}>
        {(membros ?? []).map((m) => (
          <tr key={m.id} style={{ borderTop: "1px solid var(--color-line)" }}>
            <td className="px-4 py-2.5">{m.nome}</td>
            <td className="px-4 py-2.5">{m.email}</td>
            <td className="px-4 py-2.5">
              <form action={atualizarPapel} className="flex items-center gap-2">
                <input type="hidden" name="id" value={m.id} />
                <select
                  name="papel"
                  defaultValue={m.papel}
                  className="rounded-sm border px-2 py-1 text-xs"
                  style={{ borderColor: "var(--color-line)" }}
                >
                  <option value="admin">admin</option>
                  <option value="gestor">gestor</option>
                  <option value="corretor">corretor</option>
                </select>
                <button className="text-xs underline" style={{ color: "var(--color-ink-soft)" }}>
                  Salvar
                </button>
              </form>
            </td>
            <td className="px-4 py-2.5">{m.ativo ? "Sim" : "Não"}</td>
            <td className="px-4 py-2.5">
              <form action={alternarAtivo}>
                <input type="hidden" name="id" value={m.id} />
                <input type="hidden" name="ativo" value={String(m.ativo)} />
                <button className="text-xs underline" style={{ color: "var(--color-ink-soft)" }}>
                  {m.ativo ? "Desativar" : "Ativar"}
                </button>
              </form>
            </td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
