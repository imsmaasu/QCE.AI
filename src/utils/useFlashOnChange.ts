import { useEffect, useRef, useState } from 'react';

/**
 * Returns true for 600ms whenever the observed value changes,
 * skipping the initial component render.
 */
export function useFlashOnChange(value: unknown): boolean {
  const [flashing, setFlashing] = useState(false);
  const isFirstRender = useRef(true);
  const prevValue = useRef(value);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevValue.current = value;
      return;
    }

    if (prevValue.current !== value) {
      prevValue.current = value;
      setFlashing(true);
      const timer = setTimeout(() => {
        setFlashing(false);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [value]);

  return flashing;
}
