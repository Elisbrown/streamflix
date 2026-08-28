import React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

type Direction = 'left' | 'right' | 'up' | 'down';

interface SpatialNavContextValue {
  focusedSection: string | null;
  registerSection: (section: string) => void;
  registerElement: (el: HTMLElement, section: string) => () => void;
  closeOverlay?: () => void;
  setCloseOverlay: (cb: () => void) => void;
}

const SpatialNavContext = React.createContext<SpatialNavContextValue>({
  focusedSection: null,
  registerSection: () => {},
  registerElement: () => () => {},
  closeOverlay: undefined,
  setCloseOverlay: () => {},
});

interface FocusMemory {
  [key: string]: string;
}

/*
 * webOS TV 6 navigation layer.
 *
 * The previous implementation kept multiple elements marked data-focused="true"
 * and searched the whole DOM for the first one. After React route changes that
 * stale element could remain detached/hidden, making the remote appear dead.
 *
 * This implementation has exactly one focused element at a time and computes
 * spatial neighbours from the elements currently rendered on screen.
 */
export function SpatialNavProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [focusedSection, setFocusedSection] = useState<string | null>(null);
  const memoryRef = useRef<FocusMemory>({});
  const closeOverlayRef = useRef<(() => void) | null>(null);
  const lastRouteRef = useRef(location.key);
  const focusRequestRef = useRef<number | null>(null);

  const registerSection = useCallback((_section: string) => {}, []);

  const registerElement = useCallback((_el: HTMLElement, _section: string) => {
    return () => {};
  }, []);

  const setCloseOverlay = useCallback((cb: () => void) => {
    closeOverlayRef.current = cb;
  }, []);

  const isVisible = (el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    return (
      document.body.contains(el) &&
      !el.hasAttribute('disabled') &&
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      Number(style.opacity || 1) > 0 &&
      r.width > 0 &&
      r.height > 0
    );
  };

  const getFocusables = useCallback((): HTMLElement[] => {
    return Array.from(document.querySelectorAll<HTMLElement>('[data-focusable]'))
      .filter(isVisible);
  }, []);

  const setFocus = useCallback((el: HTMLElement | null, scroll = true) => {
    if (!el || !isVisible(el)) return false;

    document.querySelectorAll<HTMLElement>('[data-focused="true"]').forEach((node) => {
      node.removeAttribute('data-focused');
    });

    el.setAttribute('data-focused', 'true');
    try {
      el.focus({ preventScroll: true });
    } catch {
      el.focus();
    }

    const section = el.getAttribute('data-nav-section');
    if (section) {
      setFocusedSection(section);
      memoryRef.current[section] = el.getAttribute('data-nav-id') || '';
    }

    if (scroll) {
      try {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      } catch {
        el.scrollIntoView();
      }
    }

    return true;
  }, []);

  const currentElement = useCallback(() => {
    const marked = document.querySelector<HTMLElement>('[data-focused="true"]');
    if (marked && isVisible(marked)) return marked;
    const active = document.activeElement as HTMLElement | null;
    if (active && active.matches?.('[data-focusable]') && isVisible(active)) return active;
    return null;
  }, []);

  const chooseNearest = useCallback((from: HTMLElement, direction: Direction) => {
    const fr = from.getBoundingClientRect();
    const fx = fr.left + fr.width / 2;
    const fy = fr.top + fr.height / 2;
    const candidates = getFocusables().filter((el) => el !== from);

    let best: HTMLElement | null = null;
    let bestScore = Number.POSITIVE_INFINITY;

    for (const el of candidates) {
      const r = el.getBoundingClientRect();
      const x = r.left + r.width / 2;
      const y = r.top + r.height / 2;
      const dx = x - fx;
      const dy = y - fy;

      if (direction === 'left' && dx >= -2) continue;
      if (direction === 'right' && dx <= 2) continue;
      if (direction === 'up' && dy >= -2) continue;
      if (direction === 'down' && dy <= 2) continue;

      const primary = direction === 'left' || direction === 'right' ? Math.abs(dx) : Math.abs(dy);
      const secondary = direction === 'left' || direction === 'right' ? Math.abs(dy) : Math.abs(dx);

      // Strongly prefer elements on the same visual row/column. This prevents
      // a navbar button from stealing focus from a nearby movie card.
      const score = primary + secondary * 2.5;

      if (score < bestScore) {
        bestScore = score;
        best = el;
      }
    }

    return best;
  }, [getFocusables]);

  const moveFocus = useCallback((direction: Direction) => {
    const from = currentElement();
    if (!from) {
      const first = getFocusables()[0];
      if (first) setFocus(first);
      return;
    }

    const target = chooseNearest(from, direction);
    if (target) {
      setFocus(target);
      return;
    }

    // At the top of a page, ↑ moves to the navbar.
    if (direction === 'up') {
      const nav = getFocusables().filter((el) => el.getAttribute('data-nav-section') === 'navbar');
      if (nav.length) {
        const fr = from.getBoundingClientRect();
        const fx = fr.left + fr.width / 2;
        const nearest = nav.reduce((a, b) => {
          const ax = Math.abs(a.getBoundingClientRect().left + a.getBoundingClientRect().width / 2 - fx);
          const bx = Math.abs(b.getBoundingClientRect().left + b.getBoundingClientRect().width / 2 - fx);
          return ax <= bx ? a : b;
        });
        setFocus(nearest);
      }
    }
  }, [chooseNearest, currentElement, getFocusables, setFocus]);

  const handleBack = useCallback(() => {
    if (closeOverlayRef.current) {
      const close = closeOverlayRef.current;
      closeOverlayRef.current = null;
      close();
      return;
    }

    if (location.pathname !== '/' || window.history.length > 1) {
      navigate(-1);
    }
  }, [location.pathname, navigate]);

  // Magic Remote pointer support: when the LG pointer hovers a focusable
  // element, make that element the single logical focus target too. This keeps
  // pointer and 5-way navigation in the same focus model.
  useEffect(() => {
    const onPointerOver = (event: MouseEvent) => {
      const target = (event.target as HTMLElement | null)?.closest?.('[data-focusable]') as HTMLElement | null;
      if (target && isVisible(target)) setFocus(target, false);
    };
    const onPointerDown = (event: MouseEvent) => {
      const target = (event.target as HTMLElement | null)?.closest?.('[data-focusable]') as HTMLElement | null;
      if (target && isVisible(target)) setFocus(target, false);
    };
    document.addEventListener('mouseover', onPointerOver, true);
    document.addEventListener('mousedown', onPointerDown, true);
    return () => {
      document.removeEventListener('mouseover', onPointerOver, true);
      document.removeEventListener('mousedown', onPointerDown, true);
    };
  }, [setFocus]);

  useEffect(() => {
    const keyCodes: Record<number, string> = {
      37: 'ArrowLeft',
      38: 'ArrowUp',
      39: 'ArrowRight',
      40: 'ArrowDown',
      13: 'Enter',
      461: 'Back',
      10009: 'Back',
      8: 'Back',
      27: 'Back',
      10082: 'Exit',
      10252: 'MediaPlayPause',
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const key = keyCodes[event.keyCode] || event.key;

      // Never steal normal text editing keys from an input.
      const target = event.target as HTMLElement | null;
      const isTextInput =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.getAttribute('contenteditable') === 'true';

      if (key === 'Back' || key === 'Exit') {
        event.preventDefault();
        event.stopPropagation();
        handleBack();
        return;
      }

      if (isTextInput && (key === 'ArrowLeft' || key === 'ArrowRight')) return;

      if (key === 'ArrowLeft' || key === 'ArrowRight' || key === 'ArrowUp' || key === 'ArrowDown') {
        event.preventDefault();
        event.stopPropagation();
        moveFocus(key.replace('Arrow', '').toLowerCase() as Direction);
        return;
      }

      if (key === 'Enter') {
        event.preventDefault();
        event.stopPropagation();
        const focused = currentElement();
        if (!focused) return;

        if (focused.tagName === 'INPUT' || focused.tagName === 'TEXTAREA') {
          const form = focused.closest('form') as HTMLFormElement | null;
          if (form) {
            const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
            form.dispatchEvent(submitEvent);
          }
          return;
        }

        focused.click();
      }
    };

    window.addEventListener('keydown', onKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true });
  }, [currentElement, handleBack, moveFocus]);

  // Every route/render gets a fresh, valid focus target. We restore by data-nav-id
  // when possible; otherwise use the first visible target on that screen.
  useEffect(() => {
    if (focusRequestRef.current) window.clearTimeout(focusRequestRef.current);

    focusRequestRef.current = window.setTimeout(() => {
      const focusables = getFocusables();
      if (!focusables.length) return;

      const saved = memoryRef.current[focusedSection || ''];
      const remembered = saved
        ? focusables.find((el) => el.getAttribute('data-nav-id') === saved)
        : null;

      const routeChanged = lastRouteRef.current !== location.key;
      const candidate = remembered || (routeChanged
        ? focusables.find((el) => el.getAttribute('data-nav-section') === 'navbar') || focusables[0]
        : currentElement() || focusables[0]);

      setFocus(candidate, false);
      lastRouteRef.current = location.key;
    }, 50);

    return () => {
      if (focusRequestRef.current) window.clearTimeout(focusRequestRef.current);
    };
  }, [location.pathname, location.search, getFocusables, setFocus, currentElement, focusedSection]);

  return (
    <SpatialNavContext.Provider
      value={{
        focusedSection,
        registerSection,
        registerElement,
        closeOverlay: closeOverlayRef.current || undefined,
        setCloseOverlay,
      }}
    >
      {children}
    </SpatialNavContext.Provider>
  );
}

export function useSpatialNav() {
  return React.useContext(SpatialNavContext);
}

import React from 'react';
