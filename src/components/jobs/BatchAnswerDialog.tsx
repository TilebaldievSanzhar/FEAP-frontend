import { useMemo } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { useTranslation } from "react-i18next";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ArrowRight, ChevronRight, HelpCircle, Save, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { JobItem } from "@/api/types";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: JobItem[];
  onSubmit: (
    payload: Array<{ item_id: string; answers: Record<string, string> }>,
  ) => Promise<void> | void;
  submitting?: boolean;
}

type FormShape = {
  byItem: Record<string, Record<string, string>>;
};

export function BatchAnswerDialog({ open, onOpenChange, items, onSubmit, submitting }: Props) {
  const { t } = useTranslation();

  const defaults = useMemo<FormShape>(() => {
    const byItem: FormShape["byItem"] = {};
    for (const item of items) {
      const perItem: Record<string, string> = {};
      for (const param of item.partial?.missing_parameters ?? []) {
        perItem[param] = "";
      }
      byItem[item.item_id] = perItem;
    }
    return { byItem };
  }, [items]);

  const { register, handleSubmit, reset, watch } = useForm<FormShape>({
    defaultValues: defaults,
    values: defaults,
  });

  const watched = watch("byItem");
  const totals = useMemo(() => {
    let total = 0;
    let filled = 0;
    for (const item of items) {
      for (const param of item.partial?.missing_parameters ?? []) {
        total += 1;
        const value = watched?.[item.item_id]?.[param];
        if (value && value.trim()) filled += 1;
      }
    }
    return { total, filled };
  }, [items, watched]);

  const submit: SubmitHandler<FormShape> = async (form) => {
    const payload: Array<{ item_id: string; answers: Record<string, string> }> = [];
    for (const item of items) {
      const raw = form.byItem[item.item_id] ?? {};
      const trimmed: Record<string, string> = {};
      for (const [key, value] of Object.entries(raw)) {
        if (value?.trim()) trimmed[key] = value.trim();
      }
      if (Object.keys(trimmed).length) {
        payload.push({ item_id: item.item_id, answers: trimmed });
      }
    }
    if (!payload.length) return;
    await onSubmit(payload);
    reset(defaults);
  };

  const fillPct = totals.total ? Math.round((totals.filled / totals.total) * 100) : 0;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 flex max-h-[92%] w-[720px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[12px] bg-card shadow-[0_24px_48px_-12px_rgba(0,0,0,.25)]",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
          )}
        >
          <div className="border-b border-[var(--border)] px-6 pb-4 pt-5">
            <div className="mb-2 flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--warn-tint)] text-[var(--warn-strong)]">
                <HelpCircle className="h-4 w-4" />
              </div>
              <div>
                <DialogPrimitive.Title className="m-0 text-base font-semibold">
                  {t("jobs.batchAnswerTitle", { count: items.length })}
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="m-0 text-[12.5px] text-[var(--text-subtle)]">
                  {t("jobs.batchAnswerDescription")}
                </DialogPrimitive.Description>
              </div>
              <div className="flex-1" />
              <DialogPrimitive.Close asChild>
                <Button type="button" size="sm" variant="ghost">
                  <X className="h-3.5 w-3.5" />
                </Button>
              </DialogPrimitive.Close>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-[var(--bg-muted)]">
              <div
                className="h-full bg-[var(--primary)] transition-[width]"
                style={{ width: `${fillPct}%` }}
              />
            </div>
            <div className="mt-1.5 flex items-center text-[11.5px] text-[var(--text-subtle)]">
              <span>
                {t("jobs.fieldsFilled", { filled: totals.filled, total: totals.total })}
              </span>
              <div className="flex-1" />
              <span>{t("jobs.attemptStat")}</span>
            </div>
          </div>

          <form
            onSubmit={handleSubmit(submit)}
            className="flex flex-1 flex-col overflow-hidden"
          >
            <div className="feap-scroll flex-1 overflow-y-auto px-6 pt-1 pb-5">
              {items.map((item) => (
                <section key={item.item_id} className="mt-4">
                  <div className="flex items-center gap-2.5 border-b border-[var(--border)] pb-2">
                    <div className="grid h-6 w-6 place-items-center rounded-md bg-[var(--primary-tint)] font-mono text-[11px] font-semibold text-[var(--primary)]">
                      {String(item.position + 1).padStart(2, "0")}
                    </div>
                    <div className="flex-1">
                      <div className="text-[13.5px] font-medium">{item.product_description}</div>
                      <div className="font-mono mute mt-0.5 text-[11.5px] text-[var(--text-subtle)]">
                        {item.partial?.classification_chain_so_far?.map((s) => s.code).join(" → ") ??
                          ""}
                      </div>
                    </div>
                    <Button type="button" size="sm" variant="ghost">
                      {t("actions.details")}
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </div>

                  <div className="flex flex-col gap-3 pt-3 pl-9">
                    {item.partial?.missing_parameters.map((param, idx) => {
                      const question = item.partial?.questions[idx] ?? param;
                      const fieldId = `item-${item.item_id}-${idx}`;
                      return (
                        <div key={param} className="flex flex-col gap-1.5">
                          <Label htmlFor={fieldId}>
                            {param} <span className="text-[var(--danger)]">*</span>
                          </Label>
                          <Input
                            id={fieldId}
                            autoComplete="off"
                            {...register(`byItem.${item.item_id}.${param}` as const)}
                          />
                          <p className="text-[11.5px] text-[var(--text-subtle)]">{question}</p>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>

            <div className="flex items-center gap-2 border-t border-[var(--border)] bg-[var(--bg-subtle)] px-6 py-3.5">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                {t("actions.cancel")}
              </Button>
              <div className="flex-1" />
              <Button type="button" variant="outline">
                <Save className="h-4 w-4" />
                {t("actions.saveDraft")}
              </Button>
              <Button type="submit" disabled={submitting || !items.length}>
                <ArrowRight className="h-4 w-4" />
                {submitting ? t("actions.submitting") : t("jobs.submitAllAnswers")}
              </Button>
            </div>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
