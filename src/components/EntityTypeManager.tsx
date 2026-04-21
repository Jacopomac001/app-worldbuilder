import { useMemo, useState } from "react";
import type {
  Entity,
  EntityType,
  EntityTypeDefinition,
  MetadataFieldDefinition,
  MetadataFieldKind,
} from "../types";
import { uiIcons } from "../utils/icons";

type EntityTypeManagerProps = {
  entityTypes: EntityTypeDefinition[];
  entities: Entity[];
  onUpdateEntityType: (type: EntityTypeDefinition) => boolean;
  onDeleteEntityType: (typeId: EntityType) => boolean;
};

type CustomFieldDraft = MetadataFieldDefinition;

const panelWrapStyle: React.CSSProperties = {
  display: "grid",
  gap: 10,
  padding: 12,
  borderRadius: 12,
  border: "1px solid rgba(148,163,184,0.14)",
  background:
    "linear-gradient(180deg, rgba(19,29,46,0.96) 0%, rgba(15,23,38,0.96) 100%)",
  minWidth: 0,
  overflow: "hidden",
};

const baseInputStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(148,163,184,0.14)",
  background:
    "linear-gradient(180deg, rgba(19,29,46,0.96) 0%, rgba(15,23,38,0.96) 100%)",
  color: "white",
  boxShadow: "0 8px 18px rgba(2,6,23,0.12)",
  boxSizing: "border-box",
  minWidth: 0,
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: "#9ca3af",
  fontWeight: 800,
};

const actionButtonStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(96,165,250,0.22)",
  background: "linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)",
  color: "white",
  cursor: "pointer",
  fontWeight: 700,
};

const subtleButtonStyle: React.CSSProperties = {
  ...baseInputStyle,
  cursor: "pointer",
  fontWeight: 700,
};

const dangerButtonStyle: React.CSSProperties = {
  ...subtleButtonStyle,
  border: "1px solid rgba(248,113,113,0.24)",
  color: "#fecaca",
};

function buildFieldKeyFromLabel(value: string) {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, " ");

  const parts = normalized.split(" ").filter(Boolean);
  if (parts.length === 0) return "";

  return parts
    .map((part, index) =>
      index === 0
        ? part.charAt(0).toLowerCase() + part.slice(1)
        : part.charAt(0).toUpperCase() + part.slice(1)
    )
    .join("");
}

function getEntityTypeUsageCount(entities: Entity[], typeId: EntityType) {
  return entities.filter((entity) => entity.type === typeId).length;
}

function buildTypeEditorKey(type: EntityTypeDefinition) {
  return JSON.stringify({
    id: type.id,
    label: type.label,
    color: type.color,
    fields: (type.fields ?? []).map((field) => ({
      key: field.key,
      label: field.label,
      kind: field.kind,
      placeholder: field.placeholder ?? "",
      relationType: field.relationType ?? "",
      relationInverseType: field.relationInverseType ?? "",
      allowedEntityTypes: field.allowedEntityTypes ?? [],
      autoCreateTarget: Boolean(field.autoCreateTarget),
      autoCreateTargetType: field.autoCreateTargetType ?? "",
    })),
  });
}

function CustomTypeEditor({
  selectedType,
  entityTypes,
  entities,
  onSave,
  onDelete,
}: {
  selectedType: EntityTypeDefinition;
  entityTypes: EntityTypeDefinition[];
  entities: Entity[];
  onSave: (type: EntityTypeDefinition) => boolean;
  onDelete: (typeId: EntityType) => boolean;
}) {
  const [label, setLabel] = useState(selectedType.label);
  const [color, setColor] = useState(selectedType.color);
  const [fields, setFields] = useState<CustomFieldDraft[]>(selectedType.fields ?? []);
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldKey, setNewFieldKey] = useState("");
  const [newFieldKind, setNewFieldKind] = useState<MetadataFieldKind>("text");
  const [newFieldPlaceholder, setNewFieldPlaceholder] = useState("");

  const usageCount = useMemo(
    () => getEntityTypeUsageCount(entities, selectedType.id),
    [entities, selectedType.id]
  );

  function updateField(
    index: number,
    patch: Partial<MetadataFieldDefinition>
  ) {
    setFields((current) =>
      current.map((field, fieldIndex) =>
        fieldIndex === index ? { ...field, ...patch } : field
      )
    );
  }

  function toggleAllowedEntityType(index: number, typeId: EntityType) {
    setFields((current) =>
      current.map((field, fieldIndex) => {
        if (fieldIndex !== index) return field;

        const currentAllowed = field.allowedEntityTypes ?? [];
        const nextAllowed = currentAllowed.includes(typeId)
          ? currentAllowed.filter((item) => item !== typeId)
          : [...currentAllowed, typeId];

        return {
          ...field,
          allowedEntityTypes: nextAllowed.length > 0 ? nextAllowed : undefined,
        };
      })
    );
  }

  function handleAddField() {
    const normalizedLabel = newFieldLabel.trim().replace(/\s+/g, " ");
    const candidateKey =
      newFieldKey.trim() || buildFieldKeyFromLabel(normalizedLabel);

    if (!normalizedLabel || !candidateKey) {
      window.alert("Ogni campo deve avere almeno etichetta e chiave.");
      return;
    }

    const duplicate = fields.some(
      (field) => field.key.trim().toLowerCase() === candidateKey.trim().toLowerCase()
    );

    if (duplicate) {
      window.alert("Esiste già un campo con questa chiave.");
      return;
    }

    setFields((current) =>
      current.concat({
        key: candidateKey.trim(),
        label: normalizedLabel,
        kind: newFieldKind,
        placeholder: newFieldPlaceholder.trim() || undefined,
      })
    );

    setNewFieldLabel("");
    setNewFieldKey("");
    setNewFieldKind("text");
    setNewFieldPlaceholder("");
  }

  function handleSave() {
    const saved = onSave({
      ...selectedType,
      label,
      color,
      fields,
    });

    if (!saved) return;
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ color: "#94a3b8", fontSize: 13 }}>
        Tipo selezionato: <strong style={{ color: "#f8fafc" }}>{selectedType.label}</strong>
        {" · "}
        {usageCount} entità assegnate
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 72px", gap: 8 }}>
        <input
          type="text"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="Nome del tipo"
          style={baseInputStyle}
        />
        <input
          type="color"
          value={color}
          onChange={(event) => setColor(event.target.value)}
          style={{
            width: "100%",
            height: 42,
            borderRadius: 12,
            border: "1px solid rgba(148,163,184,0.14)",
            background: "transparent",
            padding: 4,
            cursor: "pointer",
          }}
        />
      </div>

      <div style={sectionTitleStyle}>Campi metadata</div>

      {fields.length === 0 ? (
        <div style={{ color: "#94a3b8", fontSize: 13 }}>
          Nessun campo custom configurato.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {fields.map((field, index) => {
            const isReference = field.kind === "entity-reference";

            return (
              <div
                key={`${field.key}-${index}`}
                style={{
                  display: "grid",
                  gap: 8,
                  padding: 10,
                  borderRadius: 12,
                  border: "1px solid rgba(148,163,184,0.14)",
                  background: "rgba(7,12,22,0.32)",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
                    gap: 8,
                  }}
                >
                  <input
                    type="text"
                    value={field.label}
                    onChange={(event) =>
                      updateField(index, { label: event.target.value })
                    }
                    placeholder="Etichetta"
                    style={baseInputStyle}
                  />
                  <input
                    type="text"
                    value={field.key}
                    onChange={(event) =>
                      updateField(index, { key: event.target.value })
                    }
                    placeholder="Chiave interna"
                    style={baseInputStyle}
                  />
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
                    gap: 8,
                  }}
                >
                  <select
                    value={field.kind}
                    onChange={(event) =>
                      updateField(index, {
                        kind: event.target.value as MetadataFieldKind,
                      })
                    }
                    style={baseInputStyle}
                  >
                    <option value="text">Testo</option>
                    <option value="textarea">Textarea</option>
                    <option value="entity-reference">Riferimento entità</option>
                  </select>

                  <input
                    type="text"
                    value={field.placeholder ?? ""}
                    onChange={(event) =>
                      updateField(index, { placeholder: event.target.value })
                    }
                    placeholder="Placeholder"
                    style={baseInputStyle}
                  />
                </div>

                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    color: "#cbd5e1",
                    fontSize: 13,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={Boolean(field.required)}
                    onChange={(event) =>
                      updateField(index, { required: event.target.checked })
                    }
                  />
                  Campo obbligatorio
                </label>

                {isReference ? (
                  <div style={{ display: "grid", gap: 8 }}>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
                        gap: 8,
                      }}
                    >
                      <input
                        type="text"
                        value={field.relationType ?? ""}
                        onChange={(event) =>
                          updateField(index, {
                            relationType: event.target.value,
                          })
                        }
                        placeholder="Relazione diretta"
                        style={baseInputStyle}
                      />
                      <input
                        type="text"
                        value={field.relationInverseType ?? ""}
                        onChange={(event) =>
                          updateField(index, {
                            relationInverseType: event.target.value,
                          })
                        }
                        placeholder="Relazione inversa"
                        style={baseInputStyle}
                      />
                    </div>

                    <div style={{ color: "#94a3b8", fontSize: 12 }}>
                      Tipi ammessi
                    </div>

                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {entityTypes.map((type) => {
                        const isActive = (field.allowedEntityTypes ?? []).includes(type.id);

                        return (
                          <button
                            key={type.id}
                            type="button"
                            onClick={() => toggleAllowedEntityType(index, type.id)}
                            style={{
                              ...subtleButtonStyle,
                              padding: "6px 8px",
                              borderRadius: 999,
                              fontSize: 12,
                              background: isActive ? `${type.color}22` : subtleButtonStyle.background,
                              border: isActive
                                ? `1px solid ${type.color}`
                                : "1px solid rgba(148,163,184,0.14)",
                            }}
                          >
                            {type.label}
                          </button>
                        );
                      })}
                    </div>

                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        color: "#cbd5e1",
                        fontSize: 13,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(field.autoCreateTarget)}
                        onChange={(event) =>
                          updateField(index, {
                            autoCreateTarget: event.target.checked,
                          })
                        }
                      />
                      Crea automaticamente l'entità target se manca
                    </label>

                    {field.autoCreateTarget ? (
                      <select
                        value={field.autoCreateTargetType ?? ""}
                        onChange={(event) =>
                          updateField(index, {
                            autoCreateTargetType: event.target.value || undefined,
                          })
                        }
                        style={baseInputStyle}
                      >
                        <option value="">Usa il primo tipo ammesso</option>
                        {entityTypes.map((type) => (
                          <option key={type.id} value={type.id}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    ) : null}
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={() =>
                    setFields((current) =>
                      current.filter((_, fieldIndex) => fieldIndex !== index)
                    )
                  }
                  style={{ ...dangerButtonStyle, padding: "8px 10px" }}
                >
                  <uiIcons.delete size={14} style={{ marginRight: 8 }} />
                  Rimuovi campo
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div style={sectionTitleStyle}>Nuovo campo</div>

      <div
        style={{
          display: "grid",
          gap: 8,
          padding: 10,
          borderRadius: 12,
          border: "1px solid rgba(148,163,184,0.14)",
          background: "rgba(7,12,22,0.32)",
        }}
      >
        <input
          type="text"
          value={newFieldLabel}
          onChange={(event) => setNewFieldLabel(event.target.value)}
          placeholder="Etichetta campo"
          style={baseInputStyle}
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
            gap: 8,
          }}
        >
          <input
            type="text"
            value={newFieldKey}
            onChange={(event) => setNewFieldKey(event.target.value)}
            placeholder="Chiave interna"
            style={baseInputStyle}
          />
          <select
            value={newFieldKind}
            onChange={(event) =>
              setNewFieldKind(event.target.value as MetadataFieldKind)
            }
            style={baseInputStyle}
          >
            <option value="text">Testo</option>
            <option value="textarea">Textarea</option>
            <option value="entity-reference">Riferimento entità</option>
          </select>
        </div>

        <input
          type="text"
          value={newFieldPlaceholder}
          onChange={(event) => setNewFieldPlaceholder(event.target.value)}
          placeholder="Placeholder"
          style={baseInputStyle}
        />

        <button type="button" onClick={handleAddField} style={actionButtonStyle}>
          + Aggiungi campo
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 8 }}>
        <button type="button" onClick={handleSave} style={actionButtonStyle}>
          Salva schema
        </button>
        <button
          type="button"
          onClick={() => onDelete(selectedType.id)}
          style={dangerButtonStyle}
        >
          Elimina tipo
        </button>
      </div>
    </div>
  );
}

export default function EntityTypeManager({
  entityTypes,
  entities,
  onUpdateEntityType,
  onDeleteEntityType,
}: EntityTypeManagerProps) {
  const customTypes = useMemo(
    () => entityTypes.filter((type) => !type.builtIn),
    [entityTypes]
  );
  const [selectedTypeId, setSelectedTypeId] = useState("");

  const effectiveSelectedTypeId = customTypes.some(
    (type) => type.id === selectedTypeId
  )
    ? selectedTypeId
    : (customTypes[0]?.id ?? "");

  const selectedType =
    customTypes.find((type) => type.id === effectiveSelectedTypeId) ?? null;

  if (customTypes.length === 0) {
    return (
      <div style={panelWrapStyle}>
        <div style={sectionTitleStyle}>Schema tipi custom</div>
        <div style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.5 }}>
          Crea un tipo custom per iniziare a modellare campi e metadata personalizzati.
        </div>
      </div>
    );
  }

  return (
    <div style={panelWrapStyle}>
      <div style={sectionTitleStyle}>Schema tipi custom</div>

      <select
        value={effectiveSelectedTypeId}
        onChange={(event) => setSelectedTypeId(event.target.value)}
        style={baseInputStyle}
      >
        {customTypes.map((type) => (
          <option key={type.id} value={type.id}>
            {type.label}
          </option>
        ))}
      </select>

      {selectedType ? (
        <CustomTypeEditor
          key={buildTypeEditorKey(selectedType)}
          selectedType={selectedType}
          entityTypes={entityTypes}
          entities={entities}
          onSave={onUpdateEntityType}
          onDelete={onDeleteEntityType}
        />
      ) : null}
    </div>
  );
}
