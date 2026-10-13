import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    __heReloadLocks?: number;
  }
}

function acquire() {
  window.__heReloadLocks = (window.__heReloadLocks ?? 0) + 1;
}

function release() {
  window.__heReloadLocks = Math.max(0, (window.__heReloadLocks ?? 1) - 1);
  window.dispatchEvent(new Event('he-reload-locks-changed'));
}

export default function useReloadLock(active: boolean) {
  const locked = useRef(false);

  useEffect(() => {
    if (active && !locked.current) {
      locked.current = true;
      acquire();
    } else if (!active && locked.current) {
      locked.current = false;
      release();
    }
    return () => {
      if (locked.current) {
        locked.current = false;
        release();
      }
    };
  }, [active]);
}
