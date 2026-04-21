import { panelStyle, primaryButtonLargeStyle, secondaryButtonLargeStyle } from "../styles";
import type { Entity, EntityTypeDefinition, RelationAutomationRule } from "../types";

type RelationSuggestion = {
  ruleId: string;
  sourceEntity: Entity;
  targetEntity: Entity;
  relationType: string;
  inverseType?: string;
  reason: string;
};

type AutomationStudioProps = {
  entityTypes: EntityTypeDefinition[];
  rules: RelationAutomationRule[];
  suggestions: RelationSuggestion[];
  onAddRule: () => void;
  onUpdateRule: (ruleId: string, patch: Partial<RelationAutomationRule>) => void;
  onDeleteRule: (ruleId: string) => void;
  onApplySuggestion: (suggestion: RelationSuggestion) => void;
  onApplyAllSuggestions: () => void;
};

export default function AutomationStudio({
  entityTypes,
  rules,
  suggestions,
  onAddRule,
  onUpdateRule,
  onDeleteRule,
  onApplySuggestion,
  onApplyAllSuggestions,
}: AutomationStudioProps) {
  return (
    <div
      style={{
        ...panelStyle,
        border: "1px solid #263244",
        boxShadow: "0 16px 40px rgba(0,0,0,0.18)",
        display: "grid",
        gap: 14,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0 }}>Automazioni relazioni</h2>
          <div style={{ marginTop: 6, color: "#9ca3af", fontSize: 13 }}>
            Regole configurabili che suggeriscono o generano connessioni dal lore.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" onClick={onAddRule} style={secondaryButtonLargeStyle}>
            Nuova regola
          </button>
          <button
            type="button"
            onClick={onApplyAllSuggestions}
            style={primaryButtonLargeStyle}
            disabled={suggestions.length === 0}
          >
            Applica suggerimenti
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        {rules.map((rule) => (
          <div
            key={rule.id}
            style={{
              borderRadius: 16,
              border: "1px solid rgba(148,163,184,0.16)",
              background: "rgba(15,23,42,0.7)",
              padding: 14,
              display: "grid",
              gap: 12,
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.2fr) repeat(2, minmax(140px, 1fr)) auto", gap: 10 }}>
              <input
                type="text"
                value={rule.label}
                onChange={(event) => onUpdateRule(rule.id, { label: event.target.value })}
                placeholder="Nome regola"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #374151",
                  background: "#0b1220",
                  color: "#f3f4f6",
                }}
              />

              <select
                value={rule.sourceEntityType}
                onChange={(event) => onUpdateRule(rule.id, { sourceEntityType: event.target.value })}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #374151",
                  background: "#0b1220",
                  color: "#f3f4f6",
                }}
              >
                <option value="all">Fonte: tutti i tipi</option>
                {entityTypes.map((type) => (
                  <option key={`src-${type.id}`} value={type.id}>
                    Fonte: {type.label}
                  </option>
                ))}
              </select>

              <select
                value={rule.targetEntityType}
                onChange={(event) => onUpdateRule(rule.id, { targetEntityType: event.target.value })}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #374151",
                  background: "#0b1220",
                  color: "#f3f4f6",
                }}
              >
                <option value="all">Target: tutti i tipi</option>
                {entityTypes.map((type) => (
                  <option key={`dst-${type.id}`} value={type.id}>
                    Target: {type.label}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => onDeleteRule(rule.id)}
                style={{
                  ...secondaryButtonLargeStyle,
                  padding: "10px 12px",
                }}
              >
                Elimina
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 10 }}>
              <input
                type="text"
                value={rule.sourceMetadataKey}
                onChange={(event) => onUpdateRule(rule.id, { sourceMetadataKey: event.target.value })}
                placeholder="Campo sorgente"
                style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #374151", background: "#0b1220", color: "#f3f4f6" }}
              />
              <input
                type="text"
                value={rule.targetMetadataKey}
                onChange={(event) => onUpdateRule(rule.id, { targetMetadataKey: event.target.value })}
                placeholder="Campo target"
                style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #374151", background: "#0b1220", color: "#f3f4f6" }}
              />
              <input
                type="text"
                value={rule.relationType}
                onChange={(event) => onUpdateRule(rule.id, { relationType: event.target.value })}
                placeholder="Relazione"
                style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #374151", background: "#0b1220", color: "#f3f4f6" }}
              />
              <input
                type="text"
                value={rule.inverseType ?? ""}
                onChange={(event) => onUpdateRule(rule.id, { inverseType: event.target.value })}
                placeholder="Inversa opzionale"
                style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #374151", background: "#0b1220", color: "#f3f4f6" }}
              />
              <select
                value={rule.mode ?? "suggest"}
                onChange={(event) => onUpdateRule(rule.id, { mode: event.target.value as "suggest" | "auto" })}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #374151", background: "#0b1220", color: "#f3f4f6" }}
              >
                <option value="suggest">Suggerisci</option>
                <option value="auto">Auto</option>
              </select>
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: 8, color: "#cbd5e1", fontSize: 14 }}>
              <input
                type="checkbox"
                checked={Boolean(rule.enabled)}
                onChange={(event) => onUpdateRule(rule.id, { enabled: event.target.checked })}
              />
              Regola attiva
            </label>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        <strong>Suggerimenti correnti</strong>
        {suggestions.length === 0 ? (
          <div style={{ color: "#9ca3af" }}>Nessun suggerimento disponibile con le regole attive.</div>
        ) : (
          suggestions.slice(0, 12).map((suggestion) => (
            <div
              key={`${suggestion.ruleId}:${suggestion.sourceEntity.id}:${suggestion.targetEntity.id}:${suggestion.relationType}`}
              style={{
                borderRadius: 14,
                border: "1px solid rgba(59,130,246,0.2)",
                background: "rgba(15,23,42,0.7)",
                padding: 12,
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "grid", gap: 4 }}>
                <div style={{ color: "#f8fafc", fontWeight: 700 }}>
                  {suggestion.sourceEntity.name} → {suggestion.relationType} → {suggestion.targetEntity.name}
                </div>
                <div style={{ color: "#94a3b8", fontSize: 13 }}>{suggestion.reason}</div>
              </div>
              <button type="button" onClick={() => onApplySuggestion(suggestion)} style={secondaryButtonLargeStyle}>
                Applica
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
