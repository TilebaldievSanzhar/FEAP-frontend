import { useForm, type SubmitHandler } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { ArrowRight, Check, HelpCircle, TriangleAlert } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StatusChip } from "@/components/shared/StatusChip";
import type { ClassifyNeedsInput, ClassificationChainStep } from "@/api/types";

interface Props {
  data: ClassifyNeedsInput;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (answers: Record<string, string>) => Promise<void> | void;
  submitting?: boolean;
}

type FormShape = {
  answers: Record<string, string>;
  comment?: string;
};

export function NeedsInputDialog({ data, open, onOpenChange, onSubmit, submitting }: Props) {
  const { t } = useTranslation();
  const { partial, answers_used, answers_limit } = data;
  const attemptsLeft = Math.max(0, answers_limit - answers_used);
  const limitReached = attemptsLeft <= 0;

  const { register, handleSubmit, reset } = useForm<FormShape>({
    defaultValues: { answers: {}, comment: "" },
  });

  const submit: SubmitHandler<FormShape> = async (form) => {
    const trimmed: Record<string, string> = {};
    for (const [key, value] of Object.entries(form.answers ?? {})) {
      if (value?.trim()) trimmed[key] = value.trim();
    }
    if (form.comment?.trim()) trimmed.__comment = form.comment.trim();
    await onSubmit(trimmed);
    reset({ answers: {}, comment: "" });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-[440px] flex-col gap-0 p-0 sm:max-w-[440px]">
        <SheetHeader className="space-y-2 border-b border-[var(--border)] px-6 py-4 text-left">
          <div className="flex items-center gap-2">
            <StatusChip status="needs_input" />
            <span className="chip chip-outline font-mono">
              {t("needsInput.attempt", { used: answers_used + 1, limit: answers_limit })}
            </span>
          </div>
          <SheetTitle className="text-base font-semibold">{t("needsInput.title")}</SheetTitle>
          <SheetDescription className="text-[12.5px] text-[var(--text-subtle)]">
            {t("needsInput.headline")}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(submit)} className="flex flex-1 flex-col overflow-hidden">
          <div className="feap-scroll flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-5">
            <section>
              <div className="kicker mb-2">{t("needsInput.chainSoFar")}</div>
              <div className="flex flex-col gap-1.5">
                {(partial.classification_chain_so_far ?? []).map(
                  (step: ClassificationChainStep, i) => (
                    <div
                      key={`${step.level}-${step.code}-${i}`}
                      className="flex items-center gap-2.5 rounded-md border border-[var(--success-border)] bg-[var(--success-tint)] px-2.5 py-2"
                    >
                      <Check className="h-3 w-3 text-[var(--success)]" />
                      <div className="flex-1">
                        <div className="text-[12.5px]">
                          <span className="kicker mr-2">{step.level}</span>
                          <span className="font-mono font-semibold">{step.code}</span>
                        </div>
                        {step.name ? (
                          <div className="text-[11.5px] text-[var(--text-muted)]">{step.name}</div>
                        ) : null}
                      </div>
                    </div>
                  ),
                )}
                <div className="flex items-center gap-2.5 rounded-md border border-[var(--warn-border)] bg-[var(--warn-tint)] px-2.5 py-2">
                  <HelpCircle className="h-3 w-3 text-[var(--warn-strong)]" />
                  <div className="flex-1">
                    <div className="text-[12.5px]">
                      <span className="kicker mr-2">{t("needsInput.nextLevel")}</span>
                      <span className="font-mono font-semibold">
                        {partial.partial_code ?? "—"}
                      </span>
                    </div>
                    <div className="text-[11.5px] text-[var(--text-muted)]">
                      {t("needsInput.requiresData")}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {limitReached ? (
              <div className="alert alert-warn">
                <TriangleAlert className="alert-ico h-4 w-4" />
                <div className="flex-1 text-[12.5px]">{t("needsInput.limitReached")}</div>
              </div>
            ) : (
              <section className="flex flex-col gap-3.5">
                <div className="kicker">{t("needsInput.questions")}</div>
                {partial.missing_parameters.map((param, idx) => {
                  const question = partial.questions[idx] ?? param;
                  return (
                    <div key={param} className="space-y-1.5">
                      <Label htmlFor={`answer-${idx}`}>
                        {param} <span className="text-[var(--danger)]">*</span>
                      </Label>
                      <Input
                        id={`answer-${idx}`}
                        {...register(`answers.${param}` as const)}
                        autoComplete="off"
                      />
                      <p className="text-[11.5px] text-[var(--text-subtle)]">{question}</p>
                    </div>
                  );
                })}

                <div className="space-y-1.5">
                  <Label htmlFor="comment">{t("needsInput.freeComment")}</Label>
                  <Textarea
                    id="comment"
                    rows={3}
                    placeholder={t("needsInput.freeCommentPlaceholder")}
                    {...register("comment")}
                  />
                </div>

                <div className="alert alert-warn">
                  <TriangleAlert className="alert-ico h-4 w-4" />
                  <div className="flex-1 text-[12.5px]">{t("needsInput.attemptHint")}</div>
                </div>
              </section>
            )}
          </div>

          <SheetFooter className="flex-row justify-end gap-2 border-t border-[var(--border)] bg-[var(--bg-subtle)] px-6 py-3.5">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              {t("actions.cancel")}
            </Button>
            <Button type="submit" disabled={submitting || limitReached}>
              <ArrowRight className="h-4 w-4" />
              {submitting ? t("actions.submitting") : t("actions.submitAnswers")}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
