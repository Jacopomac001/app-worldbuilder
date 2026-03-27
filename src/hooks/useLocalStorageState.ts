import { useEffect, useState } from "react";

export function useLocalStorageState<T>(key: string, initialValue: T) {
  const [state, setState] = useState<T>(() => {
    const saved = localStorage.getItem(key);
    if (!saved) return initialValue;

    try {
      const parsed = JSON.parse(saved);
      return parsed ?? initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.error(error);
      if (error instanceof DOMException && error.name === "QuotaExceededError") {
        window.alert("Spazio locale esaurito: l'immagine è troppo pesante per essere salvata nel browser. Prova con un file più leggero.");
      }
    }
  }, [key, state]);

  return [state, setState] as const;
}