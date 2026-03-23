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

export type Entity = {
  id: string;
  type: EntityType;
  name: string;
  shortDescription: string;
  notes: string;
  tags: string[];
  metadata?: EntityMetadata;
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

export type WorldData = {
  entityTypes?: EntityTypeDefinition[];
  entities: Entity[];
  relations: Relation[];
};
