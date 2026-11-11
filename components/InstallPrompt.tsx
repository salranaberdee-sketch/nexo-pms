"use client";

import { X, Download, Share, ExternalLink, WifiOff, RefreshCw } from "lucide-react";
import { usePwa } from "@/lib/use-pwa";

/**
 * InstallPrompt
 *
 * Renders:
 *  1. SW update banner (top) — when a new version is deployed
 *  2. Offline banner (top) — when network drops
 *  3. Install banner (bottom) — context-aware per platform, never if already installed
 *
 * This component owns no install logic itself — all state lives in usePwa().
 * Settings.tsx reads the same hook to show the install card there too.
 */
export default function InstallPrompt() {
  const {
    isInstalled,
    platform,
    canInstall,
    isOnline,
    updateReady,
    showInstallBanner,
    promptInstall,
    applyUpdate,
    dismissUpdate,
    dismissInstallBanner,
    openInExternalBrowser,
  } = usePwa();

  return (
    <>
      {/* ── 1. SW Update toast (top) ────────────────────────────────────── */}
      {updateReady && (
        <div
          role="alert"
          aria-live="polite"
          className="fixed top-0 left-0 right-0 z-[60] flex items-center justify-between gap-3
                     px-4 py-3 bg-indigo-600 text-white text-sm shadow-lg"
        >
          <span className="font-medium">🔄 มีเวอร์ชันใหม่พร้อมใช้งาน</span>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={applyUpdate}
              className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-3 py-1
                         rounded-lg font-semibold transition-colors text-xs"
            >
              <RefreshCw size={12} />
              รีเฟรช
            </button>
            <button
              onClick={dismissUpdate}
              aria-label="ปิด"
              className="p-1 opacity-70 hover:opacity-100 transition-opacity"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      {/* ── 2. Offline banner (top, below update if both show) ──────────── */}
      {!isOnline && (
        <div
          role="alert"
          aria-live="polite"
          className="fixed left-0 right-0 z-[59] flex items-center gap-2
                     px-4 py-2.5 bg-amber-500 text-white text-xs font-medium shadow-md"
          style={{ top: updateReady ? "44px" : "0" }}
        >
          <WifiOff size={14} className="shrink-0" />
          <span>ไม่มีอินเทอร์เน็ต — ข้อมูลบางส่วนอาจไม่อัปเดต</span>
        </div>
      )}

      {/* ── 3. Install banner (bottom) — never shown when already installed */}
      {showInstallBanner && !isInstalled && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm">

          {/* LINE IAB */}
          {platform === "line" && (
            <div className="bg-[#06C755]/10 border border-[#06C755]/40 rounded-2xl shadow-2xl p-4
                            flex gap-3 items-start backdrop-blur">
              <img src="/icon-192x192.png" alt="Nexo" className="w-12 h-12 rounded-xl shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white leading-tight">
                  เปิดใน Browser เพื่อใช้ App
                </p>
                <p className="text-xs text-slate-300 mt-1 leading-snug">
                  LINE browser ไม่รองรับ PWA — กดเพื่อเปิดใน Safari หรือ Chrome
                  แล้ว app จะเปิดให้อัตโนมัติ
                </p>
                <button
                  onClick={openInExternalBrowser}
                  className="mt-2.5 flex items-center gap-1.5 text-xs font-semibold
                             bg-[#06C755] hover:bg-[#05b34b] text-white px-3 py-1.5 rounded-lg transition-colors"
                >
                  <ExternalLink size={13} />
                  เปิดใน Browser
                </button>
              </div>
              <button
                onClick={dismissInstallBanner}
                aria-label="ปิด"
                className="shrink-0 p-1 text-slate-500 hover:text-slate-300 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* iOS Safari */}
          {platform === "ios" && (
            <div className="bg-slate-800 border border-slate-600 rounded-2xl shadow-2xl p-4
                            flex gap-3 items-start">
              <img src="/icon-192x192.png" alt="Nexo" className="w-12 h-12 rounded-xl shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white leading-tight">
                  ติดตั้ง Nexo PMS
                </p>
                <p className="text-xs text-slate-400 mt-1 leading-snug">
                  แตะ{" "}
                  <span className="inline-flex items-center gap-0.5 text-blue-400">
                    <Share size={11} />&nbsp;แชร์
                  </span>{" "}
                  แล้วเลือก{" "}
                  <strong className="text-slate-300">"เพิ่มบนหน้าจอโฮม"</strong>
                </p>
              </div>
              <button
                onClick={dismissInstallBanner}
                aria-label="ปิด"
                className="shrink-0 p-1 text-slate-500 hover:text-slate-300 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Android / Desktop Chrome/Edge — native prompt available */}
          {(platform === "android" || platform === "desktop") && canInstall && (
            <div className="bg-slate-800 border border-slate-600 rounded-2xl shadow-2xl p-4
                            flex gap-3 items-start">
              <img src="/icon-192x192.png" alt="Nexo" className="w-12 h-12 rounded-xl shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white leading-tight">
                  ติดตั้ง Nexo PMS
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {platform === "desktop"
                    ? "ติดตั้งเป็นแอปบน desktop เพื่อเปิดได้เร็วขึ้น"
                    : "ติดตั้งเพื่อเข้าใช้งานได้เหมือน app"}
                </p>
                <button
                  onClick={promptInstall}
                  className="mt-2 flex items-center gap-1.5 text-xs font-medium
                             bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Download size={13} />
                  ติดตั้งเลย
                </button>
              </div>
              <button
                onClick={dismissInstallBanner}
                aria-label="ปิด"
                className="shrink-0 p-1 text-slate-500 hover:text-slate-300 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          )}

        </div>
      )}
    </>
  );
}
