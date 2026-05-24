# 0.1.0

- v14 only
- [Fixed] Checkbox label not functional — now properly linked to input via `for` attribute.
- [Fixed] CSS leak risk — class names no longer risk collision with other modules via unique prefixing and structure.
- [Fixed] Container checkbox misaligned — now matches native fieldset layout (label left, input right, single line).
- [Added] CSS variables for module accent colors (`--dh-containers-color-expanded`, `--dh-containers-color-collapsed`) for easier theming.
- [Added] `scripts/constants.js` — MODULE_ID and CONTAINABLE_TYPES now centralized for maintainability.
- [Changed] Replaced inline styles with CSS classes (`.dh-item-hidden` for visibility toggling, icon margin now in stylesheet).
- [Changed] CSS refactored with native nesting; color values now use CSS variables.

