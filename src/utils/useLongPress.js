import { useRef, useCallback } from 'react';

/**
 * Cross-platform long-press hook.
 * Fires onLongPress after `delay` ms of pressing (touch or mouse).
 * Also fires on right-click (contextmenu) on desktop.
 * Returns spreadable event handlers and an onClick wrapper that
 * suppresses click after a long press.
 */
export default function useLongPress(onLongPress, delay = 600) {
  const timerRef = useRef(null);
  const longPressedRef = useRef(false);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    longPressedRef.current = false;
    timerRef.current = setTimeout(() => {
      longPressedRef.current = true;
      onLongPress();
    }, delay);
  }, [onLongPress, delay]);

  const end = useCallback((e) => {
    clear();
    if (longPressedRef.current) {
      e?.preventDefault?.();
      e?.stopPropagation?.();
    }
  }, [clear]);

  const contextMenu = useCallback((e) => {
    e.preventDefault();
    clear();
    longPressedRef.current = true;
    onLongPress();
  }, [onLongPress, clear]);

  /** Wrap a user's onClick so it's suppressed after long press. */
  const wrapClick = useCallback((handler) => {
    return (e) => {
      if (longPressedRef.current) {
        longPressedRef.current = false;
        return;
      }
      handler?.(e);
    };
  }, []);

  return {
    handlers: {
      onTouchStart: start,
      onTouchMove: clear,
      onTouchEnd: end,
      onMouseDown: start,
      onMouseUp: end,
      onMouseLeave: clear,
      onContextMenu: contextMenu,
    },
    wrapClick,
  };
}
