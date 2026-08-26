"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { useDropzone } from "react-dropzone";
import {
  UploadCloud,
  Rocket,
  Github,
  KeyRound,
  Loader2,
  CheckCircle2,
  XCircle,
  Copy,
  FolderArchive,
  FileCode2,
  LogOut,
  Lock,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { Confetti, NavPill } from "./ui";
import { readZip, nameFromZip, type ZipEntry } from "@/lib/deploy";
import { deployToVercel } from "@/lib/vercel";
import { publishToGitHub } from "@/lib/github";

type Status = "idle" | "reading" | "deploying" | "success" | "error";

interface Result {
  vercelUrl?: string;
  vercelId?: string;
  githubUrl?: string;
  githubRepo?: string;
  fileCount: number;
}

const STORAGE_KEY = "dropdeploy_vercel_token";

export default function DropDeployClient() {
  const { data: session, status } = useSession();
  const [vercelToken, setVercelToken] = useState("");
  const [repoName, setRepoName] = useState("");
  const [statusState, setStatusState] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [entries, setEntries] = useState<ZipEntry[]>([]);
  const [srcFile, setSrcFile] = useState<File | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // Load stored Vercel token on mount (BYOK — stored locally, never backend).
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) setVercelToken(stored);
  }, []);

  const isLoggedIn = status === "authenticated";
  const isReady = isLoggedIn && vercelToken.trim().length > 0;

  const saveToken = (value: string) => {
    setVercelToken(value);
    if (value.trim()) {
      window.localStorage.setItem(STORAGE_KEY, value.trim());
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  };

  // ---- DropZone ----
  const onDrop = useCallback(async (accepted: File[]) => {
    const file = accepted[0];
    if (!file) return;
    setStatusState("reading");
    setMessage(`Membaca ${file.name} …`);
    setResult(null);
    setSrcFile(file);
    try {
      const files = await readZip(file);
      if (!files.length) throw new Error("ZIP kosong atau tidak valid.");
      setEntries(files);
      // default repo name from zip
      if (!repoName) setRepoName(nameFromZip(file.name));
      setStatusState("idle");
      setMessage(`${files.length} file siap. Pilih target dan deploy.`);
    } catch (e: any) {
      setStatusState("error");
      setMessage(e?.message || "Gagal membaca ZIP.");
    }
  }, [repoName]);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    noClick: !isReady,
    noKeyboard: !isReady,
    disabled: !isReady,
    accept: { "application/zip": [".zip"], "application/x-zip-compressed": [".zip"] },
    multiple: false,
  });

  // ---- Actions ----
  const handleDeployVercel = async () => {
    if (!isReady || !entries.length) return;
    setStatusState("deploying");
    setMessage("Mendeploy ke Vercel …");
    setResult(null);
    try {
      const r = await deployToVercel(vercelToken, repoName || "dropdeploy", entries);
      setResult((prev) => ({
        ...(prev ?? {}),
        vercelUrl: r.alias || r.url,
        vercelId: r.id,
        fileCount: entries.length,
      }));
      setStatusState("success");
      setMessage("Deploy Vercel berhasil!");
    } catch (e: any) {
      setStatusState("error");
      setMessage(e?.message || "Deploy Vercel gagal.");
    }
  };

  const handlePublishGitHub = async () => {
    if (!isLoggedIn || !entries.length) return;
    const token = session?.accessToken;
    if (!token) {
      setStatusState("error");
      setMessage("Sesi GitHub tidak valid. Silakan login ulang.");
      return;
    }
    setStatusState("deploying");
    setMessage("Publishing ke GitHub …");
    setResult(null);
    try {
      const r = await publishToGitHub(token, repoName || "dropdeploy", entries);
      setResult((prev) => ({
        ...(prev ?? {}),
        githubUrl: r.htmlUrl,
        githubRepo: repoName || "dropdeploy",
        fileCount: entries.length,
      }));
      setStatusState("success");
      setMessage("Repo GitHub berhasil dibuat!");
    } catch (e: any) {
      setStatusState("error");
      setMessage(e?.message || "Publish GitHub gagal.");
    }
  };

  const handleCopy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(field);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      /* ignore */
    }
  };

  // ---- Derived UI ----
  const statusColor =
    statusState === "success"
      ? "bg-mint-cream"
      : statusState === "error"
      ? "bg-cotton-candy"
      : statusState === "deploying" || statusState === "reading"
      ? "bg-lavender-mist"
      : "bg-fog";

  // Preview thumbnails
  const imageEntries = useMemo(
    () =>
      entries
        .filter((e) => /\.(png|jpe?g|gif|webp|svg)$/i.test(e.path))
        .slice(0, 4),
    [entries]
  );

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-paper-white text-carbon">
      <Confetti />

      <NavPill />

      {/* ================= HERO ================= */}
      <section className="relative mx-auto flex max-w-[1200px] flex-col items-center px-6 pb-16 pt-20 text-center">
        <p className="mb-4 rounded-full bg-lavender-mist px-4 py-1 text-[14px] font-medium text-slate shadow-sticker">
          <Sparkles size={13} className="mr-1 inline" />
          Instant Deploy dari browser
        </p>
        <h1 className="max-w-4xl text-[48px] font-medium leading-[1.1] tracking-[-0.01em] sm:text-[60px] md:text-[72px]">
          Seret <span className="text-periwinkle-violet">.zip</span> kamu.
          <br />
          Langsung <span className="text-sticker-green">online</span>.
        </h1>
        <p className="mt-6 max-w-[640px] text-[16px] leading-relaxed text-slate">
          DropDeploy mengunggah arsip <code className="font-geist-mono text-[14px]">.zip</code>{" "}
          lalu deploy ke <strong>Vercel</strong> dan publish ke <strong>GitHub</strong> —
          100% dari browser, tanpa server. Token simpan lokal hanya di perangkatmu.
        </p>
      </section>

      {/* ================= DEPLOY ================= */}
      <section id="deploy" className="relative mx-auto max-w-[1200px] scroll-mt-20 px-6 pb-24">
        <div className="grid gap-8 lg:grid-cols-[340px_1fr]">
          {/* ---- Left: connection panel ---- */}
          <aside className="flex flex-col gap-4">
            {/* GitHub auth card */}
            <div className="rounded-[24px] bg-lavender-mist p-6">
              <h3 className="mb-1 flex items-center gap-2 text-[20px] font-medium">
                <Github size={20} /> Akun GitHub
              </h3>
              <p className="mb-4 text-[14px] leading-relaxed text-slate">
                Login untuk mengaktifkan publish repo. Kredensial dikelola OAuth oleh
                NextAuth — token tidak pernah menyentuh backend selain NextAuth.
              </p>
              {isLoggedIn ? (
                <div className="flex items-center justify-between gap-3 rounded-[16px] bg-paper-white p-3 shadow-sticker-sm">
                  <div className="flex min-w-0 items-center gap-2">
                    {session?.user?.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={session.user.image}
                        alt="avatar"
                        className="size-8 rounded-full"
                      />
                    ) : (
                      <span className="grid size-8 place-items-center rounded-full bg-carbon text-paper-white">
                        <Github size={16} />
                      </span>
                    )}
                    <span className="truncate text-[15px] font-medium">
                      {session?.user?.name || "Terhubung"}
                    </span>
                  </div>
                  <button
                    onClick={() => signOut()}
                    className="flex items-center gap-1 rounded-full border border-carbon px-3 py-1 text-[13px] font-medium hover:bg-carbon hover:text-paper-white"
                  >
                    <LogOut size={13} /> Keluar
                  </button>
                </div>
              ) : (
                <div className="rounded-[16px] bg-paper-white p-3 shadow-sticker-sm">
                  <p className="mb-2 text-[13px] text-graphite">
                    {status === "loading" ? "Memeriksa sesi …" : "Belum login."}
                  </p>
                  <button
                    onClick={() => signIn("github")}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-carbon px-5 py-3 text-[16px] font-medium text-paper-white shadow-sticker transition hover:opacity-90"
                  >
                    <Github size={18} />
                    Login dengan GitHub
                  </button>
                </div>
              )}
            </div>

            {/* Vercel BYOK token card */}
            <div className="rounded-[24px] bg-butter-cream p-6">
              <h3 className="mb-1 flex items-center gap-2 text-[20px] font-medium">
                <KeyRound size={20} /> Vercel Token
              </h3>
              <p className="mb-4 text-[14px] leading-relaxed text-slate">
                Tempel token personal Vercel (BYOK). Disimpan di{" "}
                <code className="font-geist-mono text-[13px]">localStorage</code> —
                tidak pernah dikirim ke server DropDeploy.
              </p>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 rounded-[16px] bg-paper-white px-3 py-2 shadow-sticker-sm">
                  <Lock size={14} className="shrink-0 text-graphite" />
                  <input
                    type="password"
                    value={vercelToken}
                    onChange={(e) => saveToken(e.target.value)}
                    placeholder="********"
                    className="w-full bg-transparent font-geist-mono text-[14px] outline-none placeholder:text-ash"
                    autoComplete="off"
                  />
                </div>
                <a
                  href="https://vercel.com/account/tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[12px] leading-snug text-graphite underline decoration-dotted underline-offset-2 hover:text-carbon"
                >
                  Buat di Vercel → Settings → Tokens. Grants: deployment.
                  <ExternalLink size={12} className="shrink-0" />
                </a>
              </div>
            </div>

            {/* Repo / project name */}
            <div className="rounded-[24px] bg-mint-cream p-6">
              <h3 className="mb-1 flex items-center gap-2 text-[20px] font-medium">
                <FolderArchive size={20} /> Nama Projek
              </h3>
              <p className="mb-4 text-[14px] leading-relaxed text-slate">
                Default diambil dari nama file ZIP. Bisa diedit sebelum deploy.
              </p>
              <input
                type="text"
                value={repoName}
                onChange={(e) => setRepoName(e.target.value)}
                placeholder="nama-proyek"
                className="w-full rounded-full border border-carbon bg-paper-white px-4 py-2.5 font-geist-mono text-[14px] outline-none placeholder:text-ash focus:shadow-sticker"
              />
            </div>
          </aside>

          {/* ---- Right: dropzone + progress ---- */}
          <div className="flex flex-col gap-5">
            {/* Dropzone */}
            <div
              {...getRootProps()}
              className={`relative rounded-[40px] border-2 border-dashed p-10 text-center transition
                ${
                  isReady
                    ? isDragActive
                      ? "border-sticker-green bg-mint-cream"
                      : "border-silver bg-fog hover:bg-lavender-mist"
                    : "cursor-not-allowed border-ash bg-silver/40 opacity-60"
                }`}
            >
              <input {...getInputProps()} />
              {!isReady && (
                <Lock className="mx-auto mb-3 size-8 text-graphite" />
              )}
              {isReady && !entries.length && (
                <UploadCloud className="mx-auto mb-3 size-10 text-periwinkle-violet" />
              )}
              {isReady && entries.length > 0 && (
                <div className="mx-auto mb-3 flex -space-x-1.5">
                  {imageEntries.length > 0 ? (
                    imageEntries.map((img) => (
                      <img
                        key={img.path}
                        src={`data:image/*;base64,${img.data}`}
                        alt=""
                        className="size-9 rounded-full border-2 border-paper-white object-cover"
                      />
                    ))
                  ) : (
                    <FileCode2 className="size-10 text-periwinkle-violet" />
                  )}
                </div>
              )}

              <p
                className={`text-[20px] font-medium ${
                  isReady ? "text-carbon" : "text-graphite"
                }`}
              >
                {entries.length > 0
                  ? `${entries.length} file siap`
                  : isDragActive
                  ? "Lepaskan untuk deploy"
                  : "Seret & lepas file .zip di sini"}
              </p>
              <p className="mx-auto mt-2 max-w-sm text-[14px] leading-relaxed text-graphite">
                {isReady
                  ? "Klik area atau seret arsip. Script diproses di browser via JSZip sebelum deploy."
                  : "Login GitHub & isi Vercel Token untuk membuka area drop."}
              </p>

              {isReady && !entries.length && (
                <button
                  type="button"
                  onClick={open}
                  className="mt-5 rounded-full bg-carbon px-6 py-2.5 text-[16px] font-medium text-paper-white shadow-sticker transition hover:opacity-90"
                >
                  Pilih file ZIP
                </button>
              )}
            </div>

            {/* Progress / status strip */}
            {(statusState !== "idle" || entries.length > 0) && (
              <div className={`rounded-[24px] p-6 ${statusColor} transition`}>
                {(statusState === "deploying" || statusState === "reading") && (
                  <div className="flex items-center gap-3">
                    <Loader2 className="size-5 animate-spin text-carbon" />
                    <span className="text-[16px] font-medium">{message}</span>
                  </div>
                )}
                {statusState === "idle" && entries.length > 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-[16px] font-medium">{message}</span>
                    <span className="font-geist-mono text-[14px] text-slate">
                      {srcFile?.name} · {entries.length} file
                    </span>
                  </div>
                )}
                {statusState === "success" && (
                  <div className="flex items-center gap-3 text-carbon">
                    <CheckCircle2 className="size-5 text-sticker-green" />
                    <span className="text-[16px] font-medium">{message}</span>
                  </div>
                )}
                {statusState === "error" && (
                  <div className="flex items-center gap-3 text-carbon">
                    <XCircle className="size-5 text-sticker-pink" />
                    <span className="text-[16px] font-medium">{message}</span>
                  </div>
                )}

                {/* Result links */}
                {result && (
                  <div className="mt-5 grid gap-3 sm:grid-cols-1">
                    {result.vercelUrl && (
                      <ResultRow
                        label="Vercel"
                        url={result.vercelUrl}
                        method="vercel"
                        copied={copied}
                        onCopy={handleCopy}
                      />
                    )}
                    {result.githubUrl && (
                      <ResultRow
                        label="GitHub"
                        url={result.githubUrl.replace(/^https?:\/\//, "")}
                        method="github"
                        copied={copied}
                        onCopy={handleCopy}
                      />
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={handleDeployVercel}
                disabled={!isReady || !entries.length || statusState === "deploying"}
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-carbon px-6 py-3.5 text-[16px] font-medium text-paper-white shadow-sticker transition
                  enabled:hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Rocket size={18} />
                Deploy ke Vercel
              </button>
              <button
                onClick={handlePublishGitHub}
                disabled={
                  !isLoggedIn || !entries.length || statusState === "deploying"
                }
                className="flex flex-1 items-center justify-center gap-2 rounded-full border border-carbon bg-paper-white px-6 py-3.5 text-[16px] font-medium shadow-sticker transition
                  enabled:hover:bg-carbon enabled:hover:text-paper-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Github size={18} />
                Publish ke GitHub
                {!isLoggedIn && <Lock size={13} />}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ================= HOW IT WORKS (dark band) ================= */}
      <section className="bg-deep-aubergine px-6 py-24 text-paper-white">
        <div className="mx-auto max-w-[1200px]">
          <h2 className="text-center text-[40px] font-medium tracking-[-0.01em] sm:text-[60px]">
            Cara Kerja
          </h2>
          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {[
              {
                n: "01",
                t: "Siapkan Akses",
                d: "Login GitHub (OAuth NextAuth) + tempel Vercel Token. Keduanya hanya dipakai di browser kamu.",
                icon: <Github size={22} />,
              },
              {
                n: "02",
                t: "Seret .zip",
                d: "JSZip mengekstrak isi arsip di memori. Teks & aset gambar dikonversi jadi array base64 untuk payload Vercel.",
                icon: <UploadCloud size={22} />,
              },
              {
                n: "03",
                t: "Deploy Langsung",
                d: "fetch POST dari browser ke api.vercel.com/v13/deployments atau api.github.com. Langsung dapat link production.",
                icon: <Rocket size={22} />,
              },
            ].map((s) => (
              <div
                key={s.n}
                className="rounded-[24px] bg-carbon p-8 shadow-sticker-sm"
              >
                <div className="mb-4 flex items-center justify-between">
                  <span className="grid size-11 place-items-center rounded-full bg-periwinkle-violet/70 text-paper-white">
                    {s.icon}
                  </span>
                  <span className="font-geist-mono text-[14px] text-soft-periwinkle">
                    {s.n}
                  </span>
                </div>
                <h3 className="mb-2 text-[20px] font-medium">{s.t}</h3>
                <p className="text-[15px] leading-relaxed text-fog/80">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= FAQ (periwinkle band) ================= */}
      <section id="faq" className="bg-periwinkle-violet px-6 py-24 text-carbon">
        <div className="mx-auto grid max-w-[1200px] gap-12 md:grid-cols-[320px_1fr]">
          <div>
            <p className="mb-2 text-[14px] font-medium">FAQ</p>
            <h2 className="text-[40px] font-medium leading-tight tracking-[-0.01em] sm:text-[60px]">
              Ada yang perlu ditanya?
            </h2>
            <p className="mt-4 max-w-xs text-[16px] leading-relaxed">
              Jawaban cepat soal keamanan, token, dan cara kerja DropDeploy.
            </p>
          </div>
          <div className="flex flex-col gap-4">
            {[
              {
                q: "Apakah token saya dikirim ke server DropDeploy?",
                a: "Tidak. Vercel Token hanya disimpan di localStorage browser dan dikirim langsung ke api.vercel.com. DropDeploy tidak punya backend untuk memproses token atau file ZIP.",
              },
              {
                q: "Login GitHub itu untuk apa?",
                a: "Untuk publish repo ke akun GitHub kamu sendiri (BYOK). Proses OAuth lewat NextAuth — satu-satunya backend di aplikasi ini.",
              },
              {
                q: "Berapa ukuran ZIP maksimal?",
                a: "Proses sepenuhnya client-side, jadi tidak kena limit payload 4.5MB backend Vercel. Batas tergantung memori browser & kuota deployment akunmu.",
              },
              {
                q: "File apa saja yang didukung?",
                a: "Semua jenis file bisa dibaca. Teks & gambar dikonversi ke base64. Struktur direktori dipertahankan untuk payload Vercel dan path GitHub.",
              },
            ].map((item) => (
              <FaQItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="border-t border-silver bg-paper-white px-6 py-10 text-center text-[14px] text-slate">
        DropDeploy — Instant Deploy dari browser. Dibangun dengan Next.js, Tailwind,
        JSZip & react-dropzone.
      </footer>
    </main>
  );
}

/* ---- Result row ---- */
function ResultRow({
  label,
  url,
  method,
  copied,
  onCopy,
}: {
  label: string;
  url: string;
  method: string;
  copied: string | null;
  onCopy: (text: string, field: string) => void;
}) {
  const full = url.startsWith("http") ? url : `https://${url}`;
  return (
    <div className="flex items-center justify-between gap-3 rounded-[16px] bg-paper-white p-3 shadow-sticker-sm">
      <div className="flex min-w-0 items-center gap-2">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-carbon text-paper-white">
          {label === "Vercel" ? <Rocket size={15} /> : <Github size={15} />}
        </span>
        <a
          href={full}
          target="_blank"
          rel="noopener noreferrer"
          className="truncate font-geist-mono text-[14px] underline decoration-dotted underline-offset-4 hover:text-periwinkle-violet"
        >
          {url}
        </a>
      </div>
      <button
        onClick={() => onCopy(full, method)}
        className="grid size-8 shrink-0 place-items-center rounded-full border border-silver hover:bg-fog"
        title="Salin"
      >
        {copied === method ? (
          <CheckCircle2 size={15} className="text-sticker-green" />
        ) : (
          <Copy size={15} />
        )}
      </button>
    </div>
  );
}

/* ---- FAQ accordion ---- */
function FaQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      onClick={() => setOpen((o) => !o)}
      className="rounded-[16px] bg-paper-white p-5 text-left"
    >
      <span className="flex items-center justify-between gap-4">
        <span className="text-[16px] font-medium">{q}</span>
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-lavender-mist text-[20px] font-medium">
          {open ? "−" : "+"}
        </span>
      </span>
      {open && (
        <span className="mt-3 block text-[15px] leading-relaxed text-slate">
          {a}
        </span>
      )}
    </button>
  );
}