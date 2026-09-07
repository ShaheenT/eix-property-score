'use client';

export function ReportPrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print rounded-xl bg-teal-500 px-4 py-2 text-sm font-semibold text-midnight-900"
    >
      Download / Print
    </button>
  );
}
