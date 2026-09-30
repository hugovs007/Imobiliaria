import { createClient } from "@/lib/supabase/server";
import { Card, Field, PageHeader, Select, StatusBadge, Table, TextArea, Money, Button } from "@/components/ui";
import { RecordEditor } from "@/components/record-editor";
import { criarImovel } from "./actions";

// Opções alinhadas com os ENUMs do Supabase (Caixa Alta/Título)
const TIPOS_IMOVEL = [
  { value: "Residencial", label: "Residencial" },
  { value: "Comercial", label: "Comercial" },
  { value: "Industrial", label: "Industrial" },
  { value: "Terreno", label: "Terreno" },
  { value: "Outro", label: "Outro" },
];

const FINALIDADES = [
  { value: "Residencial", label: "Residencial" },
  { value: "Comercial", label: "Comercial" },
  { value: "Misto", label: "Misto" },
];

const STATUS_IMOVEL = [
  { value: "Disponível", label: "Disponível" },
  { value: "Alugado", label: "Alugado" },
  { value: "Manutenção", label: "Em manutenção" },
  { value: "Inativo", label: "Inativo" },
];

export default async function ImoveisPage() {
  const supabase = await createClient();

  const [{ data: imoveis }, { data: proprietarios }] = await Promise.all([
    supabase
      .from("imoveis")
      .select("id, codigo, proprietario_id, logradouro, numero, complemento, bairro, cidade, uf, cep, tipo, finalidade, status, area_total, area_util, valor_aluguel, valor_condominio, iptu_mensal, matricula, observacoes, proprietarios(nome)")
      .order("created_at", { ascending: false }),
    supabase.from("proprietarios").select("id, nome").order("nome"),
  ]);

  const listaImoveis = imoveis ?? [];
  const listaProprietarios = proprietarios ?? [];

  return (
    <div>
      <PageHeader title="Imóveis" subtitle="Cadastro da carteira de imóveis administrados." />

      <Card>
        <form action={criarImovel} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Código interno" name="codigo" placeholder="IM-0001" required />
          <Select
            label="Proprietário"
            name="proprietario_id"
            options={[{ value: "", label: "— não vinculado —" }, ...listaProprietarios.map((p) => ({ value: p.id, label: p.nome }))]}
          />
          <Select
            label="Tipo de Imóvel"
            name="tipo"
            defaultValue="Residencial"
            options={TIPOS_IMOVEL}
          />
          <Select
            label="Finalidade"
            name="finalidade"
            defaultValue="Residencial"
            options={FINALIDADES}
          />
          <Select
            label="Status"
            name="status"
            defaultValue="Disponível"
            options={STATUS_IMOVEL}
          />
          <Field label="CEP" name="cep" />
          <Field label="Logradouro" name="logradouro" required />
          <Field label="Número" name="numero" />
          <Field label="Complemento" name="complemento" placeholder="Apto, bloco, casa dos fundos..." />
          <Field label="Bairro" name="bairro" />
          <Field label="Cidade" name="cidade" required />
          <Field label="UF" name="uf" required />
          <Field label="Área Total (m²)" name="area_total" type="number" step="0.01" />
          <Field label="Área Útil (m²)" name="area_util" type="number" step="0.01" />
          <Field label="Valor Aluguel (R$)" name="valor_aluguel" type="number" step="0.01" required />
          <Field label="Valor Condomínio (R$)" name="valor_condominio" type="number" step="0.01" />
          <Field label="IPTU Mensal (R$)" name="iptu_mensal" type="number" step="0.01" />
          <Field label="Matrícula" name="matricula" placeholder="Número da matrícula do imóvel" />
          <TextArea label="Observações" name="observacoes" className="sm:col-span-2 lg:col-span-3" />
          <div className="sm:col-span-2 lg:col-span-3">
            <Button>Cadastrar imóvel</Button>
          </div>
        </form>
      </Card>

      <div className="mt-8">
        <Table head={["Código", "Logradouro", "Número", "Complemento", "Cidade/UF", "Tipo", "Finalidade", "Proprietário", "Aluguel", "Status", ""]}>
          {listaImoveis.map((i) => (
            <tr key={i.id} style={{ borderTop: "1px solid var(--color-line)" }}>
              <td className="px-4 py-2.5 font-mono">{i.codigo ?? "—"}</td>
              <td className="px-4 py-2.5">{i.logradouro}</td>
              <td className="px-4 py-2.5">{i.numero ?? "—"}</td>
              <td className="px-4 py-2.5">{i.complemento ?? "—"}</td>
              <td className="px-4 py-2.5">
                {i.cidade}/{i.uf}
              </td>
              <td className="px-4 py-2.5">{i.tipo}</td>
              <td className="px-4 py-2.5">{i.finalidade}</td>
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
                      options: [{ value: "", label: "— não vinculado —" }, ...listaProprietarios.map((p) => ({ value: p.id, label: p.nome }))],
                    },
                    { name: "tipo", label: "Tipo", kind: "select", value: i.tipo, options: TIPOS_IMOVEL },
                    { name: "finalidade", label: "Finalidade", kind: "select", value: i.finalidade, options: FINALIDADES },
                    { name: "status", label: "Status", kind: "select", value: i.status, options: STATUS_IMOVEL },
                    { name: "cep", label: "CEP", value: i.cep },
                    { name: "logradouro", label: "Logradouro", value: i.logradouro, required: true },
                    { name: "numero", label: "Número", value: i.numero },
                    { name: "complemento", label: "Complemento", value: i.complemento },
                    { name: "bairro", label: "Bairro", value: i.bairro },
                    { name: "cidade", label: "Cidade", value: i.cidade, required: true },
                    { name: "uf", label: "UF", value: i.uf, required: true },
                    { name: "area_total", label: "Área Total (m²)", value: i.area_total, type: "number", step: "0.01" },
                    { name: "area_util", label: "Área Útil (m²)", value: i.area_util, type: "number", step: "0.01" },
                    { name: "valor_aluguel", label: "Valor Aluguel (R$)", value: i.valor_aluguel, type: "number", step: "0.01", required: true },
                    { name: "valor_condominio", label: "Valor Condomínio (R$)", value: i.valor_condominio, type: "number", step: "0.01" },
                    { name: "iptu_mensal", label: "IPTU Mensal (R$)", value: i.iptu_mensal, type: "number", step: "0.01" },
                    { name: "matricula", label: "Matrícula", value: i.matricula },
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