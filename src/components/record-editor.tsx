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
  return (
    <details className="min-w-56">
      <summary className="cursor-pointer text-xs underline" style={{ color: "var(--color-ink-soft)" }}>
        Editar
      </summary>
      <form action={atualizarRegistro} className="mt-3 grid min-w-72 grid-cols-1 gap-3 rounded-sm border bg-white p-3 sm:grid-cols-2" style={{ borderColor: "var(--color-line)" }}>
        <input type="hidden" name="entity" value={entity} />
        <input type="hidden" name="id" value={id} />
        {fields.map((field) => (
          <label key={field.name} className={`flex flex-col gap-1 text-xs ${field.kind === "textarea" ? "sm:col-span-2" : ""}`}>
            <span style={{ color: "var(--color-ink-soft)" }}>{field.label}</span>
            {field.kind === "textarea" ? (
              <textarea
                name={field.name}
                defaultValue={field.value ?? ""}
                rows={3}
                className="rounded-sm border px-2 py-1.5 text-sm"
                style={{ borderColor: "var(--color-line)" }}
              />
            ) : field.kind === "select" ? (
              <select
                name={field.name}
                defaultValue={field.value ?? ""}
                required={field.required}
                className="rounded-sm border px-2 py-1.5 text-sm"
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
                className="rounded-sm border px-2 py-1.5 text-sm"
                style={{ borderColor: "var(--color-line)" }}
              />
            )}
          </label>
        ))}
        <button
          type="submit"
          className="rounded-sm px-3 py-2 text-xs font-medium sm:col-span-2"
          style={{ background: "var(--color-teal)", color: "var(--color-paper)" }}
        >
          Salvar alterações
        </button>
      </form>
    </details>
  );
}
