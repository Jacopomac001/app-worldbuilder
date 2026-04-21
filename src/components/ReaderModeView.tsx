import { panelStyle, secondaryButtonLargeStyle } from "../styles";
import type { Entity, EntityTypeDefinition, Relation, SemanticViewId } from "../types";
import { getEntityTypeLabel, getTypeColor } from "../utils/entity";

type ReaderModeViewProps = {
  entityTypes: EntityTypeDefinition[];
  entities: Entity[];
  relations: Relation[];
  selectedEntity: Entity | null;
  semanticView: SemanticViewId;
  onBack: () => void;
  onSelectEntity: (id: string) => void;
};

export default function ReaderModeView({
  entityTypes,
  entities,
  relations,
  selectedEntity,
  semanticView,
  onBack,
  onSelectEntity,
}: ReaderModeViewProps) {
  const highlightedRelations = selectedEntity
    ? relations.filter(
        (relation) =>
          relation.fromEntityId === selectedEntity.id || relation.toEntityId === selectedEntity.id
      )
    : [];

  const relatedEntities = highlightedRelations
    .map((relation) =>
      entities.find((entity) =>
        entity.id === (relation.fromEntityId === selectedEntity?.id ? relation.toEntityId : relation.fromEntityId)
      )
    )
    .filter((entity): entity is Entity => Boolean(entity))
    .slice(0, 8);

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: 24,
        background: "linear-gradient(180deg, #ede7d8 0%, #f8f4eb 100%)",
        color: "#1f2937",
        boxSizing: "border-box",
      }}
    >
      <div style={{ maxWidth: 1180, margin: "0 auto", display: "grid", gap: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "#6b7280" }}>
              Campaign mode
            </div>
            <h1 style={{ margin: "6px 0 0 0", fontSize: 34 }}>
              {selectedEntity?.name ?? "Consultazione del mondo"}
            </h1>
            <div style={{ marginTop: 6, color: "#4b5563" }}>
              Vista semantica: {semanticView}
            </div>
          </div>

          <button type="button" onClick={onBack} style={secondaryButtonLargeStyle}>
            Torna al workspace
          </button>
        </div>

        {selectedEntity ? (
          <div
            style={{
              ...panelStyle,
              background: "rgba(255,255,255,0.86)",
              color: "#1f2937",
              border: "1px solid rgba(148,163,184,0.18)",
            }}
          >
            <div style={{ display: "grid", gap: 18 }}>
              <div style={{ display: "grid", gap: 8 }}>
                <div
                  style={{
                    display: "inline-flex",
                    width: "fit-content",
                    padding: "6px 10px",
                    borderRadius: 999,
                    background: `${getTypeColor(selectedEntity.type, entityTypes)}22`,
                    color: getTypeColor(selectedEntity.type, entityTypes),
                    fontWeight: 700,
                  }}
                >
                  {getEntityTypeLabel(selectedEntity.type, entityTypes)}
                </div>
                <div style={{ fontSize: 18, lineHeight: 1.7 }}>
                  {selectedEntity.shortDescription || "Nessuna introduzione disponibile."}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 18 }}>
                <div
                  style={{
                    borderRadius: 16,
                    border: "1px solid rgba(148,163,184,0.18)",
                    background: "rgba(255,255,255,0.72)",
                    padding: 18,
                  }}
                >
                  <h2 style={{ marginTop: 0 }}>Lore</h2>
                  <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.8, color: "#374151" }}>
                    {selectedEntity.notes || "Nessuna nota disponibile."}
                  </div>
                </div>

                <div style={{ display: "grid", gap: 14 }}>
                  <div
                    style={{
                      borderRadius: 16,
                      border: "1px solid rgba(148,163,184,0.18)",
                      background: "rgba(255,255,255,0.72)",
                      padding: 16,
                    }}
                  >
                    <strong>Tag</strong>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                      {selectedEntity.tags.length > 0 ? selectedEntity.tags.map((tag) => (
                        <span
                          key={tag}
                          style={{
                            padding: "6px 10px",
                            borderRadius: 999,
                            background: "#e5eefc",
                            color: "#1d4ed8",
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                        >
                          {tag}
                        </span>
                      )) : <span style={{ color: "#6b7280" }}>Nessun tag</span>}
                    </div>
                  </div>

                  <div
                    style={{
                      borderRadius: 16,
                      border: "1px solid rgba(148,163,184,0.18)",
                      background: "rgba(255,255,255,0.72)",
                      padding: 16,
                    }}
                  >
                    <strong>Collegamenti rilevanti</strong>
                    <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                      {relatedEntities.length > 0 ? relatedEntities.map((entity) => (
                        <button
                          key={entity.id}
                          type="button"
                          onClick={() => onSelectEntity(entity.id)}
                          style={{
                            textAlign: "left",
                            padding: "10px 12px",
                            borderRadius: 12,
                            border: "1px solid rgba(148,163,184,0.2)",
                            background: "#fff",
                            cursor: "pointer",
                            color: "#1f2937",
                          }}
                        >
                          <strong>{entity.name}</strong>
                          <div style={{ marginTop: 4, color: "#6b7280", fontSize: 13 }}>
                            {getEntityTypeLabel(entity.type, entityTypes)}
                          </div>
                        </button>
                      )) : <div style={{ color: "#6b7280" }}>Nessun collegamento.</div>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div
            style={{
              ...panelStyle,
              background: "rgba(255,255,255,0.86)",
              color: "#1f2937",
            }}
          >
            Seleziona un'entità per entrare nella modalità consultazione.
          </div>
        )}
      </div>
    </div>
  );
}
