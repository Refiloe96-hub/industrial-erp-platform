/**
 * CSV Export Utility
 * Converts arrays of objects to a downloadable CSV file.
 * Handles commas, quotes, and newlines in values safely.
 */

function escapeCell(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Wrap in quotes if it contains comma, quote, or newline
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

/**
 * @param {string[]} headers - Column headers
 * @param {(string|number|null)[][]} rows - Row data
 * @param {string} filename - Download filename (without .csv)
 */
export function downloadCSV(headers, rows, filename = 'export') {
  const lines = [
    headers.map(escapeCell).join(','),
    ...rows.map(row => row.map(escapeCell).join(',')),
  ];
  const csv = lines.join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Format a timestamp to a readable date string */
export function fmtDate(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString('en-ZA', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
}
