// `humation1` is the primary export: the Humation 1 asset set with embedded
// SVG strings, ready to hand to createAvatar / <Avatar assets={...}>.
// `manifest` stays as a spec-vocabulary alias of the same object.
export { default, manifest as humation1, manifest } from './embedded.js';
export {
  default as manifestJson,
  manifestJson as rawManifest,
} from './manifest-json.js';
