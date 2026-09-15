import { useState, useEffect } from 'react';
import { Download, Share, X, Smartphone, PlusSquare, MoreVertical } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    // Check if already running in standalone mode (installed PWA)
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.includes('android-app://');

    if (isStandaloneMode) {
      setIsStandalone(true);
      return;
    }

    // Check if user dismissed it in this session
    if (sessionStorage.getItem('moneycard_pwa_dismissed') === 'true') {
      setIsDismissed(true);
      return;
    }

    // Detect iOS devices
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleIos = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isAppleIos);

    // Capture Chrome/Edge/Android beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Trigger native install prompt on Android/Chrome
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setIsDismissed(true);
        }
        setDeferredPrompt(null);
      } catch {
        setShowGuide((prev) => !prev);
      }
    } else {
      // Toggle device instruction guide
      setShowGuide((prev) => !prev);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem('moneycard_pwa_dismissed', 'true');
  };

  // If already installed or dismissed, hide
  if (isStandalone || isDismissed) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-emerald-300/80 bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 p-4 text-white shadow-xl animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 border border-emerald-400/30 overflow-hidden shadow-sm">
            <img
              src="/app_icon_192.png"
              alt="Money Card"
              className="h-9 w-9 object-contain"
              onError={(e) => {
                // Fallback to Smartphone icon if image fails
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
            <Smartphone className="h-5 w-5 text-emerald-400" style={{ display: 'none' }} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Install App
              </span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-400/20">
                PWA
              </span>
            </div>
            <p className="text-sm font-semibold text-slate-100 leading-tight mt-0.5">
              Install Money Card Portal
            </p>
            <p className="text-xs text-slate-300 mt-0.5">
              Add to Home Screen for instant balance checks without browser bars.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Dismiss banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Action buttons */}
      <div className="mt-3.5 flex items-center gap-2 pt-2 border-t border-slate-800/80">
        <button
          type="button"
          onClick={handleInstallClick}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-emerald-600/30 transition-all active:scale-95 cursor-pointer"
        >
          {isIos ? (
            <>
              <Share className="h-3.5 w-3.5" />
              <span>Install on iPhone</span>
            </>
          ) : deferredPrompt ? (
            <>
              <Download className="h-3.5 w-3.5" />
              <span>Install to Home Screen</span>
            </>
          ) : (
            <>
              <Download className="h-3.5 w-3.5" />
              <span>How to Install App</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleDismiss}
          className="rounded-xl px-3 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
        >
          Not now
        </button>
      </div>

      {/* Step-by-step instruction helper */}
      {showGuide && (
        <div className="mt-3 rounded-xl bg-slate-800/95 border border-slate-700/80 p-3 text-xs text-slate-200 space-y-2 animate-in fade-in duration-200">
          {isIos ? (
            <>
              <p className="font-semibold text-emerald-400">Install via Safari in 2 quick steps:</p>
              <ol className="space-y-1.5 list-decimal list-inside text-[11px] text-slate-300">
                <li>
                  Tap the <strong className="text-white">Share</strong> icon{' '}
                  <Share className="inline h-3.5 w-3.5 text-sky-400 mx-0.5" /> at the bottom of Safari.
                </li>
                <li>
                  Scroll down and tap <strong className="text-white">Add to Home Screen</strong>{' '}
                  <PlusSquare className="inline h-3.5 w-3.5 text-emerald-400 mx-0.5" />.
                </li>
              </ol>
            </>
          ) : (
            <>
              <p className="font-semibold text-emerald-400">Install on your phone in 2 quick steps:</p>
              <ol className="space-y-1.5 list-decimal list-inside text-[11px] text-slate-300">
                <li>
                  Tap the browser menu{' '}
                  <MoreVertical className="inline h-3.5 w-3.5 text-emerald-400 mx-0.5" /> (3 dots at top or bottom right).
                </li>
                <li>
                  Tap <strong className="text-white">Install app</strong> or <strong className="text-white">Add to Home screen</strong>.
                </li>
              </ol>
            </>
          )}
        </div>
      )}
    </div>
  );
}
