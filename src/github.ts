import { Octokit } from "@octokit/rest";
import { shouldExcludeLink } from "./link.js";
import type { GetGHTreePathsFn } from "./types.js";

const IS_GITHUB_REPO =
  /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/tree\/([^/]+)/;

export { IS_GITHUB_REPO };

/**
 * Fetch GitHub tree and return full raw URLs of .md/.MD blobs under rootPath,
 * excluding paths that match exclude list.
 */
export const getGHTreePaths: GetGHTreePathsFn = async (
  baseUrl: URL,
  exclude: string[],
) => {
  const octokit = new Octokit({ auth: undefined });
  const [, owner, repo, , branch, ...parts] = baseUrl.pathname.split("/");
  const rootPath = parts.join("/");

  const tree = await octokit.request(
    "GET /repos/{owner}/{repo}/git/trees/{tree_sha}",
    {
      owner,
      repo,
      tree_sha: branch,
      headers: { "X-GitHub-Api-Version": "2022-11-28" },
      recursive: "true",
    },
  );

  return tree.data.tree
    .filter(
      (file) =>
        file.type === "blob" &&
        (file.path?.endsWith(".md") || file.path?.endsWith(".MD")) &&
        file.path.startsWith(rootPath) &&
        !shouldExcludeLink(file.path ?? "", exclude),
    )
    .map(
      (file) =>
        `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${file.path}`,
    );
};
