export const STATUSES = {
  draft: "草稿",
  review: "评审中",
  active: "推进中",
  done: "已完成",
  parked: "暂存",
};
export const UNITS = ["GPU 小时", "人时", "CPU 小时", "元", "美元"];
export const uid = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const text = (v, max = 50000) => (typeof v === "string" ? v.slice(0, max) : "");
const list = (v, max = 30) => (Array.isArray(v) ? v.slice(0, max) : []);
const date = (v) =>
  typeof v === "string" && Number.isFinite(Date.parse(v))
    ? new Date(v).toISOString()
    : now();
export function emptyWorkspace() {
  return {
    version: 1,
    id: uid(),
    name: "我的研究工作区",
    profile: { name: "我", handle: "", exchangeOrg: "" },
    ideas: [],
    events: [],
    updatedAt: now(),
    revision: 0,
  };
}
export function validateWorkspace(value) {
  if (
    !value ||
    value.version !== 1 ||
    !Array.isArray(value.ideas) ||
    value.ideas.length > 1000
  )
    throw Error("工作区格式不正确，或想法数量超过 1000。");
  const ids = new Set();
  const ideas = value.ideas.map((v) => {
    if (
      !v ||
      typeof v.id !== "string" ||
      !/^[\w-]{1,80}$/.test(v.id) ||
      ids.has(v.id)
    )
      throw Error("想法编号无效或重复。");
    ids.add(v.id);
    const resources = list(v.resources, 1000).map((r) => {
      const amount = Number(r.value);
      if (!Number.isFinite(amount) || amount <= 0 || !UNITS.includes(r.unit))
        throw Error("投入记录的数量或单位不正确。");
      return {
        id: text(r.id, 80) || uid(),
        contributor: text(r.contributor, 100),
        unit: r.unit,
        value: amount,
        description: text(r.description, 2000),
        createdAt: date(r.createdAt),
      };
    });
    return {
      id: v.id,
      title: text(v.title, 160).trim() || "未命名想法",
      summary: text(v.summary, 600),
      body: text(v.body),
      author: text(v.author, 100),
      status: Object.hasOwn(STATUSES, v.status) ? v.status : "draft",
      tags: list(v.tags)
        .map((t) => text(t, 40))
        .filter(Boolean),
      reviewers: list(v.reviewers)
        .map((t) => text(t, 100))
        .filter(Boolean),
      createdAt: date(v.createdAt),
      updatedAt: date(v.updatedAt),
      reviews: list(v.reviews, 1000).map((r) => ({
        id: text(r.id, 80) || uid(),
        author: text(r.author, 100),
        decision: ["继续推进", "需要修改", "暂缓"].includes(r.decision)
          ? r.decision
          : "需要修改",
        body: text(r.body, 10000),
        createdAt: date(r.createdAt),
      })),
      resources,
    };
  });
  return {
    version: 1,
    id: text(value.id, 80) || uid(),
    name: text(value.name, 100) || "我的研究工作区",
    profile: {
      name: text(value.profile?.name, 100) || "我",
      handle: text(value.profile?.handle, 100),
      exchangeOrg: text(value.profile?.exchangeOrg, 100),
    },
    ideas,
    events: list(value.events, 5000).map((e) => ({
      id: text(e.id, 80),
      type: text(e.type, 50),
      label: text(e.label, 300),
      actor: text(e.actor, 100),
      ideaId: text(e.ideaId, 80),
      at: date(e.at),
    })),
    updatedAt: date(value.updatedAt),
    revision:
      Number.isSafeInteger(value.revision) && value.revision >= 0
        ? value.revision
        : 0,
  };
}
export function updateWorkspace(
  workspace,
  label,
  mutate,
  ideaId = "",
  type = "edit",
) {
  const copy = structuredClone(workspace);
  mutate(copy);
  copy.updatedAt = now();
  copy.revision++;
  copy.events.unshift({
    id: uid(),
    label,
    type,
    ideaId,
    actor: copy.profile.name,
    at: copy.updatedAt,
  });
  copy.events = copy.events.slice(0, 5000);
  return validateWorkspace(copy);
}
export function createIdea(fields, author) {
  if (!String(fields.title || "").trim()) throw Error("请填写想法标题。");
  return validateWorkspace({
    ...emptyWorkspace(),
    ideas: [
      {
        ...fields,
        id: uid(),
        author,
        createdAt: now(),
        updatedAt: now(),
        reviews: [],
        resources: [],
      },
    ],
  }).ideas[0];
}
export function resourceTotals(ideas) {
  const totals = {};
  for (const idea of ideas)
    for (const r of idea.resources)
      totals[r.unit] = (totals[r.unit] || 0) + r.value;
  return totals;
}
export function filterIdeas(ideas, query = "", status = "all") {
  const q = query.toLocaleLowerCase().trim();
  return ideas
    .filter(
      (i) =>
        (status === "all" || i.status === status) &&
        (!q ||
          [i.title, i.summary, i.body, i.author, ...i.tags, ...i.reviewers]
            .join(" ")
            .toLocaleLowerCase()
            .includes(q)),
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
const tex = (value) =>
  String(value).replace(
    /[\\{}$&#%_^~]/g,
    (c) =>
      ({
        "\\": "\\textbackslash{}",
        "{": "\\{",
        "}": "\\}",
        $: "\\$",
        "&": "\\&",
        "#": "\\#",
        "%": "\\%",
        _: "\\_",
        "^": "\\textasciicircum{}",
        "~": "\\textasciitilde{}",
      })[c],
  );
const yaml = (value) => JSON.stringify(String(value));
export function noteFiles(idea, profile) {
  const writer = profile.handle || idea.author;
  const meta = `title: ${yaml(idea.title)}\nwriter: ${yaml(writer)}\nreaders: []\npush_to: ${JSON.stringify(idea.reviewers)}\n`;
  return {
    "note.md": `# ${idea.title}\n\n${idea.summary}\n\n${idea.body}\n`,
    "note.tex": `\\documentclass[UTF8,11pt]{ctexart}\n\\usepackage[margin=1in]{geometry}\n\\title{${tex(idea.title)}}\n\\author{${tex(idea.author)}}\n\\date{}\n\\begin{document}\n\\maketitle\n${tex(idea.summary)}\n\n${tex(idea.body)}\n\\end{document}\n`,
    "note.meta.yml": meta,
    "credit.json": JSON.stringify(
      {
        ideaId: idea.id,
        author: idea.author,
        createdAt: idea.createdAt,
        reviews: idea.reviews,
        resources: idea.resources,
      },
      null,
      2,
    ),
    "README.txt":
      "CircuIdea note export. UTF-8. Compile note.tex with XeLaTeX.\nPlace these files in notes/" +
      idea.id +
      "/ in your private idea repository.\nUse circuidea deliver notes/" +
      idea.id +
      "/note.tex for the signed Git exchange.\nThis export is not a signed delivery.\n",
  };
}
export function cliCommands(idea, profile) {
  const path = `notes/${idea.id}`;
  const config = `me: ${yaml(profile.handle || "YOUR_GITHUB_USER")}\nexchange_org: ${yaml(profile.exchangeOrg || "YOUR_EXCHANGE_ORG")}\nupstreams: []\n`;
  return {
    config,
    commands: `circuidea doctor\n# 将导出的文件放入 ${path}/\ngit add '${path}'\ngit commit -S -m 'Draft idea ${idea.id}'\ncircuidea deliver '${path}/note.tex'`,
  };
}
export function zipFiles(files) {
  const encoder = new TextEncoder(),
    chunks = [],
    central = [];
  let offset = 0;
  const u16 = (v, at, n) => v.setUint16(at, n, true),
    u32 = (v, at, n) => v.setUint32(at, n >>> 0, true);
  for (const [name, content] of Object.entries(files)) {
    if (name.includes("..") || name.startsWith("/"))
      throw Error("不安全的导出路径。");
    const filename = encoder.encode(name),
      data = encoder.encode(content);
    let crc = -1;
    for (const byte of data) {
      crc ^= byte;
      for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
    crc = (crc ^ -1) >>> 0;
    const local = new Uint8Array(30 + filename.length),
      l = new DataView(local.buffer);
    u32(l, 0, 0x04034b50);
    u16(l, 4, 20);
    u16(l, 6, 0x800);
    u16(l, 12, 33);
    u32(l, 14, crc);
    u32(l, 18, data.length);
    u32(l, 22, data.length);
    u16(l, 26, filename.length);
    local.set(filename, 30);
    const entry = new Uint8Array(46 + filename.length),
      c = new DataView(entry.buffer);
    u32(c, 0, 0x02014b50);
    u16(c, 4, 20);
    u16(c, 6, 20);
    u16(c, 8, 0x800);
    u16(c, 14, 33);
    u32(c, 16, crc);
    u32(c, 20, data.length);
    u32(c, 24, data.length);
    u16(c, 28, filename.length);
    u32(c, 42, offset);
    entry.set(filename, 46);
    chunks.push(local, data);
    central.push(entry);
    offset += local.length + data.length;
  }
  const size = central.reduce((n, a) => n + a.length, 0),
    end = new Uint8Array(22),
    v = new DataView(end.buffer);
  u32(v, 0, 0x06054b50);
  u16(v, 8, central.length);
  u16(v, 10, central.length);
  u32(v, 12, size);
  u32(v, 16, offset);
  return new Blob([...chunks, ...central, end], { type: "application/zip" });
}
export function sampleWorkspace() {
  let w = emptyWorkspace();
  w.name = "研究小组 · 示例";
  w.profile.name = "示例作者";
  const data = [
    {
      title: "让研究想法有一份完整的来历",
      summary:
        "把原始提案、后续讨论与实际投入放在同一个工作区，保留每一次修改的背景。",
      body: "问题\n想法经常散落在聊天和文档中，后续讨论很难追溯。\n\n下一步\n先用一个小项目，完整记录从提案到评审的过程。",
      status: "review",
      tags: ["协作", "Credit"],
      reviewers: ["示例评审者"],
    },
    {
      title: "概念形成：从异常到可复用的结构",
      summary:
        "记录问题、候选抽象和待验证的推论，先明确什么结果能够支持这个想法。",
      body: "核心问题\n一个新概念能否帮助解决没有展示过的问题？\n\n验证计划\n冻结定义后，再测试隐藏问题。这里没有填写实验结果。",
      status: "active",
      tags: ["抽象", "数学"],
      reviewers: [],
    },
    {
      title: "本周阅读与值得继续追问的问题",
      summary: "先记下问题，不急着把它包装成一篇论文。",
      body: "把文献、疑问和下一步阅读建议放在这里。",
      status: "draft",
      tags: ["阅读"],
      reviewers: [],
    },
  ];
  for (const item of data) {
    const idea = createIdea(item, w.profile.name);
    w = updateWorkspace(
      w,
      "创建想法：" + idea.title,
      (x) => x.ideas.push(idea),
      idea.id,
      "create",
    );
  }
  return w;
}
