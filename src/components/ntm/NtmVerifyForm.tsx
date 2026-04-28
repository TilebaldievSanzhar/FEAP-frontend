import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { Shield } from "lucide-react";

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
    <form className="flex flex-col gap-4" onSubmit={handleSubmit(submit)}>
      <div className="space-y-1.5">
        <Label htmlFor="ntm-code">{t("ntm.codeLabel")}</Label>
        <Input
          id="ntm-code"
          inputMode="numeric"
          className="font-mono"
          placeholder={t("ntm.codePlaceholder")}
          aria-invalid={Boolean(formState.errors.code)}
          {...register("code")}
        />
        {formState.errors.code ? (
          <p className="text-[11.5px] text-[var(--danger)]">{t("ntm.codeError")}</p>
        ) : (
          <p className="text-[11.5px] text-[var(--text-subtle)]">10 знаков · можно вставить с пробелами</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ntm-desc">{t("ntm.descriptionLabel")}</Label>
        <Textarea
          id="ntm-desc"
          rows={7}
          placeholder={t("ntm.descriptionPlaceholder")}
          aria-invalid={Boolean(formState.errors.product_description)}
          {...register("product_description")}
        />
        {formState.errors.product_description ? (
          <p className="text-[11.5px] text-[var(--danger)]">{t("ntm.descriptionError")}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ntm-country">{t("ntm.countryLabel")}</Label>
        <select
          id="ntm-country"
          className="h-9 w-full rounded-[var(--r-md)] border border-[var(--border)] bg-card px-2.5 text-[13px] outline-none focus:border-[var(--primary)] focus:shadow-[0_0_0_3px_var(--primary-tint-strong)]"
          defaultValue="cn"
        >
          <option value="cn">Китай (CN)</option>
          <option value="tr">Турция (TR)</option>
          <option value="ru">Россия (RU)</option>
          <option value="kg">Кыргызстан (KG)</option>
        </select>
      </div>

      <Button type="submit" size="lg" disabled={submitting}>
        <Shield className="h-4 w-4" />
        {submitting ? t("actions.submitting") : t("ntm.verifySubmit")}
      </Button>
    </form>
  );
}
