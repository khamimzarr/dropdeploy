import JSZip from "jszip";

/**
 * Vercel BuildUpload = { data: string; encoding: "base64" | "utf-8" }
 * GitHub contents = { path, content (base64), encoding }
 */

export interface ZipEntry {
  path: string;
  data: string; // base64 encoded bytes
}

/**
 * Read a .zip File in the browser, convert every entry to a base64
 * buffer. ALL processing happens on the client — never touches a backend.
 */
export async function readZip(file: File, onProgress?: (p: number) => void): Promise<ZipEntry[]> {
  const zip = await JSZip.loadAsync(file);
  const entries: ZipEntry[] = [];
  const names = Object.keys(zip.files);

  const fileNames = names.filter(n => !zip.files[n].dir);
  const total = fileNames.length;
  let done = 0;

  for (const name of fileNames) {
    const zipEntry = zip.files[name];
    const item = await zipEntry.async("uint8array");
    let base64 = "";
    for (let i = 0; i < item.length; i += 0x8000) {
      base64 += String.fromCharCode(...item.subarray(i, i + 0x8000));
    }
    entries.push({
      path: name.replace(/^\/+/, ""),
      data: btoa(base64),
    });
    done++;
    if (onProgress) onProgress(Math.round((done / total) * 100));
  }

  return entries;
}

export function detectEnv(
  entries: ZipEntry[] | { path: string }[]
): { framework?: string; hasDockerfile: boolean } {
  const paths = new Set(entries.map((e) => e.path));
  // If a top-level folder contains the app, Vercel picks it up anyway;
  // we pass the flat file tree which is what v13/deployments expects.
  const hasDockerfile = paths.has("Dockerfile") || paths.has("dockerfile");

  const hasNext = [...paths].some(
    (p) => p === "next.config.js" || p === "next.config.mjs" || p === "next.config.ts"
  );
  let framework: string | undefined;
  if (hasNext) framework = "nextjs";
  if (hasDockerfile) framework = "docker";
  if (paths.has("package.json")) {
    // keep nextjs detection; otherwise leave undetected for Vercel to auto-detect
    if (!framework) framework = undefined;
  }
  return { framework, hasDockerfile };
}

/** Smallest tech that keeps build info intact. */
export function nameFromZip(fileName: string): string {
  return fileName
    .replace(/\.zip$/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "deploy";
}