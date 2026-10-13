import { cn } from "@/lib/utils";
import type { CodeSource, DraftStatus, MatchVerdict, PermitStatus } from "@/api/dt-types";

type BadgeKind = "ok" | "warn" | "danger" | "info" | "mute";

const KIND_CLASSES: Record<BadgeKind, string> = {
  ok: "bg-[var(--success-tint)] text-[var(--success)]",
  warn: "bg-[var(--warn-tint)] text-[var(--warn-strong)]",
  danger: "bg-[var(--danger-tint)] text-[var(--danger)]",
  info: "bg-[var(--info-tint)] text-[var(--info)]",
  mute: "bg-[var(--bg-muted)] text-[var(--text-subtle)]",
};

const DOT_CLASSES: Record<BadgeKind, string> = {
  ok: "bg-[var(--success)]",
  warn: "bg-[var(--warn)]",
  danger: "bg-[var(--danger)]",
  info: "bg-[var(--info)]",
  mute: "bg-[var(--text-faint)]",
};

/** Mono pill with a status dot — the design's `.feap-status`. */
export function StatusPill({
  kind,
  children,
  className,
}: {
  kind: BadgeKind;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-[22px] items-center gap-1.5 rounded-full px-2 font-mono text-[11px] font-medium",
        KIND_CLASSES[kind],
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", DOT_CLASSES[kind])} />
      {children}
    </span>
  );
}

const DOSSIER_KIND: Record<string, BadgeKind> = {
  draft: "mute",
  classifying: "info",
  review: "warn",
  ready: "ok",
};

export function DossierStatusBadge({ status }: { status: string }) {
  return <StatusPill kind={DOSSIER_KIND[status] ?? "mute"}>{status}</StatusPill>;
}

const DRAFT_KIND: Record<DraftStatus, BadgeKind> = {
  ready: "ok",
  has_errors: "danger",
  needs_input: "warn",
};

export function DraftStatusBadge({ status }: { status: DraftStatus }) {
  return <StatusPill kind={DRAFT_KIND[status] ?? "mute"}>{status}</StatusPill>;
}

const DOC_STATUS_KIND: Record<string, BadgeKind> = {
  attached: "mute",
  needs_kind: "warn",
  extracted: "ok",
};

export function DocStatusBadge({ status }: { status: string }) {
  return <StatusPill kind={DOC_STATUS_KIND[status] ?? "mute"}>{status}</StatusPill>;
}

const PERMIT_KIND: Record<PermitStatus, BadgeKind> = {
  found: "ok",
  format_ok: "mute",
  unavailable: "mute",
  not_found: "warn",
  status_mismatch: "warn",
  code_mismatch: "warn",
  format_invalid: "danger",
};

export function PermitStatusBadge({ status }: { status: PermitStatus }) {
  return <StatusPill kind={PERMIT_KIND[status] ?? "mute"}>{status}</StatusPill>;
}

const VERDICT_KIND: Record<MatchVerdict | "consistent" | "questionable", BadgeKind> = {
  match: "ok",
  consistent: "ok",
  uncertain: "mute",
  questionable: "warn",
  mismatch: "danger",
};

export function VerdictBadge({ verdict }: { verdict: keyof typeof VERDICT_KIND }) {
  return <StatusPill kind={VERDICT_KIND[verdict] ?? "mute"}>{verdict}</StatusPill>;
}

// ── Source-of-code badge (каскад / каталог / вручную) ──────────────────────

const SOURCE_STYLE: Record<CodeSource, { label: string; className: string }> = {
  cascade: { label: "каскад", className: "bg-[var(--primary-tint)] text-[var(--primary)]" },
  catalog: { label: "каталог", className: "bg-[var(--success-tint)] text-[var(--success)]" },
  manual: { label: "вручную", className: "bg-[var(--bg-muted)] text-[var(--text-subtle)]" },
};

export function CodeSourceBadge({
  source,
  confidence,
}: {
  source: CodeSource;
  confidence?: number | null;
}) {
  const cfg = SOURCE_STYLE[source];
  return (
    <span
      className={cn(
        "inline-flex h-[18px] items-center gap-1 rounded-full px-[7px] font-mono text-[10.5px]",
        cfg.className,
      )}
    >
      {cfg.label}
      {confidence != null ? <span className="tabular-nums">· {confidence.toFixed(2)}</span> : null}
    </span>
  );
}

/** «гр. 22» reference badge next to a field label. */
export function GBadge({ g }: { g: string }) {
  return <span className="g-badge">гр. {g}</span>;
}
