import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Calculator } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { ShipmentFormTab } from "@/components/dt/ShipmentFormTab";
import { useCreateShipment } from "@/api/dt";
import { emptyItem, emptyShipment, formatHsCode, type ShipmentIn } from "@/api/dt-types";
import { useHasRole } from "@/stores/auth";
import { parseApiError } from "@/lib/errors";

/** Prefill from /calc «Создать поставку» — one position with the computed code. */
interface NewShipmentSearch {
  code?: string;
  origin?: string;
  desc?: string;
  value?: string;
  currency?: string;
  qty?: string;
  unit?: string;
  /** Производитель — для индивидуальных ставок мер защиты рынка. */
  mfr?: string;
}

function initialModel(s: NewShipmentSearch): ShipmentIn {
  const model = emptyShipment();
  if (!s.code) return model;
  if (s.currency && /^[A-Z]{3}$/.test(s.currency)) model.contract_currency = s.currency;
  model.items = [
    {
      ...emptyItem(),
      description: s.desc ?? "",
      hs_code: s.code,
      origin_country: s.origin ?? null,
      price: s.value && /^\d+(\.\d+)?$/.test(s.value) ? s.value : "0",
      qty: s.qty && /^\d+(\.\d+)?$/.test(s.qty) ? s.qty : null,
      qty_unit: s.unit ?? null,
      manufacturer: s.mfr ?? null,
      classification_ref: null,
    },
  ];
  return model;
}

function NewDeclarationPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const canWrite = useHasRole("declarant");
  const create = useCreateShipment();

  const [model, setModel] = useState<ShipmentIn>(() => initialModel(search));
  const [dirty, setDirty] = useState(false);

  async function onSave() {
    if (!model.seller.name.trim() || !model.buyer.name.trim()) {
      toast.error(t("ws.partiesRequired"));
      return;
    }
    try {
      const created = await create.mutateAsync(model);
      toast.success(t("ws.created"));
      void navigate({
        to: "/declarations/$shipmentId",
        params: { shipmentId: created.id },
        search: { tab: "items" },
      });
    } catch (err) {
      toast.error(parseApiError(err).message);
    }
  }

  return (
    <AppShell crumbs={[t("shell.navDeclarations"), t("ws.newDossier")]}>
      <header className="mb-5">
        <div className="eyebrow mb-1.5">POST /shipments</div>
        <h1 className="text-2xl font-medium tracking-tight">{t("ws.newDossier")}</h1>
        <p className="mt-1 max-w-[640px] text-[13px] text-[var(--text-subtle)]">
          {t("ws.newDossierHint")}
        </p>
      </header>
      {search.code ? (
        <div className="alert alert-info mb-4 max-w-[760px]">
          <Calculator className="alert-ico h-4 w-4" />
          <div className="text-[12.5px]">
            {t("ws.fromCalc", { code: formatHsCode(search.code) })}
          </div>
        </div>
      ) : null}
      <ShipmentFormTab
        value={model}
        onChange={(m) => {
          setModel(m);
          setDirty(true);
        }}
        onSave={() => void onSave()}
        saving={create.isPending}
        dirty={dirty}
        canWrite={canWrite}
        createMode
      />
    </AppShell>
  );
}

export const Route = createFileRoute("/declarations/new")({
  validateSearch: (search: Record<string, unknown>): NewShipmentSearch => {
    const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : typeof v === "number" ? String(v) : undefined);
    const code = str(search.code)?.replace(/\D/g, "");
    return {
      code: code && code.length === 10 ? code : undefined,
      origin: /^[A-Z]{2}$/.test(str(search.origin)?.toUpperCase() ?? "") ? str(search.origin)?.toUpperCase() : undefined,
      desc: str(search.desc),
      value: str(search.value),
      currency: str(search.currency)?.toUpperCase(),
      qty: str(search.qty),
      unit: str(search.unit)?.slice(0, 20),
      mfr: str(search.mfr)?.slice(0, 300),
    };
  },
  component: NewDeclarationPage,
});
