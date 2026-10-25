# CircuIdea

CircuIdea 原名 CircuRead，用来记录研究想法、评审反馈、资源投入与贡献来历。

[打开工作台](https://circuidea.pages.dev/) · [English](README.md) · [作者主页](https://stonezhang.com/)


## 浏览器使用

打开 https://circuidea.pages.dev/，直接写下想法，点“记下”。打开一条想法就能继续写，修改自动保存；做完点“完成”，也可以继续推进。想法多起来后会出现搜索。

内容保存在当前浏览器。已有想法、讨论和投入记录保留，历史讨论与投入可在想法内查看。网页不再提供 JSON 导入导出、token 配置或同步入口；没有云端存储或共享账号服务。

## 签名 Git 交付

新版命令为 `circuidea`，保留旧 `circuread` 命令与交付协议兼容性。需要 Bash 4+、Git、已登录的 `gh`、mikefarah/yq v4，以及配置好的 Git 签名密钥。

```bash
git clone https://github.com/tongmd/CircuIdea.git
cd CircuIdea
mkdir -p "$HOME/.local/bin"
install -m 755 circuidea circuread "$HOME/.local/bin/"
```

把 `~/.local/bin` 加入 PATH。在自己的私有想法仓库根目录创建 `.circuidea.yml`：

```yaml
me: YOUR_GITHUB_USER
exchange_org: YOUR_EXCHANGE_ORG
upstreams: []
```

```bash
circuidea doctor
circuidea new notes/my-idea
# 编辑 note.tex 和 note.meta.yml，将真实评审者填入 push_to
git add .circuidea.yml notes/my-idea
git commit -S -m 'Draft my idea'
circuidea deliver notes/my-idea/note.tex
# 评审者执行：circuidea review <delivery-directory>
circuidea fetch --all
# 检查导入内容，再按需 git push
```

`deliver` 在指定组织创建私有的作者到评审者仓库，邀请指定评审者，提交带 UUID 的签名交付。`review` 签名提交回复，`fetch` 导入快照，不覆盖原始笔记。签名可用于验证可信签名者的来历；仓库所有者仍能改写历史，不能视为不可篡改存储。

新命令优先读取 `.circuidea.yml`，不存在时兼容 `.circuread.yml`。旧命令仍读取旧配置。导入评审继续放在 `.circuread/reviews/`，保持协议兼容。详见[协议文档](docs/protocol.md)。

`bash bootstrap.sh <github-user> <idea-repo> <exchange-org>` 可创建并推送新的私有想法仓库，再安装两个命令。该命令会执行实际 GitHub 操作，请确认确实需要创建该仓库后使用。

## 开发与部署

界面使用原生 HTML/CSS/JavaScript，没有构建步骤与服务端密钥。

```bash
npm run serve  # http://localhost:18972
npm test
bash tests/test_cli.sh
bash tests/test_exchange.sh
npx wrangler pages deploy web --project-name circuidea --branch main
```

测试覆盖数据模型、GitHub API 模拟、签名交付兼容、浏览器创建/修改、评审/投入、刷新持久化、搜索、备份恢复、ZIP 下载、冲突处理与手机布局。GitHub 同步测试使用模拟 API，不修改用户私有仓库。

图标沿用 Tong Zhang 主页图标。MIT 许可证。
