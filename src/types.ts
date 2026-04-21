export type EntityType = string;

export type MetadataFieldKind = "text" | "textarea" | "entity-reference";

export type MetadataFieldDefinition = {
  key: string;
  label: string;
  kind: MetadataFieldKind;
  placeholder?: string;
  required?: boolean;
  allowedEntityTypes?: EntityType[];
  relationType?: string;
  relationInverseType?: string;
  autoCreateTarget?: boolean;
  autoCreateTargetType?: EntityType;
};

export type EntityTypeDefinition = {
  id: string;
  label: string;
  color: string;
  builtIn?: boolean;
  fields?: MetadataFieldDefinition[];
};

export type EntityMetadata = Record<string, string>;

export type DndStats = {
  enabled?: boolean;
  livello?: string;
  classe?: string;
  ca?: string;
  puntiFerita?: string;
  velocita?: string;
  iniziativa?: string;
  bonusCompetenza?: string;
  dadoVita?: string;
  forza?: string;
  destrezza?: string;
  costituzione?: string;
  intelligenza?: string;
  saggezza?: string;
  carisma?: string;
  armiEquipaggiate?: string;
  equipaggiamento?: string;
  sensi?: string;
  linguaggi?: string;
  competenze?: string;
  challengeRating?: string;
  note?: string;
};

export type Entity = {
  id: string;
  type: EntityType;
  name: string;
  shortDescription: string;
  notes: string;
  tags: string[];
  metadata?: EntityMetadata;
  stats?: DndStats;
  image?: string;
  createdAt: string;
  updatedAt: string;
  lastModified: number;
};

export type RelationSource = "manual" | "metadata";

export type Relation = {
  id: string;
  fromEntityId: string;
  toEntityId: string;
  type: string;
  inverseType?: string;
  source?: RelationSource;
  sourceFieldKey?: string;
};

export type ImageAssetExport = {
  id: string;
  dataUrl: string;
  mimeType?: string;
};

export type SemanticViewId =
  | "default"
  | "political-map"
  | "genealogy"
  | "event-chain"
  | "faction-network";

export type RelationAutomationRule = {
  id: string;
  label: string;
  enabled?: boolean;
  sourceEntityType: EntityType | "all";
  sourceMetadataKey: string;
  targetEntityType: EntityType | "all";
  targetMetadataKey: string;
  relationType: string;
  inverseType?: string;
  mode?: "suggest" | "auto";
};

export type WorkspacePreset = {
  id: string;
  label: string;
  semanticView: SemanticViewId;
  graphViewMode: string;
  graphFilter: string;
  graphViewType: string;
  graphViewTag: string;
  graphRelationFilter: string;
  graphNeighborhoodDepth: number;
  graphTypeFilters: Record<string, boolean>;
};

export type NarrativePackageMeta = {
  packageType: "region" | "storyline" | "faction" | "cast";
  seed: string;
  label: string;
  createdAt: string;
};

export type WorldData = {
  version?: number;
  entityTypes?: EntityTypeDefinition[];
  entities: Entity[];
  relations: Relation[];
  imageAssets?: ImageAssetExport[];
  packageMeta?: NarrativePackageMeta;
};
