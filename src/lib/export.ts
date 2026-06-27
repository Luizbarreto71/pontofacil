/** Utilitários de exportação — CSV nativo e PDF (jsPDF carregado sob demanda). */

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Exporta uma tabela para CSV (abre no Excel). */
export function exportCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const esc = (v: string | number) => {
    const s = String(v).replace(/"/g, '""');
    return /[",;\n]/.test(s) ? `"${s}"` : s;
  };
  const csv = [headers, ...rows].map((r) => r.map(esc).join(";")).join("\n");
  // BOM para acentuação correta no Excel
  download(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }), filename);
}

/** Exporta uma tabela para PDF (jsPDF + autotable, carregados sob demanda). */
export async function exportPDF(
  filename: string,
  title: string,
  subtitle: string,
  headers: string[],
  rows: (string | number)[][]
) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.setTextColor(37, 99, 235);
  doc.text(title, 14, 18);
  doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text(subtitle, 14, 25);

  autoTable(doc, {
    head: [headers],
    body: rows.map((r) => r.map(String)),
    startY: 31,
    styles: { fontSize: 9, cellPadding: 2.5 },
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
  });

  doc.save(filename);
}
