export function escapeCsvValue(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  const escaped = text.replace(/"/g, '""');
  return `"${escaped}"`;
}

export function toCsv(rows: unknown[][]) {
  return rows.map((row) => row.map(escapeCsvValue).join(",")).join("\n");
}
