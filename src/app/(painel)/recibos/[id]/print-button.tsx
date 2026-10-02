"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-6 py-2.5 rounded shadow transition cursor-pointer"
    >
      🖨️ Imprimir Recibo
    </button>
  );
}