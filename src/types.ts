export type EntityType =
  | "luogo"
  | "personaggio"
  | "fazione"
  | "oggetto"
  | "evento";

export type EntityMetadata = Record<string, string>;

export type Entity = {
  id: string;
  type: EntityType;
  name: string;
  shortDescription: string;
  notes: string;
  tags: string[];
  metadata?: EntityMetadata;
  createdAt: string;
  updatedAt: string;
  lastModified: number;
};

export type Relation = {
  id: string;
  fromEntityId: string;
  toEntityId: string;
  type: string;
  inverseType?: string;
};

export type WorldData = {
  entities: Entity[];
  relations: Relation[];
};