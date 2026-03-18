import { UI_TEXT } from "../config";
import {
  cardStyle,
  dangerButtonStyle,
  inputDarkStyle,
  panelStyle,
  primaryButtonStyle,
  selectStyle,
} from "../styles";
import type { Entity, Relation } from "../types";
import type { RelationPreset } from "../utils/entity";
import {
  getEntityTypeLabel,
  getRelationTypeForPerspective,
} from "../utils/entity";

type RelationsPanelProps = {
  entities: Entity[];
  relations: Relation[];
  selectedEntity: Entity;
  availableRelationTargets: Entity[];
  selectedEntityRelations: Relation[];
  relationType: string;
  relationInverseType: string;
  relationTargetId: string | "";
  relationPresets: readonly RelationPreset[];
  onRelationTypeChange: (value: string) => void;
  onRelationInverseTypeChange: (value: string) => void;
  onRelationTargetIdChange: (value: string | "") => void;
  onAddRelation: () => void;
  onDeleteRelation: (relationId: string) => void;
  getEntityById: (id: string) => Entity | undefined;
};

export default function RelationsPanel({
  entities,
  relations,
  selectedEntity,
  availableRelationTargets,
  selectedEntityRelations,
  relationType,
  relationInverseType,
  relationTargetId,
  relationPresets,
  onRelationTypeChange,
  onRelationInverseTypeChange,
  onRelationTargetIdChange,
  onAddRelation,
  onDeleteRelation,
  getEntityById,
}: RelationsPanelProps) {
  const normalizedType = relationType.trim().toLowerCase();
  const matchingPreset =
    relationPresets.find((preset) => preset.type === normalizedType) ?? null;

  return (
    <div style={panelStyle}>
      <h2 style={{ marginTop: 0 }}>Relazioni</h2>

      <div style={{ ...cardStyle, marginBottom: "16px" }}>
        <div style={{ fontSize: "14px", color: "#9ca3af", marginBottom: "8px" }}>
          Crea nuova relazione
        </div>

        <div style={{ display: "grid", gap: "10px" }}>
          <input
            list="relation-presets"
            type="text"
            value={relationType}
            onChange={(e) => onRelationTypeChange(e.target.value)}
            placeholder={UI_TEXT.relationTypePlaceholder}
            style={inputDarkStyle}
          />

          <datalist id="relation-presets">
            {relationPresets.map((preset) => (
              <option key={preset.type} value={preset.type} />
            ))}
          </datalist>

          <input
            type="text"
            value={relationInverseType}
            onChange={(e) => onRelationInverseTypeChange(e.target.value)}
            placeholder={UI_TEXT.relationInversePlaceholder}
            style={inputDarkStyle}
          />

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            {relationPresets.map((preset) => {
              const isActive = normalizedType === preset.type;

              return (
                <button
                  key={preset.type}
                  type="button"
                  onClick={() => {
                    onRelationTypeChange(preset.type);
                    onRelationInverseTypeChange(preset.inverseType ?? "");
                  }}
                  style={{
                    backgroundColor: isActive ? "#2563eb" : "#1f2937",
                    color: "white",
                    border: "1px solid #374151",
                    borderRadius: "999px",
                    padding: "6px 10px",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: 600,
                  }}
                >
                  {preset.type}
                </button>
              );
            })}
          </div>

          <div style={{ fontSize: "12px", color: "#9ca3af", lineHeight: 1.5 }}>
            Puoi usare un preset oppure scrivere una relazione libera.
            <br />
            Esempio: <strong>vive in</strong> / <strong>ospita</strong>
            {matchingPreset?.inverseType ? (
              <>
                <br />
                Preset rilevato: inversa suggerita{" "}
                <strong>{matchingPreset.inverseType}</strong>
              </>
            ) : null}
          </div>

          <select
            value={relationTargetId}
            onChange={(e) => onRelationTargetIdChange(e.target.value || "")}
            style={selectStyle}
          >
            <option value="">{UI_TEXT.relationTargetPlaceholder}</option>
            {availableRelationTargets.map((entity) => (
              <option key={entity.id} value={entity.id}>
                {entity.name} ({getEntityTypeLabel(entity.type)})
              </option>
            ))}
          </select>

          <button onClick={onAddRelation} style={primaryButtonStyle}>
            Aggiungi relazione
          </button>
        </div>
      </div>

      <div style={{ fontSize: "14px", color: "#9ca3af", marginBottom: "8px" }}>
        Relazioni dell'entità selezionata
      </div>

      {selectedEntityRelations.length === 0 ? (
        <div
          style={{
            fontSize: "14px",
            color: "#9ca3af",
            padding: "12px",
            borderRadius: "12px",
            backgroundColor: "#111827",
            border: "1px solid #374151",
          }}
        >
          Nessuna relazione presente.
        </div>
      ) : (
        <div style={{ display: "grid", gap: "10px" }}>
          {selectedEntityRelations.map((relation) => {
            const fromEntity = getEntityById(relation.fromEntityId);
            const toEntity = getEntityById(relation.toEntityId);

            if (!fromEntity || !toEntity) return null;

            const isOutgoing = relation.fromEntityId === selectedEntity.id;
            const direction = isOutgoing ? "outgoing" : "incoming";

            const semanticType = getRelationTypeForPerspective(
              relation.type,
              relation.inverseType,
              direction
            );

            const subjectEntity = isOutgoing ? fromEntity : toEntity;
            const objectEntity = isOutgoing ? toEntity : fromEntity;

            return (
              <div
                key={relation.id}
                style={{
                  backgroundColor: "#111827",
                  border: "1px solid #374151",
                  borderRadius: "12px",
                  padding: "12px",
                }}
              >
                <div
                  style={{
                    fontSize: "12px",
                    color: isOutgoing ? "#93c5fd" : "#c4b5fd",
                    marginBottom: "6px",
                    fontWeight: 700,
                  }}
                >
                  {isOutgoing ? "IN USCITA" : "IN ENTRATA · LETTURA SEMANTICA"}
                </div>

                <div style={{ fontSize: "14px", lineHeight: 1.5 }}>
                  <strong>{subjectEntity.name}</strong> — {semanticType} →{" "}
                  <strong>{objectEntity.name}</strong>
                </div>

                <div
                  style={{
                    marginTop: "8px",
                    fontSize: "12px",
                    color: "#9ca3af",
                    lineHeight: 1.5,
                  }}
                >
                  Salvata come: <strong>{fromEntity.name}</strong> — {relation.type} →{" "}
                  <strong>{toEntity.name}</strong>
                  {relation.inverseType ? (
                    <>
                      <br />
                      Inversa: <strong>{relation.inverseType}</strong>
                    </>
                  ) : null}
                </div>

                <button
                  onClick={() => onDeleteRelation(relation.id)}
                  style={{ ...dangerButtonStyle, marginTop: "10px" }}
                >
                  Elimina relazione
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: "16px", display: "grid", gap: "10px" }}>
        <div
          style={{
            backgroundColor: "#111827",
            border: "1px solid #374151",
            borderRadius: "12px",
            padding: "12px",
          }}
        >
          Entità totali: {entities.length}
        </div>

        <div
          style={{
            backgroundColor: "#111827",
            border: "1px solid #374151",
            borderRadius: "12px",
            padding: "12px",
          }}
        >
          Relazioni totali: {relations.length}
        </div>

        <div
          style={{
            backgroundColor: "#111827",
            border: "1px solid #374151",
            borderRadius: "12px",
            padding: "12px",
          }}
        >
          Relazioni visibili: {selectedEntityRelations.length}
        </div>
      </div>
    </div>
  );
}