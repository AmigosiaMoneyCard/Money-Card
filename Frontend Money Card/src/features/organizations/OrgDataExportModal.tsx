import { useState } from 'react';
import { Modal, ModalFooter, Button } from '@/components/ui';
import { apiService } from '@/services/api';
import { Download, Database, CheckCircle2 } from 'lucide-react';
import { notify } from '@/utils';

interface OrgDataExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId?: string;
  organizationName?: string;
}

export function OrgDataExportModal({
  isOpen,
  onClose,
  organizationId,
  organizationName = 'Cafeteria Organization',
}: OrgDataExportModalProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleDownloadExport = async () => {
    setIsExporting(true);
    try {
      const res = await (apiService as any).organizations.exportOrganizationData(organizationId);
      if (res.success && res.data) {
        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
          JSON.stringify(res.data, null, 2)
        )}`;
        const downloadAnchor = document.createElement('a');
        const filename = `${organizationName.replace(/[^a-zA-Z0-9_-]/g, '_')}_data_export_${
          new Date().toISOString().split('T')[0]
        }.json`;
        downloadAnchor.setAttribute('href', jsonString);
        downloadAnchor.setAttribute('download', filename);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();

        notify.success('Organization data exported successfully');
        onClose();
      } else {
        notify.error(res.error?.message || 'Failed to export organization data');
      }
    } catch (err: any) {
      notify.error(err?.message || 'Unexpected error exporting organization data');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Export Organization Data Archive"
      maxWidth="md"
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Generate a comprehensive JSON data backup containing all active records and historic transaction data for{' '}
          <strong className="text-gray-900">{organizationName}</strong>.
        </p>

        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-2.5">
          <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
            Included in this Export:
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>Cafeteria Counters & Branches</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>Staff Members & Roles</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>Registered Wallets & Cards</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>Card Sessions & Balances</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>Menu Catalog & Products</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>Historic Financial Transactions</span>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-blue-50 text-blue-800 text-xs">
          <Database className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            Sensitive security information such as user passwords are automatically scrubbed and excluded from the export archive for tenant privacy and compliance.
          </span>
        </div>
      </div>

      <ModalFooter>
        <Button variant="outline" onClick={onClose} disabled={isExporting}>
          Cancel
        </Button>
        <Button
          onClick={handleDownloadExport}
          isLoading={isExporting}
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          Download JSON Archive
        </Button>
      </ModalFooter>
    </Modal>
  );
}
