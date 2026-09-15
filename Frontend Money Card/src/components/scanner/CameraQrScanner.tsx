import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { CameraOff, AlertCircle, RefreshCw, SwitchCamera } from 'lucide-react';
import { Button } from '@/components/ui';
import { generateSecureToken } from '../../utils/cryptoRandom';

interface CameraQrScannerProps {
  onScan: (decodedText: string) => void;
  isActive: boolean;
  onToggleActive?: (active: boolean) => void;
  className?: string;
}

export function CameraQrScanner({
  onScan,
  isActive,
  onToggleActive,
  className = '',
}: CameraQrScannerProps) {
  const containerIdRef = useRef<string>(generateSecureToken('qr-reader'));
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [availableCameras, setAvailableCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);

  // Debounce duplicate scans
  const lastScanRef = useRef<{ text: string; time: number }>({ text: '', time: 0 });

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (err) {
        console.warn('Error stopping QR scanner:', err);
      }
      scannerRef.current = null;
    }
  }, []);

  const startScanner = useCallback(
    async (cameraId?: string) => {
      setErrorMessage(null);
      setIsInitializing(true);

      // Stop any existing instance
      await stopScanner();

      // Ensure container DOM exists
      const container = document.getElementById(containerIdRef.current);
      if (!container) {
        setIsInitializing(false);
        return;
      }

      try {
        const scanner = new Html5Qrcode(containerIdRef.current, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.DATA_MATRIX,
            Html5QrcodeSupportedFormats.CODE_128,
          ],
          verbose: false,
        });
        scannerRef.current = scanner;

        // Query available cameras
        try {
          const cameras = await Html5Qrcode.getCameras();
          if (cameras && cameras.length > 0) {
            setAvailableCameras(cameras.map((c) => ({ id: c.id, label: c.label || `Camera ${c.id.slice(0, 5)}` })));
          }
        } catch {
          // Camera listing query can fail if permissions not yet granted
        }

        const cameraConfig = cameraId
          ? { deviceId: { exact: cameraId } }
          : { facingMode: 'environment' };

        const config = {
          fps: 25,
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const edge = Math.floor(minEdge * 0.82);
            return { width: edge, height: edge };
          },
          aspectRatio: 1.0,
        };

        await scanner.start(
          cameraConfig,
          config,
          (decodedText: string) => {
            const trimmed = decodedText.trim();
            if (!trimmed) return;

            const now = Date.now();
            const isSameCode = trimmed === lastScanRef.current.text;
            const timeSinceLast = now - lastScanRef.current.time;

            // Debounce: 1200ms for exact duplicate, 250ms for different card
            if (isSameCode && timeSinceLast < 1200) {
              return;
            }
            if (!isSameCode && timeSinceLast < 250) {
              return;
            }

            lastScanRef.current = { text: trimmed, time: now };
            onScan(trimmed);
          },
          () => {
            // Frame parse error (no QR detected in frame), safe to ignore
          },
        );
      } catch (err: any) {
        console.error('Failed to start camera scanner:', err);
        const msg =
          err?.message ||
          (typeof err === 'string' ? err : 'Unable to access camera. Please verify camera permissions.');
        setErrorMessage(msg);
      } finally {
        setIsInitializing(false);
      }
    },
    [onScan, stopScanner],
  );

  // Toggle or re-start when isActive changes
  useEffect(() => {
    if (isActive) {
      startScanner(selectedCameraId || undefined);
    } else {
      stopScanner();
    }

    return () => {
      stopScanner();
    };
  }, [isActive, selectedCameraId, startScanner, stopScanner]);

  const handleSwitchCamera = () => {
    if (availableCameras.length <= 1) return;
    const currentIndex = availableCameras.findIndex((c) => c.id === selectedCameraId);
    const nextIndex = (currentIndex + 1) % availableCameras.length;
    const nextCamera = availableCameras[nextIndex];
    setSelectedCameraId(nextCamera.id);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Scanner Viewport Container - Full Frame Square */}
      <div className="relative w-full aspect-square max-w-[340px] sm:max-w-[380px] mx-auto rounded-2xl overflow-hidden border-2 border-emerald-500/60 bg-black flex items-center justify-center shadow-2xl">
        {/* DOM node for Html5Qrcode */}
        <div
          id={containerIdRef.current}
          className="w-full h-full [&_video]:!w-full [&_video]:!h-full [&_video]:!object-cover [&_video]:!block [&_#qr-shaded-region]:!hidden [&_#qr-shaded-region]:!border-0"
        />

        {isInitializing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 text-emerald-400 gap-2 z-10">
            <RefreshCw className="h-7 w-7 animate-spin" />
            <p className="text-xs font-semibold text-slate-300">Initializing full-frame camera...</p>
          </div>
        )}

        {errorMessage && (
          <div className="absolute inset-0 p-6 flex flex-col items-center justify-center bg-slate-950/95 text-center z-10 space-y-3">
            <AlertCircle className="h-8 w-8 text-rose-400" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-rose-300">Camera Access Issue</p>
              <p className="text-xs text-slate-400 max-w-xs">{errorMessage}</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs border-slate-700"
                onClick={() => startScanner(selectedCameraId || undefined)}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1" /> Retry Camera
              </Button>
            </div>
          </div>
        )}

        {/* Full-Frame Square Scanner Reticle Overlay */}
        {!isInitializing && !errorMessage && isActive && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4">
            <div className="relative w-[78%] aspect-square max-w-[260px] border border-emerald-400/50 rounded-2xl overflow-hidden">
              {/* Corner accents - prominent full-frame corners */}
              <div className="absolute -top-1 -left-1 w-7 h-7 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl shadow-[0_0_10px_rgba(52,211,153,0.9)]" />
              <div className="absolute -top-1 -right-1 w-7 h-7 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl shadow-[0_0_10px_rgba(52,211,153,0.9)]" />
              <div className="absolute -bottom-1 -left-1 w-7 h-7 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl shadow-[0_0_10px_rgba(52,211,153,0.9)]" />
              <div className="absolute -bottom-1 -right-1 w-7 h-7 border-b-4 border-r-4 border-emerald-400 rounded-br-xl shadow-[0_0_10px_rgba(52,211,153,0.9)]" />
              
              {/* Vertical sweeping laser line across the whole square QR frame */}
              <div className="absolute left-1 right-1 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_10px_rgba(52,211,153,1)] animate-qr-sweep" />
            </div>
            <p className="mt-3 text-[11px] font-semibold text-emerald-300 bg-slate-950/85 px-3.5 py-1 rounded-full border border-emerald-500/30 backdrop-blur-md shadow-md">
              Align QR code inside the frame
            </p>
          </div>
        )}
      </div>

      {/* Camera Controls Bar */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span className="font-medium text-slate-700">Live Optical Scanner</span>
          {availableCameras.length > 1 && (
            <button
              type="button"
              onClick={handleSwitchCamera}
              className="flex items-center gap-1 text-[11px] text-emerald-700 hover:text-emerald-800 ml-2 px-2 py-0.5 rounded bg-slate-100 border border-slate-200"
            >
              <SwitchCamera className="h-3 w-3" />
              <span>Switch Camera</span>
            </button>
          )}
        </div>

        {onToggleActive && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleActive(false)}
            className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 py-1 px-2.5 h-auto"
          >
            <CameraOff className="h-3.5 w-3.5 mr-1" /> Close Camera
          </Button>
        )}
      </div>
    </div>
  );
}
