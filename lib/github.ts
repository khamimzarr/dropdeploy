import type { ZipEntry } from "./deploy";

const GH_API = "https://api.github.com";

export interface GitHubPublishResult {
  htmlUrl: string;
  cloneUrl: string;
  defaultBranch: string;
}

/**
 * Publish the extracted files to a NEW GitHub repo owned by the logged-in
 * GitHub user (BYOK). Uses the access token NextAuth stored in the session;
 * runs entirely client-side against api.github.com.
 *
 * @throws Error with friendly message on failure.
 */
export async function publishToGitHub(
  token: string,
  repoName: string,
  entries: ZipEntry[],
  description = "Deployed via DropDeploy"
): Promise<GitHubPublishResult> {
  if (!token) throw new Error("Tidak ada sesi GitHub. Silakan login dulu.");

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  };

  // 1) Create empty repo
  const createRes = await fetch(`${GH_API}/user/repos`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: repoName,
      description,
      private: false,
      auto_init: false,
      has_issues: true,
      has_projects: false,
      has_wiki: false,
    }),
  });
  const created = await createRes.json().catch(() => ({}));
  if (!createRes.ok) {
    throw new Error(
      `Gagal membuat repo: ${
        (created as any).message || `HTTP ${createRes.status}`
      }`
    );
  }

  const owner = (created as any).owner?.login;
  if (!owner) throw new Error("GitHub tidak mengembalikan owner repo.");

  // 2) Commit files to main via the Contents API (one file per request).
  //    Simple + reliable; no git backend required on the client.
  const repoApi = `${GH_API}/repos/${owner}/${repoName}`;
  const branchDefault = (created as any).default_branch || "main";
  let shaMap: Record<string, string> = {}; // path -> sha (dirs tracked implicitly)

  // For content paths, Git needs every intermediate dir to exist. GitHub
  // contents API creates dirs implicitly when path includes '/', so a flat
  // loop over file paths works. We commit in sorted order for determinism.
  const sorted = entries
    .slice()
    .sort((a, b) => a.path.localeCompare(b.path));

  let committed = 0;
  for (const entry of sorted) {
    const putRes = await fetch(
      `${repoApi}/contents/${entry.path}`,
      {
        method: "PUT",
        headers,
        body: JSON.stringify({
          message: `Add ${entry.path} via DropDeploy`,
          content: entry.data, // base64 already
          branch: branchDefault,
        }),
      }
    );
    const putJson = await putRes.json().catch(() => ({}));
    if (!putRes.ok) {
      // 422 bump happens when file already exists → overwrite
      throw new Error(
        `Gagal upload ${entry.path}: ${
          (putJson as any).message || `HTTP ${putRes.status}`
        }`
      );
    }
    shaMap[entry.path] = (putJson as any).content?.sha;
    committed++;
  }

  return {
    htmlUrl: (created as any).html_url,
    cloneUrl: (created as any).clone_url,
    defaultBranch: branchDefault,
  };
}