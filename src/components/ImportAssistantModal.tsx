import type { Entity, EntityTypeDefinition, WorldData } from "../types";
import { dangerButtonLargeStyle, panelStyle, primaryButtonLargeStyle, secondaryButtonLargeStyle } from "../styles";

type PreparedImportDraft = WorldData & {
  imageAssets?: Array<{
    id: string;
    dataUrl: string;
    mimeType?: string;
  }>;
};

type ImportEntityReviewStatus = "new" | "probable-match" | "conflict" | "duplicate";

type ImportEntityReview = {
  importedEntity: Entity;
  status: ImportEntityReviewStatus;
  matchedEntity?: Entity;
  reason: string;
};

type ImportAssistantModalProps = {
  open: boolean;
  fileName: string;
  mode: "merge" | "replace";
  draft: PreparedImportDraft;
  mergedEntityTypes: EntityTypeDefinition[];
  entityReviews: ImportEntityReview[];
  isApplying: boolean;
  onModeChange: (value: "merge" | "replace") => void;
  onCancel: () => void;
  onConfirm: () => void;
};

function countByStatus(reviews: ImportEntityReview[], status: ImportEntityReviewStatus) {
  return reviews.filter((review) => review.status === status).length;
}

function statusColor(status: ImportEntityReviewStatus) {
  if (status === "new") return "#0f766e";
  if (status === "duplicate") return "#1d4ed8";
  if (status === "probable-match") return "#b45309";
  return "#991b1b";
}

function statusLabel(status: ImportEntityReviewStatus) {
  if (status === "new") return "Nuovo";
  if (status === "duplicate") return "Duplicato";
  if (status === "probable-match") return "Match probabile";
  return "Conflitto";
}

export default function ImportAssistantModal({
  open,
  fileName,
  mode,
  draft,
  mergedEntityTypes,
  entityReviews,
  isApplying,
  onModeChange,
  onCancel,
  onConfirm,
}: ImportAssistantModalProps) {
  if (!open) return null;

  const duplicateCount = countByStatus(entityReviews, "duplicate");
  const probableCount = countByStatus(entityReviews, "probable-match");
  const conflictCount = countByStatus(entityReviews, "conflict");
  const newCount = countByStatus(entityReviews, "new");

  const groupedReviews: ImportEntityReviewStatus[] = [
    "conflict",
    "probable-match",
    "new",
    "duplicate",
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 120,
        background: "rgba(2,6,23,0.76)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          ...panelStyle,
          width: "min(1120px, 100%)",
          maxHeight: "90vh",
          overflow: "auto",
          border: "1px solid rgba(96,165,250,0.2)",
          display: "grid",
          gap: 18,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ margin: 0 }}>Import assistito</h2>
            <div style={{ color: "#9ca3af", marginTop: 6 }}>
              Preview di <strong>{fileName}</strong> prima di applicare modifiche al mondo corrente.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => onModeChange("merge")}
              style={{
                ...secondaryButtonLargeStyle,
                background: mode === "merge" ? "linear-gradient(180deg, #1d4ed8 0%, #1e40af 100%)" : secondaryButtonLargeStyle.background,
              }}
            >
              Merge guidato
            </button>
            <button
              type="button"
              onClick={() => onModeChange("replace")}
              style={{
                ...dangerButtonLargeStyle,
                opacity: mode === "replace" ? 1 : 0.72,
              }}
            >
              Replace completo
            </button>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12,
          }}
        >
          {[
            { label: "Entità importate", value: draft.entities.length, color: "#1d4ed8" },
            { label: "Relazioni importate", value: draft.relations.length, color: "#0f766e" },
            { label: "Tipi disponibili", value: mode === "replace" ? draft.entityTypes?.length ?? 0 : mergedEntityTypes.length, color: "#7c3aed" },
            { label: "Nuove", value: newCount, color: statusColor("new") },
            { label: "Match probabili", value: probableCount, color: statusColor("probable-match") },
            { label: "Conflitti", value: conflictCount, color: statusColor("conflict") },
            { label: "Duplicati", value: duplicateCount, color: statusColor("duplicate") },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                borderRadius: 16,
                border: `1px solid ${item.color}33`,
                background: "rgba(15,23,42,0.84)",
                padding: 14,
                display: "grid",
                gap: 4,
              }}
            >
              <div style={{ fontSize: 12, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {item.label}
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#f8fafc" }}>{item.value}</div>
            </div>
          ))}
        </div>

        {mode === "replace" ? (
          <div
            style={{
              borderRadius: 16,
              border: "1px solid rgba(248,113,113,0.22)",
              background: "rgba(69,10,10,0.28)",
              padding: 16,
              color: "#fee2e2",
              lineHeight: 1.6,
            }}
          >
            Replace sostituirà l’intero dataset corrente con il contenuto del backup e rimuoverà gli asset immagini non più usati dopo l’applicazione riuscita.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            <div style={{ color: "#cbd5e1", lineHeight: 1.6 }}>
              Il merge non applica più fusioni silenziose. I conflitti vengono importati come nuove entità nominate in modo sicuro, i duplicati vengono ignorati, i match probabili vengono uniti solo sui record compatibili.
            </div>

            {groupedReviews.map((status) => {
              const reviews = entityReviews.filter((review) => review.status === status);
              if (reviews.length === 0) return null;

              return (
                <section key={status} style={{ display: "grid", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <strong style={{ color: "#f8fafc" }}>{statusLabel(status)}</strong>
                    <span
                      style={{
                        padding: "4px 10px",
                        borderRadius: 999,
                        background: `${statusColor(status)}22`,
                        border: `1px solid ${statusColor(status)}44`,
                        color: "#f8fafc",
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      {reviews.length}
                    </span>
                  </div>

                  <div style={{ display: "grid", gap: 10 }}>
                    {reviews.slice(0, 8).map((review) => (
                      <div
                        key={`${status}:${review.importedEntity.id}`}
                        style={{
                          borderRadius: 14,
                          border: `1px solid ${statusColor(status)}33`,
                          background: "rgba(15,23,42,0.72)",
                          padding: 14,
                          display: "grid",
                          gap: 8,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                          <div>
                            <div style={{ fontWeight: 800, color: "#f8fafc" }}>{review.importedEntity.name}</div>
                            <div style={{ color: "#94a3b8", fontSize: 13 }}>{review.importedEntity.type}</div>
                          </div>
                          {review.matchedEntity ? (
                            <div style={{ color: "#cbd5e1", fontSize: 13 }}>
                              Match: <strong>{review.matchedEntity.name}</strong>
                            </div>
                          ) : null}
                        </div>
                        <div style={{ color: "#cbd5e1", lineHeight: 1.55 }}>{review.reason}</div>
                      </div>
                    ))}

                    {reviews.length > 8 ? (
                      <div style={{ color: "#94a3b8", fontSize: 13 }}>
                        +{reviews.length - 8} altri elementi in questa categoria
                      </div>
                    ) : null}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
          <button type="button" onClick={onCancel} style={secondaryButtonLargeStyle} disabled={isApplying}>
            Annulla
          </button>
          <button type="button" onClick={onConfirm} style={primaryButtonLargeStyle} disabled={isApplying}>
            {isApplying ? "Applicazione in corso..." : mode === "replace" ? "Conferma replace" : "Applica merge"}
          </button>
        </div>
      </div>
    </div>
  );
}
