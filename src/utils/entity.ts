import type {
  Entity,
  EntityMetadata,
  EntityType,
  EntityTypeDefinition,
  MetadataFieldDefinition,
  Relation,
} from "../types";

type CreateEntityInput = {
  type: EntityType;
  name: string;
  shortDescription: string;
};

export type RelationPreset = {
  type: string;
  inverseType?: string;
};

export const BUILT_IN_ENTITY_TYPES: EntityTypeDefinition[] = [
  { id: "luogo", label: "Luogo", color: "#059669", builtIn: true },
  { id: "personaggio", label: "Personaggio", color: "#2563eb", builtIn: true },
  { id: "fazione", label: "Fazione", color: "#7c3aed", builtIn: true },
  { id: "oggetto", label: "Oggetto", color: "#d97706", builtIn: true },
  { id: "evento", label: "Evento", color: "#dc2626", builtIn: true },
];

export const metadataFieldsByType: Partial<Record<EntityType, MetadataFieldDefinition[]>> = {
  luogo: [
    { key: "regione", label: "Regione", kind: "text", placeholder: "Es. Costa orientale" },
    { key: "clima", label: "Clima", kind: "text", placeholder: "Es. Tropicale umido" },
    { key: "popolazione", label: "Popolazione", kind: "text", placeholder: "Es. 12.000 abitanti" },
    { key: "pericolo", label: "Livello di pericolo", kind: "text", placeholder: "Es. Alto" },
  ],
  personaggio: [
    { key: "ruolo", label: "Ruolo", kind: "text", placeholder: "Es. Esploratore" },
    { key: "fazione", label: "Fazione", kind: "entity-reference", placeholder: "Es. Guardia d'Ambra", allowedEntityTypes: ["fazione"], relationType: "membro di", relationInverseType: "include" },
    { key: "status", label: "Status", kind: "text", placeholder: "Es. Vivo / disperso" },
  ],
  fazione: [
    { key: "leader", label: "Leader", kind: "entity-reference", placeholder: "Es. Matriarca Sihra", allowedEntityTypes: ["personaggio"], relationType: "ha come leader", relationInverseType: "guida" },
    { key: "ideologia", label: "Ideologia", kind: "text", placeholder: "Es. Espansione rituale" },
    { key: "territorio", label: "Territorio", kind: "entity-reference", placeholder: "Es. Paludi del sud", allowedEntityTypes: ["luogo"], relationType: "controlla", relationInverseType: "è controllato da" },
    { key: "risorse", label: "Risorse", kind: "text", placeholder: "Es. Ambra, sale, bestie" },
  ],
  oggetto: [
    { key: "origine", label: "Origine", kind: "entity-reference", placeholder: "Es. Tempio Verde" },
    { key: "materiale", label: "Materiale", kind: "text", placeholder: "Es. Ossidiana" },
    { key: "potere", label: "Potere", kind: "textarea", placeholder: "Es. Visioni profetiche" },
    { key: "stato", label: "Stato", kind: "text", placeholder: "Es. Integro / spezzato" },
  ],
  evento: [
    { key: "anno", label: "Anno", kind: "text", placeholder: "Es. -1200 oppure 432" },
    { key: "epoca", label: "Epoca", kind: "text", placeholder: "Es. Prima Era, Età dei Rettili" },
    { key: "ordineCronologico", label: "Ordine cronologico", kind: "text", placeholder: "Es. 10, 20, 30" },
    { key: "stato", label: "Stato temporale", kind: "text", placeholder: "Es. antico, recente, in corso, profetizzato" },
  ],
};

export const RELATION_PRESETS: readonly RelationPreset[] = [
  { type: "membro di", inverseType: "include" },
  { type: "alleato di", inverseType: "alleato di" },
  { type: "nemico di", inverseType: "nemico di" },
  { type: "controlla", inverseType: "è controllato da" },
  { type: "vive in", inverseType: "ospita" },
  { type: "si trova in", inverseType: "contiene" },
  { type: "possiede", inverseType: "appartiene a" },
  { type: "ha causato", inverseType: "è stato causato da" },
  { type: "ha distrutto", inverseType: "è stato distrutto da" },
  { type: "discende da", inverseType: "ha come discendente" },
] as const;

const RELATION_INVERSES: Record<string, string> = Object.fromEntries(
  RELATION_PRESETS.filter((preset) => preset.inverseType).map((preset) => [preset.type, preset.inverseType as string])
);

function titleCaseFromId(type: string) {
  return type
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

export function getEntityTypeDefinition(
  type: EntityType,
  entityTypes: EntityTypeDefinition[]
): EntityTypeDefinition | undefined {
  return entityTypes.find((item) => item.id === type);
}

export function getMetadataFieldsForEntityType(
  type: EntityType,
  entityTypes: EntityTypeDefinition[]
): MetadataFieldDefinition[] {
  return getEntityTypeDefinition(type, entityTypes)?.fields ?? metadataFieldsByType[type] ?? [];
}

export function getMetadataFieldDefinition(
  entityType: EntityType,
  fieldKey: string,
  entityTypes: EntityTypeDefinition[]
): MetadataFieldDefinition | undefined {
  return getMetadataFieldsForEntityType(entityType, entityTypes).find((field) => field.key === fieldKey);
}

export function getMetadataFieldsForType(type: EntityType): MetadataFieldDefinition[] {
  return metadataFieldsByType[type] ?? [];
}

export function isReferenceMetadataField(
  entityType: EntityType,
  fieldKey: string,
  entityTypes: EntityTypeDefinition[]
): boolean {
  return getMetadataFieldDefinition(entityType, fieldKey, entityTypes)?.kind === "entity-reference";
}

export function normalizeEntityName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeTag(tag: string): string {
  return tag.trim().toLowerCase().replace(/\s+/g, " ");
}

export function normalizeRelationType(type: string): string {
  return type.trim().toLowerCase().replace(/\s+/g, " ");
}

export function normalizeOptionalRelationType(type?: string): string | undefined {
  if (typeof type !== "string") return undefined;
  const normalized = normalizeRelationType(type);
  return normalized || undefined;
}

export function normalizeMetadataValue(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function getSuggestedInverseRelationType(type: string): string {
  const normalized = normalizeRelationType(type);
  return RELATION_INVERSES[normalized] ?? "";
}

export function getRelationTypeForPerspective(
  type: string,
  inverseType: string | undefined,
  direction: "outgoing" | "incoming"
): string {
  const normalizedType = normalizeRelationType(type);
  const normalizedInverse = normalizeOptionalRelationType(inverseType);
  return direction === "outgoing" ? normalizedType : normalizedInverse ?? normalizedType;
}

export function normalizeMetadata(metadata: EntityMetadata | undefined): EntityMetadata {
  if (!metadata) return {};
  const entries = Object.entries(metadata)
    .map(([key, value]) => [key.trim(), normalizeText(String(value ?? ""))] as const)
    .filter(([key, value]) => key && value);
  return Object.fromEntries(entries);
}

export function getDefaultMetadata(
  type: EntityType,
  entityTypes?: EntityTypeDefinition[]
): EntityMetadata {
  const fields = entityTypes ? getMetadataFieldsForEntityType(type, entityTypes) : getMetadataFieldsForType(type);
  return Object.fromEntries(fields.map((field) => [field.key, ""]));
}

export function remapMetadataForType(
  previousMetadata: EntityMetadata | undefined,
  nextType: EntityType,
  entityTypes?: EntityTypeDefinition[]
): EntityMetadata {
  const normalizedPrevious = normalizeMetadata(previousMetadata);
  const nextFields = entityTypes ? getMetadataFieldsForEntityType(nextType, entityTypes) : getMetadataFieldsForType(nextType);
  if (nextFields.length === 0) return { ...normalizedPrevious };
  return Object.fromEntries(nextFields.map((field) => [field.key, normalizedPrevious[field.key] ?? ""]));
}

export function hasDuplicateEntityName(
  entities: Entity[],
  type: EntityType,
  name: string,
  excludeEntityId?: string
): boolean {
  const normalizedName = normalizeEntityName(name).toLowerCase();
  return entities.some((entity) => {
    if (excludeEntityId !== undefined && entity.id === excludeEntityId) return false;
    return entity.type === type && normalizeEntityName(entity.name).toLowerCase() === normalizedName;
  });
}

export function createEntity(_entities: Entity[], input: CreateEntityInput): Entity {
  const normalizedName = normalizeEntityName(input.name);
  const normalizedDescription = normalizeText(input.shortDescription);
  const nowIso = new Date().toISOString();
  const nowNum = Date.now();
  return {
    id: crypto.randomUUID(),
    type: input.type,
    name: normalizedName || "Senza nome",
    shortDescription: normalizedDescription,
    notes: "",
    tags: [],
    metadata: getDefaultMetadata(input.type),
    createdAt: nowIso,
    updatedAt: nowIso,
    lastModified: nowNum,
  };
}

export function getEntityTypeLabel(type: EntityType, entityTypes?: EntityTypeDefinition[]): string {
  return entityTypes?.find((option) => option.id === type)?.label ?? BUILT_IN_ENTITY_TYPES.find((option) => option.id === type)?.label ?? titleCaseFromId(type);
}

export function getTypeColor(type: EntityType, entityTypes?: EntityTypeDefinition[]): string {
  return entityTypes?.find((option) => option.id === type)?.color ?? BUILT_IN_ENTITY_TYPES.find((option) => option.id === type)?.color ?? "#374151";
}

export function getTypeIconGlyph(type: EntityType): string {
  switch (type) {
    case "luogo":
      return "▲";
    case "personaggio":
      return "●";
    case "fazione":
      return "◆";
    case "oggetto":
      return "■";
    case "evento":
      return "✦";
    default:
      return "◈";
  }
}

export function buildMetadataRelationKey(fromEntityId: string, fieldKey: string): string {
  return `${fromEntityId}::${fieldKey}`;
}

export function isSameMetadataRelationOrigin(
  relation: Relation,
  fromEntityId: string,
  fieldKey: string
): boolean {
  return relation.source === "metadata" && relation.fromEntityId === fromEntityId && relation.sourceFieldKey === fieldKey;
}
