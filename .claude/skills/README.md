# Agent skills

Owner of: which skills this repo has, where they come from, and how they are shared between
Claude Code and Factory Droid. When to use each skill and how it applies to this project is
owned by [`AGENTS.md`](../../AGENTS.md#agent-skills).

## Sharing between tools

- Claude Code reads `.claude/skills/`; Factory Droid reads `.factory/skills/`.
- Vendored skills live here; `.factory/skills/<name>` is a symlink to `../../.claude/skills/<name>`.
- `review-guidelines` is project-owned and lives in `.factory/skills/review-guidelines/`, because
  Factory's review-guideline job writes there; `.claude/skills/review-guidelines` links to it.
- Link individual skills, never a whole folder — git cannot commit files under a symlinked
  directory. On Windows, clone with `core.symlinks=true` (and Developer Mode) to get real links.

## Inventory

| Skill | Source | Commit | License |
| --- | --- | --- | --- |
| `karpathy-guidelines` | [forrestchang/andrej-karpathy-skills](https://github.com/forrestchang/andrej-karpathy-skills) | `2c60614` | MIT |
| `react-best-practices` (`vercel-react-best-practices`) | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) | `063bee9` | MIT |
| `systematic-debugging` | [obra/superpowers](https://github.com/obra/superpowers) | `main` (Oct 2026) | MIT, see `LICENSE-superpowers` |
| `verification-before-completion` | [obra/superpowers](https://github.com/obra/superpowers) | `main` (Oct 2026) | MIT, see `LICENSE-superpowers` |
| `review-guidelines` | this repository | — | — |

Vendored skills are copied unmodified. To update one, re-copy its directory from the source and
update the commit above; put project-specific adjustments in `AGENTS.md`, not in the skill.
