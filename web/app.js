import {
  STATUSES,
  UNITS,
  uid,
  emptyWorkspace,
  validateWorkspace,
  updateWorkspace,
  createIdea,
  filterIdeas,
  resourceTotals,
  noteFiles,
  cliCommands,
  zipFiles,
  sampleWorkspace,
} from "./model.js";
import { GitHubWorkspace } from "./github.js";
const $ = (s) => document.querySelector(s),
  KEY = "circuidea.workspace.v1";
let w = emptyWorkspace(),
  view = "overview",
  selected = "",
  query = "",
  status = "all",
  connection = null,
  saveFailed = false;
try {
  const saved = localStorage.getItem(KEY);
  if (saved) w = validateWorkspace(JSON.parse(saved));
} catch (e) {
  saveFailed = true;
}
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
};
const add = (p, ...children) => {
  p.append(...children.filter(Boolean));
  return p;
};
const btn = (text, fn, cls = "button subtle") => {
  const b = el("button", cls, text);
  b.type = "button";
  b.onclick = fn;
  return b;
};
const stamp = (s) =>
  new Date(s).toLocaleString("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
function toast(s) {
  $("#toast").textContent = s;
  $("#toast").hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => ($("#toast").hidden = true), 4500);
}
function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(w));
    saveFailed = false;
  } catch (e) {
    saveFailed = true;
    toast("浏览器存储失败，请立即导出备份。");
  }
  render();
}
function change(label, mutate, id = "", type = "edit") {
  w = updateWorkspace(w, label, mutate, id, type);
  persist();
}
function download(blob, name) {
  const a = el("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}
function backup() {
  download(
    new Blob([JSON.stringify(w, null, 2)], { type: "application/json" }),
    "circuidea-workspace.json",
  );
}
function go(v, id = "") {
  view = v;
  selected = id;
  render();
  window.scrollTo(0, 0);
}
function heading(title, sub) {
  const h = el("div", "page-heading");
  add(
    h,
    add(
      el("div"),
      el("span", "eyebrow", "YOUR RESEARCH, CONNECTED"),
      el("h1", "", title),
      el("p", "subtext", sub),
    ),
  );
  return h;
}
function card(i) {
  const c = el("article", "idea-card");
  add(
    c,
    add(
      el("div", "card-top"),
      el("span", "status " + i.status, STATUSES[i.status]),
      el("span", "card-date", stamp(i.updatedAt)),
    ),
    btn(i.title, () => go("detail", i.id), "link-button row-title"),
    el("p", "", i.summary || "还没有填写概述。"),
    add(el("div", "tags"), ...i.tags.map((t) => el("span", "tag", t))),
    add(
      el("div", "card-footer"),
      el("span", "author", i.author),
      el(
        "span",
        "card-metrics",
        `${i.reviews.length} 条评审 · ${i.resources.length} 笔投入`,
      ),
    ),
  );
  return c;
}
function empty(title, copy) {
  return add(
    el("div", "empty"),
    el("div", "empty-symbol", "◈"),
    el("h2", "", title),
    el("p", "", copy),
    add(
      el("div", "empty-actions"),
      btn("＋ 新建想法", () => editIdea(), "button primary"),
      btn("载入示例", loadSample),
    ),
  );
}
function activities(events) {
  const p = el("div", "panel");
  if (!events.length)
    add(p, el("p", "subtext", "还没有活动。新建一个想法开始记录。"));
  for (const e of events)
    add(
      p,
      add(
        el("div", "activity-row"),
        el("span", "activity-dot", "•"),
        add(
          el("div"),
          el("p", "", e.label),
          el("small", "subtext", `${e.actor} · ${stamp(e.at)}`),
        ),
      ),
    );
  return p;
}
function render() {
  $("#workspace-name").textContent = w.name;
  $("#idea-count").textContent = w.ideas.length;
  $("#view-name").textContent = {
    overview: "工作台",
    ideas: "全部想法",
    reviews: "评审与讨论",
    resources: "资源投入",
    activity: "活动记录",
    detail: "想法详情",
  }[view];
  document
    .querySelectorAll("[data-view]")
    .forEach((n) => n.classList.toggle("active", n.dataset.view === view));
  $("#storage-label").textContent = saveFailed
    ? "尚未保存，请导出备份"
    : "保存在此浏览器";
  $("#save-label").textContent = connection
    ? connection.repository + " · 手动同步"
    : "本地工作区 · 建议定期备份";
  $("#connect-button").textContent = connection
    ? "GitHub 同步"
    : "↗ 连接 GitHub";
  const m = $("#main");
  m.replaceChildren();
  if (saveFailed)
    add(
      m,
      el(
        "p",
        "notice",
        "无法读取或保存浏览器存储。当前修改可能无法保留，请导出备份；原始存储没有被自动清除。",
      ),
    );
  if (w.name.includes("示例"))
    add(
      m,
      el(
        "p",
        "notice demo",
        "示例数据 · 用于体验界面，不代表实际研究或实验结果。可在设置中导入自己的工作区。",
      ),
    );
  if (view === "overview") {
    const stats = el("section", "stats");
    for (const [label, n, help] of [
      ["全部想法", w.ideas.length, "每个问题，都值得被记下"],
      [
        "正在推进",
        w.ideas.filter((i) => i.status === "active").length,
        "把下一步变成行动",
      ],
      [
        "评审与讨论",
        w.ideas.reduce((n, i) => n + i.reviews.length, 0),
        "保留建议，也保留来历",
      ],
      [
        "投入记录",
        w.ideas.reduce((n, i) => n + i.resources.length, 0),
        "记录每一份实际贡献",
      ],
    ])
      add(
        stats,
        add(
          el("div", "stat"),
          el("span", "stat-label", label),
          el("strong", "stat-number", n),
          el("small", "stat-help", help),
        ),
      );
    add(
      m,
      stats,
      add(
        el("div", "section-heading"),
        el("h2", "", "最近的想法"),
        btn("查看全部 →", () => go("ideas"), "text-button"),
      ),
    );
    add(
      m,
      w.ideas.length
        ? add(
            el("div", "idea-grid"),
            ...filterIdeas(w.ideas).slice(0, 3).map(card),
          )
        : empty(
            "你的第一个想法，从这里开始",
            "内容保存在当前浏览器。无需注册，也可以稍后连接私有仓库。",
          ),
    );
    add(
      m,
      add(
        el("div", "overview-bottom"),
        add(
          el("section"),
          el("h2", "", "最近活动"),
          activities(w.events.slice(0, 4)),
        ),
        add(
          el("section", "panel"),
          el("h2", "", "一个简单的研究循环"),
          ...[
            "记录问题与原始提案",
            "邀请评审，留下具体反馈",
            "记录资源投入与贡献",
            "导出、归档，再继续推进",
          ].map((s, i) =>
            add(
              el("div", "workflow-step"),
              el("span", "step-number", i + 1),
              el("span", "", s),
            ),
          ),
        ),
      ),
    );
  } else if (view === "ideas") {
    add(m, heading("全部想法", "收集问题，整理线索，跟进下一步。"));
    const tools = el("div", "tools"),
      input = el("input", "search");
    input.placeholder = "搜索标题、正文或标签";
    input.setAttribute("aria-label", "搜索想法");
    input.value = query;
    const select = el("select", "filter-select");
    select.setAttribute("aria-label", "筛选状态");
    for (const [v, t] of [["all", "全部状态"], ...Object.entries(STATUSES)]) {
      const o = el("option", "", t);
      o.value = v;
      select.append(o);
    }
    select.value = status;
    const grid = el("div", "idea-grid");
    const refresh = () => {
      const ideas = filterIdeas(w.ideas, query, status);
      grid.replaceChildren(...ideas.map(card));
      if (!ideas.length)
        grid.append(el("p", "subtext", "没有符合条件的想法。"));
    };
    input.oninput = () => {
      query = input.value;
      refresh();
    };
    select.onchange = () => {
      status = select.value;
      refresh();
    };
    add(m, add(tools, input, select), grid);
    refresh();
  } else if (view === "activity") {
    add(
      m,
      heading(
        "活动记录",
        "工作区中的修改记录。浏览器记录可被编辑，不是签名存证。",
      ),
      activities(w.events),
    );
  } else if (view === "reviews") {
    add(m, heading("评审与讨论", "具体的建议，让想法往前走。"));
    const entries = w.ideas
      .flatMap((i) => i.reviews.map((r) => ({ i, r })))
      .sort((a, b) => b.r.createdAt.localeCompare(a.r.createdAt));
    if (!entries.length)
      add(m, el("p", "notice", "还没有评审。打开一个想法，点击“添加评审”。"));
    for (const { i, r } of entries) add(m, reviewCard(i, r));
  } else if (view === "resources") {
    add(m, heading("资源投入", "按原始单位记录投入，不混合不同币种与资源。"));
    const totals = resourceTotals(w.ideas);
    add(
      m,
      add(
        el("div", "totals"),
        ...Object.entries(totals).map(([u, n]) =>
          el("span", "total-pill", `${n.toLocaleString()} ${u}`),
        ),
      ),
    );
    const table = el("table");
    add(
      table,
      add(
        el("thead"),
        add(
          el("tr"),
          ...["想法", "贡献者", "数量", "说明", "时间"].map((s) =>
            el("th", "", s),
          ),
        ),
      ),
    );
    const body = el("tbody");
    for (const i of w.ideas)
      for (const r of i.resources)
        add(
          body,
          add(
            el("tr"),
            add(
              el("td"),
              btn(i.title, () => go("detail", i.id), "link-button"),
            ),
            el("td", "", r.contributor),
            el("td", "", `${r.value} ${r.unit}`),
            el("td", "", r.description),
            el("td", "", stamp(r.createdAt)),
          ),
        );
    add(table, body);
    add(m, add(el("div", "table-wrap"), table));
    if (!body.children.length)
      add(
        m,
        el("p", "notice", "还没有投入记录。打开一个想法，点击“记录投入”。"),
      );
  } else if (view === "detail") renderDetail(m);
}
function reviewCard(i, r) {
  return add(
    el("article", "review-card"),
    add(
      el("div", "review-head"),
      el("strong", "", r.author),
      el("span", "review-decision", r.decision),
      el("small", "subtext", stamp(r.createdAt)),
    ),
    btn(i.title, () => go("detail", i.id), "text-button"),
    el("p", "note-body", r.body),
  );
}
function renderDetail(m) {
  const i = w.ideas.find((i) => i.id === selected);
  if (!i) {
    go("ideas");
    return;
  }
  add(
    m,
    btn("← 返回全部想法", () => go("ideas"), "text-button"),
    heading(i.title, i.summary),
  );
  const actions = el("div", "detail-actions");
  add(
    actions,
    btn("编辑想法", () => editIdea(i), "button primary"),
    btn("添加评审", () => addReview(i)),
    btn("记录投入", () => addResource(i)),
    btn("导出笔记 ZIP", () =>
      download(zipFiles(noteFiles(i, w.profile)), `circuidea-${i.id}.zip`),
    ),
    btn("签名交付指南", () => showCommands(i)),
    btn(
      "删除",
      () => {
        if (
          confirm(`删除“${i.title}”？其评审与投入也会删除。建议先导出备份。`)
        ) {
          change(
            "删除想法：" + i.title,
            (x) => (x.ideas = x.ideas.filter((v) => v.id !== i.id)),
            i.id,
            "delete",
          );
          go("ideas");
        }
      },
      "button danger",
    ),
  );
  add(
    m,
    actions,
    add(
      el("div", "detail-grid"),
      add(
        el("article", "panel"),
        el("h2", "", "提案与笔记"),
        el("p", "note-body", i.body || "暂未填写正文。"),
      ),
      add(
        el("aside", "panel"),
        el("span", "status " + i.status, STATUSES[i.status]),
        el("p", "detail-meta", "作者：" + i.author),
        el(
          "p",
          "detail-meta",
          "评审者：" + (i.reviewers.join("、") || "未指定"),
        ),
        el("p", "detail-meta", "更新于 " + stamp(i.updatedAt)),
        add(el("div", "tags"), ...i.tags.map((t) => el("span", "tag", t))),
      ),
    ),
  );
  add(m, el("h2", "", "评审与讨论"), ...i.reviews.map((r) => reviewCard(i, r)));
  if (!i.reviews.length) add(m, el("p", "subtext", "还没有评审。"));
  add(m, el("h2", "", "投入记录"));
  for (const r of i.resources)
    add(
      m,
      add(
        el("div", "panel"),
        el("strong", "", `${r.contributor} · ${r.value} ${r.unit}`),
        el("p", "", r.description),
        el("small", "subtext", stamp(r.createdAt)),
      ),
    );
}
let submitHandler;
function modal(title, fields, handler, label = "保存") {
  const d = $("#dialog");
  if (d.open) d.close();
  $("#dialog-title").textContent = title;
  $("#dialog-body").replaceChildren(...fields);
  $("#dialog-error").hidden = true;
  $("#dialog-submit").textContent = label;
  $("#dialog-submit").hidden = !handler;
  submitHandler = handler;
  d.showModal();
}
function field(label, name, value = "", type = "text", options = []) {
  const wrap = el("label", "field");
  wrap.append(el("span", "", label));
  const input = el(
    type === "textarea" ? "textarea" : type === "select" ? "select" : "input",
  );
  input.name = name;
  if (type === "select")
    for (const [v, t] of options) {
      const o = el("option", "", t);
      o.value = v;
      input.append(o);
    }
  else if (type !== "textarea") input.type = type;
  input.value = value;
  if (
    [
      "title",
      "body",
      "author",
      "value",
      "contributor",
      "repo",
      "token",
    ].includes(name)
  )
    input.required = true;
  if (type === "number") {
    input.min = "0.000001";
    input.step = "any";
  }
  if (name === "token") input.autocomplete = "off";
  if (type === "textarea") input.rows = name === "body" ? 9 : 3;
  wrap.append(input);
  return wrap;
}
$("#dialog-form").onsubmit = async (e) => {
  e.preventDefault();
  const button = $("#dialog-submit");
  if (button.disabled) return;
  button.disabled = true;
  try {
    await submitHandler?.(Object.fromEntries(new FormData(e.target)));
    $("#dialog").close();
  } catch (err) {
    $("#dialog-error").textContent = err.message;
    $("#dialog-error").hidden = false;
  } finally {
    button.disabled = false;
  }
};
for (const id of ["close-dialog", "cancel-dialog"])
  $("#" + id).onclick = () => $("#dialog").close();
function editIdea(i) {
  modal(
    i ? "编辑想法" : "新建想法",
    [
      field("标题", "title", i?.title || ""),
      field("一句话概述", "summary", i?.summary || "", "textarea"),
      field("正文 / 问题 / 下一步", "body", i?.body || "", "textarea"),
      field(
        "状态",
        "status",
        i?.status || "draft",
        "select",
        Object.entries(STATUSES),
      ),
      field("标签（用逗号分隔）", "tags", i?.tags.join(", ") || ""),
      field(
        "评审者 GitHub 用户名（逗号分隔）",
        "reviewers",
        i?.reviewers.join(", ") || "",
      ),
    ],
    (f) => {
      const fields = {
        ...f,
        tags: f.tags
          .split(/[,，]/)
          .map((s) => s.trim())
          .filter(Boolean),
        reviewers: f.reviewers
          .split(/[,，]/)
          .map((s) => s.trim())
          .filter(Boolean),
      };
      if (i) {
        change(
          "编辑想法：" + f.title,
          (x) =>
            Object.assign(
              x.ideas.find((v) => v.id === i.id),
              fields,
              { updatedAt: new Date().toISOString() },
            ),
          i.id,
        );
      } else {
        const idea = createIdea(fields, w.profile.name);
        change(
          "创建想法：" + idea.title,
          (x) => x.ideas.push(idea),
          idea.id,
          "create",
        );
        selected = idea.id;
      }
      go("detail", selected);
    },
  );
}
function addReview(i) {
  modal(
    "添加评审",
    [
      field("评审者", "author", w.profile.name),
      field(
        "建议",
        "decision",
        "需要修改",
        "select",
        ["继续推进", "需要修改", "暂缓"].map((s) => [s, s]),
      ),
      field("具体意见", "body", "", "textarea"),
    ],
    (f) =>
      change(
        "添加评审：" + i.title,
        (x) => {
          const target = x.ideas.find((v) => v.id === i.id);
          target.reviews.push({
            ...f,
            id: uid(),
            createdAt: new Date().toISOString(),
          });
          target.updatedAt = new Date().toISOString();
        },
        i.id,
        "review",
      ),
  );
}
function addResource(i) {
  modal(
    "记录投入",
    [
      field("贡献者", "contributor", w.profile.name),
      field("数量", "value", "", "number"),
      field(
        "单位",
        "unit",
        UNITS[0],
        "select",
        UNITS.map((s) => [s, s]),
      ),
      field("说明", "description", "", "textarea"),
    ],
    (f) =>
      change(
        "记录投入：" + i.title,
        (x) => {
          const target = x.ideas.find((v) => v.id === i.id);
          target.resources.push({
            ...f,
            value: Number(f.value),
            id: uid(),
            createdAt: new Date().toISOString(),
          });
          target.updatedAt = new Date().toISOString();
        },
        i.id,
        "resource",
      ),
  );
}
function showCommands(i) {
  const c = cliCommands(i, w.profile);
  modal(
    "签名 Git 交付",
    [
      el(
        "p",
        "notice",
        "浏览器同步不产生签名交付。先导出 ZIP，解压到私有想法仓库，再使用已配置签名密钥的 CLI。",
      ),
      el("h3", "", ".circuidea.yml"),
      el("pre", "code", c.config),
      el("h3", "", "命令"),
      el("pre", "code", c.commands),
    ],
    null,
  );
}
function settings() {
  modal(
    "工作区设置",
    [
      field("工作区名称", "name", w.name),
      field("你的名字", "profileName", w.profile.name),
      field("GitHub 用户名", "handle", w.profile.handle),
      field("交付组织（CLI）", "exchangeOrg", w.profile.exchangeOrg),
      el(
        "p",
        "field-help",
        "内容仅保存在当前浏览器。清理浏览器数据会删除本地工作区，请定期备份。",
      ),
      add(
        el("div", "settings-actions"),
        btn("导出 JSON 备份", backup),
        btn("导入 JSON 备份", () => $("#import-file").click()),
        btn("载入示例", () => {
          $("#dialog").close();
          loadSample();
        }),
        btn("新建空工作区", () => {
          if (confirm("先导出备份。确定替换当前工作区为空工作区？")) {
            connection?.disconnect();
            connection = null;
            w = emptyWorkspace();
            persist();
            $("#dialog").close();
            go("overview");
          }
        }),
      ),
    ],
    (f) =>
      change("更新工作区设置", (x) => {
        x.name = f.name;
        x.profile = {
          name: f.profileName,
          handle: f.handle,
          exchangeOrg: f.exchangeOrg,
        };
      }),
  );
}
function loadSample() {
  $("#toast").hidden = true;
  if (
    w.ideas.length &&
    !confirm("载入示例会替换当前工作区。请先导出备份。确定继续？")
  )
    return;
  connection?.disconnect();
  connection = null;
  w = sampleWorkspace();
  persist();
  go("overview");
}
$("#import-file").onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    if (file.size > 4 * 1024 * 1024) throw Error("备份不能超过 4 MiB。");
    const imported = validateWorkspace(JSON.parse(await file.text()));
    if (
      !confirm(
        `导入“${imported.name}”，包含 ${imported.ideas.length} 个想法？当前工作区将被替换，请先备份。`,
      )
    )
      return;
    connection?.disconnect();
    connection = null;
    w = imported;
    persist();
    $("#dialog").close();
    go("overview");
    toast("工作区已导入。");
  } catch (err) {
    toast("导入失败：" + err.message);
  } finally {
    e.target.value = "";
  }
};
function connect() {
  if (connection) {
    modal(
      "GitHub 私有仓库同步",
      [
        el("p", "", connection.repository),
        el(
          "p",
          "notice",
          "同步需要手动执行。远端冲突会停止写入，不会自动合并。Token 只保留在当前页面内存，关闭或刷新后需重新连接。",
        ),
        btn("读取远端版本", async () => {
          if (!confirm("先导出本地备份。确定用远端替换当前内容？")) return;
          try {
            const remote = await connection.read();
            if (!remote) throw Error("远端还没有工作区。");
            w = remote;
            persist();
            $("#dialog").close();
            toast("已读取远端。");
          } catch (e) {
            toast(e.message);
          }
        }),
        btn("断开连接", () => {
          connection.disconnect();
          connection = null;
          render();
          $("#dialog").close();
        }),
      ],
      async () => {
        await connection.write(w);
        toast("已同步到 GitHub。");
      },
      "同步到 GitHub",
    );
    return;
  }
  modal(
    "连接 GitHub 私有仓库",
    [
      el(
        "p",
        "notice",
        "使用已初始化的私有仓库，以及仅对该仓库开放 Contents 读写权限的 fine-grained token。Token 不会保存在浏览器存储或导出文件中。",
      ),
      field("仓库 owner/repository", "repo"),
      field("GitHub token", "token", "", "password"),
      el(
        "p",
        "field-help",
        "文件保存为 .circuidea/workspace.json。API 提交不等同于 CLI 的签名交付。",
      ),
    ],
    async (f) => {
      const client = new GitHubWorkspace(f.token, f.repo);
      try {
        const remote = await client.connect();
        if (
          remote &&
          w.ideas.length &&
          !confirm(
            "远端已有工作区。请先导出本地备份。是否用远端版本替换当前工作区？",
          )
        ) {
          client.disconnect();
          throw Error("已取消连接，本地内容保持不变。");
        }
        if (remote) w = remote;
        connection = client;
        persist();
        toast(
          remote
            ? "已连接并读取远端工作区。"
            : "已连接。再次点击 GitHub 同步可上传当前工作区。",
        );
      } catch (e) {
        client.disconnect();
        throw e;
      } finally {
        const token = $('[name="token"]');
        if (token) token.value = "";
      }
    },
    "连接",
  );
}
document.addEventListener("click", (e) => {
  const n = e.target.closest("[data-view],[data-action]");
  if (!n) return;
  if (n.dataset.view) go(n.dataset.view);
  else
    ({ new: () => editIdea(), settings, backup, connect })[
      n.dataset.action
    ]?.();
});
$("#workspace-button").onclick = settings;
render();
