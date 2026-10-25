# CircuIdea

A small workspace for research ideas, reviews, and contributions. Previously **CircuRead**.

[Open the workspace](https://circuidea.pages.dev/) · [中文说明](README_CN.md) · [Tong Zhang](https://stonezhang.com/)


## Use the web workspace

Open https://circuidea.pages.dev/. Write an idea and press **记下**. Open any saved idea to continue writing; changes save automatically. Mark it complete when you are done, or continue it later. Search appears when the list grows.

Content stays in this browser. Existing ideas, reviews, and contribution records are preserved; existing discussion and contribution records can be read within an idea. The web interface has no JSON import/export, token configuration, or synchronization controls. It does not provide cloud storage or shared accounts.

## Signed Git exchange CLI

The original private Git exchange protocol remains available. CircuIdea gives it a new command; `circuread` remains supported for existing installations.

Requirements: Bash 4+, Git, authenticated GitHub CLI (`gh auth login`), [mikefarah/yq v4](https://github.com/mikefarah/yq), and a Git signing key. On macOS install a current Bash and ensure it is on `PATH`.

```bash
git clone https://github.com/tongmd/CircuIdea.git
cd CircuIdea
mkdir -p "$HOME/.local/bin"
install -m 755 circuidea circuread "$HOME/.local/bin/"
# Add ~/.local/bin to PATH; configure your Git identity and signing key.
```

At the root of an existing private idea Git repository, create `.circuidea.yml`:

```yaml
me: YOUR_GITHUB_USER
exchange_org: YOUR_EXCHANGE_ORG
upstreams: []
```

```bash
circuidea doctor
circuidea new notes/my-idea
# Edit notes/my-idea/note.tex and note.meta.yml; add real reviewers to push_to.
git add .circuidea.yml notes/my-idea
git commit -S -m 'Draft my idea'
circuidea deliver notes/my-idea/note.tex
# Reviewer: circuidea review <delivery-directory>
circuidea fetch --all
# Inspect imported reviews, then git push when ready.
```

`deliver` creates private `<author>__to__<reviewer>` exchange repositories in the configured organization, invites the intended reviewer, and pushes a UUID delivery in a signed commit. `review` signs the response. `fetch` imports snapshots without replacing your original note. Review imports remain under `.circuread/reviews/` for protocol compatibility. `circuidea` reads `.circuidea.yml`, falling back to `.circuread.yml` when no new config exists; the legacy `circuread` command continues to use its original config.

Signed commits provide verifiable provenance when the signer is trusted. Repository owners can still rewrite history. Do not describe this as immutable storage. See [the protocol](docs/protocol.md) for the existing exchange format and its limitations.

For a new private idea repository, `bash bootstrap.sh <github-user> <idea-repo> <exchange-org>` creates and pushes a signed initial repository, then installs both commands. It performs GitHub actions, so use it only when you intend to create that repository.

## Develop and deploy

The UI is static, dependency-free HTML/CSS/JavaScript. No build step or server secrets are needed.

```bash
npm run serve             # http://localhost:18972
npm test                 # model and mocked GitHub API checks
bash tests/test_cli.sh
bash tests/test_exchange.sh  # isolated local repos and temporary signing keys
```

The web interface is checked for idea capture, automatic saving, reload persistence, completion, existing-data preservation, and responsive layouts. Model and GitHub API tests remain isolated from user repositories.

Deploy the `web/` directory to Cloudflare Pages with no build command:

```bash
npx wrangler pages deploy web --project-name circuidea --branch main
```

The homepage icon and app branding use Tong Zhang's existing site icon. MIT license.
