import { beforeAll, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryHistory, createRootRoute, createRouter, RouterProvider } from "@tanstack/react-router";

import { initI18n } from "@/i18n";
import { DtDraftTab } from "@/components/dt/DtDraftTab";
import { RemedyDecisionCard } from "@/components/tariff/RemedyDecisionCard";
import { TariffSummary } from "@/components/tariff/TariffSummary";
import { emptyShipment, type DtDraftOut } from "@/api/dt-types";
import type { TnvedCodeInfo, TradeRemedy } from "@/api/types";

beforeAll(() => {
  initI18n("ru");
  // Lookups hit the network in hooks; the tests only care about rendering.
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("offline"))));
});

function withQuery(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{ui}</QueryClientProvider>;
}

const AD32: TradeRemedy = {
  measure_no: "AD-32",
  kind: "antidumping",
  title: "Алюминиевая посуда",
  product_description: "Штампованная и литая алюминиевая посуда для бытовых и иных нужд",
  countries: ["CN"],
  rates: [{ rate_pct: "21.89", country: null, producers: [], variant: null }],
  valid_to: "2027-05-28",
  legal_basis: "Решение Коллегии ЕЭК от 24 августа 2021 г. № 107",
  source_url: "https://remedies.eaeunion.org/x",
  status: "may_apply",
};

// v3 spec §5.1 example: aluminium cookware from CN, 10 000 USD @ 87.5, DAP.
function v3Draft(decision: "applies" | null): DtDraftOut {
  const g47 = [
    { kind: "duty", code: "2010", basis: "875000.00", rate: "9%", amount: "78750.00", missing: [], note: null, ref: null },
    ...(decision === "applies"
      ? [{ kind: "antidumping", code: "2050", basis: "875000.00", rate: "21.89%", amount: "191537.50", missing: [], note: "мера AD-32: Алюминиевая посуда", ref: "AD-32" }]
      : []),
    { kind: "vat", code: "5010", basis: "953750.00", rate: "12%", amount: "114450.00", missing: [], note: null, ref: null },
  ] as DtDraftOut["graphs"]["items"][number]["g47"];
  return {
    id: "d1",
    shipment_id: "s1",
    version: 4,
    status: decision ? "ready" : "needs_input",
    structure_version: "1",
    created_at: "2026-10-13T10:00:00Z",
    findings: [
      { rule: "W-REMEDY-EXEMPT", severity: "warning", graph: "items[0].g44", message: "Освобождение без документа", details: {} },
    ],
    missing_parameters: decision
      ? []
      : [
          "Товар 1 (7615101000): антидемпинговая мера AD-32 «Алюминиевая посуда» (CN) совпадает по коду — подтвердите, подпадает ли товар под описание меры (remedy_decisions['AD-32']: applies / not_applicable / exempt)",
        ],
    graphs: {
      meta: { procedure: "IM40", structure_version: "1", rate_date: "2026-10-13", generated_at: "", vat_base_includes_remedies: false, fee_mode: "percent" },
      header: {
        g01: { direction: "ИМ", procedure: "40", form: "ЭД" },
        g02: null, g03: { sheets: 1 }, g05: 1, g06: null, g07: null, g08: null, g09: null,
        g11: null, g12: "875000.00", g14: null, g15: null, g17: "KG", g18: null, g19: null,
        g20: { incoterms: "DAP", place: null }, g21: null,
        g22: { currency: "USD", amount: "10000.00" }, g23: { rate: "87.5", date: "2026-10-13" },
        g24: null, g25: null, g37: { requested: "40", previous: "00", feature: "000" },
      },
      items: [
        {
          g32: 1,
          g31: { description: "Кастрюли литые алюминиевые", qty: null, qty_unit: null, packages: null, sku: null },
          g33: "7615101000", g34: "CN", g35: null, g36: null, g38: null,
          g41: { qty: null, unit: null, required_unit: null },
          g42: "10000.00", g43: "1", g44: [], g45: "875000.00", g46: null,
          g47,
          tariff: {
            origin_regime: null,
            preferential_duty_rate: null,
            preferential_rate_applied: false,
            remedies: [{ measure_no: "AD-32", kind: "antidumping", title: "Алюминиевая посуда", decision, notes: null, ...(decision ? { rate: "21.89%" } : {}) }],
            vat_options: [],
            vat_benefit: null,
            vat_benefit_applied: false,
          },
        },
      ],
      totals: {
        g05: 1, g03_sheets: 1, g12: "875000.00", invoice_total: "10000.00", additions_total: "0.00",
        payments: decision
          ? { duty: "78750.00", antidumping: "191537.50", vat: "114450.00", fee: "3500.00" }
          : { duty: "78750.00", vat: "114450.00", fee: "3500.00" },
        fee_line: { kind: "fee", code: "1010", basis: "875000.00", rate: "0.4% от таможенной стоимости", amount: "3500.00", missing: [], note: "ПП КР № 79 от 13.02.2020, п. 38" },
      },
    },
  };
}

function renderDraft(draft: DtDraftOut, handlers: Partial<{ onGoToItem: () => void; onGoToDocs: () => void }> = {}) {
  return render(
    withQuery(
      <DtDraftTab
        draft={draft}
        draftLoading={false}
        hasDraft
        canWrite
        generating={false}
        onGenerate={() => undefined}
        onExport={() => undefined}
        exporting={null}
        model={emptyShipment()}
        onApplyPatch={() => undefined}
        onGoToItem={handlers.onGoToItem ?? (() => undefined)}
        onGoToDocs={handlers.onGoToDocs ?? (() => undefined)}
      />,
    ),
  );
}

const digits = (s: string | null | undefined) => (s ?? "").replace(/\D/g, "");

describe("DtDraftTab v3", () => {
  it("renders the remedy line, dynamic totals and the fee", () => {
    renderDraft(v3Draft("applies"));
    expect(screen.getAllByText("Антидемпинговая пошлина").length).toBeGreaterThan(0);
    expect(screen.getAllByText("AD-32").length).toBeGreaterThan(0);
    // 78750 + 191537.50 + 114450 + 3500 — summed exactly from the backend strings
    expect(screen.getAllByText((_, el) => el?.tagName === "DIV" && digits(el.textContent).startsWith("38823750")).length).toBeGreaterThan(0);
    expect(screen.getByText("Сбор · гр. B")).toBeInTheDocument();
    expect(screen.getByText(/База НДС: без пошлин защиты рынка/)).toBeInTheDocument();
  });

  it("keeps a pending remedy out of the total and links to the decision", () => {
    const onGoToItem = vi.fn();
    renderDraft(v3Draft(null), { onGoToItem });
    expect(screen.getByText(/не входят в сумму/)).toBeInTheDocument();
    const resolve = screen.getAllByRole("button", { name: /Решить/ });
    fireEvent.click(resolve[0]);
    expect(onGoToItem).toHaveBeenCalledWith(1, "AD-32");
  });

  it("sends W-REMEDY-EXEMPT to the documents tab", () => {
    const onGoToDocs = vi.fn();
    renderDraft(v3Draft("applies"), { onGoToDocs });
    fireEvent.click(screen.getByRole("button", { name: /Во вкладку «Документы»/ }));
    expect(onGoToDocs).toHaveBeenCalled();
  });
});

describe("RemedyDecisionCard", () => {
  it("records a decision and asks for a justification on «не подпадает»", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <RemedyDecisionCard
        measure={AD32}
        origin="CN"
        value={undefined}
        manufacturer={null}
        onChange={onChange}
        onManufacturerChange={() => undefined}
      />,
    );
    fireEvent.click(screen.getByRole("radio", { name: /Нет, товар не подпадает/ }));
    expect(onChange).toHaveBeenCalledWith({ decision: "not_applicable" });

    rerender(
      <RemedyDecisionCard
        measure={AD32}
        origin="CN"
        value={{ decision: "not_applicable" }}
        manufacturer={null}
        onChange={onChange}
        onManufacturerChange={() => undefined}
      />,
    );
    expect(screen.getByText(/Обоснование обязательно/)).toBeInTheDocument();
    expect(screen.getByText("21,89%")).toBeInTheDocument();
  });
});

describe("TariffSummary", () => {
  it("shows rates, the fee rule and the remedy as «может применяться»", async () => {
    const info: TnvedCodeInfo = {
      code: "7615101000",
      code_formatted: "7615 10 100 0",
      name: "литые",
      chain: [],
      duty_rate: "9%",
      vat_rate: "12%",
      excise_rate: null,
      vat_conditional: [],
      trade_remedies: [AD32],
      customs_fee: "0.4% от таможенной стоимости ДТ, не менее 500 сом и не более 250000 сом — ПП КР № 79 от 13.02.2020, п. 38",
    };
    render(withQuery(<TariffSummaryHarness info={info} />));
    expect(await screen.findByText("может применяться")).toBeInTheDocument();
    expect(screen.getByText("0,4%")).toBeInTheDocument();
    expect(screen.getByText("Нетарифные меры по коду не найдены")).toBeInTheDocument();
  });
});

// TariffSummary renders router <Link>s; a memory router keeps them happy.
function TariffSummaryHarness({ info }: { info: TnvedCodeInfo }) {
  const router = createRouter({
    routeTree: createRootRoute({ component: () => <TariffSummary info={info} origin="CN" openFirstRemedy /> }),
    history: createMemoryHistory(),
  });
  return <RouterProvider router={router} />;
}
