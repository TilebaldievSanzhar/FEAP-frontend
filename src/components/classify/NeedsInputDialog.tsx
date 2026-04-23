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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ClassificationChain } from "./ClassificationChain";
import type { ClassifyNeedsInput } from "@/api/types";

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
      <SheetContent side="right" className="flex flex-col">
        <SheetHeader>
          <SheetTitle>{t("needsInput.title")}</SheetTitle>
          <SheetDescription>
            {t("needsInput.description", { used: answers_used, limit: answers_limit })}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(submit)} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-6">
            <section>
              <h3 className="mb-2 text-sm font-medium">{t("needsInput.chainSoFar")}</h3>
              <ClassificationChain
                chain={partial.classification_chain_so_far}
                highlightPending
              />
            </section>

            {limitReached ? (
              <p className="rounded-md border border-amber-400/60 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200">
                {t("needsInput.limitReached")}
              </p>
            ) : (
              <section className="space-y-4">
                <h3 className="text-sm font-medium">{t("needsInput.questions")}</h3>
                {partial.missing_parameters.map((param, idx) => {
                  const question = partial.questions[idx] ?? param;
                  return (
                    <div key={param} className="space-y-1.5">
                      <Label htmlFor={`answer-${idx}`}>{param}</Label>
                      <p className="text-xs text-muted-foreground">{question}</p>
                      <Input
                        id={`answer-${idx}`}
                        {...register(`answers.${param}` as const)}
                        autoComplete="off"
                      />
                    </div>
                  );
                })}

                <div className="space-y-1.5">
                  <Label htmlFor="comment">{t("needsInput.freeComment")}</Label>
                  <Textarea id="comment" rows={3} {...register("comment")} />
                </div>
              </section>
            )}
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
            <Button type="submit" disabled={submitting || limitReached}>
              {submitting ? t("actions.submitting") : t("actions.submitAnswers")}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
