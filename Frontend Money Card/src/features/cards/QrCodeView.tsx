// ─── Safe QR Representation Component (M7) ─────────────────
// Displays QR code URL & visual card framing without exposing secrets or raw database UUIDs.

import { useState } from 'react';
import { QrCode, Copy, Check, ShieldCheck, ExternalLink } from 'lucide-react';
import { Button, Badge } from '@/components/ui';
import { notify } from '@/utils';
import { QRCodeCanvas } from 'qrcode.react';

interface QrCodeViewProps {
  physicalCardNumber: string;
  qrToken: string;
}

export function QrCodeView({ physicalCardNumber, qrToken }: QrCodeViewProps) {
  const [copied, setCopied] = useState(false);

  // M0 Rule 15: Opaque HTTPS URL
  const qrUrl = typeof window !== 'undefined' ? `${window.location.origin}/c/${qrToken}` : `https://app.moneycard.com/c/${qrToken}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(qrUrl);
    setCopied(true);
    notify.success('QR URL copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <QrCode className="h-4 w-4 text-emerald-600" />
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
            Card QR Credential
          </h4>
        </div>
        <Badge variant="outline" className="text-[10px] text-emerald-700 border-emerald-300 bg-emerald-50">
          Opaque Token
        </Badge>
      </div>

      {/* Visual QR Card Representation */}
      <div className="flex flex-col sm:flex-row items-center gap-4 rounded-xl bg-white p-4 border border-slate-200 shadow-xs">
        {/* Real Scannable QR Code Canvas */}
        <div className="flex shrink-0 flex-col items-center justify-center rounded-xl bg-white p-2 shadow-xs border border-slate-200">
          <QRCodeCanvas
            value={qrUrl}
            size={108}
            level="H"
            includeMargin={false}
          />
        </div>

        {/* Info */}
        <div className="flex-1 space-y-2 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <span className="text-xs text-slate-500">Card:</span>
            <span className="font-mono text-sm font-bold text-emerald-700">
              {physicalCardNumber}
            </span>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-600">Public QR URL</label>
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5 border border-slate-300">
              <span className="flex-1 truncate font-mono text-xs text-slate-700">{qrUrl}</span>
              <button
                type="button"
                onClick={handleCopy}
                className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                title="Copy QR URL"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-center sm:justify-start gap-1 text-[11px] text-slate-500">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>Encodes opaque URL token — No balance or user secrets stored</span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-end gap-2">
        <a
          href={qrUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
          <span>Open Portal View</span>
        </a>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          leftIcon={copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
        >
          {copied ? 'Copied' : 'Copy QR URL'}
        </Button>
      </div>
    </div>
  );
}
