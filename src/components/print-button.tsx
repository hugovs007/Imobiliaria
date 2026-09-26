"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-sm px-4 py-2 text-sm font-medium print:hidden"
      style={{ background: "var(--color-teal)", color: "var(--color-paper)" }}
    >
      Imprimir recibo
    </button>
  );
}
