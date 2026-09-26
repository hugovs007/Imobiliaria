"use client";

import { useId, useRef, useState } from "react";
import { atualizarRegistro } from "@/app/(painel)/actions";

type EditorField = {
  name: string;
  label: string;
  value?: string | number | null;
  required?: boolean;
  step?: string;
  type?: string;
  kind?: "input" | "select" | "textarea";
  options?: { value: string; label: string }[];
};

export function RecordEditor({
  entity,
  id,
  fields,
}: {
  entity: string;
  id: string;
  fields: EditorField[];
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openDialog() {
    setError(null);
    setIsOpen(true);
    dialogRef.current?.showModal();
  }

  function closeDialog() {
    dialogRef.current?.close();
    setIsOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="text-xs underline"
        style={{ color: "var(--color-ink-soft)" }}
      >
        Editar
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onClose={() => setIsOpen(false)}
        className="m-auto max-h-[90vh] w-[min(42rem,calc(100vw-2rem))] overflow-y-auto rounded-md border bg-white p-0 shadow-2xl backdrop:bg-black/50"
        style={{ borderColor: "var(--color-line)" }}
      >
        {isOpen && (
          <div className="p-5 sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 id={titleId} className="text-lg font-semibold" style={{ color: "var(--color-ink)" }}>
                  Editar informações
                </h2>
                <p className="mt-1 text-sm" style={{ color: "var(--color-ink-soft)" }}>
                  Altere os campos necessários e salve.
                </p>
              </div>
              <button
                type="button"
                onClick={closeDialog}
                aria-label="Fechar"
                className="rounded-sm px-2 py-1 text-lg leading-none"
                style={{ color: "var(--color-ink-soft)" }}
              >
                ×
              </button>
            </div>
            <form
              action={async (formData) => {
                setIsSaving(true);
                setError(null);
                try {
                  await atualizarRegistro(formData);
                  closeDialog();
                } catch (cause) {
                  setError(cause instanceof Error ? cause.message : "Não foi possível salvar as alterações.");
                } finally {
                  setIsSaving(false);
                }
              }}
              className="grid grid-cols-1 gap-4 sm:grid-cols-2"
            >
              <input type="hidden" name="entity" value={entity} />
              <input type="hidden" name="id" value={id} />
              {fields.map((field) => (
                <label key={field.name} className={`flex flex-col gap-1 text-sm ${field.kind === "textarea" ? "sm:col-span-2" : ""}`}>
                  <span style={{ color: "var(--color-ink-soft)" }}>{field.label}</span>
                  {field.kind === "textarea" ? (
                    <textarea
                      name={field.name}
                      defaultValue={field.value ?? ""}
                      rows={3}
                      className="rounded-sm border px-3 py-2"
                      style={{ borderColor: "var(--color-line)" }}
                    />
                  ) : field.kind === "select" ? (
                    <select
                      name={field.name}
                      defaultValue={field.value ?? ""}
                      required={field.required}
                      className="rounded-sm border px-3 py-2"
                      style={{ borderColor: "var(--color-line)" }}
                    >
                      {field.options?.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      name={field.name}
                      type={field.type ?? "text"}
                      defaultValue={field.value ?? ""}
                      required={field.required}
                      step={field.step}
                      className="rounded-sm border px-3 py-2"
                      style={{ borderColor: "var(--color-line)" }}
                    />
                  )}
                </label>
              ))}
              {error && (
                <p role="alert" className="text-sm sm:col-span-2" style={{ color: "var(--color-alert)" }}>
                  {error}
                </p>
              )}
              <div className="flex justify-end gap-2 border-t pt-4 sm:col-span-2" style={{ borderColor: "var(--color-line)" }}>
                <button
                  type="button"
                  onClick={closeDialog}
                  className="rounded-sm border px-4 py-2 text-sm"
                  style={{ borderColor: "var(--color-line)", color: "var(--color-ink)" }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-sm px-4 py-2 text-sm font-medium disabled:opacity-60"
                  style={{ background: "var(--color-teal)", color: "var(--color-paper)" }}
                >
                  {isSaving ? "Salvando..." : "Salvar alterações"}
                </button>
              </div>
            </form>
          </div>
        )}
      </dialog>
    </>
  );
}
