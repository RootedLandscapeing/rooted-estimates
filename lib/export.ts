"use client";

type CsvValue = string | number | null | undefined;

export function downloadCsv(
  filename: string,
  rows: Array<Record<string, CsvValue>>
) {
  if (!rows.length || typeof window === "undefined") {
    return;
  }

  const headers = Object.keys(rows[0]);
  const csvLines = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          const normalized = value == null ? "" : String(value);
          const escaped = normalized.replaceAll('"', '""');
          return `"${escaped}"`;
        })
        .join(",")
    )
  ];

  const blob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
}
