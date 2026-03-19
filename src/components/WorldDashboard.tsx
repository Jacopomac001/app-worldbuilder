import type { Entity, Relation } from "../types";

type Props = {
  entities: Entity[];
  relations: Relation[];
  onOpenEntity: (id: string) => void;
  onEnterWorkspace: () => void;
  onCreateEntity: () => void;
};

export default function WorldDashboard({
  entities,
  relations,
  onOpenEntity,
  onEnterWorkspace,
  onCreateEntity,
}: Props) {
  const isEmpty = entities.length === 0;

  const events = entities.filter((e) => e.type === "evento");

  const factions = entities
    .filter((e) => e.type === "fazione")
    .map((f) => ({
      entity: f,
      connections: relations.filter(
        (r) => r.fromEntityId === f.id || r.toEntityId === f.id
      ).length,
    }))
    .sort((a, b) => b.connections - a.connections)
    .slice(0, 5);

  const lastModified = [...entities]
    .sort((a, b) => b.lastModified - a.lastModified)
    .slice(0, 6);

  const recentEvents = [...events]
    .sort((a, b) => b.lastModified - a.lastModified)
    .slice(0, 5);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      {/* EMPTY PROJECT */}
      {isEmpty ? (
        <div
          className="panel-enter"
          style={{
            textAlign: "center",
            padding: "80px 20px",
          }}
        >
          <h1>Il tuo mondo è vuoto</h1>

          <p style={{ color: "#9ca3af", marginTop: 8 }}>
            Crea la prima entità per iniziare a costruire il worldbuilding.
          </p>

          <button
            onClick={onCreateEntity}
            style={{
              marginTop: 24,
              padding: "14px 28px",
              borderRadius: 14,
              background: "#2563eb",
              border: "none",
              color: "white",
              fontSize: 16,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            + Crea prima entità
          </button>
        </div>
      ) : (
        <>
          {/* METRICHE */}
          <div
            className="panel-enter"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: 14,
              marginBottom: 28,
            }}
          >
            {[
              ["Entità", entities.length],
              ["Relazioni", relations.length],
              ["Eventi", events.length],
              [
                "Tag",
                new Set(entities.flatMap((e) => e.tags)).size,
              ],
              [
                "Fazioni",
                entities.filter((e) => e.type === "fazione").length,
              ],
              [
                "Personaggi",
                entities.filter((e) => e.type === "personaggio").length,
              ],
            ].map(([label, value]) => (
              <div
                key={label}
                className="interactive-card"
                style={{
                  padding: 18,
                  borderRadius: 16,
                  background: "#111827",
                  border: "1px solid #374151",
                }}
              >
                <div style={{ fontSize: 24, fontWeight: 700 }}>{value}</div>
                <div style={{ color: "#9ca3af" }}>{label}</div>
              </div>
            ))}
          </div>

          {/* ULTIMI MODIFICATI */}
          <Section title="Ultimi modificati">
            {lastModified.map((e) => (
              <Item key={e.id} onClick={() => onOpenEntity(e.id)}>
                {e.name}
              </Item>
            ))}
          </Section>

          {/* EVENTI RECENTI */}
          <Section title="Eventi recenti">
            {recentEvents.map((e) => (
              <Item key={e.id} onClick={() => onOpenEntity(e.id)}>
                {e.name}
              </Item>
            ))}
          </Section>

          {/* FAZIONI PRINCIPALI */}
          <Section title="Fazioni principali">
            {factions.map(({ entity, connections }) => (
              <Item
                key={entity.id}
                onClick={() => onOpenEntity(entity.id)}
              >
                {entity.name} · {connections} connessioni
              </Item>
            ))}
          </Section>

          {/* ENTER WORKSPACE */}
          <div style={{ textAlign: "center", marginTop: 40 }}>
            <button
              onClick={onEnterWorkspace}
              style={{
                padding: "14px 32px",
                borderRadius: 14,
                background: "#2563eb",
                border: "none",
                color: "white",
                fontSize: 16,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Entra nel workspace
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- SUBCOMPONENTS ---------- */

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="panel-enter" style={{ marginBottom: 24 }}>
      <h2>{title}</h2>
      <div
        style={{
          display: "grid",
          gap: 10,
          marginTop: 10,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function Item({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className="interactive-card"
      onClick={onClick}
      style={{
        padding: 14,
        borderRadius: 12,
        background: "#111827",
        border: "1px solid #374151",
        color: "white",
        textAlign: "left",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}