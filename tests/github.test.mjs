import { test } from "node:test";
import assert from "node:assert/strict";
import {
  GitHubWorkspace,
  parseRepository,
  ConflictError,
} from "../web/github.js";
import { sampleWorkspace } from "../web/model.js";
const response = (status, data) =>
  new Response(JSON.stringify(data), { status });
test("repository input and private repository enforcement", async () => {
  assert.equal(
    parseRepository("https://github.com/tongmd/private.git"),
    "tongmd/private",
  );
  assert.throws(() => parseRepository("https://evil.com/a/b"));
  const c = new GitHubWorkspace("secret", "me/repo", async () =>
    response(200, { private: false }),
  );
  await assert.rejects(() => c.connect(), /私有/);
});
test("UTF-8 sync, SHA concurrency protection, token only in request header", async () => {
  const w = sampleWorkspace();
  let written;
  const c = new GitHubWorkspace("secret", "me/repo", async (url, options) => {
    assert.equal(options.headers.Authorization, "Bearer secret");
    if (url.endsWith("/me/repo"))
      return response(200, { private: true, default_branch: "main" });
    if (options.method === "PUT") {
      written = JSON.parse(options.body);
      return response(200, {
        content: { sha: "new" },
        commit: { html_url: "https://github.com/me/repo/commit/new" },
      });
    }
    return response(200, {
      type: "file",
      encoding: "base64",
      size: 100,
      sha: "old",
      content: Buffer.from(JSON.stringify(w)).toString("base64"),
    });
  });
  assert.equal((await c.connect()).ideas[0].title, w.ideas[0].title);
  await c.write(w);
  assert.equal(written.sha, "old");
  assert.ok(
    !Buffer.from(written.content, "base64").toString().includes("secret"),
  );
  c.fetcher = async () => response(409, {});
  await assert.rejects(() => c.write(w), ConflictError);
  c.disconnect();
  assert.equal(c.token, "");
});
test("missing workspace can be initialized and network errors do not disclose credentials", async () => {
  const c = new GitHubWorkspace("secret", "me/repo", async (url) =>
    url.includes("/contents/")
      ? response(404, {})
      : response(200, { private: true }),
  );
  assert.equal(await c.connect(), null);
  assert.equal(c.sha, null);
  c.fetcher = () => {
    throw Error("secret");
  };
  await assert.rejects(
    () => c.write(sampleWorkspace()),
    (e) => !e.message.includes("secret"),
  );
});
