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
import { InstallApp } from "./InstallApp";
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

type TokenState = "empty" | "checking" | "valid" | "invalid";

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
  const [tokenState, setTokenState] = useState<TokenState>("empty");

  // Load stored Vercel token on mount (BYOK — stored locally, never backend).
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) setVercelToken(stored);
  }, []);

  // Reveal on scroll
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("is-visible");
        }),
      { threshold: 0.15 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const isLoggedIn = status === "authenticated";
  const isTokenValid = tokenState === "valid";
  const isReady = isLoggedIn && isTokenValid;

  const saveToken = (value: string) => {
    setVercelToken(value);
    const t = value.trim();
    if (t) {
      window.localStorage.setItem(STORAGE_KEY, t);
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    // reset state — debounce check akan jalan
    if (!t) setTokenState("empty");
    else setTokenState("checking");
  };

  // Validate token live against Vercel API (BYOK — client-side, token never hits our backend)
  useEffect(() => {
    const t = vercelToken.trim();
    if (!t) {
      setTokenState("empty");
      return;
    }
    const id = setTimeout(async () => {
      try {
        const res = await fetch("https://api.vercel.com/v2/user", {
          headers: { Authorization: `Bearer ${t}` },
        });
        setTokenState(res.ok ? "valid" : "invalid");
      } catch {
        setTokenState("invalid");
      }
    }, 450);
    return () => clearTimeout(id);
  }, [vercelToken]);

  // ---- DropZone ----
  const onDrop = useCallback(async (accepted: File[]) => {
    const file = accepted[0];
    if (!file) return;
    setStatusState("reading");
    setMessage("Membongkar muatan...");
    setResult(null);
    setSrcFile(file);
    try {
      const files = await readZip(file);
      if (!files.length) throw new Error("ZIP kosong atau tidak valid.");
      setEntries(files);
      // default repo name from zip
      if (!repoName) setRepoName(nameFromZip(file.name));
      setStatusState("idle");
      setMessage(`${files.length} file siap.`);
    } catch (e: any) {
      setStatusState("error");
      setMessage(e?.message || "Gagal membaca ZIP.");
    }
  }, [repoName]);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: { "application/zip": [".zip"], "application/x-zip-compressed": [".zip"] },
    multiple: false,
  });

  // ---- Satu tombol — deploy ke Vercel & GitHub sekaligus ----
  const handleDeployAll = async () => {
    if (!isReady || !entries.length) return;
    const ghToken = session?.accessToken;
    setStatusState("deploying");
    setResult(null);
    setMessage("Menyiapkan panggung...");
    let vercelUrl: string | undefined;
    let vercelId: string | undefined;
    let githubUrl: string | undefined;
    let vercelErr: string | undefined;
    let githubErr: string | undefined;
    let vercelDone = false;
    let githubDone = false;
    const name = repoName || "dropdeploy";
    const updatePhase = () => {
      // Vercel & GitHub berjalan paralel — tampilkan fase yang masih aktif
      if (vercelDone && !githubDone) setMessage("Mengamankan kode...");
      else if (githubDone && !vercelDone) setMessage("Menyiapkan panggung...");
    };
    const tasks: Promise<void>[] = [];
    tasks.push(
      deployToVercel(vercelToken, name, entries)
        .then((r) => {
          vercelUrl = r.alias || r.url;
          vercelId = r.id;
        })
        .catch((e: any) => {
          vercelErr = e?.message || "Deploy Vercel gagal.";
        })
        .finally(() => {
          vercelDone = true;
          updatePhase();
        })
    );
    if (ghToken) {
      tasks.push(
        publishToGitHub(ghToken, name, entries)
          .then((r) => {
            githubUrl = r.htmlUrl;
          })
          .catch((e: any) => {
            githubErr = e?.message || "Publish GitHub gagal.";
          })
          .finally(() => {
            githubDone = true;
            updatePhase();
          })
      );
    }
    await Promise.all(tasks);
    if (vercelUrl || githubUrl) {
      setResult({
        vercelUrl,
        vercelId,
        githubUrl,
        githubRepo: githubUrl ? name : undefined,
        fileCount: entries.length,
      });
    }
    if (vercelUrl && githubUrl) {
      setStatusState("success");
      setMessage("Misi sukses. Kode mendarat di GitHub dan mengudara di Vercel.");
    } else if (vercelUrl && githubErr) {
      setStatusState("success");
      setMessage(`Vercel berhasil — GitHub: ${githubErr}`);
    } else if (githubUrl && vercelErr) {
      setStatusState("success");
      setMessage(`GitHub berhasil — Vercel: ${vercelErr}`);
    } else {
      setStatusState("error");
      setMessage(vercelErr || githubErr || "Deploy gagal.");
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

      <NavPill installSlot={<InstallApp variant="nav" />} />

      {/* ================= HERO ================= */}
      <section className="relative mx-auto flex max-w-[1200px] flex-col items-center px-6 pb-16 pt-20 text-center">
        <p className="animate-fade-up mb-4 rounded-full bg-lavender-mist px-4 py-1 text-[14px] font-medium text-slate shadow-sticker">
          <Sparkles size={13} className="mr-1 inline" />
          Instant Deploy dari browser
        </p>
        <h1 className="animate-fade-up delay-100 max-w-4xl text-[48px] font-medium leading-[1.1] tracking-[-0.01em] sm:text-[60px] md:text-[72px]">
          Tarik, Lepas, <span className="text-periwinkle-violet">Deploy</span>.
          <br />
          Semudah <span className="text-sticker-green">itu</span>.
        </h1>
        <p className="animate-fade-up delay-200 mt-6 max-w-[640px] text-[16px] leading-relaxed text-slate">
          Seret file <code className="font-geist-mono text-[14px]">.zip</code>, lalu langsung dapat link live untuk <strong>Vercel</strong> & <strong>GitHub</strong> — semuanya dari web ini.
        </p>
      </section>

      {/* ================= DEPLOY ================= */}
      <section id="deploy" className="reveal relative mx-auto max-w-[1200px] scroll-mt-20 px-6 pb-24">
        <div className={`mx-auto transition-all duration-500 ease-in-out ${entries.length > 0 ? "max-w-[1200px]" : "max-w-[700px]"}`}>
          
          {/* Dropzone Always Centered */}
          <div
            {...getRootProps()}
            className={`relative rounded-[40px] border-2 border-dashed p-12 text-center transition
              ${isDragActive ? "border-sticker-green bg-mint-cream scale-[1.02]" : "border-silver bg-fog hover:bg-lavender-mist"}
              ${entries.length > 0 ? "border-solid border-carbon bg-paper-white shadow-sticker" : "cursor-pointer"}`}
          >
            <input {...getInputProps()} />
            
            {!entries.length && (
              <UploadCloud className="mx-auto mb-4 size-14 text-periwinkle-violet" />
            )}
            
            {entries.length > 0 && (
              <div className="mx-auto mb-5 flex -space-x-2 justify-center">
                {imageEntries.length > 0 ? (
                  imageEntries.map((img, i) => (
                    <img
                      key={img.path}
                      src={`data:image/*;base64,${img.data}`}
                      alt=""
                      className={`size-12 rounded-full border-2 border-paper-white object-cover animate-float ${i === 1 ? "animate-float-alt" : ""} ${i === 2 ? "animate-float-slow" : ""}`}
                      style={{ animationDelay: `${i * 120}ms` }}
                    />
                  ))
                ) : (
                  <FileCode2 className="size-12 text-periwinkle-violet animate-float" />
                )}
              </div>
            )}

            <p className="text-[24px] font-medium text-carbon">
              {entries.length > 0
                ? `${entries.length} file dari ${srcFile?.name} siap!`
                : isDragActive
                ? "Lepaskan file sekarang"
                : "Seret & lepas file .zip ke sini"}
            </p>
            {!entries.length && (
              <p className="mx-auto mt-3 max-w-sm text-[15px] leading-relaxed text-graphite">
                Atau klik untuk memilih manual. Kami akan mengekstraknya otomatis di memori browser.
              </p>
            )}
          </div>

          {/* Configuration and Actions appear ONLY after drop */}
          {entries.length > 0 && (
            <div className="mt-8 mx-auto animate-fade-up flex max-w-[540px] flex-col gap-5">
              
              {!isReady ? (
                <div className="flex flex-col gap-4 animate-fade-up">
                  <h3 className="text-[18px] font-medium mb-1 text-left">Siapkan Akses</h3>
                  
                  {/* GitHub auth card */}
                  <div className="card-lift rounded-[24px] bg-lavender-mist p-5 text-left">
                    <h3 className="mb-1 flex items-center gap-2 text-[16px] font-medium">
                      <Github size={16} /> Akun GitHub
                    </h3>
                    {isLoggedIn ? (
                      <div className="mt-3 flex items-center justify-between gap-3 rounded-[16px] bg-paper-white p-2.5 shadow-sticker-sm">
                        <div className="flex min-w-0 items-center gap-2">
                          {session?.user?.image ? (
                            <img src={session.user.image} alt="avatar" className="size-6 shrink-0 rounded-full" />
                          ) : (
                            <Github size={14} className="shrink-0" />
                          )}
                          <span className="truncate text-[13px] font-medium">
                            {session?.user?.name || "Terhubung"}
                          </span>
                        </div>
                        <button onClick={() => signOut()} className="shrink-0 text-[11px] underline text-graphite hover:text-carbon">Keluar</button>
                      </div>
                    ) : (
                      <div className="mt-3">
                        <button onClick={() => signIn("github")} className="flex w-full items-center justify-center gap-2 rounded-full bg-carbon px-4 py-2.5 text-[14px] font-medium text-paper-white shadow-sticker transition hover:opacity-90">
                          <Github size={16} /> Login GitHub
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Vercel Token */}
                  <div className="card-lift rounded-[24px] bg-butter-cream p-5 text-left">
                    <h3 className="mb-1 flex items-center gap-2 text-[16px] font-medium">
                      <KeyRound size={16} /> Vercel Token
                    </h3>
                    <div className="mt-3 flex flex-col gap-2">
                      <div className={`flex items-center gap-2 rounded-[16px] bg-paper-white px-3 py-2 shadow-sticker-sm ${tokenState === "valid" ? "ring-2 ring-sticker-green" : tokenState === "invalid" ? "ring-2 ring-sticker-pink" : ""}`}>
                        <Lock size={14} className="shrink-0 text-graphite" />
                        <input type="password" value={vercelToken} onChange={(e) => saveToken(e.target.value)} placeholder="********" className="w-full bg-transparent font-geist-mono text-[13px] outline-none placeholder:text-ash" autoComplete="off" />
                        {tokenState === "checking" && <Loader2 size={14} className="shrink-0 animate-spin text-graphite" />}
                        {tokenState === "valid" && <CheckCircle2 size={14} className="shrink-0 text-sticker-green" />}
                        {tokenState === "invalid" && <XCircle size={14} className="shrink-0 text-sticker-pink" />}
                      </div>
                      <a href="https://vercel.com/account/tokens" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] text-graphite underline decoration-dotted hover:text-carbon">
                        Klik untuk generate tokens <ExternalLink size={10} />
                      </a>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="card-lift animate-fade-up rounded-[24px] bg-mint-cream p-5 border border-sticker-green/20 shadow-sticker-sm text-left">
                  <h3 className="mb-3 flex items-center gap-2 text-[16px] font-medium text-sticker-green">
                    <CheckCircle2 size={18} /> Akses Siap
                  </h3>
                  <div className="flex flex-col gap-2.5 text-[13px] text-carbon">
                    <span className="flex items-center gap-2"><Github size={15} className="text-graphite"/> {session?.user?.name || "GitHub terhubung"}</span>
                    <span className="flex items-center gap-2"><KeyRound size={15} className="text-graphite"/> Vercel Token valid</span>
                  </div>
                  <button onClick={() => { window.localStorage.removeItem(STORAGE_KEY); setVercelToken(""); setTokenState("empty"); }} className="mt-4 text-[12px] underline text-graphite hover:text-carbon">Atur ulang akses</button>
                </div>
              )}

              {/* Project Name */}
              <div className="card-lift rounded-[24px] bg-lavender-mist p-6 shadow-sticker-sm text-left animate-fade-up delay-100">
                <h3 className="mb-1 flex items-center gap-2 text-[18px] font-medium">
                  <FolderArchive size={18} /> Nama Projek
                </h3>
                <p className="mb-4 text-[14px] text-slate">Nama repo GitHub & URL Vercel.</p>
                <input
                  type="text"
                  value={repoName}
                  onChange={(e) => setRepoName(e.target.value)}
                  placeholder="nama-proyek"
                  className="w-full rounded-full border border-carbon bg-paper-white px-4 py-3 font-geist-mono text-[15px] outline-none placeholder:text-ash focus:shadow-sticker transition-shadow"
                />
              </div>

              {/* Status / Results Strip */}
              {(statusState !== "idle" || result) && (
                <div className={`animate-scale-in rounded-[24px] p-6 ${statusColor} shadow-sticker-sm transition text-left`}>
                  {(statusState === "deploying" || statusState === "reading") && (
                    <div className="flex items-center gap-3">
                      <Loader2 className="size-5 animate-spin text-carbon" />
                      <span className="text-[16px] font-medium">{message}</span>
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

                  {result && (
                    <div className="mt-5 grid gap-3 sm:grid-cols-1">
                      {result.vercelUrl && (
                        <ResultRow label="Vercel" url={result.vercelUrl} method="vercel" copied={copied} onCopy={handleCopy} />
                      )}
                      {result.githubUrl && (
                        <ResultRow label="GitHub" url={result.githubUrl.replace(/^https?:\/\//, "")} method="github" copied={copied} onCopy={handleCopy} />
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Deploy Button */}
              <button
                onClick={handleDeployAll}
                disabled={!isReady || statusState === "deploying"}
                className="btn-shine flex w-full items-center justify-center gap-2 rounded-full bg-carbon px-6 py-4 text-[18px] font-medium text-paper-white shadow-sticker transition enabled:hover:shadow-[0_6px_20px_rgba(0,0,0,0.18)] disabled:cursor-not-allowed disabled:opacity-40 animate-fade-up delay-200"
              >
                {statusState === "deploying" ? <Loader2 size={20} className="animate-spin" /> : <Rocket size={20} className="group-hover:animate-[iconBounce_0.6s_ease]" />}
                Deploy Sekarang
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ================= HOW IT WORKS (dark band) ================= */}
      <section id="cara" className="reveal bg-deep-aubergine px-6 py-24 text-paper-white">
        <div className="mx-auto max-w-[1200px]">
          <h2 className="text-center text-[40px] font-medium tracking-[-0.01em] sm:text-[60px]">
            Cara Kerja
          </h2>
          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {[
              {
                n: "01",
                t: "Siapkan Akses",
                d: "Login GitHub lalu tempel token Vercel. Privasimu terjaga",
                icon: <Github size={22} />,
              },
              {
                n: "02",
                t: "Seret .zip",
                d: "Tarik arsip .zip dari foldermu, isinya dibaca otomatis.",
                icon: <UploadCloud size={22} />,
              },
              {
                n: "03",
                t: "Deploy Langsung",
                d: "Klik deploy, lalu dapat link live untuk Vercel & GitHub dalam sekejap.",
                icon: <Rocket size={22} />,
              },
            ].map((s) => (
              <div
                key={s.n}
                className="card-lift rounded-[24px] bg-carbon p-8 shadow-sticker-sm"
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
      <section id="faq" className="reveal bg-periwinkle-violet px-6 py-24 text-carbon">
        <div className="mx-auto grid max-w-[1200px] gap-12 md:grid-cols-[320px_1fr]">
          <div>
            <p className="mb-2 text-[14px] font-medium">FAQ</p>
            <h2 className="text-[40px] font-medium leading-tight tracking-[-0.01em] sm:text-[60px]">
              Ada yang perlu ditanya?
            </h2>
            <p className="mt-4 max-w-xs text-[16px] leading-relaxed">
              Jawaban cepat soal keamanan & cara kerja.
            </p>
          </div>
          <div className="flex flex-col gap-4">
            {[
              {
                q: "Apakah token dikirim ke server DropDeploy?",
                a: "Tidak. Token simpan di localStorage & dikirim langsung ke api.vercel.com.",
              },
              {
                q: "Apakah arsip saya dikirim ke DropDeploy?",
                a: "Tidak. Arsip .zip dan token kamu hanya diproses di browser, tidak sampai ke server DropDeploy.",
              },
              {
                q: "Login GitHub untuk apa?",
                a: "Publish repo ke akunmu (BYOK) — satu-satunya backend adalah NextAuth.",
              },
              {
                q: "Ukuran ZIP maksimal?",
                a: "Client-side, jadi bebas limit 4.5MB backend. Batas ikut memori browser & kuota akunmu.",
              },
              {
                q: "File apa saja didukung?",
                a: "Semua jenis. Teks & gambar → base64. Struktur direktori tetap.",
              },
            ].map((item) => (
              <FaQItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="border-t border-silver bg-paper-white px-6 py-10 text-center text-[14px] text-slate">
        DropDeploy — Deploy dari browser.
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
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-[16px] bg-paper-white p-3 shadow-sticker-sm">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-carbon text-paper-white">
          {label === "Vercel" ? <Rocket size={15} /> : <Github size={15} />}
        </span>
        <a
          href={full}
          target="_blank"
          rel="noopener noreferrer"
          className="min-w-0 flex-1 truncate font-geist-mono text-[14px] underline decoration-dotted underline-offset-4 hover:text-periwinkle-violet"
          title={full}
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