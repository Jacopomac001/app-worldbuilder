import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { UI_TEXT } from "../config";
import { inputStyle, primaryButtonStyle, selectStyle } from "../styles";
import type { Entity, EntityType, EntityTypeDefinition } from "../types";
import {
  getEntityTypeLabel,
  hasDuplicateEntityName,
  normalizeEntityName,
  normalizeText,
} from "../utils/entity";

type NewEntityFormProps = {
  entityTypes: EntityTypeDefinition[];
  entities: Entity[];
  initialType?: EntityType;
  onCreate: (data: {
    type: EntityType;
    name: string;
    shortDescription: string;
  }) => boolean;
  onCancel: () => void;
};

const formStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
  padding: 12,
  border: "1px solid rgba(148,163,184,0.14)",
  borderRadius: 12,
  background:
    "linear-gradient(180deg, rgba(19,29,46,0.96) 0%, rgba(15,23,38,0.96) 100%)",
  marginTop: 12,
};

const fieldWrapStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#cfcfcf",
  fontWeight: 700,
};

const cancelButtonStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(148,163,184,0.14)",
  background:
    "linear-gradient(180deg, rgba(19,29,46,0.96) 0%, rgba(15,23,38,0.96) 100%)",
  color: "white",
  cursor: "pointer",
};

const errorStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#fca5a5",
  background: "#3f1414",
  border: "1px solid #7f1d1d",
  borderRadius: 8,
  padding: "8px 10px",
};

export default function NewEntityForm({
  entityTypes,
  entities,
  initialType = "luogo",
  onCreate,
  onCancel,
}: NewEntityFormProps) {
  const [type, setType] = useState<EntityType>(initialType);
  const [name, setName] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [error, setError] = useState("");

  const nameInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const typeExists = entityTypes.some((item) => item.id === initialType);
    setType(typeExists ? initialType : entityTypes[0]?.id ?? "luogo");
  }, [initialType, entityTypes]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      nameInputRef.current?.focus();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [initialType]);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onCancel();
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onCancel]);

  const normalizedName = useMemo(() => normalizeEntityName(name), [name]);
  const normalizedDescription = useMemo(
    () => normalizeText(shortDescription),
    [shortDescription]
  );

  const duplicateName = useMemo(() => {
    if (!normalizedName) return false;
    return hasDuplicateEntityName(entities, type, normalizedName);
  }, [entities, type, normalizedName]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!normalizedName) {
      setError("Il nome è obbligatorio.");
      return;
    }

    if (duplicateName) {
      setError(
        `Esiste già un'entità di tipo ${getEntityTypeLabel(
          type,
          entityTypes
        ).toLowerCase()} con questo nome.`
      );
      return;
    }

    const created = onCreate({
      type,
      name: normalizedName,
      shortDescription: normalizedDescription,
    });

    if (!created) {
      setError("Impossibile creare l'entità.");
      return;
    }

    setError("");
    setType(entityTypes.some((item) => item.id === initialType) ? initialType : entityTypes[0]?.id ?? "luogo");
    setName("");
    setShortDescription("");
  }

  return (
    <form onSubmit={handleSubmit} style={formStyle}>
      <div style={fieldWrapStyle}>
        <label style={labelStyle}>Tipo</label>
        <select
          value={type}
          onChange={(event) => {
            setType(event.target.value as EntityType);
            setError("");
          }}
          style={selectStyle}
        >
          {entityTypes.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div style={fieldWrapStyle}>
        <label style={labelStyle}>Nome</label>
        <input
          ref={nameInputRef}
          type="text"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setError("");
          }}
          placeholder={UI_TEXT.newEntityNamePlaceholder}
          style={{
            ...inputStyle,
            border: duplicateName ? "1px solid #dc2626" : inputStyle.border,
          }}
        />
      </div>

      <div style={fieldWrapStyle}>
        <label style={labelStyle}>Descrizione breve</label>
        <input
          type="text"
          value={shortDescription}
          onChange={(event) => {
            setShortDescription(event.target.value);
            setError("");
          }}
          placeholder={UI_TEXT.newEntityDescriptionPlaceholder}
          style={inputStyle}
        />
      </div>

      {error ? <div style={errorStyle}>{error}</div> : null}

      <div
        style={{
          fontSize: 12,
          color: "#9ca3af",
          lineHeight: 1.5,
        }}
      >
        Invio crea l'entità. ESC annulla.
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <button
          type="submit"
          disabled={!normalizedName || duplicateName}
          style={{
            ...primaryButtonStyle,
            opacity: !normalizedName || duplicateName ? 0.6 : 1,
            cursor:
              !normalizedName || duplicateName ? "not-allowed" : "pointer",
          }}
        >
          Crea entità
        </button>

        <button type="button" onClick={onCancel} style={cancelButtonStyle}>
          Annulla
        </button>
      </div>
    </form>
  );
}