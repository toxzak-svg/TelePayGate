export function exportToCsv(filename: string, rows: Record<string, any>[]) {
  if (!rows || !rows.length) {
    // create empty csv
    const blob = new Blob([""], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return;
  }

  const headers = Object.keys(rows[0]);
  const csv = [headers.join(',')].concat(
    rows.map(r => headers.map(h => {
      const val = r[h] === null || r[h] === undefined ? '' : String(r[h]);
      // escape quotes
      const escaped = val.replace(/"/g, '""');
      // wrap fields containing comma or quote in quotes
      return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
    }).join(','))
  ).join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
