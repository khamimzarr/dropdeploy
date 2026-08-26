import type { ZipEntry } from "./deploy";

const VERCEL_API = "https://api.vercel.com/v13/deployments";

export interface VercelDeployResult {
  id: string;
  url: string;
  /** production-ready alias e.g. project.vercel.app */
  alias: string;
  readyState?: string;
}

/**
 * Direct-deploy a flat file tree to Vercel from the browser.
 * token comes from the user's localStorage — never sent to our backend.
 *
 * @throws Error with a friendly message on failure.
 */
export async function deployToVercel(
  token: string,
  projectName: string,
  files: ZipEntry[]
): Promise<VercelDeployResult> {
  if (!token.trim()) throw new Error("Vercel token kosong.");

  // Vercel requires files without the trailing folder the zip may carry.
  // Each upload: { file, data, encoding }. We already decoded to UTF-8 for
  // text and kept binary as base64 — send base64 for everything to avoid
  // corruption with images & non-UTF-8 sources.
  const uploads = files
    .filter((f) => f.path.length > 0)
    .map((f) => ({
      // normalize: strip leading './' and trim
      file: f.path.replace(/^\.\//, ""),
      data: f.data,
      encoding: "base64" as const,
    }));

  const body = {
    name: projectName,
    files: uploads,
    projectSettings: {
      framework: null,
      buildCommand: undefined,
      // dockerfile detected at runtime in caller
    },
    target: "production",
    forceNew: 1,
  };

  const res = await fetch(VERCEL_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    const detail =
      (json as any).error?.message ||
      (json as any).message ||
      `HTTP ${res.status}`;
    if (res.status === 403 || res.status === 401) {
      throw new Error("Token Vercel tidak valid / tidak punya izin (403).");
    }
    throw new Error(`Vercel gagal: ${detail}`);
  }

  const deployUrl = json.url as string;
  let alias = deployUrl;
  // if a project alias is attached (production), use entrypoint domain
  const aliases = (json as any).alias as string[] | undefined;
  if (aliases && aliases.length > 0) alias = aliases[0];

  return {
    id: json.id as string,
    url: deployUrl,
    alias,
    readyState: json.readyState as string | undefined,
  };
}