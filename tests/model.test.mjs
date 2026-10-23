import { test } from "node:test";
import assert from "node:assert/strict";
import {
  emptyWorkspace,
  createIdea,
  updateWorkspace,
  validateWorkspace,
  filterIdeas,
  resourceTotals,
  noteFiles,
  zipFiles,
  sampleWorkspace,
} from "../web/model.js";
test("create, update, search, validation and unit separation", () => {
  let w = emptyWorkspace();
  const i = createIdea(
    { title: "中文 idea", body: "latent structure", tags: ["数学"] },
    "Stone",
  );
  w = updateWorkspace(w, "create", (w) => w.ideas.push(i));
  assert.equal(w.revision, 1);
  assert.equal(filterIdeas(w.ideas, "数学").length, 1);
  assert.equal(filterIdeas(w.ideas, "latent", "done").length, 0);
  assert.throws(() => createIdea({ title: " " }, "me"));
  assert.throws(() => validateWorkspace({ ...w, ideas: [i, i] }));
  assert.equal(validateWorkspace({ ...w, token: "secret" }).token, undefined);
  i.resources = [
    { unit: "GPU 小时", value: 2 },
    { unit: "元", value: 30 },
    { unit: "GPU 小时", value: 3 },
  ];
  assert.deepEqual(resourceTotals([i]), { "GPU 小时": 5, 元: 30 });
});
test("sample is explicitly labeled and has no fake experiment results", () => {
  const w = sampleWorkspace();
  assert.match(w.name, /示例/);
  assert.equal(w.ideas.length, 3);
  assert.ok(w.ideas.every((i) => i.resources.length === 0));
});
test("export escapes LaTeX and produces ZIP headers", async () => {
  const w = emptyWorkspace();
  const i = createIdea({ title: "A & B_中文", body: "$x% \\ end" }, "Stone");
  const files = noteFiles(i, w.profile);
  assert.match(files["note.tex"], /A \\& B\\_中文/);
  const zip = await zipFiles(files).arrayBuffer();
  assert.equal(new DataView(zip).getUint32(0, true), 0x04034b50);
  assert.throws(() => zipFiles({ "../bad": "x" }));
});
