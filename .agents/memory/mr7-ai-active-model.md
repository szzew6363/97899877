---
name: Active Model State Location
description: Where the currently selected AI model name is stored in AppState
---

## Rule
The active model name lives at `state.activeModel` (top-level AppState), not inside `state.settings`.

**Why:** When implementing components that need the current model (e.g. token counter context window lookup), reading `state.settings.model` causes a TypeScript error because no such field exists.

**How to apply:**
- Read model: `const model = state.activeModel;`
- Dispatch change: `dispatch({ type: "SET_MODEL", model: newId })`
- Look up AI_MODELS: `AI_MODELS.find(m => m.id === state.activeModel)`
