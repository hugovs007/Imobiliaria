import { createClient } from "@/lib/supabase/server";
import { Card, Field, PageHeader, Select, StatusBadge, Table, TextArea, Money, Button } from "@/components/ui";
import { RecordEditor } from "@/components/record-editor";
import { criarImovel } from "./actions";

const TIPOS_IMOVEL = [
  { value: "residencial", label: "Residencial" },
  { value: "comercial", label: "Comercial" },
  { value: "casa", label: "Casa" },
  { value: "apartamento", label: "Apartamento" },
  { value: "terreno", label: "Terreno" },
  { value: "sala_comercial", label: "Sala comercial" },
  { value: "galpao", label: "Galpão" },
  { value: "rural", label: "Rural" },
  { value: "kitnet", label: "Kitnet" },
  { value: "outro", label: "Outro" },
];

const FINALIDADES = [
  { value: "aluguel", label: "Aluguel" },
  { value: "venda", label: "Venda" },
  { value: "aluguel_venda", label: "Aluguel e Venda" },
];

export default async function ImoveisPage() {
  const supabase = await createClient();
  const [{ data: imoveis }, { data: proprietarios }] = await Promise.all([
    supabase
      .from("imoveis")
      .select("id, codigo, proprietario_id, endereco, numero, complemento, bairro, cidade, estado, cep, tipo, finalidade, status, quartos, banheiros, garagem, area_util, valor_venda, valor_aluguel, valor_iptu, propriedade, observacoes, proprietarios(nome)")
      .order("created_at", { ascending: false }),
    supabase.from("proprietarios").select("id, nome").order("nome"),
  ]);

  return (
    <div>
      <PageHeader title="Imóveis" subtitle="Cadastro da carteira de imóveis administrados." />

      <Card>
        <form action={criarImovel} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Código interno" name="codigo" placeholder="IM-0001" />
          <Select
            label="Proprietário"
            name="proprietario_id"
            options={[{ value: "", label: "— não vinculado —" }, ...(proprietarios ?? []).map((p) => ({ value: p.id, label: p.nome }))]}
          />
          <Select
            label="Tipo de Imóvel"
            name="tipo"
            defaultValue="residencial"
            options={TIPOS_IMOVEL}
          />
          <Select
            label="Finalidade"
            name="finalidade"
            defaultValue="aluguel"
            options={FINALIDADES}
          />
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
          <Field label="Endereço" name="endereco" required />
          <Field label="Número" name="numero" />
          <Field label="Complemento" name="complemento" placeholder="Apto, bloco, casa dos fundos..." />
          <Field label="Bairro" name="bairro" />
          <Field label="Cidade" name="cidade" required />
          <Field label="Estado (UF)" name="estado" required />
          <Field label="CEP" name="cep" />
          <Field label="Quartos" name="quartos" type="number" />
          <Field label="Banheiros" name="banheiros" type="number" />
          <Field label="Garagem" name="garagem" type="number" />
          <Field label="Área Útil (m²)" name="area_util" type="number" step="0.01" />
          <Field label="Valor Venda (R$)" name="valor_venda" type="number" step="0.01" />
          <Field label="Valor Aluguel (R$)" name="valor_aluguel" type="number" step="0.01" required />
          <Field label="Valor IPTU (R$)" name="valor_iptu" type="number" step="0.01" />
          <Field label="PROPRIEDADE" name="propriedade" placeholder="Nome da propriedade/condomínio" />
          <TextArea label="Observações" name="observacoes" className="sm:col-span-2 lg:col-span-3" />
          <div className="sm:col-span-2 lg:col-span-3">
            <Button>Cadastrar imóvel</Button>
          </div>
        </form>
      </Card>

      <div className="mt-8">
        <Table head={["Código", "Endereço", "Complemento", "Cidade/UF", "Tipo", "Finalidade", "Proprietário", "Aluguel", "Status", ""]}>
          {(imoveis ?? []).map((i) => (
            <tr key={i.id} style={{ borderTop: "1px solid var(--color-line)" }}>
              <td className="px-4 py-2.5">{i.codigo ?? "—"}</td>
              <td className="px-4 py-2.5">{i.endereco}</td>
              <td className="px-4 py-2.5">{i.complemento ?? "—"}</td>
              <td className="px-4 py-2.5">
                {i.cidade}/{i.estado}
              </td>
              <td className="px-4 py-2.5 capitalize">{i.tipo}</td>
              <td className="px-4 py-2.5 capitalize">{i.finalidade}</td>
              <td className="px-4 py-2.5">{(i.proprietarios as unknown as { nome: string } | null)?.nome ?? "—"}</td>
              <td className="px-4 py-2.5">
                <Money value={i.valor_aluguel} />
              </td>
              <td className="px-4 py-2.5">
                <StatusBadge status={i.status} />
              </td>
              <td className="px-4 py-2.5">
                <RecordEditor
                  entity="imoveis"
                  id={i.id}
                  fields={[
                    { name: "codigo", label: "Código interno", value: i.codigo },
                    {
                      name: "proprietario_id",
                      label: "Proprietário",
                      kind: "select",
                      value: i.proprietario_id,
                      options: [{ value: "", label: "— não vinculado —" }, ...(proprietarios ?? []).map((p) => ({ value: p.id, label: p.nome }))],
                    },
                    { name: "tipo", label: "Tipo", kind: "select", value: i.tipo, options: TIPOS_IMOVEL },
                    { name: "finalidade", label: "Finalidade", kind: "select", value: i.finalidade, options: FINALIDADES },
                    { name: "status", label: "Status", kind: "select", value: i.status, options: [
                        { value: "disponivel", label: "Disponível" },
                        { value: "alugado", label: "Alugado" },
                        { value: "manutencao", label: "Em manutenção" },
                        { value: "inativo", label: "Inativo" },
                      ]},
                    { name: "endereco", label: "Endereço", value: i.endereco, required: true },
                    { name: "numero", label: "Número", value: i.numero },
                    { name: "complemento", label: "Complemento", value: i.complemento },
                    { name: "bairro", label: "Bairro", value: i.bairro },
                    { name: "cidade", label: "Cidade", value: i.cidade, required: true },
                    { name: "estado", label: "Estado (UF)", value: i.estado, required: true },
                    { name: "cep", label: "CEP", value: i.cep },
                    { name: "quartos", label: "Quartos", value: i.quartos, type: "number" },
                    { name: "banheiros", label: "Banheiros", value: i.banheiros, type: "number" },
                    { name: "garagem", label: "Garagem", value: i.garagem, type: "number" },
                    { name: "area_util", label: "Área Útil (m²)", value: i.area_util, type: "number", step: "0.01" },
                    { name: "valor_venda", label: "Valor Venda (R$)", value: i.valor_venda, type: "number", step: "0.01" },
                    { name: "valor_aluguel", label: "Valor Aluguel (R$)", value: i.valor_aluguel, type: "number", step: "0.01", required: true },
                    { name: "valor_iptu", label: "Valor IPTU (R$)", value: i.valor_iptu, type: "number", step: "0.01" },
                    { name: "propriedade", label: "PROPRIEDADE", value: i.propriedade },
                    { name: "observacoes", label: "Observações", value: i.observacoes, kind: "textarea" },
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
