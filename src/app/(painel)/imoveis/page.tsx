import { createClient } from "@/lib/supabase/server";
import { Card, Field, PageHeader, Select, StatusBadge, Table, TextArea, Money, Button } from "@/components/ui";
import { criarImovel } from "./actions";

export default async function ImoveisPage() {
  const supabase = await createClient();
  const [{ data: imoveis }, { data: proprietarios }] = await Promise.all([
    supabase
      .from("imoveis")
      .select("id, codigo, endereco, cidade, estado, tipo, status, valor_aluguel_base, proprietarios(nome)")
      .order("created_at", { ascending: false }),
    supabase.from("proprietarios").select("id, nome").order("nome"),
  ]);

  return (
    <div>
      <PageHeader title="Imóveis" subtitle="Cadastro da carteira de imóveis administrados." />

      <Card>
        <form action={criarImovel} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Código interno" name="codigo" placeholder="IM-0001" />
          <Select
            label="Proprietário"
            name="proprietario_id"
            options={[{ value: "", label: "— não vinculado —" }, ...(proprietarios ?? []).map((p) => ({ value: p.id, label: p.nome }))]}
          />
          <Field label="Endereço" name="endereco" required />
          <Field label="Número" name="numero" />
          <Field label="Bairro" name="bairro" />
          <Field label="Cidade" name="cidade" required />
          <Field label="Estado (UF)" name="estado" required />
          <Field label="CEP" name="cep" />
          <Select
            label="Tipo"
            name="tipo"
            defaultValue="residencial"
            options={[
              { value: "residencial", label: "Residencial" },
              { value: "comercial", label: "Comercial" },
            ]}
          />
          <Field label="Quartos" name="quartos" type="number" />
          <Field label="Área (m²)" name="area_m2" type="number" step="0.01" />
          <Field label="Valor de aluguel base (R$)" name="valor_aluguel_base" type="number" step="0.01" required />
          <Select
            label="Status"
            name="status"
            defaultValue="disponivel"
            options={[
              { value: "disponivel", label: "Disponível" },
              { value: "alugado", label: "Alugado" },
              { value: "manutencao", label: "Em manutenção" },
              { value: "inativo", label: "Inativo" },
            ]}
          />
          <TextArea label="Observações" name="observacoes" />
          <div className="sm:col-span-2">
            <Button>Cadastrar imóvel</Button>
          </div>
        </form>
      </Card>

      <div className="mt-8">
        <Table head={["Código", "Endereço", "Cidade/UF", "Tipo", "Proprietário", "Aluguel base", "Status"]}>
          {(imoveis ?? []).map((i) => (
            <tr key={i.id} style={{ borderTop: "1px solid var(--color-line)" }}>
              <td className="px-4 py-2.5">{i.codigo ?? "—"}</td>
              <td className="px-4 py-2.5">{i.endereco}</td>
              <td className="px-4 py-2.5">
                {i.cidade}/{i.estado}
              </td>
              <td className="px-4 py-2.5 capitalize">{i.tipo}</td>
              <td className="px-4 py-2.5">{(i.proprietarios as unknown as { nome: string } | null)?.nome ?? "—"}</td>
              <td className="px-4 py-2.5">
                <Money value={i.valor_aluguel_base} />
              </td>
              <td className="px-4 py-2.5">
                <StatusBadge status={i.status} />
              </td>
            </tr>
          ))}
        </Table>
      </div>
    </div>
  );
}
