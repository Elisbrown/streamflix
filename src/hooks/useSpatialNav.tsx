import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

interface SpatialNavContextValue {
  focusedSection: string | null;
  registerSection: (section: string) => void;
  registerElement: (el: HTMLElement, section: string) => () => void;
  closeOverlay?: () => void;
  setCloseOverlay: (cb: () => void) => void;
}

const SpatialNavContext = createContext<SpatialNavContextValue>({
  focusedSection: null,
  registerSection: () => {},
  registerElement: () => () => {},
  closeOverlay: undefined,
  setCloseOverlay: () => {},
});

interface FocusMemory {
  [section: string]: number;
}

export function SpatialNavProvider({ children, closeOverlay }: { children: React.ReactNode; closeOverlay?: () => void }) {
  const [focusedSection, setFocusedSection] = useState<string | null>(null);
  const navigate = useNavigate();
  const memoryRef = useRef<FocusMemory>({});
  const overlayRef = useRef<(() => void) | undefined>(closeOverlay);
  const sectionsRef = useRef<Set<string>>(new Set());
  const elementsRef = useRef<Map<string, HTMLElement[]>>(new Map());

  useEffect(() => {
    overlayRef.current = closeOverlay;
  }, [closeOverlay]);

  const registerSection = useCallback((section: string) => {
    sectionsRef.current.add(section);
  }, []);

  const registerElement = useCallback((el: HTMLElement, section: string) => {
    if (!elementsRef.current.has(section)) elementsRef.current.set(section, []);
    const arr = elementsRef.current.get(section)!;
    arr.push(el);
    // Sort by DOM order roughly
    arr.sort((a, b) => {
      const pos = a.compareDocumentPosition(b);
      return pos & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    });
    return () => {
      const arr2 = elementsRef.current.get(section);
      if (arr2) {
        const idx = arr2.indexOf(el);
        if (idx > -1) arr2.splice(idx, 1);
      }
    };
  }, []);

  const setCloseOverlay = useCallback((cb: () => void) => {
    overlayRef.current = cb;
  }, []);

  const getFocusablesInSection = useCallback((section: string): HTMLElement[] => {
    const arr = elementsRef.current.get(section) || [];
    return arr.filter((el) => {
      if (!document.body.contains(el)) return false;
      return true;
    });
  }, []);

  const getAllSections = useCallback((): string[] => {
    return Array.from(sectionsRef.current);
  }, []);

  const getNearest = useCallback(
    (fromEl: HTMLElement, direction: 'left' | 'right' | 'up' | 'down', section?: string) => {
      const rect = fromEl.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      const candidates: HTMLElement[] = [];
      if (section) {
        candidates.push(...getFocusablesInSection(section));
      } else {
        getAllSections().forEach((s) => candidates.push(...getFocusablesInSection(s)));
      }

      let best: HTMLElement | null = null;
      let bestScore = Infinity;

      for (const el of candidates) {
        if (el === fromEl) continue;
        const r = el.getBoundingClientRect();
        const ecx = r.left + r.width / 2;
        const ecy = r.top + r.height / 2;

        let dx = ecx - cx;
        let dy = ecy - cy;

        if (direction === 'left' && dx >= -10) continue; // must be to left
        if (direction === 'right' && dx <= 10) continue;
        if (direction === 'up' && dy >= -10) continue;
        if (direction === 'down' && dy <= 10) continue;

        const dist = Math.sqrt(dx * dx + dy * dy);
        const angleScore = Math.abs(Math.atan2(dy, dx) - {
          left: Math.PI, right: 0, up: -Math.PI / 2, down: Math.PI / 2
        }[direction]);
        const score = dist + angleScore * 50; // prioritize direction alignment

        if (score < bestScore) {
          bestScore = score;
          best = el;
        }
      }
      return best;
    },
    [getFocusablesInSection, getAllSections]
  );

  const moveFocus = useCallback(
    (direction: 'left' | 'right' | 'up' | 'down', currentSection?: string) => {
      const currentSectionVal = currentSection || focusedSection;
      const activeEl = document.querySelector('[data-focused="true"]') as HTMLElement | null;
      const startEl = activeEl || document.activeElement as HTMLElement | null;
      if (!startEl) return;

      let target = getNearest(startEl, direction, currentSectionVal || undefined);
      if (!target) {
        // Try across all sections
        target = getNearest(startEl, direction);
      }
      if (target) {
        target.focus();
        target.setAttribute('data-focused', 'true');
        target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
        // Determine section of target
        const sectionAttr = target.getAttribute('data-nav-section');
        if (sectionAttr) {
          setFocusedSection(sectionAttr);
          const arr = getFocusablesInSection(sectionAttr);
          const idx = arr.indexOf(target);
          if (idx > -1) memoryRef.current[sectionAttr] = idx;
        } else if (currentSectionVal) {
          setFocusedSection(currentSectionVal);
        }
      }
    },
    [focusedSection, getNearest, getFocusablesInSection]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const focused = document.querySelector('[data-focused="true"]') as HTMLElement | null;
      const activeEl = focused || document.activeElement;
      const sectionAttr = activeEl?.getAttribute('data-nav-section') || focused?.getAttribute('data-nav-section');
      const currentSection = sectionAttr || focusedSection || null;

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        moveFocus('up', currentSection || undefined);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        moveFocus('down', currentSection || undefined);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        moveFocus('left', currentSection || undefined);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        moveFocus('right', currentSection || undefined);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (focused) {
          focused.click();
        } else if (activeEl && (activeEl as HTMLElement).click) {
          (activeEl as HTMLElement).click();
        }
      } else if (e.key === 'Backspace') {
        // Try modal close first
        if (overlayRef.current) {
          overlayRef.current();
        } else {
          navigate(-1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [moveFocus, focusedSection, navigate]);

  // Initialize focus on mount
  useEffect(() => {
    const first = document.querySelector('[data-focusable]') as HTMLElement | null;
    if (first) {
      first.setAttribute('data-focused', 'true');
      first.focus({ preventScroll: true });
      const sec = first.getAttribute('data-nav-section');
      if (sec) setFocusedSection(sec);
    }
  }, []);

  return (
    <SpatialNavContext.Provider
      value={{
        focusedSection,
        registerSection,
        registerElement,
        closeOverlay,
        setCloseOverlay,
      }}
    >
      {children}
    </SpatialNavContext.Provider>
  );
}

export function useSpatialNav() {
  return useContext(SpatialNavContext);
}
