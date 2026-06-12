---
name: mr7-ai streaming throttle
description: ChatView onChunk must be throttled — dispatching PATCH_MSG on every token causes full app rerenders and freezes.
---

# Rule
The `onChunk` callback inside `callModel()` in `ChatView.tsx` must throttle PATCH_MSG dispatches to at most once per ~48ms. Use a `flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)` added to the component's refs.

**Why:** The global StoreProvider context wraps the entire app. Every PATCH_MSG triggers a full reconciliation of the ~3000-line ChatView tree. With parallel streaming (Council/Godmode) or fast models, onChunk fires 20-50x/second — this saturates the main thread and freezes the UI.

**How to apply:**
```typescript
if (flushTimerRef.current) return; // accumulate
flushTimerRef.current = setTimeout(() => {
  flushTimerRef.current = null;
  dispatch({ type: "PATCH_MSG", ... });
}, 48);
```
Always clear flushTimerRef and do a final forced dispatch in the `finally` block to avoid dropping the last chunk of a stream.
