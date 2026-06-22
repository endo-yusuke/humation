# Humation OSS Manifest

This document defines the first OSS manifest shape for Humation avatar packages.
The goal is to keep public part identity stable while allowing UI grouping,
categories, layer structure, and aliases to evolve.

## Design Rules

- `PartOption.id` is the canonical public identity. It must not encode the
  current UI category.
- `alias` is optional, human-facing, and can be deprecated or redirected.
- `SelectionSlot` defines mutually exclusive choices such as `head`, `body`,
  or `item`.
- `UiGroup` defines picker/navigation grouping. It can change without changing
  part IDs.
- `LayerFragment` defines actual SVG insertion. One selected part can render
  zero, one, or many layer fragments.
- Seed and deterministic generation must normalize aliases to canonical IDs
  before hashing or rendering.
- Public OSS rendering uses CSS custom properties for colors. Inline color
  materialization is allowed only in tests or compatibility tooling, not as a
  public output mode.

## Canonical IDs

Use opaque-but-readable IDs scoped to the template:

```txt
hm1-p-000001
hm1-p-000002
hm1-p-000023
```

Recommended format:

```txt
{templateShortId}-p-{zeroPaddedSequence}
```

Examples:

- `hm1-p-000023` for `humation-1`
- `hm2-p-000023` for a future `humation-2`

The old numeric IDs from the current API remain valid source IDs during the
migration, but OSS consumers should receive canonical IDs in manifests.

## Manifest Shape

```ts
type HumationManifest = {
  schemaVersion: "1.0";
  template: {
    id: string;
    shortId: string;
    name: string;
    version: string;
    license: string;
  };
  defaults: {
    selections: Record<SelectionSlotId, PartOptionId>;
    colors: Record<ColorSlotId, HexColor>;
    background: HexColor | "transparent";
    crop: CropId;
  };
  colors: ColorSlot[];
  crops: Record<CropId, ViewBox>;
  selectionSlots: SelectionSlot[];
  uiGroups: UiGroup[];
  layerSlots: LayerSlot[];
  parts: PartOption[];
  aliases: AliasEntry[];
};

type SelectionSlotId = string;
type PartOptionId = string;
type ColorSlotId = string;
type LayerSlotId = string;
type UiGroupId = string;
type CropId = string; // published manifests expose "avatar"
type HexColor = string;

type ViewBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type ColorSlot = {
  id: ColorSlotId;
  label: string;
  default: HexColor;
  cssVariable: `--hm-${string}`;
  allowTransparent?: boolean;
};

type SelectionSlot = {
  id: SelectionSlotId;
  label: string;
  defaultPart: PartOptionId;
  allowsEmpty?: boolean;
  exclusive: true;
};

type UiGroup = {
  id: UiGroupId;
  label: string;
  order: number;
  selectionSlots: SelectionSlotId[];
  partIds?: PartOptionId[];
};

type LayerSlot = {
  id: LayerSlotId;
  label: string;
  order: number;
  offset: { x: number; y: number };
  size: { width: number; height: number };
  hidden?: boolean;
};

type PartOption = {
  id: PartOptionId;
  source?: {
    groupId?: string;
    partId?: string;
  };
  // Unique within the part's selection slot (e.g. 'braids', 'hoodie').
  // Doubles as the display label; UIs derive presentation from it.
  // Resolvable in selections via the generated `${slot}-${name}` alias.
  name?: string;
  aliases?: string[];
  selectionSlot: SelectionSlotId;
  uiGroups: UiGroupId[];
  layers: LayerFragment[];
  tags?: string[];
  deprecated?: boolean;
};

// Color binding is explicit in the SVG source: recolorable regions
// reference CSS variables with default-color fallbacks, e.g.
// fill="var(--hm-hair, #000000)". Regions without variable references
// are color-fixed by construction (accessory fills bind only their
// outlines to the stroke slot).
type LayerFragment = {
  layerSlot: LayerSlotId;
  svgPath: string;
  svg?: string; // PoC-only in-memory source; omit from published manifest.
  transform?: string;
};

type AliasEntry = {
  alias: string;
  targetId: PartOptionId;
  status: "active" | "deprecated";
  replacementAlias?: string;
};
```

## Example: Single-Layer Part

```json
{
  "id": "hm1-p-000023",
  "source": {
    "groupId": "head",
    "partId": "023"
  },
  "aliases": ["head-wavy-long"],
  "name": "wavy-long",
  "selectionSlot": "head",
  "uiGroups": ["head"],
  "layers": [
    {
      "layerSlot": "head",
      "svgPath": "assets/humation-1/head/023.svg"
    }
  ]
}
```

The referenced SVG carries its own color bindings, e.g.
`<path fill="var(--hm-hair, #000000)" .../>`. Marker colors used by the
artist in the source design are converted before publication; published
assets contain CSS variables directly.

## Example: Multi-Layer Part

Zo is not part of the initial OSS release, but it is the model for a single
selection that affects multiple visual layers.

```json
{
  "id": "hm1-p-000071",
  "source": {
    "groupId": "item",
    "partId": "zo-like-example"
  },
  "aliases": ["item-zo-like-example"],
  "selectionSlot": "item",
  "uiGroups": ["items"],
  "layers": [
    {
      "layerSlot": "accessory-back",
      "svgPath": "assets/humation-1/item/zo-like-back.svg"
    },
    {
      "layerSlot": "accessory-front",
      "svgPath": "assets/humation-1/item/zo-like-front.svg"
    }
  ]
}
```

This keeps the user selection stable while allowing the renderer to place SVG
fragments at different z positions.

## Alias Resolution

All render inputs are resolved before rendering:

```ts
function resolvePartId(input: string, manifest: HumationManifest) {
  if (manifest.parts.some((part) => part.id === input)) return input;

  const alias = manifest.aliases.find((entry) => entry.alias === input);
  if (alias) return alias.targetId;

  throw new Error(`Unknown part: ${input}`);
}
```

Rules:

- Canonical IDs always win over aliases.
- Aliases must be unique inside one template manifest.
- Deprecated aliases must continue resolving until the next major version.
- Every part exposes exactly one `${slot}-${name}` alias; renames add a new
  alias and deprecate the old one.

## Rendering Contract

The renderer should:

1. Resolve every selected part to a canonical `PartOption.id`.
2. Fill omitted selection slots from `defaults.selections`.
3. Expand selected parts into `LayerFragment[]`.
4. Sort fragments by `layerSlots[].order`.
5. Apply `layerSlot.offset` and fragment `transform`.
6. Colors bind through CSS variables embedded in the SVG sources, e.g.
   `fill="var(--hm-hair, #000000)"` (the fallback is the default color, so
   assets render correctly standalone). The renderer only sets variable
   values on the root element. Color slots are
   role-named (`hair`, `clothes`, `bottom`, `skin`, `stroke`, `background`) so
   they never collide with selection slots like `head` and `body`.
7. Emit deterministic SVG with stable `data-hm-*` attributes.

Recommended output attributes:

```xml
<g
  data-hm-layer-slot="head"
  data-hm-part-id="hm1-p-000023"
  data-hm-selection-slot="head"
  data-hm-source-group-id="head"
  data-hm-source-part-id="023"
>
```

## Migration From an Existing Avatar API

If you are migrating an existing avatar system, its concepts usually map to
the Humation manifest like this:

| Existing API              | Humation manifest                                                          |
| ------------------------- | -------------------------------------------------------------------------- |
| `groups[].id`             | `selectionSlots[].id` initially                                            |
| `groups[].parts[].id`     | `parts[].source.partId`                                                    |
| `groups[].order`          | `layerSlots[].order`                                                       |
| `groups[].offset`         | `layerSlots[].offset`                                                      |
| `groups[].size`           | `layerSlots[].size`                                                        |
| `colors[].id`             | `colors[].id`, renamed to role names (`head` → `hair`, `body` → `clothes`) |
| `render.svg` query params | `createAvatar({ selections, colors })`                                     |

Generate canonical IDs by walking the current source metadata
order and assigning `hm1-p-000001`, `hm1-p-000002`, and so on. Do not use layer
render order for ID assignment; render order may change independently from part
identity. The original numeric IDs are recorded in `source.partId`; the
public vocabulary is the per-slot part name (exposed as the
`${slot}-${name}` alias), and canonical IDs are the stable persistence
format.

## Initial Scope

The first OSS manifest should include only `humation-1`.

Out of scope for the initial manifest:

- Zo assets or collaboration-specific templates
- Semantic alias naming
- animation behavior
- CLI or MCP metadata
- remote asset loading

## Package Strategy

Humation follows a Lucide-style runtime package split:

```txt
@humation/core
  framework-independent renderer, manifest types, alias resolution, validation

@humation/assets-humation-1
  Humation 1 manifest.json, assets/**/*.svg, and an embedded manifest export

@humation/react / @humation/web-component
  future framework adapters that call @humation/core
```

This keeps the engine independent from template assets and lets each template
own its versioning, license, and release cadence. A shadcn-style registry or
skills layer can be added later for installable snippets, examples, and AI
instructions, but it should not replace the npm runtime packages.

Current package build checks:

```sh
bun run build:packages
bun run test
```

`build:packages` emits `dist` for the runtime packages.

## Manifest and Asset Generation

Ownership is split by responsibility:

```txt
packages/core
  pure manifest types, createAvatar(), alias resolution, validation

packages/assets-humation-1
  Humation 1 manifest.json, SVG assets, and embedded manifest exports
```

`manifest.json`, `assets/**/*.svg`, `src/embedded.ts`, `src/manifest-json.ts`,
and `src/manifest.ts` in `packages/assets-humation-1` are generated snapshots.
Update them together so raw SVGs and embedded manifests stay in sync.

The exported JSON intentionally omits PoC-only embedded `layers[].svg` values
and keeps only `svgPath`. The embedded manifest module (`src/embedded.ts`)
carries the inline SVG strings instead, so consumers can render without any
file I/O.
