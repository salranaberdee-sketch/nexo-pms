"use client";

import { useState, useEffect } from "react";
import { X, Download, Share } from "lucide-react";

// BeforeInstallPromptEvent is not in standard TS lib yet
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [swRegistered, setSwRegistered] = useState(false);

  useEffect(() => {
    // Detect iOS (iPhone/iPad/iPod)
    const ios =
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !(window as unknown as { MSStream?: unknown }).MSStream;
    setIsIOS(ios);

    // Detect if already installed as standalone PWA
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);

    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .then((reg) => {
          setSwRegistered(true);
          // Check for updates every hour
          setInterval(() => reg.update(), 60 * 60 * 1000);
        })
        .catch((err) =>
          console.error("[PWA] Service worker registration failed:", err)
        );
    }

    // Listen for Android/Chrome install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show banner only if user hasn't dismissed it before
      if (!sessionStorage.getItem("nexo-install-dismissed")) {
        setShowBanner(true);
      }
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Show iOS banner if not standalone and not dismissed
    if (ios && !standalone && !sessionStorage.getItem("nexo-install-dismissed")) {
      // Delay slightly so it doesn't flash on first load
      const timer = setTimeout(() => setShowBanner(true), 2000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener("beforeinstallprompt", handler);
      };
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setShowBanner(false);
        setDeferredPrompt(null);
      }
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    sessionStorage.setItem("nexo-install-dismissed", "1");
  };

  // Already installed or SW not relevant — show nothing
  if (isStandalone || !showBanner) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm">
      <div className="bg-slate-800 border border-slate-600 rounded-2xl shadow-2xl p-4 flex gap-3 items-start">
        {/* App icon */}
        <img
          src="/icon-192x192.png"
          alt="Nexo"
          className="w-12 h-12 rounded-xl shrink-0"
        />

        {/* Text + action */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white leading-tight">
            ติดตั้ง Nexo PMS
          </p>

          {isIOS ? (
            /* iOS: ต้องทำด้วยตัวเอง ผ่านเมนู Share */
            <p className="text-xs text-slate-400 mt-1 leading-snug">
              แตะ{" "}
              <span className="inline-flex items-center gap-0.5 text-blue-400">
                <Share size={11} />
                &nbsp;แชร์
              </span>{" "}
              แล้วเลือก <strong className="text-slate-300">"เพิ่มบนหน้าจอโฮม"</strong>
            </p>
          ) : (
            <p className="text-xs text-slate-400 mt-1">
              ติดตั้งเพื่อเข้าใช้งานได้เหมือน app
            </p>
          )}

          {/* Install button — only on Android/Chrome where prompt is available */}
          {!isIOS && deferredPrompt && (
            <button
              onClick={handleInstall}
              className="mt-2 flex items-center gap-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg transition-colors"
            >
              <Download size={13} />
              ติดตั้งเลย
            </button>
          )}
        </div>

        {/* Dismiss */}
        <button
          onClick={handleDismiss}
          aria-label="ปิด"
          className="shrink-0 p-1 text-slate-500 hover:text-slate-300 transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
