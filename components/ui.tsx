import { Rocket, Lock } from "lucide-react";

/** Confetti — decorative blobs with float animation. */
export function Confetti() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="animate-float absolute -top-10 -left-10 size-52 rounded-full bg-sticker-green/80" />
      <div className="animate-float-alt absolute top-16 right-[-60px] size-56 rounded-[40px] bg-sticker-yellow/70" />
      <div className="animate-float-slow absolute top-[45%] -left-16 size-40 rounded-full bg-sticker-pink/70" />
      <div className="animate-float absolute top-[30%] -right-10 size-44 rounded-[24px] bg-periwinkle-violet/60" />
      <div className="animate-float-alt absolute bottom-[-40px] left-1/3 size-36 rounded-full bg-sticker-yellow/60" />
      <div className="animate-float-slow absolute top-1/2 right-1/4 size-24 rounded-full bg-sticker-green/60" />
    </div>
  );
}

export function Logo() {
  return (
    <div className="flex items-center gap-2">
      <span className="grid size-8 place-items-center rounded-full bg-carbon text-paper-white shadow-sticker">
        <Rocket size={16} strokeWidth={2.5} />
      </span>
      <span className="text-[16px] font-medium tracking-tight">DropDeploy</span>
    </div>
  );
}

export function NavPill() {
  return (
    <nav className="animate-fade-in sticky top-4 z-40 mx-auto mt-4 flex w-fit items-center gap-8 rounded-full bg-lavender-mist px-4 py-2 shadow-sticker">
      <Logo />
      <div className="hidden items-center gap-1 sm:flex">
        {[
          { href: "#deploy", label: "Deploy" },
          { href: "#cara", label: "Cara Kerja" },
          { href: "#faq", label: "FAQ" },
        ].map((l) => (
          <a
            key={l.href}
            href={l.href}
            className="rounded-full px-3 py-1 text-[16px] font-medium hover:bg-paper-white/80"
          >
            {l.label}
          </a>
        ))}
      </div>
      <span className="rounded-full bg-carbon px-3 py-1 text-[14px] font-medium text-paper-white shadow-sticker">
        v1.0
      </span>
    </nav>
  );
}

export function StatusBadge({ ready }: { ready: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[14px] font-medium ${
        ready ? "bg-mint-cream text-carbon" : "bg-fog text-graphite"
      }`}
    >
      <span
        className={`size-2 rounded-full ${
          ready ? "bg-sticker-green" : "bg-graphite"
        }`}
      />
      {ready ? "Siap deploy" : "Belum siap"}
    </span>
  );
}

export function LockNotice() {
  return (
    <p className="mt-3 flex items-center justify-center gap-2 text-[14px] text-graphite">
      <Lock size={14} />
      Drop Zone terkunci — login GitHub <span className="text-carbon">dan</span>{" "}
      isi Vercel Token untuk mengaktifkannya.
    </p>
  );
}