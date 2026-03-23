import { UI_TEXT } from "../config";
import {
  cardStyle,
  dangerButtonStyle,
  inputDarkStyle,
  panelStyle,
  primaryButtonStyle,
  selectStyle,
} from "../styles";
import type { Entity, EntityTypeDefinition, Relation } from "../types";
import type { RelationPreset } from "../utils/entity";
import {
  getEntityTypeLabel,
  getRelationTypeForPerspective,
  getTypeColor,
} from "../utils/entity";
import { getEntityTypeIcon, uiIcons } from "../utils/icons";

type RelationsPanelProps = {
  entityTypes: EntityTypeDefinition[];
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

const sectionLabelStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  fontSize: "14px",
  color: "#9ca3af",
  marginBottom: "8px",
  fontWeight: 700,
};

const relationMetaTextStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "#9ca3af",
  lineHeight: 1.45,
};

export default function RelationsPanel({
  entityTypes,
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
  const selectedAccent = getTypeColor(selectedEntity.type, entityTypes);
  const SelectedEntityIcon = getEntityTypeIcon(selectedEntity.type);

  return (
    <div
      style={{
        ...panelStyle,
        border: "1px solid rgba(148, 163, 184, 0.14)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginTop: 0,
          marginBottom: "16px",
        }}
      >
        <uiIcons.relations size={18} />
        <h2 style={{ margin: 0 }}>Relazioni</h2>
      </div>

      <div
        style={{
          ...cardStyle,
          marginBottom: "16px",
          display: "grid",
          gap: "12px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "10px 12px",
            borderRadius: "14px",
            background: `${selectedAccent}12`,
            border: `1px solid ${selectedAccent}33`,
          }}
        >
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: `${selectedAccent}22`,
              border: `1px solid ${selectedAccent}44`,
              flexShrink: 0,
            }}
          >
            <SelectedEntityIcon size={16} color={selectedAccent} />
          </div>

          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: "14px",
                fontWeight: 800,
                color: "#f3f4f6",
                lineHeight: 1.2,
              }}
            >
              {selectedEntity.name}
            </div>
            <div style={relationMetaTextStyle}>
              {getEntityTypeLabel(selectedEntity.type, entityTypes)}
            </div>
          </div>
        </div>

        <div style={sectionLabelStyle}>
          <uiIcons.newEntity size={14} />
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
                    background: isActive
                      ? "linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)"
                      : "linear-gradient(180deg, #0f1726 0%, #0b1220 100%)",
                    color: "#f8fafc",
                    border: isActive
                      ? "1px solid rgba(96,165,250,0.34)"
                      : "1px solid rgba(148,163,184,0.14)",
                    borderRadius: "999px",
                    padding: "7px 10px",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {preset.type}
                </button>
              );
            })}
          </div>

          {matchingPreset?.inverseType ? (
            <div style={relationMetaTextStyle}>
              Inverso suggerito: <strong>{matchingPreset.inverseType}</strong>
            </div>
          ) : null}

          <select
            value={relationTargetId}
            onChange={(e) => onRelationTargetIdChange(e.target.value)}
            style={selectStyle}
          >
            <option value="">{UI_TEXT.relationTargetPlaceholder}</option>
            {availableRelationTargets.map((entity) => (
              <option key={entity.id} value={entity.id}>
                {entity.name} — {getEntityTypeLabel(entity.type, entityTypes)}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={onAddRelation}
            style={{
              ...primaryButtonStyle,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            <uiIcons.relations size={15} />
            Aggiungi relazione
          </button>
        </div>
      </div>

      <div style={{ ...cardStyle, display: "grid", gap: "12px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <div style={sectionLabelStyle}>
            <uiIcons.relations size={14} />
            Relazioni visibili
          </div>

          <div style={relationMetaTextStyle}>
            {selectedEntityRelations.length} su {relations.length} totali
          </div>
        </div>

        {selectedEntityRelations.length === 0 ? (
          <div style={relationMetaTextStyle}>
            Nessuna relazione per questa entità.
          </div>
        ) : (
          <div style={{ display: "grid", gap: "10px" }}>
            {selectedEntityRelations.map((relation) => {
              const isOutgoing = relation.fromEntityId === selectedEntity.id;
              const otherEntityId = isOutgoing
                ? relation.toEntityId
                : relation.fromEntityId;
              const otherEntity = getEntityById(otherEntityId);

              const relationLabel = getRelationTypeForPerspective(
                relation.type,
                relation.inverseType,
                isOutgoing ? "outgoing" : "incoming"
              );

              const accent = otherEntity
                ? getTypeColor(otherEntity.type, entityTypes)
                : "#64748b";
              const OtherIcon = otherEntity
                ? getEntityTypeIcon(otherEntity.type)
                : null;

              return (
                <div
                  key={relation.id}
                  style={{
                    ...cardStyle,
                    padding: "12px",
                    display: "grid",
                    gap: "10px",
                    border: "1px solid rgba(148, 163, 184, 0.14)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: "10px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "10px",
                        minWidth: 0,
                      }}
                    >
                      {OtherIcon ? (
                        <div
                          style={{
                            width: "30px",
                            height: "30px",
                            borderRadius: "10px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: `${accent}22`,
                            border: `1px solid ${accent}44`,
                            flexShrink: 0,
                          }}
                        >
                          <OtherIcon size={15} color={accent} />
                        </div>
                      ) : null}

                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: "14px",
                            fontWeight: 800,
                            color: "#f3f4f6",
                            lineHeight: 1.2,
                            wordBreak: "break-word",
                          }}
                        >
                          {otherEntity?.name ?? "Entità sconosciuta"}
                        </div>

                        <div style={relationMetaTextStyle}>
                          {otherEntity
                            ? getEntityTypeLabel(otherEntity.type, entityTypes)
                            : "Entità non trovata"}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onDeleteRelation(relation.id)}
                      style={{
                        ...dangerButtonStyle,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        flexShrink: 0,
                      }}
                    >
                      <uiIcons.delete size={14} />
                    </button>
                  </div>

                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      width: "fit-content",
                      padding: "6px 10px",
                      borderRadius: "999px",
                      background: isOutgoing
                        ? "rgba(59,130,246,0.12)"
                        : "rgba(168,85,247,0.12)",
                      border: isOutgoing
                        ? "1px solid rgba(59,130,246,0.28)"
                        : "1px solid rgba(168,85,247,0.28)",
                      color: "#f8fafc",
                      fontSize: "12px",
                      fontWeight: 800,
                    }}
                  >
                    <uiIcons.relations size={13} />
                    {isOutgoing ? "→" : "←"} {relationLabel}
                  </div>

                  {relation.inverseType ? (
                    <div style={relationMetaTextStyle}>
                      Tipo base: <strong>{relation.type}</strong> · Inverso:{" "}
                      <strong>{relation.inverseType}</strong>
                    </div>
                  ) : (
                    <div style={relationMetaTextStyle}>
                      Tipo base: <strong>{relation.type}</strong>
                    </div>
                  )}

                  {relation.source === "metadata" ? (
                    <div style={relationMetaTextStyle}>
                      Origine: <strong>campo metadata</strong>
                      {relation.sourceFieldKey ? ` · ${relation.sourceFieldKey}` : ""}
                    </div>
                  ) : relation.source === "manual" ? (
                    <div style={relationMetaTextStyle}>
                      Origine: <strong>manuale</strong>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}

        <div style={relationMetaTextStyle}>
          Entità archiviate: <strong>{entities.length}</strong>
        </div>
      </div>
    </div>
  );
}
