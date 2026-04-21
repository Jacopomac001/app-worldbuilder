import { UI_TEXT } from "../config";
import EntityTypeIcon from "./EntityTypeIcon";
import {
  cinematicMotion,
  cinematicTypography,
  dangerButtonStyle,
  inputDarkStyle,
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
import { uiIcons } from "../utils/icons";

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
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  fontSize: 11,
  color: cinematicTypography.inkSoft,
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  fontWeight: 800,
};

const relationMetaTextStyle: React.CSSProperties = {
  fontSize: 12,
  color: cinematicTypography.inkMuted,
  lineHeight: 1.6,
};

function relationChipStyle(isActive: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    border: isActive
      ? "1px solid rgba(146,182,255,0.2)"
      : "1px solid rgba(255,255,255,0.05)",
    background: isActive ? "rgba(255,255,255,0.06)" : "transparent",
    color: isActive ? cinematicTypography.inkStrong : cinematicTypography.ink,
    padding: "7px 11px",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: isActive
      ? "0 8px 18px rgba(0,0,0,0.14), 0 0 14px rgba(100,150,255,0.05)"
      : "none",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    transition: cinematicMotion.transition,
  };
}

export default function RelationsPanel({
  entityTypes,
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
  const outgoingCount = selectedEntityRelations.filter(
    (relation) => relation.fromEntityId === selectedEntity.id
  ).length;
  const incomingCount = selectedEntityRelations.length - outgoingCount;

  return (
    <div
      style={{
        display: "grid",
        gap: 22,
        paddingLeft: 2,
      }}
    >
      <div
        style={{
          display: "grid",
          gap: 12,
          paddingBottom: 18,
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div style={sectionLabelStyle}>
          <uiIcons.relations size={14} />
          Inspector relazioni
        </div>

        <div
          style={{
            display: "grid",
            gap: 10,
          }}
        >
          <div
            style={{
              fontFamily: cinematicTypography.displayFont,
              fontSize: 28,
              lineHeight: 1.05,
              color: cinematicTypography.inkStrong,
            }}
          >
            Relazioni del focus attuale
          </div>
          <div style={{ ...relationMetaTextStyle, maxWidth: 520 }}>
            Il pannello destro legge i legami della scheda attiva come contesto, non come un
            modulo separato dal workspace.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: `${selectedAccent}14`,
              border: `1px solid ${selectedAccent}24`,
              flexShrink: 0,
            }}
          >
            <EntityTypeIcon type={selectedEntity.type} size={18} color={selectedAccent} />
          </div>

          <div style={{ minWidth: 0, display: "grid", gap: 2, flex: 1 }}>
            <div
              style={{
                fontFamily: cinematicTypography.displayFont,
                fontSize: 21,
                color: cinematicTypography.inkStrong,
                lineHeight: 1.1,
              }}
            >
              {selectedEntity.name}
            </div>
            <div style={relationMetaTextStyle}>
              {getEntityTypeLabel(selectedEntity.type, entityTypes)}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 14,
              flexWrap: "wrap",
              color: cinematicTypography.inkSoft,
              fontSize: 12,
            }}
          >
            <span>{outgoingCount} in uscita</span>
            <span>{incomingCount} in entrata</span>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gap: 14,
          padding: "14px 0 18px",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div style={{ display: "grid", gap: 6 }}>
          <div style={sectionLabelStyle}>
            <uiIcons.newEntity size={14} />
            Componi legame
          </div>
          <div style={relationMetaTextStyle}>
            Preset veloci per iniziare, campi aperti per rifinire relazione e inverso.
          </div>
        </div>

        <div style={{ display: "grid", gap: 12 }}>
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

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
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
                  style={relationChipStyle(isActive)}
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
                {entity.name} · {getEntityTypeLabel(entity.type, entityTypes)}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={onAddRelation}
            style={{
              ...primaryButtonStyle,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              width: "fit-content",
            }}
          >
            <uiIcons.relations size={15} />
            Aggiungi relazione
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gap: 14 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "grid", gap: 6 }}>
            <div style={sectionLabelStyle}>
              <uiIcons.relations size={14} />
              Legami in vista
            </div>
            <div
              style={{
                color: cinematicTypography.inkStrong,
                fontFamily: cinematicTypography.displayFont,
                fontSize: 24,
                lineHeight: 1.08,
              }}
            >
              Traccia relazioni visibili
            </div>
          </div>

          <div style={relationMetaTextStyle}>
            {selectedEntityRelations.length} su {relations.length} relazioni del mondo
          </div>
        </div>

        {selectedEntityRelations.length === 0 ? (
          <div style={{ ...relationMetaTextStyle, paddingTop: 4 }}>
            Nessuna relazione per questa entità. Parti da un preset rapido oppure definisci un tipo
            personalizzato.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
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

              return (
                <div
                  key={relation.id}
                  style={{
                    padding: "14px 0",
                    borderBottom: "1px solid rgba(255,255,255,0.08)",
                    display: "grid",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 12,
                        minWidth: 0,
                      }}
                    >
                      {otherEntity ? (
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 12,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: `${accent}16`,
                            border: `1px solid ${accent}2a`,
                            flexShrink: 0,
                          }}
                        >
                          <EntityTypeIcon type={otherEntity.type} size={16} color={accent} />
                        </div>
                      ) : null}

                      <div style={{ minWidth: 0, display: "grid", gap: 4 }}>
                        <div
                          style={{
                            color: cinematicTypography.inkStrong,
                            fontWeight: 800,
                            fontSize: 16,
                            lineHeight: 1.25,
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
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        flexShrink: 0,
                      }}
                    >
                      <uiIcons.delete size={14} />
                    </button>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 8,
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        width: "fit-content",
                        padding: "7px 11px",
                        borderRadius: 999,
                        background: isOutgoing ? "rgba(84,198,173,0.12)" : "rgba(146,182,255,0.12)",
                        color: cinematicTypography.inkStrong,
                        border: "1px solid rgba(255,255,255,0.08)",
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      {isOutgoing ? "In uscita" : "In entrata"}
                    </span>

                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "7px 11px",
                        borderRadius: 999,
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        color: cinematicTypography.ink,
                        fontSize: 12,
                      }}
                    >
                      {relationLabel}
                    </span>

                    {relation.source === "metadata" ? (
                      <span
                        style={{
                          padding: "7px 11px",
                          borderRadius: 999,
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.06)",
                          color: cinematicTypography.inkSoft,
                          fontSize: 12,
                        }}
                      >
                        Generata da metadata
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
