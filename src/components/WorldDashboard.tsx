import { BookOpen, Compass, Gem, Link2, MapPinned, Shield, Sparkles, Users } from "lucide-react";
import type { Entity, EntityTypeDefinition, Relation } from "../types";
import { getEntityTypeLabel, getTypeColor } from "../utils/entity";
import { getEntityTypeIcon } from "../utils/icons";

type Props = {
  entityTypes: EntityTypeDefinition[];
  entities: Entity[];
  relations: Relation[];
  selectedEntityId?: string;
  onOpenEntity: (id: string) => void;
  onEnterWorkspace: () => void;
  onCreateEntity: () => void;
};

type RankedEntity = {
  entity: Entity;
  connections: number;
};

function parseChronology(entity: Entity): number {
  const rawOrder = entity.metadata?.ordineCronologico?.trim();
  const rawYear = entity.metadata?.anno?.trim();

  if (rawOrder && !Number.isNaN(Number(rawOrder))) {
    return Number(rawOrder);
  }

  if (rawYear && !Number.isNaN(Number(rawYear))) {
    return Number(rawYear);
  }

  return Number.MAX_SAFE_INTEGER;
}

function countConnections(entityId: string, relations: Relation[]) {
  return relations.filter(
    (relation) => relation.fromEntityId === entityId || relation.toEntityId === entityId
  ).length;
}

function MetricCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div
      className="interactive-card"
      style={{
        padding: 18,
        borderRadius: 18,
        background:
          "linear-gradient(180deg, rgba(33,28,22,0.96) 0%, rgba(16,18,21,0.98) 100%)",
        border: "1px solid rgba(170,141,87,0.14)",
        boxShadow: "0 16px 34px rgba(0,0,0,0.22)",
        display: "grid",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ color: "#d9c49b" }}>{icon}</div>
        <div style={{ fontSize: 28, fontWeight: 800, color: "#f6efe2" }}>{value}</div>
      </div>
      <div>
        <div style={{ color: "#f6efe2", fontWeight: 700 }}>{label}</div>
        {hint ? <div style={{ color: "#aab7c8", fontSize: 12, marginTop: 4 }}>{hint}</div> : null}
      </div>
    </div>
  );
}

function Section({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      className="panel-enter"
      style={{
        padding: 20,
        borderRadius: 22,
        background:
          "linear-gradient(180deg, rgba(27,24,20,0.96) 0%, rgba(12,14,17,0.98) 100%)",
        border: "1px solid rgba(170,141,87,0.14)",
        boxShadow: "0 18px 40px rgba(0,0,0,0.22)",
        display: "grid",
        gap: 16,
      }}
    >
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {icon}
          <h2 style={{ margin: 0, color: "#f6efe2", fontSize: 22 }}>{title}</h2>
        </div>
        {subtitle ? (
          <p style={{ margin: "8px 0 0 0", color: "#aab7c8", lineHeight: 1.6 }}>{subtitle}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function EntityButton({
  entity,
  entityTypes,
  extra,
  onClick,
}: {
  entity: Entity;
  entityTypes: EntityTypeDefinition[];
  extra?: string;
  onClick: () => void;
}) {
  const Icon = getEntityTypeIcon(entity.type);
  const accent = getTypeColor(entity.type, entityTypes);

  return (
    <button
      className="interactive-card"
      onClick={onClick}
      style={{
        width: "100%",
        padding: "14px 16px",
        borderRadius: 16,
        background:
          "linear-gradient(180deg, rgba(33,29,24,0.96) 0%, rgba(14,16,20,0.98) 100%)",
        border: "1px solid rgba(170,141,87,0.14)",
        color: "#f6efe2",
        textAlign: "left",
        cursor: "pointer",
        display: "grid",
        gap: 6,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          style={{
            width: 30,
            height: 30,
            borderRadius: 10,
            background: `${accent}22`,
            border: `1px solid ${accent}33`,
            color: accent,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon size={16} />
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 800, color: "#f6efe2" }}>{entity.name}</div>
          <div style={{ color: "#aab7c8", fontSize: 12 }}>
            {getEntityTypeLabel(entity.type, entityTypes)}
            {extra ? ` · ${extra}` : ""}
          </div>
        </div>
      </div>
      {entity.shortDescription ? (
        <div style={{ color: "#d7c9ad", fontSize: 13, lineHeight: 1.5 }}>{entity.shortDescription}</div>
      ) : null}
    </button>
  );
}

function TagCloud({
  tags,
  onOpenTagEntity,
}: {
  tags: Array<{ tag: string; count: number; representative?: Entity }>;
  onOpenTagEntity: (entityId: string) => void;
}) {
  if (tags.length === 0) {
    return <div style={{ color: "#aab7c8" }}>Ancora nessun tag usato nel progetto.</div>;
  }

  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      {tags.map((item) => (
        <button
          key={item.tag}
          type="button"
          onClick={() => {
            if (item.representative) onOpenTagEntity(item.representative.id);
          }}
          style={{
            padding: "10px 12px",
            borderRadius: 999,
            border: "1px solid rgba(170,141,87,0.18)",
            background: "rgba(36,30,22,0.9)",
            color: "#f3e9d4",
            cursor: item.representative ? "pointer" : "default",
            fontWeight: 700,
          }}
        >
          #{item.tag} <span style={{ color: "#b89c63" }}>· {item.count}</span>
        </button>
      ))}
    </div>
  );
}

export default function WorldDashboard({
  entityTypes,
  entities,
  relations,
  selectedEntityId,
  onOpenEntity,
  onEnterWorkspace,
  onCreateEntity,
}: Props) {
  const isEmpty = entities.length === 0;
  const events = entities.filter((e) => e.type === "evento");
  const entitiesWithoutRelations = entities.filter(
    (entity) => countConnections(entity.id, relations) === 0
  );

  const recentCreated = [...entities]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 6);

  const chronologicalEvents = [...events]
    .sort((a, b) => parseChronology(a) - parseChronology(b))
    .slice(0, 6);

  const continueEntity =
    entities.find((entity) => entity.id === selectedEntityId) ??
    [...entities].sort((a, b) => b.lastModified - a.lastModified)[0];

  const rankedFactions: RankedEntity[] = entities
    .filter((entity) => entity.type === "fazione")
    .map((entity) => ({ entity, connections: countConnections(entity.id, relations) }))
    .sort((a, b) => b.connections - a.connections)
    .slice(0, 5);

  const rankedPlaces: RankedEntity[] = entities
    .filter((entity) => entity.type === "luogo")
    .map((entity) => ({ entity, connections: countConnections(entity.id, relations) }))
    .sort((a, b) => b.connections - a.connections)
    .slice(0, 5);

  const tagCounts = [...new Set(entities.flatMap((entity) => entity.tags))]
    .map((tag) => ({
      tag,
      count: entities.filter((entity) => entity.tags.includes(tag)).length,
      representative: entities.find((entity) => entity.tags.includes(tag)),
    }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, "it"))
    .slice(0, 12);

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", display: "grid", gap: 22 }}>
      {isEmpty ? (
        <Section
          title="Il tuo mondo è ancora vuoto"
          subtitle="Crea la prima entità per iniziare il codex del mondo. Da qui puoi poi collegare personaggi, luoghi, fazioni, eventi e oggetti nel workspace."
          icon={<BookOpen size={22} color="#d4b778" />}
        >
          <div
            style={{
              padding: 28,
              borderRadius: 20,
              border: "1px dashed rgba(170,141,87,0.24)",
              background: "rgba(36,30,22,0.72)",
              display: "grid",
              gap: 14,
              justifyItems: "start",
            }}
          >
            <div style={{ color: "#f3e9d4", lineHeight: 1.7, maxWidth: 760 }}>
              Inizia da una fazione, da un luogo centrale o da un evento storico importante. Dopo i primi nodi,
              il grafo e la dashboard diventeranno molto più utili.
            </div>
            <button
              onClick={onCreateEntity}
              style={{
                padding: "14px 22px",
                borderRadius: 14,
                background: "linear-gradient(180deg, #6c8452 0%, #4f6a37 100%)",
                border: "1px solid rgba(199,178,124,0.25)",
                color: "#fff8eb",
                fontSize: 15,
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              + Crea prima entità
            </button>
          </div>
        </Section>
      ) : (
        <>
          <Section
            title="Panoramica del mondo"
            subtitle="Una lettura veloce del progetto: stato generale, densità delle relazioni e punti da completare."
            icon={<Compass size={22} color="#d4b778" />}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1.35fr) minmax(320px, 0.65fr)",
                gap: 18,
              }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 14 }}>
                <MetricCard icon={<BookOpen size={18} />} label="Entità totali" value={entities.length} />
                <MetricCard icon={<Link2 size={18} />} label="Relazioni" value={relations.length} />
                <MetricCard icon={<Sparkles size={18} />} label="Eventi" value={events.length} />
                <MetricCard icon={<Users size={18} />} label="Personaggi" value={entities.filter((e) => e.type === "personaggio").length} />
                <MetricCard icon={<Shield size={18} />} label="Fazioni" value={entities.filter((e) => e.type === "fazione").length} />
                <MetricCard icon={<MapPinned size={18} />} label="Luoghi" value={entities.filter((e) => e.type === "luogo").length} />
                <MetricCard icon={<Gem size={18} />} label="Oggetti" value={entities.filter((e) => e.type === "oggetto").length} />
                <MetricCard
                  icon={<BookOpen size={18} />}
                  label="Entità orfane"
                  value={entitiesWithoutRelations.length}
                  hint="Senza relazioni: ottime candidate da completare"
                />
              </div>

              <div
                style={{
                  padding: 18,
                  borderRadius: 18,
                  background:
                    "linear-gradient(180deg, rgba(44,37,27,0.92) 0%, rgba(17,18,20,0.98) 100%)",
                  border: "1px solid rgba(170,141,87,0.18)",
                  display: "grid",
                  gap: 12,
                  alignContent: "start",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Compass size={18} color="#d4b778" />
                  <div style={{ color: "#f6efe2", fontWeight: 800 }}>Continua da dove avevi lasciato</div>
                </div>

                {continueEntity ? (
                  <EntityButton
                    entity={continueEntity}
                    entityTypes={entityTypes}
                    extra="entità attiva"
                    onClick={() => onOpenEntity(continueEntity.id)}
                  />
                ) : (
                  <div style={{ color: "#aab7c8" }}>Nessuna entità recente disponibile.</div>
                )}

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button
                    onClick={onEnterWorkspace}
                    style={{
                      padding: "12px 16px",
                      borderRadius: 14,
                      background: "linear-gradient(180deg, #6c8452 0%, #4f6a37 100%)",
                      border: "1px solid rgba(199,178,124,0.25)",
                      color: "#fff8eb",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    Entra nel workspace
                  </button>
                  <button
                    onClick={onCreateEntity}
                    style={{
                      padding: "12px 16px",
                      borderRadius: 14,
                      background: "linear-gradient(180deg, rgba(50,43,33,0.95) 0%, rgba(22,23,25,0.98) 100%)",
                      border: "1px solid rgba(170,141,87,0.18)",
                      color: "#f6efe2",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    + Nuova entità
                  </button>
                </div>
              </div>
            </div>
          </Section>

          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 18 }}>
            <Section
              title="Entità create di recente"
              subtitle="Le ultime aggiunte al mondo, ordinate per data di creazione."
              icon={<Sparkles size={20} color="#d4b778" />}
            >
              <div style={{ display: "grid", gap: 10 }}>
                {recentCreated.map((entity) => (
                  <EntityButton
                    key={entity.id}
                    entity={entity}
                    entityTypes={entityTypes}
                    extra={new Date(entity.createdAt).toLocaleDateString("it-IT")}
                    onClick={() => onOpenEntity(entity.id)}
                  />
                ))}
              </div>
            </Section>

            <Section
              title="Eventi ordinati cronologicamente"
              subtitle="La timeline prende prima ordine cronologico, poi anno."
              icon={<BookOpen size={20} color="#d4b778" />}
            >
              <div style={{ display: "grid", gap: 10 }}>
                {chronologicalEvents.length > 0 ? (
                  chronologicalEvents.map((entity) => {
                    const extra = [entity.metadata?.ordineCronologico, entity.metadata?.anno, entity.metadata?.epoca]
                      .filter(Boolean)
                      .join(" · ");
                    return (
                      <EntityButton
                        key={entity.id}
                        entity={entity}
                        entityTypes={entityTypes}
                        extra={extra || "evento"}
                        onClick={() => onOpenEntity(entity.id)}
                      />
                    );
                  })
                ) : (
                  <div style={{ color: "#aab7c8" }}>Nessun evento presente.</div>
                )}
              </div>
            </Section>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 18 }}>
            <Section
              title="Fazioni principali"
              subtitle="Ordinate per numero di connessioni nel grafo."
              icon={<Shield size={20} color="#d4b778" />}
            >
              <div style={{ display: "grid", gap: 10 }}>
                {rankedFactions.length > 0 ? (
                  rankedFactions.map(({ entity, connections }) => (
                    <EntityButton
                      key={entity.id}
                      entity={entity}
                      entityTypes={entityTypes}
                      extra={`${connections} connessioni`}
                      onClick={() => onOpenEntity(entity.id)}
                    />
                  ))
                ) : (
                  <div style={{ color: "#aab7c8" }}>Nessuna fazione presente.</div>
                )}
              </div>
            </Section>

            <Section
              title="Luoghi principali"
              subtitle="I luoghi con la maggiore centralità narrativa o strutturale."
              icon={<MapPinned size={20} color="#d4b778" />}
            >
              <div style={{ display: "grid", gap: 10 }}>
                {rankedPlaces.length > 0 ? (
                  rankedPlaces.map(({ entity, connections }) => (
                    <EntityButton
                      key={entity.id}
                      entity={entity}
                      entityTypes={entityTypes}
                      extra={`${connections} connessioni`}
                      onClick={() => onOpenEntity(entity.id)}
                    />
                  ))
                ) : (
                  <div style={{ color: "#aab7c8" }}>Nessun luogo presente.</div>
                )}
              </div>
            </Section>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "minmax(320px, 0.9fr) minmax(0, 1.1fr)", gap: 18 }}>
            <Section
              title="Tag più usati"
              subtitle="Una mappa veloce dei temi, delle regioni e delle storyline che ricorrono di più."
              icon={<Sparkles size={20} color="#d4b778" />}
            >
              <TagCloud tags={tagCounts} onOpenTagEntity={onOpenEntity} />
            </Section>

            <Section
              title="Entità senza relazioni"
              subtitle="Questi nodi esistono già ma non sono ancora collegati al resto del mondo."
              icon={<Link2 size={20} color="#d4b778" />}
            >
              <div style={{ display: "grid", gap: 10 }}>
                {entitiesWithoutRelations.length > 0 ? (
                  entitiesWithoutRelations.slice(0, 8).map((entity) => (
                    <EntityButton
                      key={entity.id}
                      entity={entity}
                      entityTypes={entityTypes}
                      extra="da collegare"
                      onClick={() => onOpenEntity(entity.id)}
                    />
                  ))
                ) : (
                  <div style={{ color: "#aab7c8" }}>Ottimo: tutte le entità hanno almeno una relazione.</div>
                )}
              </div>
            </Section>
          </div>
        </>
      )}
    </div>
  );
}
