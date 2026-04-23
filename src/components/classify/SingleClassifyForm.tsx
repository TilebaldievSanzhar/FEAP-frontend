import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { ClassificationResultCard } from "./ClassificationResultCard";
import { NeedsInputDialog } from "./NeedsInputDialog";

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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("classify.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="description">{t("classify.descriptionLabel")}</Label>
              <Textarea
                id="description"
                rows={4}
                placeholder={t("classify.descriptionPlaceholder")}
                {...form.register("description")}
              />
              {form.formState.errors.description ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.description.message}
                </p>
              ) : null}
            </div>

            <details className="rounded-md border p-3">
              <summary className="cursor-pointer select-none text-sm font-medium">
                {t("classify.additionalInfo")}
              </summary>
              <div className="mt-3 space-y-2">
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

            <div className="flex gap-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? t("actions.submitting") : t("classify.submit")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={submitting}
                onClick={() => {
                  form.reset({ description: "", additionalInfo: [] });
                  setResult(null);
                  setNeedsInput(null);
                }}
              >
                {t("actions.reset")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {result ? <ClassificationResultCard result={result} /> : null}

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
    </div>
  );
}
