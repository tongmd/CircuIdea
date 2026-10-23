# CircuIdea

A small workspace for research ideas, reviews, and contributions. Previously **CircuRead**.

[Open the workspace](https://circuidea.pages.dev/) · [中文说明](README_CN.md) · [Tong Zhang](https://stonezhang.com/)

![CircuIdea workspace with explicitly labeled example data](docs/workspace.png)

## Use the web workspace

Open **https://circuidea.pages.dev/**. No account or installation is needed.

1. Create an idea with a proposal, tags, reviewers, and progress status.
2. Add reviews and record contributions in GPU hours, human hours, CPU hours, CNY, or USD. Different units are summarized separately.
3. Search ideas, follow activity, and export a full JSON backup or an individual note ZIP.
4. Optionally connect an initialized **private GitHub repository**. Use a fine-grained personal access token scoped to that repository with **Contents: read and write**. Read and write `.circuidea/workspace.json` manually through the GitHub sync dialog.

Your workspace starts empty and is stored in this browser's local storage. Clearing browser data removes local content. Export backups regularly. “Load example” is optional and clearly labels its data; it asks before replacing a nonempty workspace.

GitHub tokens stay in page memory only and are cleared on disconnect or refresh. They are never included in browser storage, JSON backups, or note exports. Remote updates use the file SHA to detect conflicts; a conflict stops the write. Export a local backup before loading a remote version. GitHub API sync creates ordinary commits, not the CLI's signed deliveries. The browser has no shared login service, automatic background sync, or automatic credit allocation.

The note ZIP contains `note.md`, XeLaTeX-compatible `note.tex`, `note.meta.yml`, and `credit.json` with reviews and recorded resources. It can be placed in your private idea repository and delivered with the CLI below. Local activity and contribution entries are editable records, not independently verified evidence.

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

Browser verification covers idea creation, editing, review/resource entry, reload persistence, search, JSON import/export, ZIP downloads, token storage, GitHub conflict handling, and responsive layouts. GitHub synchronization tests use mocked API responses; no private user repository is altered by the tests.

Deploy the `web/` directory to Cloudflare Pages with no build command:

```bash
npx wrangler pages deploy web --project-name circuidea --branch main
```

The homepage icon and app branding use Tong Zhang's existing site icon. MIT license.
