import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const verifySchema = z.object({
  code: z
    .string()
    .min(2, "min")
    .transform((v) => v.replace(/\D/g, "")),
  product_description: z.string().min(3, "min"),
});

export type VerifyFormValues = z.infer<typeof verifySchema>;

interface Props {
  defaultValues?: Partial<VerifyFormValues>;
  submitting?: boolean;
  onSubmit: (values: VerifyFormValues) => void;
}

export function NtmVerifyForm({ defaultValues, submitting, onSubmit }: Props) {
  const { t } = useTranslation();
  const { register, handleSubmit, formState } = useForm<VerifyFormValues>({
    resolver: zodResolver(verifySchema),
    defaultValues: {
      code: defaultValues?.code ?? "",
      product_description: defaultValues?.product_description ?? "",
    },
  });

  const submit: SubmitHandler<VerifyFormValues> = (values) => onSubmit(values);

  return (
    <form className="space-y-4" onSubmit={handleSubmit(submit)}>
      <div className="space-y-1.5">
        <Label htmlFor="ntm-code">{t("ntm.codeLabel")}</Label>
        <Input
          id="ntm-code"
          inputMode="numeric"
          placeholder={t("ntm.codePlaceholder")}
          aria-invalid={Boolean(formState.errors.code)}
          {...register("code")}
        />
        {formState.errors.code ? (
          <p className="text-xs text-destructive">{t("ntm.codeError")}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ntm-desc">{t("ntm.descriptionLabel")}</Label>
        <Textarea
          id="ntm-desc"
          rows={4}
          placeholder={t("ntm.descriptionPlaceholder")}
          aria-invalid={Boolean(formState.errors.product_description)}
          {...register("product_description")}
        />
        {formState.errors.product_description ? (
          <p className="text-xs text-destructive">{t("ntm.descriptionError")}</p>
        ) : null}
      </div>

      <Button type="submit" disabled={submitting}>
        {submitting ? t("actions.submitting") : t("ntm.submit")}
      </Button>
    </form>
  );
}
