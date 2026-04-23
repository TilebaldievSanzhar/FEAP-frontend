import { useMemo } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { useTranslation } from "react-i18next";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ClassificationChain } from "@/components/classify/ClassificationChain";

import type { JobItem } from "@/api/types";

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

  const { register, handleSubmit, reset } = useForm<FormShape>({
    defaultValues: defaults,
    values: defaults,
  });

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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col">
        <SheetHeader>
          <SheetTitle>{t("jobs.batchAnswerTitle", { count: items.length })}</SheetTitle>
          <SheetDescription>{t("jobs.batchAnswerDescription")}</SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(submit)} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-4 overflow-y-auto px-6 pb-6">
            {items.map((item) => (
              <details
                key={item.item_id}
                className="rounded-md border"
                open
              >
                <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium">
                  <span className="mr-2 font-mono text-xs text-muted-foreground">
                    #{item.position + 1}
                  </span>
                  {item.product_description}
                </summary>
                <div className="space-y-3 border-t p-3">
                  {item.partial?.classification_chain_so_far?.length ? (
                    <ClassificationChain
                      chain={item.partial.classification_chain_so_far}
                      highlightPending
                    />
                  ) : null}

                  {item.partial?.missing_parameters.map((param, idx) => {
                    const question = item.partial?.questions[idx] ?? param;
                    const fieldId = `item-${item.item_id}-${idx}`;
                    return (
                      <div key={param} className="space-y-1.5">
                        <Label htmlFor={fieldId}>{param}</Label>
                        <p className="text-xs text-muted-foreground">{question}</p>
                        <Input
                          id={fieldId}
                          autoComplete="off"
                          {...register(`byItem.${item.item_id}.${param}` as const)}
                        />
                      </div>
                    );
                  })}
                </div>
              </details>
            ))}
          </div>

          <SheetFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              {t("actions.cancel")}
            </Button>
            <Button type="submit" disabled={submitting || !items.length}>
              {submitting ? t("actions.submitting") : t("jobs.submitAllAnswers")}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
