# DropDeploy 🚀

Instant Deploy — seret & lepas file `.zip`, langsung online di **Vercel** dan **GitHub**, sepenuhnya dari browser.

> **Arsitektur 90% client-side.** Pemrosesan ZIP dan seluruh `fetch` ke API Vercel/GitHub berjalan di browser pengguna. **Satu-satunya backend** adalah NextAuth (GitHub OAuth).

---

## Fitur

- ⬇️ **Drag & Drop `.zip`** — react-dropzone + JSZip ekstrak isi arsip di memori browser.
- ⚙️ **Real-time Progress** — animasi roda gigi memantau persentase ekstraksi *client-side*.
- 🇻 **Instant Deploy Vercel** — `POST api.vercel.com/v13/deployments` langsung dari client, pakai token BYOK di `localStorage`.
- 🐙 **Publish GitHub** — buat repo + commit file ke akun pengguna lewat OAuth NextAuth (BYOK).
- 🔒 **BYOK sepenuhnya** — token Vercel disimpan lokal, tidak pernah dikirim ke backend DropDeploy.
- 📱 **PWA Support** — bisa diinstal sebagai native app mandiri langsung dari browser.
- 🎨 UI mengikuti **DESIGN.md** (layout elegan satu kolom, pill nav, sticker shadow, tinted cards).

---

## Tech Stack

- **Next.js 16** (App Router) + Tailwind CSS v4
- **next-auth** v4 — khusus GitHub OAuth (satu-satunya API route)
- **jszip** — ekstraksi ZIP di browser
- **react-dropzone** — area drag & drop
- **lucide-react** — ikon

---

## Menjalankan Lokal

```bash
npm install
cp .env.example .env.local   # lalu isi nilai dibawah
npm run dev                  # http://localhost:3000
```

> 📝 Di Termux (Android/arm64), build pakai Webpack karena Turbopack tak punya native binding:
> `npm run build` sudah otomatis `next build --webpack`.

---

## Environment Variables (.env)

| Variabel | Wajib | Deskripsi |
| :--- | :--- | :--- |
| `AUTH_GITHUB_ID` | ✅ | Client ID GitHub OAuth App |
| `AUTH_GITHUB_SECRET` | ✅ | Client Secret GitHub OAuth App |
| `AUTH_SECRET` | ✅ | Secret untuk enkripsi JWT NextAuth. Buat: `npx auth secret` atau `openssl rand -base64 32` |

> `next-auth` v4 juga membaca `AUTH_*` (prefix `NEXTAUTH_*` sudah di-deprecate sejak v4.23).

### Membuat GitHub OAuth App

1. Buka **https://github.com/settings/developers** → *New OAuth App*.
2. **Homepage URL:** `http://localhost:3000`
3. **Authorization callback URL:** `http://localhost:3000/api/auth/callback/github`
4. Simpan → salin **Client ID** & **Client Secret** ke `.env.local`.
5. Scope yang diminta aplikasi: `read:user user:email repo` (agar user bisa publish repo ke akun mereka).

> Untuk produksi, ganti `localhost:3000` dengan domain ter-deploy (mis. `https://dropdeploy.my.id`).

### Token Vercel (bagi pengguna akhir — bukan env)

Token Vercel **tidak** masuk `.env`. Pengguna memasukkan token personal mereka di UI (field *Vercel Token*), disimpan di `localStorage` browser. Buat di:
**Vercel → Settings → Tokens → Create** (scope: *deployment*).

---

## Arsitektur & Alur Kerja

```
Browser (client)                          Backend
─────────────                            ────────
 .zip ──▶ JSZip (ekstrak di memori)
   └─▶ files[] base64
          ├─▶ POST api.vercel.com/v13/deployments   (token localStorage)
          └─▶ POST api.github.com/user/repos        (token dari sesi NextAuth)
                                                     │
GitHub OAuth: signIn("github") ────────────────▶ /api/auth/[...nextauth]  ✅ SATU-SATUNYA backend
```

- **DropZone terkunci** secara fungsional sampai *login GitHub* **dan** *Vercel Token* terisi.
- Semua beban data (ZIP, base64, payload besar) tidak pernah lewat backend → **bebas limit payload 4.5MB Vercel**.

---

## Struktur Proyek

```
dropdeploy/
├─ app/
│  ├─ api/auth/[...nextauth]/route.ts   # ✅ NextAuth (satu-satunya backend)
│  ├─ globals.css                        # Tailwind v4 @theme token dari DESIGN.md
│  ├─ layout.tsx · providers.tsx · page.tsx
├─ components/
│  ├─ DropDeployClient.tsx               # UI + logika dropzone/deploy/publish
│  └─ ui.tsx                             # confetti, nav pill, logo, badge
├─ lib/
│  ├─ auth.ts                            # config NextAuth (GitHub, JWT token)
│  ├─ deploy.ts                          # JSZip extract + nama + deteksi env
│  ├─ vercel.ts                          # POST /v13/deployments
│  └─ github.ts                          # create repo + commit via Contents API
├─ types/next-auth.d.ts                  # augmentasi Session (accessToken)
├─ .env.example · .env.local
└─ ...
```

---

## Batasan & Catatan

- **Deploy Vercel** memakai flat file tree (zipped). Folder induk tunggal otomatis dideteksi Vercel.
- **Publish GitHub** commit per-file via Contents API (tanpa backend git). Untuk monorepo/repo besar bisa lambat.
- Ukuran ZIP dibatasi memori browser (bukan limit backend).
- Vercel token & arsip hanya diproses di browser pengguna — DropDeploy tidak menyimpannya di server.