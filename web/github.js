import { validateWorkspace } from "./model.js";
const PATH = ".circuidea/workspace.json";
export class ConflictError extends Error {
  constructor() {
    super(
      "远端已有新修改。请先导出本地备份，再读取远端版本；本次没有覆盖远端。",
    );
    this.name = "ConflictError";
  }
}
export function parseRepository(value) {
  let s = value
    .trim()
    .replace(/^https:\/\/github\.com\//, "")
    .replace(/\.git\/?$/, "")
    .replace(/\/$/, "");
  if (
    !/^[A-Za-z0-9-]+\/[A-Za-z0-9_.-]+$/.test(s) ||
    s.endsWith("/.") ||
    s.endsWith("/..")
  )
    throw Error("仓库格式应为 owner/repository。");
  return s;
}
function encode(text) {
  const bytes = new TextEncoder().encode(text);
  let s = "";
  for (let i = 0; i < bytes.length; i += 8192)
    s += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(s);
}
function decode(content) {
  return new TextDecoder("utf-8", { fatal: true }).decode(
    Uint8Array.from(atob(content.replace(/\s/g, "")), (c) => c.charCodeAt(0)),
  );
}
export class GitHubWorkspace {
  constructor(token, repository, fetcher = globalThis.fetch.bind(globalThis)) {
    this.token = token.trim();
    this.repository = parseRepository(repository);
    this.fetcher = fetcher;
    this.sha = null;
    this.branch = "";
    this.connected = false;
    if (!this.token) throw Error("请填写 GitHub token。");
  }
  async request(path, options = {}, allowMissing = false) {
    let response;
    try {
      response = await this.fetcher("https://api.github.com" + path, {
        ...options,
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: "Bearer " + this.token,
          "X-GitHub-Api-Version": "2022-11-28",
          ...(options.body ? { "Content-Type": "application/json" } : {}),
        },
        signal: AbortSignal.timeout(30000),
        redirect: "error",
      });
    } catch (_) {
      throw Error("无法连接 GitHub，请检查网络后重试。");
    }
    if (response.status === 404 && allowMissing) return null;
    if (
      response.status === 409 ||
      (response.status === 422 && options.method === "PUT")
    )
      throw new ConflictError();
    if (!response.ok) {
      const messages = {
        401: "GitHub token 无效或已过期。",
        403: "没有仓库权限，或 GitHub 请求额度已用完。",
        404: "仓库不存在，或 token 无权访问。",
      };
      throw Error(
        messages[response.status] || `GitHub 请求失败（${response.status}）。`,
      );
    }
    return response.json();
  }
  async connect() {
    const info = await this.request("/repos/" + this.repository);
    if (!info.private)
      throw Error("请使用私有仓库存放研究想法。当前连接未建立。");
    if (info.permissions && info.permissions.push === false)
      throw Error("当前账号没有该仓库的写入权限。");
    this.branch = info.default_branch || "main";
    this.connected = true;
    return this.read();
  }
  async read() {
    if (!this.connected) throw Error("请先连接仓库。");
    const data = await this.request(
      `/repos/${this.repository}/contents/${PATH}?ref=${encodeURIComponent(this.branch)}`,
      {},
      true,
    );
    if (!data) {
      this.sha = null;
      return null;
    }
    if (
      data.type !== "file" ||
      data.encoding !== "base64" ||
      data.size > 4 * 1024 * 1024
    )
      throw Error("远端工作区文件格式或大小不支持。");
    const workspace = validateWorkspace(JSON.parse(decode(data.content)));
    this.sha = data.sha;
    return workspace;
  }
  async write(workspace) {
    if (!this.connected) throw Error("请先连接仓库。");
    const normalized = validateWorkspace(workspace),
      text = JSON.stringify(normalized, null, 2) + "\n";
    if (new TextEncoder().encode(text).length > 4 * 1024 * 1024)
      throw Error("工作区超过 4 MiB，请先导出归档。");
    const body = {
      message: "CircuIdea: update research workspace",
      content: encode(text),
      branch: this.branch,
    };
    if (this.sha) body.sha = this.sha;
    const result = await this.request(
      `/repos/${this.repository}/contents/${PATH}`,
      { method: "PUT", body: JSON.stringify(body) },
    );
    this.sha = result.content.sha;
    return result.commit.html_url;
  }
  disconnect() {
    this.token = "";
    this.sha = null;
    this.connected = false;
  }
}
