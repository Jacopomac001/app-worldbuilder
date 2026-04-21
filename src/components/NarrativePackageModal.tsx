import { useMemo, useState } from "react";
import { panelStyle, primaryButtonLargeStyle, secondaryButtonLargeStyle } from "../styles";
import type { Entity } from "../types";

type NarrativePackageModalProps = {
  open: boolean;
  entities: Entity[];
  onClose: () => void;
  onExport: (params: {
    packageType: "region" | "storyline" | "faction" | "cast";
    seed: string;
    label: string;
  }) => void;
};

export default function NarrativePackageModal({
  open,
  entities,
  onClose,
  onExport,
}: NarrativePackageModalProps) {
  const [packageType, setPackageType] = useState<"region" | "storyline" | "faction" | "cast">("region");
  const [seed, setSeed] = useState("");
  const [label, setLabel] = useState("");

  const candidates = useMemo(() => {
    if (packageType === "faction") {
      return entities.filter((entity) => entity.type === "fazione");
    }

    if (packageType === "cast") {
      return entities.filter((entity) => entity.type === "personaggio");
    }

    return entities;
  }, [entities, packageType]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 110,
        background: "rgba(2,6,23,0.76)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          ...panelStyle,
          width: "min(760px, 100%)",
          display: "grid",
          gap: 16,
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>Esporta pacchetto narrativo</h2>
          <div style={{ marginTop: 6, color: "#9ca3af" }}>
            Ritaglia una parte del mondo da riusare in altre campagne o dataset.
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
          <select
            value={packageType}
            onChange={(event) => setPackageType(event.target.value as "region" | "storyline" | "faction" | "cast")}
            style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #374151", background: "#0b1220", color: "#f3f4f6" }}
          >
            <option value="region">Regione</option>
            <option value="storyline">Storyline</option>
            <option value="faction">Fazione</option>
            <option value="cast">Cast</option>
          </select>

          <select
            value={seed}
            onChange={(event) => setSeed(event.target.value)}
            style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #374151", background: "#0b1220", color: "#f3f4f6" }}
          >
            <option value="">Seleziona seed</option>
            {candidates.map((entity) => (
              <option key={entity.id} value={entity.id}>
                {entity.name}
              </option>
            ))}
          </select>

          <input
            type="text"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="Nome pacchetto"
            style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #374151", background: "#0b1220", color: "#f3f4f6" }}
          />
        </div>

        <div style={{ color: "#cbd5e1", lineHeight: 1.6 }}>
          Il pacchetto include il seed scelto, le relazioni collegate e le entità adiacenti coerenti con il tipo di pacchetto. Poi puoi reimportarlo via merge assistito.
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
          <button type="button" onClick={onClose} style={secondaryButtonLargeStyle}>
            Chiudi
          </button>
          <button
            type="button"
            onClick={() => onExport({ packageType, seed, label })}
            style={primaryButtonLargeStyle}
            disabled={!seed || !label.trim()}
          >
            Esporta pacchetto
          </button>
        </div>
      </div>
    </div>
  );
}
