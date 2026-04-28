import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import {
  ChevronRight,
  Globe,
  Package,
  Plus,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

import { ClassificationResultCard } from "./ClassificationResultCard";
import { NeedsInputDialog } from "./NeedsInputDialog";
import { StatusChip } from "@/components/shared/StatusChip";

import { useClassify, useResume } from "@/api/classify";
import type { ClassifyNeedsInput, ClassifyResponse, ClassificationResult } from "@/api/types";
import { parseApiError } from "@/lib/errors";

const schema = z.object({
  description: z.string().min(3, "Минимум 3 символа"),
  additionalInfo: z
    .array(
      z.object({
        key: z.string().trim(),
        value: z.string().trim(),
      }),
    )
    .optional(),
});

type FormValues = z.infer<typeof schema>;

const RECENT = [
  { code: "8509 40 000 0", desc: "Блендер погружной", time: "12 мин назад", status: "completed" as const },
  { code: "6403 99 960 0", desc: "Ботинки кожаные муж.", time: "1 ч назад", status: "completed" as const },
  { code: "—", desc: "Смесь минеральная для корма", time: "2 ч назад", status: "needs_input" as const },
];

export function SingleClassifyForm() {
  const { t } = useTranslation();

  const [result, setResult] = useState<ClassificationResult | null>(null);
  const [needsInput, setNeedsInput] = useState<ClassifyNeedsInput | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { description: "", additionalInfo: [] },
  });
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "additionalInfo",
  });
  const desc = form.watch("description") ?? "";

  const classifyMutation = useClassify();
  const resumeMutation = useResume(needsInput?.session_id ?? null);

  function handleResponse(res: ClassifyResponse) {
    if (res.status === "completed") {
      setResult(res.result);
      setNeedsInput(null);
    } else if (res.status === "needs_input") {
      setNeedsInput(res);
      setResult(null);
    } else {
      toast.error(res.error || t("errors.generic"));
    }
  }

  async function onSubmit(values: FormValues) {
    const additional_info: Record<string, string> = {};
    for (const row of values.additionalInfo ?? []) {
      if (row.key.trim() && row.value.trim()) {
        additional_info[row.key.trim()] = row.value.trim();
      }
    }

    try {
      setResult(null);
      setNeedsInput(null);
      const res = await classifyMutation.mutateAsync({
        description: values.description,
        ...(Object.keys(additional_info).length ? { additional_info } : {}),
      });
      handleResponse(res);
    } catch (err) {
      const parsed = parseApiError(err);
      toast.error(parsed.message, {
        description: parsed.requestId ? `Request ID: ${parsed.requestId}` : undefined,
      });
    }
  }

  async function onAnswer(answers: Record<string, string>) {
    try {
      const res = await resumeMutation.mutateAsync(answers);
      handleResponse(res);
    } catch (err) {
      const parsed = parseApiError(err);
      toast.error(parsed.message);
    }
  }

  const submitting = classifyMutation.isPending;
  const canSubmit = desc.trim().length >= 3 && !submitting;

  if (result) {
    return (
      <ClassificationResultCard
        result={result}
        onReclassify={() => {
          setResult(null);
          form.reset({ description: desc, additionalInfo: [] });
        }}
      />
    );
  }

  return (
    <>
      <header className="mb-7">
        <h1 className="text-2xl font-semibold tracking-tight">{t("classify.heading")}</h1>
        <p className="mt-1 max-w-[640px] text-sm text-[var(--text-muted)]">
          {t("classify.headingHint")}
        </p>
      </header>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_320px]">
        {/* Main form card */}
        <section className="rounded-[var(--r-lg)] border border-[var(--border)] bg-card shadow-[var(--shadow-xs)]">
          <div className="flex items-center gap-3 border-b border-[var(--border)] px-6 py-4">
            <Sparkles className="h-4 w-4 text-[var(--primary)]" />
            <h2 className="flex-1 text-sm font-semibold tracking-tight">{t("classify.cardTitle")}</h2>
            <span className="chip chip-neutral font-mono">session · new</span>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5 px-6 py-5">
            <div className="space-y-1.5">
              <Label htmlFor="description">
                {t("classify.descriptionLabel")} <span className="text-[var(--danger)]">*</span>
              </Label>
              <Textarea
                id="description"
                rows={5}
                placeholder={t("classify.descriptionPlaceholder")}
                {...form.register("description")}
              />
              <div className="flex items-center justify-between">
                <span className="text-[11.5px] text-[var(--text-subtle)]">
                  {t("classify.minHint")}
                </span>
                <span className="font-mono text-[11.5px] text-[var(--text-subtle)]">
                  {desc.length} / 2000
                </span>
              </div>
              {form.formState.errors.description ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.description.message}
                </p>
              ) : null}
            </div>

            <details className="rounded-[var(--r-md)] border border-[var(--border)] bg-card">
              <summary className="flex cursor-pointer items-center gap-2.5 bg-[var(--bg-subtle)] px-3.5 py-3 text-[13px] font-medium hover:bg-[var(--bg-muted)]">
                <ChevronRight className="h-3.5 w-3.5" />
                <span className="flex-1">{t("classify.additionalInfo")}</span>
                <span className="chip chip-outline">
                  {fields.length} {t("classify.parametersLabel")}
                </span>
              </summary>
              <div className="space-y-2 border-t border-[var(--border)] p-3.5">
                {fields.map((field, idx) => (
                  <div key={field.id} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                    <Input
                      placeholder={t("classify.keyPlaceholder")}
                      {...form.register(`additionalInfo.${idx}.key` as const)}
                    />
                    <Input
                      placeholder={t("classify.valuePlaceholder")}
                      {...form.register(`additionalInfo.${idx}.value` as const)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(idx)}
                      aria-label={t("actions.remove")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ key: "", value: "" })}
                >
                  <Plus className="h-4 w-4" />
                  {t("classify.addParameter")}
                </Button>
              </div>
            </details>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="chip chip-outline">
                  <Globe className="h-2.5 w-2.5" />
                  {t("classify.countryHint")}
                </span>
                <span className="chip chip-outline">
                  <Package className="h-2.5 w-2.5" />
                  {t("classify.hsHint")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm">
                  <Save className="h-4 w-4" />
                  {t("classify.saveDraft")}
                </Button>
                <Button type="submit" disabled={!canSubmit}>
                  <Sparkles className="h-4 w-4" />
                  {submitting ? t("actions.submitting") : t("classify.submit")}
                </Button>
              </div>
            </div>
          </form>
        </section>

        {/* Sidebar: how-it-works + recent */}
        <aside className="flex flex-col gap-3">
          <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-card p-5 shadow-[var(--shadow-xs)]">
            <div className="kicker mb-2.5">{t("classify.howItWorks")}</div>
            <ol className="m-0 list-decimal pl-4 text-[12.5px] leading-7 text-[var(--text-muted)]">
              <li>{t("classify.step1")}</li>
              <li>{t("classify.step2")}</li>
              <li>{t("classify.step3")}</li>
              <li>{t("classify.step4")}</li>
            </ol>
          </div>

          <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-card p-5 shadow-[var(--shadow-xs)]">
            <div className="kicker mb-2.5">{t("classify.recent")}</div>
            <ul className="flex flex-col gap-2">
              {RECENT.map((r, i) => (
                <li
                  key={i}
                  className="flex items-center gap-2 py-1.5 text-[12.5px]"
                  style={{
                    borderBottom: i < RECENT.length - 1 ? "1px solid var(--border)" : "none",
                  }}
                >
                  <div className="flex flex-1 flex-col">
                    <span className="font-mono text-[11.5px] text-[var(--primary)]">{r.code}</span>
                    <span className="text-[var(--text-muted)]">{r.desc}</span>
                  </div>
                  <StatusChip status={r.status} />
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      {needsInput ? (
        <NeedsInputDialog
          data={needsInput}
          open={Boolean(needsInput)}
          onOpenChange={(open) => {
            if (!open) setNeedsInput(null);
          }}
          onSubmit={onAnswer}
          submitting={resumeMutation.isPending}
        />
      ) : null}
    </>
  );
}
