import { useEffect, useRef, useState } from "react";
import {
  readPersistedValue,
  writePersistedValue,
} from "../utils/persistentStorage";

export function useLocalStorageState<T>(key: string, initialValue: T) {
  const hasHydratedRef = useRef(false);
  const [state, setState] = useState<T>(() => {
    const saved = window.localStorage.getItem(key);
    if (!saved) return initialValue;

    try {
      const parsed = JSON.parse(saved);
      return parsed ?? initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const persisted = await readPersistedValue<T>(key);
        if (cancelled) return;

        if (typeof persisted !== "undefined") {
          setState(persisted);

          try {
            window.localStorage.setItem(key, JSON.stringify(persisted));
          } catch {
            // local mirror is optional
          }
        }
      } catch (error) {
        console.error(error);
      } finally {
        if (!cancelled) {
          hasHydratedRef.current = true;
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [key]);

  useEffect(() => {
    if (!hasHydratedRef.current) return;

    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.error(error);
      if (error instanceof DOMException && error.name === "QuotaExceededError") {
        window.alert(
          "Spazio locale esaurito: il progetto è troppo grande per il salvataggio rapido nel browser. Prova a esportare un backup o alleggerire i dati più pesanti."
        );
      }
    }

    void writePersistedValue(key, state).catch((error) => {
      console.error(error);
    });
  }, [key, state]);

  return [state, setState] as const;
}
