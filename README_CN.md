# CircuIdea

CircuIdea 原名 CircuRead，用来记录研究想法、评审反馈、资源投入与贡献来历。

[打开工作台](https://circuidea.pages.dev/) · [English](README.md) · [作者主页](https://stonezhang.com/)

![CircuIdea 工作台，展示明确标注的示例数据](docs/workspace.png)

## 浏览器使用

直接打开 https://circuidea.pages.dev/，无需安装或注册。

1. 新建想法，填写提案、标签、评审者和进展状态。
2. 添加评审与讨论，记录 GPU 小时、人时、CPU 小时、人民币或美元投入。不同单位分别汇总。
3. 搜索想法、查看活动记录，导出整个工作区的 JSON 备份，或单个想法的笔记 ZIP。
4. 按需连接已经初始化的 GitHub 私有仓库。使用仅对该仓库开放 Contents 读写权限的 fine-grained token，手动同步 `.circuidea/workspace.json`。

初次打开是空工作区，内容保存在当前浏览器。清理浏览器数据会丢失本地内容，请定期导出备份。可以主动载入示例；示例有明确标记，替换已有内容前需要确认。

Token 只保存在当前页面内存，断开或刷新后清除，不写入浏览器存储、JSON 备份或 ZIP。远端修改使用文件 SHA 检测冲突，发生冲突时停止写入。读取远端前请先备份本地内容。浏览器同步生成普通 Git 提交，不等于 CLI 签名交付。目前没有共享账号服务、后台自动同步或自动分配贡献比例。

ZIP 包含 Markdown、可用 XeLaTeX 编译的 LaTeX、`note.meta.yml` 和记录评审与资源投入的 `credit.json`，可放入私有想法仓库继续使用 CLI。浏览器活动记录与投入记录可以编辑，不是经过独立核验的存证。

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
