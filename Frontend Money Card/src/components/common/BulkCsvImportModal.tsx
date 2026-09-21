import { useState, useRef, type ChangeEvent } from 'react';
import { Button, Modal, ModalFooter } from '@/components/ui';
import { notify } from '@/utils';
import { Upload, Download, FileText, AlertCircle } from 'lucide-react';

interface BulkCsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  templateFilename: string;
  templateContent: string;
  onImport: (rows: any[]) => Promise<{ success: boolean; message?: string; data?: any }>; // callback after parsing
}

export function BulkCsvImportModal({
  isOpen,
  onClose,
  title,
  templateFilename,
  templateContent,
  onImport,
}: BulkCsvImportModalProps) {
  const [fileName, setFileName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedRows, setParsedRows] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = () => {
    const blob = new Blob([templateContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = templateFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    notify.success('Template downloaded');
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setError(null);
    setParsedRows(null);
    setIsProcessing(true);

    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
      if (lines.length < 2) {
        setError('CSV must contain header row + at least one data row.');
        setIsProcessing(false);
        return;
      }
      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
      const rows = lines.slice(1).map((line, idx) => {
        const vals = line.split(',');
        const row: any = { rowNumber: idx + 2 };
        headers.forEach((h, i) => {
          row[h] = vals[i] ? vals[i].trim() : '';
        });
        return row;
      });
      setParsedRows(rows);
    } catch {
      setError('Failed to parse CSV file.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmitImport = async () => {
    if (!parsedRows || parsedRows.length === 0) return;
    setIsProcessing(true);
    setError(null);
    try {
      const res = await onImport(parsedRows);
      if (res.success) {
        notify.success(res.message || 'Bulk import completed');
        setParsedRows(null);
        setFileName('');
        if (fileRef.current) fileRef.current.value = '';
        onClose();
      } else {
        setError(res.message || 'Import failed');
      }
    } catch {
      setError('Unexpected error during import');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={() => !isProcessing && onClose()} title={title} size="lg">
      <div className="space-y-4">
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
          <h3 className="text-sm font-semibold text-emerald-800 mb-2 flex items-center gap-2">
            <FileText className="h-4 w-4" /> CSV Template
          </h3>
          <p className="text-xs text-emerald-700 mb-3">Download the template to see the required columns.</p>
          <Button variant="outline" size="sm" onClick={handleDownloadTemplate} leftIcon={<Download className="h-3.5 w-3.5" />} className="cursor-pointer">
            Download Template
          </Button>
        </div>

        <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/60 p-6 text-center hover:border-emerald-400 transition-colors">
          <input ref={fileRef} type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={isProcessing}
            className="text-emerald-700 font-medium text-sm underline underline-offset-2 hover:text-emerald-800 cursor-pointer"
          >
            {fileName ? `Selected: ${fileName}` : 'Click to upload CSV'}
          </button>
          <p className="text-[11px] text-slate-400 mt-1">CSV only. Max 100 rows recommended.</p>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {parsedRows && (
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 flex items-center justify-between">
              <span>{parsedRows.length} rows ready</span>
              <span className="text-emerald-600 font-semibold">{parsedRows.length} valid</span>
            </div>
            <div className="overflow-x-auto max-h-48">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    {Object.keys(parsedRows[0]).filter((k) => k !== 'rowNumber').map((k) => (
                      <th key={k} className="px-2 py-2 text-left font-medium border-b border-slate-200 whitespace-nowrap">{k}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parsedRows.slice(0, 5).map((row) => (
                    <tr key={row.rowNumber} className="hover:bg-slate-50/50">
                      {Object.entries(row).filter(([k]) => k !== 'rowNumber').map(([k, v]) => (
                        <td key={k} className="px-2 py-1.5 text-slate-700 whitespace-nowrap">{String(v)}</td>
                      ))}
                    </tr>
                  ))}
                  {parsedRows.length > 5 && (
                    <tr>
                      <td colSpan={Object.keys(parsedRows[0]).length - 1} className="px-2 py-2 text-xs text-slate-400 italic">...and {parsedRows.length - 5} more</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <ModalFooter>
          <Button variant="outline" onClick={() => { onClose(); setFileName(''); setParsedRows(null); setError(null); if (fileRef.current) fileRef.current.value = ''; }} disabled={isProcessing} className="cursor-pointer">Cancel</Button>
          <Button variant="primary" onClick={handleSubmitImport} isLoading={isProcessing} disabled={isProcessing || !parsedRows || parsedRows.length === 0} leftIcon={<Upload className="h-3.5 w-3.5" />} className="cursor-pointer">Import & Create</Button>
        </ModalFooter>
      </div>
    </Modal>
  );
}
