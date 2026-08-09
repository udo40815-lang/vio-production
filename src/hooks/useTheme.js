import { useState, useEffect, useCallback } from 'react';

export function useTheme(initialDark) {
  const [dark, setDark] = useState(initialDark ?? (
    typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
  ));
  const toggle = useCallback(() => setDark(d => !d), []);
  return [dark, toggle];
}
