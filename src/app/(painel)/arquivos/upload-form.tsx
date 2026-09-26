"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { registrarArquivo } from "./actions";

const LIMITE_ARQUIVO_BYTES = 40 * 1024 * 1024;

export function UploadForm() {
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  async function enviar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (enviando) return;

    const form = event.currentTarget;
    const dados = new FormData(form);
    const arquivo = dados.get("arquivo");
    const entidadeTipo = String(dados.get("entidade_tipo") || "");
    const entidadeId = String(dados.get("entidade_id") || "").trim();
    const tipoArquivo = String(dados.get("tipo_arquivo") || "");

    setErro(null);
    setSucesso(false);

    if (!(arquivo instanceof File) || arquivo.size === 0) {
      setErro("Selecione um arquivo para enviar.");
      return;
    }
    if (arquivo.size > LIMITE_ARQUIVO_BYTES) {
      setErro("O arquivo excede o limite de 40 MB.");
      return;
    }
    if (!entidadeId) {
      setErro("Informe o ID do registro vinculado.");
      return;
    }

    setEnviando(true);
    const supabase = createClient();
    const nomeSeguro = arquivo.name.replace(/[\\/]/g, "_");
    const caminho = `${entidadeTipo}/${entidadeId}/${crypto.randomUUID()}-${nomeSeguro}`;

    try {
      const { error: erroUpload } = await supabase.storage.from("arquivos").upload(caminho, arquivo);
      if (erroUpload) throw new Error(erroUpload.message);

      const metadados = new FormData();
      metadados.set("entidade_tipo", entidadeTipo);
      metadados.set("entidade_id", entidadeId);
      metadados.set("tipo_arquivo", tipoArquivo);
      metadados.set("nome", arquivo.name);
      metadados.set("path_ou_url", caminho);
      metadados.set("tamanho_bytes", String(arquivo.size));

      try {
        await registrarArquivo(metadados);
      } catch (cause) {
        await supabase.storage.from("arquivos").remove([caminho]);
        throw cause;
      }

      form.reset();
      setSucesso(true);
    } catch (cause) {
      setErro(cause instanceof Error ? cause.message : "Não foi possível enviar o arquivo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <label className="flex flex-col gap-1 text-sm">
        <span style={{ color: "var(--color-ink-soft)" }}>Vinculado a</span>
        <select name="entidade_tipo" required defaultValue="contrato" className="rounded-sm border bg-white/70 px-3 py-2" style={{ borderColor: "var(--color-line)" }}>
          <option value="contrato">Contrato</option>
          <option value="imovel">Imóvel</option>
          <option value="manutencao">Manutenção</option>
          <option value="pagamento">Pagamento</option>
          <option value="conta">Conta de água/energia</option>
          <option value="inquilino">Inquilino</option>
          <option value="proprietario">Proprietário</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span style={{ color: "var(--color-ink-soft)" }}>ID do registro vinculado</span>
        <input name="entidade_id" required placeholder="cole o ID do contrato/imóvel/etc." className="rounded-sm border bg-white/70 px-3 py-2" style={{ borderColor: "var(--color-line)" }} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span style={{ color: "var(--color-ink-soft)" }}>Tipo de arquivo</span>
        <input name="tipo_arquivo" placeholder="foto, contrato, recibo, comprovante..." className="rounded-sm border bg-white/70 px-3 py-2" style={{ borderColor: "var(--color-line)" }} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span style={{ color: "var(--color-ink-soft)" }}>Arquivo</span>
        <input name="arquivo" type="file" required className="text-sm" />
        <span className="mt-1 inline-flex w-fit items-center rounded-sm border px-2 py-1 text-xs" style={{ borderColor: "var(--color-line)", color: "var(--color-ink-soft)" }}>
          Limite: 40 MB por arquivo
        </span>
      </label>
      {(erro || sucesso) && (
        <p role={erro ? "alert" : "status"} className="text-sm sm:col-span-2" style={{ color: erro ? "var(--color-alert)" : "var(--color-ok)" }}>
          {erro ?? "Arquivo enviado com sucesso."}
        </p>
      )}
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={enviando}
          className="rounded-sm px-4 py-2 text-sm font-medium disabled:opacity-60"
          style={{ background: "var(--color-teal)", color: "var(--color-paper)" }}
        >
          {enviando ? "Enviando..." : "Enviar arquivo"}
        </button>
      </div>
    </form>
  );
}
