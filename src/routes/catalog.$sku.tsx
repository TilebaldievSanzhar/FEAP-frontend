import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Calculator, Download, FolderOpen, Pencil } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { CatalogEditor } from "@/components/catalog/CatalogEditor";
import { CodeSourceBadge } from "@/components/dt/badges";
import { CountryChip } from "@/components/tariff/CountryChip";
import { HsChain } from "@/components/tariff/HsChain";
import { TariffSummary } from "@/components/tariff/TariffSummary";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCatalog, useUpsertCatalogItem } from "@/api/dt";
import { normalizeOrigin, useCodeLookup } from "@/api/tnved";
import { formatHsCode, type CatalogItemOut } from "@/api/dt-types";
import { useHasRole } from "@/stores/auth";
import { parseApiError } from "@/lib/errors";
import { formatIsoDate, todayIso } from "@/lib/tariff";

const ORIGIN_KEYS = ["origin", "origin_country", "country", "страна", "происхождение"];
const MANUFACTURER_KEYS = ["manufacturer", "producer", "производитель"];

function attr(item: CatalogItemOut, keys: string[]): string | null {
  for (const [k, v] of Object.entries(item.attributes)) {
    if (keys.includes(k.toLowerCase()) && v != null && String(v).trim()) return String(v).trim();
  }
  return null;
}

/**
 * «Товары» → паспорт товара (v3 §3.3, P1): code + rationale, rates & measures,
 * conformity docs (P2), usage. Catalog has no GET-by-id, so the record is
 * found through the list endpoint by exact SKU.
 */
function PassportPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { sku } = Route.useParams();
  const canWrite = useHasRole("declarant");
  const list = useCatalog({ q: sku, limit: 50 });
  const upsert = useUpsertCatalogItem();
  const [editOpen, setEditOpen] = useState(false);

  const item = list.data?.items.find((i) => i.sku === sku) ?? null;
  const origin = item ? normalizeOrigin(attr(item, ORIGIN_KEYS)) : null;
  const manufacturer = item ? attr(item, MANUFACTURER_KEYS) : null;
  const lookup = useCodeLookup(item?.hs_code ?? null, { origin });

  const crumbs = [t("shell.sectionWork"), t("shell.navCatalog"), sku];

  if (list.isLoading) {
    return (
      <AppShell crumbs={crumbs}>
        <Skeleton className="mb-4 h-16 w-2/3" />
        <Skeleton className="h-64 w-full" />
      </AppShell>
    );
  }

  if (!item) {
    return (
      <AppShell crumbs={crumbs}>
        <div className="alert alert-warn max-w-[760px]">
          <div className="flex-1 text-[12.5px]">
            {list.error ? parseApiError(list.error).message : t("passport.notFound", { sku })}
          </div>
          <Button size="sm" variant="outline" asChild>
            <Link to="/catalog">{t("passport.backToList")}</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const approvedAt = item.approved_at
    ? new Date(item.approved_at).toLocaleDateString(i18n.language === "ky" ? "ky-KG" : "ru-RU")
    : null;
  const ownAttrs = Object.entries(item.attributes);

  return (
    <AppShell crumbs={crumbs}>
      <div className="-mx-8 -mt-7 mb-6 border-b border-[var(--border)] bg-[hsl(var(--card))] px-7 py-[18px]">
        <div className="mb-2 text-[12px] text-[var(--text-subtle)]">
          <Link to="/catalog" className="no-underline hover:underline">
            {t("shell.navCatalog")}
          </Link>{" "}
          <span className="mx-1 text-[var(--text-faint)]">/</span> <span className="font-mono">{item.sku}</span>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div className="min-w-0">
            <h1 className="text-2xl font-medium tracking-tight">{item.description}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2.5">
              {item.hs_code ? (
                <span className="font-mono text-[15px] font-semibold">{formatHsCode(item.hs_code)}</span>
              ) : (
                <span className="text-[12.5px] text-[var(--text-faint)]">{t("catalog.noCode")}</span>
              )}
              {origin ? <CountryChip code={origin} /> : null}
              {manufacturer ? <span className="text-[12px] text-[var(--text-subtle)]">{manufacturer}</span> : null}
              <span className="chip chip-outline">
                {item.approved_by
                  ? t("passport.approved", { by: item.approved_by, date: approvedAt ?? "" })
                  : t("passport.notApproved")}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" className="text-[var(--text-faint)]" disabled>
              <Download /> {t("passport.pdfSoon")}
            </Button>
            {canWrite ? (
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                <Pencil /> {t("passport.edit")}
              </Button>
            ) : null}
            {item.hs_code ? (
              <Button
                onClick={() =>
                  void navigate({
                    to: "/declarations/new",
                    search: { code: item.hs_code ?? undefined, origin: origin ?? undefined, desc: item.description },
                  })
                }
              >
                <FolderOpen /> {t("passport.toShipment")}
              </Button>
            ) : (
              <Button onClick={() => void navigate({ to: "/calc", search: { desc: item.description } })}>
                <Calculator /> {t("passport.calcCode")}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-4">
          {item.hs_code ? (
            <section className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[hsl(var(--card))]">
              <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
                <span className="text-[13px] font-semibold">{t("passport.codeTitle")}</span>
                <CodeSourceBadge source="catalog" />
              </div>
              <div className="flex flex-col gap-3 px-4 py-3.5">
                <HsChain code={item.hs_code} withSubheading />
                <div className="text-[12.5px] leading-relaxed text-[var(--text-muted)]">
                  {item.approved_by ? t("passport.codeApprovedNote") : t("passport.codeDraftNote")}
                </div>
              </div>
            </section>
          ) : null}

          {item.hs_code ? (
            <section className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[hsl(var(--card))]">
              <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
                <span className="text-[13px] font-semibold">{t("passport.ratesTitle")}</span>
                <span className="text-[11.5px] text-[var(--text-subtle)]">
                  {t("calc.asOf", { date: formatIsoDate(todayIso()) })}
                </span>
              </div>
              <div className="px-[18px] pb-4">
                {lookup.isLoading ? (
                  <Skeleton className="mt-3 h-40 w-full" />
                ) : lookup.data ? (
                  <TariffSummary info={lookup.data} origin={origin} />
                ) : (
                  <div className="py-3 text-[12.5px] text-[var(--text-subtle)]">
                    {lookup.error ? parseApiError(lookup.error).message : "—"}
                  </div>
                )}
                {!origin ? (
                  <div className="mt-2.5 text-[11.5px] text-[var(--text-subtle)]">{t("passport.noOriginHint")}</div>
                ) : null}
              </div>
            </section>
          ) : null}

          <section className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[hsl(var(--card))]">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
              <span className="text-[13px] font-semibold">{t("passport.docsTitle")}</span>
              <span className="chip chip-outline font-mono">P2</span>
            </div>
            <div className="px-4 py-3.5 text-[12.5px] text-[var(--text-subtle)]">{t("passport.docsHint")}</div>
          </section>
        </div>

        <aside className="flex flex-col gap-3.5">
          <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[hsl(var(--card))]">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
              <span className="text-[13px] font-semibold">{t("passport.historyTitle")}</span>
              <span className="font-mono text-[12px] tabular-nums">{item.usage_count}</span>
            </div>
            <div className="flex flex-col gap-2 px-4 py-3 text-[12.5px] text-[var(--text-muted)]">
              {item.usage_count > 0 ? t("passport.usage", { n: item.usage_count }) : t("passport.usageNone")}
              <Link to="/declarations" className="text-[12px] text-[var(--primary)] no-underline hover:underline">
                {t("passport.allShipments")}
              </Link>
            </div>
          </div>
          <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[hsl(var(--card))]">
            <div className="border-b border-[var(--border)] px-4 py-3 text-[13px] font-semibold">
              {t("catalog.colAttrs")}
            </div>
            <div className="px-4 py-3">
              {ownAttrs.length ? (
                <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-3.5 gap-y-1.5 text-[12.5px]">
                  {ownAttrs.map(([k, v]) => (
                    <div key={k} className="contents">
                      <dt className="font-mono text-[11.5px] text-[var(--text-subtle)]">{k}</dt>
                      <dd className="m-0">{String(v)}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <div className="text-[12px] text-[var(--text-faint)]">—</div>
              )}
            </div>
          </div>
        </aside>
      </div>

      <CatalogEditor
        key={item.id}
        open={editOpen}
        onOpenChange={setEditOpen}
        item={item}
        pending={upsert.isPending}
        onSubmit={async (payload) => {
          try {
            await upsert.mutateAsync(payload);
            setEditOpen(false);
            toast.success(t("catalog.saved"));
          } catch (err) {
            toast.error(parseApiError(err).message);
          }
        }}
      />
    </AppShell>
  );
}

export const Route = createFileRoute("/catalog/$sku")({
  component: PassportPage,
});
