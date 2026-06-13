/**
 * RAF-based render batcher — batches rapid state updates to one per animation frame.
 * Non-invasive: wraps any callback, no React changes needed.
 */
export function createRAFBatcher<T>(
  onFlush: (latest: T) => void,
): { push: (val: T) => void; flush: (latest: T) => void; cancel: () => void } {
  let rafId: number | null = null;
  let pending: T | null = null;

  function flush(latest: T) {
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
    pending = null;
    onFlush(latest);
  }

  function push(val: T) {
    pending = val;
    if (rafId !== null) return;
    rafId = requestAnimationFrame(() => {
      rafId = null;
      if (pending !== null) { const p = pending; pending = null; onFlush(p); }
    });
  }

  function cancel() {
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
    pending = null;
  }

  return { push, flush, cancel };
}

/**
 * Throttle any function to fire at most once per minMs window.
 * Uses performance.now() for precision.
 */
export function createThrottle<T extends unknown[]>(
  fn: (...args: T) => void,
  minMs: number,
): { call: (...args: T) => void; flush: (...args: T) => void } {
  let last = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  function call(...args: T) {
    const now = performance.now();
    if (now - last >= minMs) { last = now; fn(...args); return; }
    if (timer) return;
    timer = setTimeout(() => {
      timer = null; last = performance.now(); fn(...args);
    }, minMs - (now - last));
  }

  function flush(...args: T) {
    if (timer) { clearTimeout(timer); timer = null; }
    last = performance.now(); fn(...args);
  }

  return { call, flush };
}
