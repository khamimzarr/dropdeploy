"use client";

import { useEffect, useRef, useState } from "react";
import {
  Download,
  CheckCircle2,
  Smartphone,
  X,
  Loader2,
} from "lucide-react";

/** Minimal type for the captured browser install prompt (Chrome Android). */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type InstallState = "promptable" | "installed" | "unsupported";

/**
 * Detects whether the app is already running as an installed PWA.
 * Works both via display-mode and the iOS standalone check.
 */
function isInstalledApp(): boolean {
  if (
    window.matchMedia("(display-mode: standalone)").matches ||
    // @ts-expect-error -- non-standard iOS Safari flag
    window.navigator.standalone === true
  ) {
    return true;
  }
  return false;
}

/**
 * PWA install UI — a polished button + non-alert modal + success toast.
 * Captures `beforeinstallprompt` so *we* decide when to show the native
 * Chrome prompt, instead of Chrome's default auto-banner.
 */
export function InstallApp({
  variant = "nav",
}: {
  variant?: "nav" | "card";
}) {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [state, setState] = useState<InstallState>("unsupported");
  const [showModal, setShowModal] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const deferred = useRef<BeforeInstallPromptEvent | null>(null);
  const promptRef = useRef<BeforeInstallPromptEvent | null>(null);

  // React to display-mode changes (e.g. app gets launched).
  const [, forceRender] = useState(0);

  useEffect(() => {
    // Keep a ref in sync so event handlers never read a stale closure.
    promptRef.current = installPrompt;
  }, [installPrompt]);

  useEffect(() => {
    const refresh = () => {
      setState(isInstalledApp() ? "installed" : promptRef.current ? "promptable" : "unsupported");
    };

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      deferred.current = promptEvent;
      promptRef.current = promptEvent;
      setInstallPrompt(promptEvent);
      refresh();
    };

    const onInstalled = () => {
      deferred.current = null;
      promptRef.current = null;
      setInstallPrompt(null);
      setShowModal(false);
      setState("installed");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);
    };

    const onDisplayMode = () => {
      forceRender((n) => n + 1);
      refresh();
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    if ("matchMedia" in window) {
      window.matchMedia("(display-mode: standalone)").addEventListener("change", onDisplayMode);
    }

    // Initial check (in case PWA was launched directly).
    refresh();

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      window.matchMedia("(display-mode: standalone)").removeEventListener("change", onDisplayMode);
    };
  }, []);

  const handleOpenModal = () => {
    if (state !== "promptable") return;
    setShowModal(true);
  };

  const handleConfirmInstall = async () => {
    const e = deferred.current;
    if (!e) {
      setShowModal(false);
      return;
    }
    setInstalling(true);
    try {
      await e.prompt();
      const choice = await e.userChoice;
      if (choice.outcome === "accepted") {
        setState("installed");
      }
      deferred.current = null;
      setInstallPrompt(null);
    } catch {
      /* prompt canceled or unavailable — keep prompting available */
    } finally {
      setInstalling(false);
      setShowModal(false);
    }
  };

  const btnLabel =
    state === "installed"
      ? "Terpasang ✓"
      : state === "promptable"
      ? "Install Aplikasi"
      : "Install Aplikasi";

  // Nav variant — a compact pill button.
  if (variant === "nav") {
    return (
      <>
        <button
          onClick={handleOpenModal}
          disabled={state !== "promptable"}
          title={
            state === "installed"
              ? "Aplikasi sudah terpasang"
              : state === "unsupported"
              ? "Buka lewat Chrome di Android untuk menginstal"
              : "Instal DropDeploy ke layar beranda"
          }
          className={`relative flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[14px] font-medium transition
            ${
              state === "installed"
                ? "cursor-default bg-mint-cream text-carbon"
                : state === "promptable"
                ? "bg-carbon text-paper-white shadow-sticker enabled:hover:opacity-90"
                : "cursor-not-allowed bg-fog text-graphite"
            }`}
        >
          {state === "installed" ? (
            <CheckCircle2 size={15} className="text-sticker-green" />
          ) : (
            <Download size={15} />
          )}
          <span className="hidden sm:inline">{btnLabel}</span>
          {installPrompt && state === "promptable" && (
            <span className="grid size-2 rounded-full bg-sticker-green animate-pulse-soft" />
          )}
        </button>
        {showModal && (
          <InstallModal
            installing={installing}
            state={state}
            onConfirm={handleConfirmInstall}
            onClose={() => setShowModal(false)}
          />
        )}
        {showToast && <InstallToast onClose={() => setShowToast(false)} />}
      </>
    );
  }

  // Card variant — an explainer card with a large sticky CTA.
  return (
    <>
      <div
        className={`card-lift reveal delay-100 rounded-[24px] p-5 sm:p-6 ${
          state === "installed" ? "bg-mint-cream" : "bg-lavender-mist"
        }`}
      >
        <h3 className="mb-1 flex items-center gap-2 text-[17px] font-medium sm:text-[20px]">
          <Smartphone size={18} className="sm:size-5" /> Install Aplikasi
        </h3>
        <p className="mb-4 text-[13px] leading-relaxed text-slate sm:text-[14px]">
          Simpan DropDeploy ke layar beranda — buka cepat seperti app native, tanpa tab browser.
        </p>

        {state === "installed" ? (
          <div className="flex items-center gap-2 rounded-[16px] bg-paper-white p-3 text-[14px] font-medium text-carbon">
            <CheckCircle2 size={18} className="text-sticker-green" />
            Terpasang di perangkatmu
          </div>
        ) : state === "unsupported" ? (
          <div className="rounded-[16px] bg-paper-white p-3 text-[13px] leading-relaxed text-graphite">
            Buka DropDeploy lewat <b className="text-carbon">Chrome di Android</b> (HTTPS) untuk
            mengaktifkan tombol install.
          </div>
        ) : (
          <button
            onClick={handleOpenModal}
            className="btn-shine flex w-full items-center justify-center gap-2 rounded-full bg-carbon px-5 py-3 text-[16px] font-medium text-paper-white shadow-sticker transition enabled:hover:opacity-90"
          >
            <Download size={18} />
            Install ke Beranda
          </button>
        )}
      </div>

      {showModal && (
        <InstallModal
          installing={installing}
          state={state}
          onConfirm={handleConfirmInstall}
          onClose={() => setShowModal(false)}
        />
      )}
      {showToast && <InstallToast onClose={() => setShowToast(false)} />}
    </>
  );
}

/* ---- Custom modal (not alert) ---- */
function InstallModal({
  installing,
  state,
  onConfirm,
  onClose,
}: {
  installing: boolean;
  state: InstallState;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Instal aplikasi DropDeploy"
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
    >
      {/* Backdrop — click outside to dismiss */}
      <button
        type="button"
        aria-label="Tutup"
        onClick={onClose}
        className="animate-fade-in absolute inset-0 cursor-default bg-carbon/40 backdrop-blur-sm"
      />

      <div className="animate-scale-in relative w-full max-w-sm rounded-[24px] bg-paper-white p-6 shadow-sticker">
        <button
          onClick={onClose}
          aria-label="Tutup dialog"
          className="absolute right-4 top-4 grid size-8 place-items-center rounded-full bg-fog text-graphite transition hover:bg-lavender-mist hover:text-carbon"
        >
          <X size={16} />
        </button>

        <div className="mx-auto mb-4 grid size-14 place-items-center rounded-[20px] bg-mint-cream">
          <Smartphone size={26} className="text-carbon" />
        </div>

        <h3 className="text-center text-[20px] font-medium">Instal DropDeploy?</h3>
        <p className="mt-2 text-center text-[14px] leading-relaxed text-slate">
          Tambahkan DropDeploy ke layar beranda. Buka secepat aplikasi native — tanpa perlu tab
          browser, dan data pip misi tetap aman di perangkatmu.
        </p>

        <div className="mt-5 flex flex-col gap-2">
          <button
            onClick={onConfirm}
            disabled={installing || state !== "promptable"}
            className="btn-shine flex w-full items-center justify-center gap-2 rounded-full bg-carbon px-5 py-3 text-[16px] font-medium text-paper-white shadow-sticker transition enabled:hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {installing ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Download size={18} />
            )}
            {installing ? "Menyiapkan..." : "Install"}
          </button>
          <button
            onClick={onClose}
            disabled={installing}
            className="w-full rounded-full border border-silver px-5 py-2.5 text-[15px] font-medium text-graphite transition enabled:hover:bg-fog enabled:hover:text-carbon disabled:opacity-50"
          >
            Batal
          </button>
        </div>

        <p className="mt-4 text-center text-[12px] leading-relaxed text-graphite">
          100% gratis · terpasang sebagai app dari browser ini, tanpa Play Store.
        </p>
      </div>
    </div>
  );
}

/* ---- Success toast / snackbar ---- */
function InstallToast({ onClose }: { onClose: () => void }) {
  return (
    <div className="animate-scale-in fixed bottom-6 left-1/2 z-[60] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2">
      <div className="flex items-center gap-3 rounded-[20px] bg-carbon px-4 py-3 text-paper-white shadow-sticker">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-mint-cream">
          <CheckCircle2 size={17} className="text-sticker-green" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-medium">Aplikasi terpasang!</p>
          <p className="truncate text-[12px] text-fog/80">Cek layar beranda untuk DropDeploy.</p>
        </div>
        <button
          onClick={onClose}
          aria-label="Tutup notifikasi"
          className="grid size-7 shrink-0 place-items-center rounded-full text-fog/70 transition hover:bg-paper-white/10 hover:text-paper-white"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}