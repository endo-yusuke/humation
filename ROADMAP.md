# Roadmap

Each phase delivers standalone value. Status as of June 2026.

## Phase 1 — Core rendering (this repo, done)

- [x] `@humation/core`: deterministic `createAvatar()` with CSS custom
      property (`--hm-*`) color slots, manifest validation, alias resolution
- [x] `@humation/assets-humation-1`: Humation 1 manifest + 86 SVG parts,
      embedded and JSON manifest exports
- [x] Release infrastructure: pack smoke test, publish readiness check,
      release preparation script
- [x] First stable npm publish (`v1.0.0`)

## Phase 2 — React + Web Component

- [x] `@humation/react`: `<Avatar>` with seed / named selections / colors as
      CSS custom properties (color changes never re-render the content)
- [x] `<humation-avatar>` web component: attributes mirror the selection
      slots, colors via `--hm-*` CSS variables, Shadow DOM
- [x] Avatar builder block distributed shadcn-style (`registry/` +
      `r/avatar-builder.json`, installable via `npx shadcn add <url>`)
- [ ] Static tree-shakeable `<Avatar>` with per-part imports (Lucide-style
      codegen) — deferred; seed/dynamic use cases need all parts anyway
- [x] Human-readable part names — every part has a unique per-slot `name`
      (`braids`, `hoodie`, `camera`) that doubles as the display label
      and resolves in selections (`{ head: 'braids' }`). Naming reviewed
      and approved by the artist; renames stay non-breaking via alias
      deprecation, canonical IDs are the stable persistence format
- [x] Seed-based deterministic generation (`seed` → same avatar)

## Phase 3 — Site

- [ ] Gallery, playground, `llms.txt`

## Phase 4 — AI layer

- [ ] `skills/humation-avatar`: Vercel skills distribution (SKILL.md +
      manifest.json) so agents can use Humation via `npx skills add`
- [ ] Render API alignment (human-readable IDs, seed, png output)

## Phase 5 — Community

- [ ] Part contribution flow
- [ ] Vue / Svelte adapters

## Non-goals

- CLI and MCP server: embedding is `import`, images are `curl`. A thin wrapper
  over `@humation/core` can be added later if genuinely needed.
