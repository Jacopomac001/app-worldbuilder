import { useMemo, useState } from "react";
import { metaPillStyle, panelStyle, timelineBadgeStyle, timelineItemStyle } from "../styles";
import type { Entity } from "../types";
import { getEntityTypeIcon, uiIcons } from "../utils/icons";

type TimelineWorkbenchEvent = {
  entity: Entity;
  anno: string;
  epoca: string;
  ordineCronologico: string;
  stato: string;
  parsedYear: number | null;
  parsedOrder: number | null;
};

type TimelineWorkbenchProps = {
  events: TimelineWorkbenchEvent[];
  periods: string[];
  periodFilter: string;
  onPeriodFilterChange: (value: string) => void;
  selectedEntityId: string;
  onSelectEntity: (id: string) => void;
  getStatusColor: (status: string) => string;
};

function groupByEra(events: TimelineWorkbenchEvent[]) {
  const map = new Map<string, TimelineWorkbenchEvent[]>();

  events.forEach((event) => {
    const key = event.epoca.trim() || "Senza epoca";
    const bucket = map.get(key) ?? [];
    bucket.push(event);
    map.set(key, bucket);
  });

  return Array.from(map.entries());
}

export default function TimelineWorkbench({
  events,
  periods,
  periodFilter,
  onPeriodFilterChange,
  selectedEntityId,
  onSelectEntity,
  getStatusColor,
}: TimelineWorkbenchProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [groupMode, setGroupMode] = useState<"era" | "flat">("era");

  const timelineStatuses = useMemo(() => {
    return Array.from(new Set(events.map((event) => event.stato.trim()).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b, "it", { sensitivity: "base" })
    );
  }, [events]);

  const filteredEvents = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const normalizedStatus = statusFilter.trim().toLowerCase();

    return events.filter((event) => {
      const matchesPeriod =
        periodFilter === "all" ||
        event.epoca.trim().toLowerCase() === periodFilter.trim().toLowerCase();
      const matchesStatus =
        normalizedStatus === "all" ||
        event.stato.trim().toLowerCase() === normalizedStatus;
      const haystack = [
        event.entity.name,
        event.entity.shortDescription,
        event.entity.notes,
        event.anno,
        event.epoca,
        event.ordineCronologico,
        event.stato,
        ...event.entity.tags,
        ...Object.values(event.entity.metadata ?? {}),
      ]
        .join(" ")
        .toLowerCase();
      const matchesSearch = !normalizedSearch || haystack.includes(normalizedSearch);

      return matchesPeriod && matchesStatus && matchesSearch;
    });
  }, [events, periodFilter, search, statusFilter]);

  const groupedEvents = useMemo(() => groupByEra(filteredEvents), [filteredEvents]);
  const selectedEvent = events.find((event) => event.entity.id === selectedEntityId) ?? null;

  return (
    <div
      style={{
        ...panelStyle,
        border: "1px solid #263244",
        boxShadow: "0 16px 40px rgba(0,0,0,0.18)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "12px",
          flexWrap: "wrap",
          marginBottom: "14px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <uiIcons.timeline size={18} />
            <h2 style={{ margin: 0 }}>Timeline workbench</h2>
          </div>
          <div
            style={{
              fontSize: "13px",
              color: "#9ca3af",
              marginTop: "4px",
            }}
          >
            Filtra eventi, scorri per epoca e apri al volo la scheda narrativa.
          </div>
        </div>

        <div
          style={{
            fontSize: 12,
            color: "#d5dfeb",
            padding: "8px 10px",
            borderRadius: 999,
            background: "#0b1220",
            border: "1px solid #334155",
          }}
        >
          Eventi: {filteredEvents.length}/{events.length}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(180px, 1fr) minmax(180px, 1fr) minmax(180px, 1fr) auto",
          gap: 10,
          marginBottom: 14,
        }}
      >
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Cerca per evento, note, metadata..."
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: "10px",
            border: "1px solid #374151",
            backgroundColor: "#111827",
            color: "#f3f4f6",
            boxSizing: "border-box",
          }}
        />

        <select
          value={periodFilter}
          onChange={(event) => onPeriodFilterChange(event.target.value)}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: "10px",
            border: "1px solid #374151",
            backgroundColor: "#111827",
            color: "#f3f4f6",
          }}
        >
          <option value="all">Tutte le epoche</option>
          {periods.map((period) => (
            <option key={period} value={period}>
              {period}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: "10px",
            border: "1px solid #374151",
            backgroundColor: "#111827",
            color: "#f3f4f6",
          }}
        >
          <option value="all">Tutti gli stati</option>
          {timelineStatuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setGroupMode("era")}
            style={{
              padding: "10px 12px",
              borderRadius: "10px",
              border: "1px solid #374151",
              background: groupMode === "era" ? "#1d4ed8" : "#111827",
              color: "#f3f4f6",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Per epoca
          </button>
          <button
            type="button"
            onClick={() => setGroupMode("flat")}
            style={{
              padding: "10px 12px",
              borderRadius: "10px",
              border: "1px solid #374151",
              background: groupMode === "flat" ? "#1d4ed8" : "#111827",
              color: "#f3f4f6",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Lista unica
          </button>
        </div>
      </div>

      {selectedEvent ? (
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 14,
          }}
        >
          <span style={metaPillStyle()}>Selezionato: {selectedEvent.entity.name}</span>
          {selectedEvent.epoca ? (
            <button
              type="button"
              onClick={() => onPeriodFilterChange(selectedEvent.epoca)}
              style={{
                ...metaPillStyle(),
                cursor: "pointer",
                border: "1px solid rgba(96,165,250,0.3)",
                background: "rgba(30,41,59,0.98)",
                color: "#dbeafe",
              }}
            >
              Vai a epoca: {selectedEvent.epoca}
            </button>
          ) : null}
        </div>
      ) : null}

      {filteredEvents.length === 0 ? (
        <div
          style={{
            backgroundColor: "#111827",
            border: "1px solid #374151",
            borderRadius: "14px",
            padding: "14px",
            color: "#9ca3af",
            fontSize: "14px",
          }}
        >
          Nessun evento trovato con i filtri attuali.
        </div>
      ) : groupMode === "flat" ? (
        <div style={{ display: "grid", gap: "10px" }}>
          {filteredEvents.map((event) => {
            const isSelected = selectedEntityId === event.entity.id;
            const EventIcon = getEntityTypeIcon(event.entity.type);

            return (
              <button
                key={event.entity.id}
                type="button"
                onClick={() => onSelectEntity(event.entity.id)}
                style={timelineItemStyle(isSelected)}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "10px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "rgba(59,130,246,0.14)",
                        border: "1px solid rgba(59,130,246,0.24)",
                        flexShrink: 0,
                      }}
                    >
                      <EventIcon size={15} />
                    </div>
                    <div style={{ fontWeight: 700, fontSize: "15px", minWidth: 0 }}>{event.entity.name}</div>
                  </div>

                  {event.stato ? (
                    <span style={timelineBadgeStyle(getStatusColor(event.stato))}>{event.stato}</span>
                  ) : null}
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "8px" }}>
                  {event.anno ? <span style={metaPillStyle()}>Anno: {event.anno}</span> : null}
                  {event.epoca ? <span style={metaPillStyle()}>Epoca: {event.epoca}</span> : null}
                  {event.ordineCronologico ? (
                    <span style={metaPillStyle()}>Ordine: {event.ordineCronologico}</span>
                  ) : null}
                </div>

                {event.entity.shortDescription ? (
                  <div style={{ fontSize: "13px", color: "#d1d5db", textAlign: "left" }}>
                    {event.entity.shortDescription}
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {groupedEvents.map(([era, eraEvents]) => (
            <section key={era} style={{ display: "grid", gap: 10 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <strong style={{ color: "#f8fafc" }}>{era}</strong>
                <span style={metaPillStyle()}>{eraEvents.length} eventi</span>
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                {eraEvents.map((event) => {
                  const isSelected = selectedEntityId === event.entity.id;
                  return (
                    <button
                      key={event.entity.id}
                      type="button"
                      onClick={() => onSelectEntity(event.entity.id)}
                      style={timelineItemStyle(isSelected)}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                        <div style={{ display: "grid", gap: 6, textAlign: "left" }}>
                          <div style={{ fontWeight: 700, fontSize: 15 }}>{event.entity.name}</div>
                          {event.entity.shortDescription ? (
                            <div style={{ fontSize: 13, color: "#d1d5db" }}>{event.entity.shortDescription}</div>
                          ) : null}
                        </div>
                        {event.stato ? (
                          <span style={timelineBadgeStyle(getStatusColor(event.stato))}>{event.stato}</span>
                        ) : null}
                      </div>

                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                        {event.anno ? <span style={metaPillStyle()}>Anno: {event.anno}</span> : null}
                        {event.ordineCronologico ? (
                          <span style={metaPillStyle()}>Ordine: {event.ordineCronologico}</span>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
