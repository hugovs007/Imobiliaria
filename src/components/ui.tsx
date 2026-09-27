import { ReactNode } from "react";

export function Alert({
  children,
  variant = "default",
  className,
}: {
  children: ReactNode;
  variant?: "default" | "destructive";
  className?: string;
}) {
  const base = "rounded-md border p-4 text-sm";
  if (variant === "destructive") {
    return (
      <div
        className={`${base} ${className ?? ""}`}
        style={{
          borderColor: "var(--color-alert)",
          background: "var(--color-alert)1a",
          color: "var(--color-alert)",
        }}
      >
        {children}
      </div>
    );
  }
  return (
    <div
      className={`${base} ${className ?? ""}`}
      style={{
        borderColor: "var(--color-line)",
        background: "var(--color-teal)1a",
        color: "var(--color-teal)",
      }}
    >
      {children}
    </div>
  );
}

export function Field({
  label,
  name,
  type = "text",
  defaultValue,
  required,
  step,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string | number;
  required?: boolean;
  step?: string;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-ink-soft" style={{ color: "var(--color-ink-soft)" }}>
        {label}
        {required && <span style={{ color: "var(--color-alert)" }}> *</span>}
      </span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        step={step}
        placeholder={placeholder}
        className="rounded-sm border px-3 py-2 bg-white/70 focus:outline-none focus:ring-2"
        style={{
          borderColor: "var(--color-line)",
        }}
      />
    </label>
  );
}

export function Select({
  label,
  name,
  options,
  defaultValue,
  required,
}: {
  label: string;
  name: string;
  options: { value: string; label: string }[];
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span style={{ color: "var(--color-ink-soft)" }}>
        {label}
        {required && <span style={{ color: "var(--color-alert)" }}> *</span>}
      </span>
      <select
        name={name}
        defaultValue={defaultValue}
        required={required}
        className="rounded-sm border px-3 py-2 bg-white/70 focus:outline-none focus:ring-2"
        style={{ borderColor: "var(--color-line)" }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function TextArea({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm sm:col-span-2">
      <span style={{ color: "var(--color-ink-soft)" }}>{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue}
        rows={3}
        className="rounded-sm border px-3 py-2 bg-white/70 focus:outline-none focus:ring-2"
        style={{ borderColor: "var(--color-line)" }}
      />
    </label>
  );
}

export function Button({
  children,
  variant = "primary",
}: {
  children: ReactNode;
  variant?: "primary" | "ghost";
}) {
  const base = "rounded-sm px-4 py-2 text-sm font-medium transition-colors";
  if (variant === "ghost") {
    return (
      <button
        type="submit"
        className={`${base} border`}
        style={{ borderColor: "var(--color-line)", color: "var(--color-ink)" }}
      >
        {children}
      </button>
    );
  }
  return (
    <button
      type="submit"
      className={base}
      style={{ background: "var(--color-teal)", color: "var(--color-paper)" }}
    >
      {children}
    </button>
  );
}

const badgeColors: Record<string, string> = {
  ativo: "var(--color-ok)",
  disponivel: "var(--color-ok)",
  pago: "var(--color-ok)",
  concluida: "var(--color-ok)",
  aplicado: "var(--color-ok)",
  pendente: "var(--color-warn)",
  aberta: "var(--color-warn)",
  em_andamento: "var(--color-warn)",
  alugado: "var(--color-teal)",
  atrasado: "var(--color-alert)",
  encerrado: "var(--color-ink-soft)",
  rescindido: "var(--color-alert)",
  manutencao: "var(--color-warn)",
  inativo: "var(--color-ink-soft)",
  cancelada: "var(--color-ink-soft)",
  ignorado: "var(--color-ink-soft)",
};

export function StatusBadge({ status }: { status: string }) {
  const color = badgeColors[status] ?? "var(--color-ink-soft)";
  return (
    <span
      className="rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap"
      style={{ background: `${color}1a`, color }}
    >
      {status.replace("_", " ")}
    </span>
  );
}

export function Card({ children }: { children: ReactNode }) {
  return (
    <div
      className="rounded-md border bg-white/60 p-5"
      style={{ borderColor: "var(--color-line)" }}
    >
      {children}
    </div>
  );
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold" style={{ color: "var(--color-ink)" }}>
        {title}
      </h1>
      {subtitle && (
        <p className="mt-1 text-sm" style={{ color: "var(--color-ink-soft)" }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-md border" style={{ borderColor: "var(--color-line)" }}>
      <table className="w-full min-w-max border-collapse text-sm">
        <thead>
          <tr style={{ borderBottom: "1px solid var(--color-line)" }}>
            {head.map((h) => (
              <th
                key={h}
                className="px-4 py-2.5 text-left font-medium"
                style={{ color: "var(--color-ink-soft)" }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Money({ value }: { value: number | null | undefined }) {
  if (value === null || value === undefined) return <span>—</span>;
  return (
    <span>
      {value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
    </span>
  );
}
