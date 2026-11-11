"use client";

import { useState, useEffect, useCallback } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export type Platform =
  | "ios"       // iPhone / iPad Safari
  | "android"   // Android Chrome
  | "desktop"   // Windows / macOS / Linux Chrome, Edge, Brave
  | "line"      // LINE in-app browser (can't install)
  | "unknown";

export interface PwaState {
  /** Already running as installed PWA (standalone / minimal-ui) */
  isInstalled: boolean;
  /** Platform category */
  platform: Platform;
  /** Is the browser capable of showing the native install prompt? */
  canInstall: boolean;
  /** Is the browser online? */
  isOnline: boolean;
  /** New SW version is waiting — user should refresh */
  updateReady: boolean;
  /** Trigger the native Chrome/Edge install prompt */
  promptInstall: () => Promise<"accepted" | "dismissed" | "unavailable">;
  /** Acknowledge the update and reload */
  applyUpdate: () => void;
  /** Dismiss update toast without reloading */
  dismissUpdate: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  if (/Line\//i.test(ua)) return "line";
  if (/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream) return "ios";
  if (/Android/.test(ua)) return "android";
  // Desktop: Windows, macOS, Linux
  if (/Win|Mac|Linux/.test(navigator.platform || ua)) return "desktop";
  return "unknown";
}

function detectStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: minimal-ui)").matches ||
    (navigator as any).standalone === true
  );
}

/** localStorage key: timestamp until which install banner is suppressed */
const DISMISS_KEY = "nexo-install-dismissed-until";

function isBannerSuppressed(): boolean {
  try {
    const until = parseInt(localStorage.getItem(DISMISS_KEY) || "0");
    return Date.now() < until;
  } catch {
    return false;
  }
}

function suppressBanner(days = 7) {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now() + days * 86_400_000));
  } catch {
    /* storage unavailable */
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * usePwa — single hook for all PWA install/update/offline state.
 *
 * Rules:
 *  - If already installed (standalone), never show install UI.
 *  - If user dismissed banner, suppress for 7 days.
 *  - If LINE IAB, only expose "open in browser" — no native install.
 *  - Desktop Chrome/Edge: expose native prompt just like Android.
 */
export function usePwa(): PwaState & {
  showInstallBanner: boolean;
  dismissInstallBanner: () => void;
  openInExternalBrowser: () => void;
} {
  const [platform, setPlatform] = useState<Platform>("unknown");
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [updateReady, setUpdateReady] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  // SW message handler (memoised so it's stable across renders)
  const handleSwMessage = useCallback((e: MessageEvent) => {
    if (e.data?.type === "SW_UPDATED") setUpdateReady(true);
  }, []);

  useEffect(() => {
    // ── Clean up LINE param if present ───────────────────────────────────────
    const params = new URLSearchParams(window.location.search);
    if (params.has("openExternalBrowser")) {
      params.delete("openExternalBrowser");
      const clean =
        window.location.pathname +
        (params.toString() ? "?" + params.toString() : "") +
        window.location.hash;
      window.history.replaceState({}, "", clean);
    }

    const plat = detectPlatform();
    const installed = detectStandalone();
    setPlatform(plat);
    setIsInstalled(installed);
    setIsOnline(navigator.onLine);

    // ── Online / offline ──────────────────────────────────────────────────────
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    // ── Service Worker ────────────────────────────────────────────────────────
    if ("serviceWorker" in navigator && plat !== "line") {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .then((reg) => {
          // updatefound → new SW is installing
          reg.addEventListener("updatefound", () => {
            const newWorker = reg.installing;
            newWorker?.addEventListener("statechange", () => {
              if (
                newWorker.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                setUpdateReady(true);
              }
            });
          });
          // Poll for updates every 30 min
          const timer = setInterval(() => reg.update(), 30 * 60_000);
          return () => clearInterval(timer);
        })
        .catch((err) =>
          console.error("[PWA] SW registration failed:", err)
        );

      navigator.serviceWorker.addEventListener("message", handleSwMessage);
    }

    // ── Already installed → never show install banner ─────────────────────────
    if (installed) {
      return () => {
        window.removeEventListener("online", onOnline);
        window.removeEventListener("offline", onOffline);
        navigator.serviceWorker?.removeEventListener("message", handleSwMessage);
      };
    }

    // ── LINE IAB: show "open in browser" immediately ──────────────────────────
    if (plat === "line") {
      setShowInstallBanner(true);
      return () => {
        window.removeEventListener("online", onOnline);
        window.removeEventListener("offline", onOffline);
      };
    }

    // ── Android / Desktop Chrome/Edge: capture beforeinstallprompt ───────────
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (!isBannerSuppressed()) setShowInstallBanner(true);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    // ── iOS Safari: show hint banner after delay ──────────────────────────────
    let iosTimer: ReturnType<typeof setTimeout> | undefined;
    if (plat === "ios" && !isBannerSuppressed()) {
      iosTimer = setTimeout(() => setShowInstallBanner(true), 2500);
    }

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      navigator.serviceWorker?.removeEventListener("message", handleSwMessage);
      if (iosTimer) clearTimeout(iosTimer);
    };
  }, [handleSwMessage]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const promptInstall = useCallback(async (): Promise<
    "accepted" | "dismissed" | "unavailable"
  > => {
    if (!deferredPrompt) return "unavailable";
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
      setShowInstallBanner(false);
    }
    return outcome;
  }, [deferredPrompt]);

  const applyUpdate = useCallback(() => {
    setUpdateReady(false);
    window.location.reload();
  }, []);

  const dismissUpdate = useCallback(() => setUpdateReady(false), []);

  const dismissInstallBanner = useCallback(() => {
    setShowInstallBanner(false);
    if (platform !== "line") suppressBanner(7);
  }, [platform]);

  const openInExternalBrowser = useCallback(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("openExternalBrowser", "1");
    window.location.href = url.toString();
  }, []);

  return {
    isInstalled,
    platform,
    canInstall: deferredPrompt !== null,
    isOnline,
    updateReady,
    showInstallBanner,
    promptInstall,
    applyUpdate,
    dismissUpdate,
    dismissInstallBanner,
    openInExternalBrowser,
  };
}
