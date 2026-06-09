---
name: Canvas Context TypeScript Closure Fix
description: How to handle canvas getContext null-narrowing inside RAF animation loops
---

## Rule
Use `canvas.getContext("2d")!` (non-null assertion) when the ctx variable is used inside nested functions/closures called via requestAnimationFrame.

**Why:** TypeScript's control flow narrowing does not persist across closure boundaries for async callbacks. Even after `if (!ctx) return;`, TypeScript still considers `ctx` possibly null inside a nested `draw()` function passed to `requestAnimationFrame`. This causes TS18047 errors on every canvas call.

**How to apply:** Any new canvas component that uses an animation loop should follow the FuturisticBackground3D.tsx pattern:
```ts
const ctx = canvas.getContext("2d")!;
// skip null check — guaranteed non-null since canvas element exists
```
Guard at the outer level with `if (!canvas) return;` which is sufficient.
