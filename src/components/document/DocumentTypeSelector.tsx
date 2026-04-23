import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import type { DocumentType } from "@/api/types";

const VALUES: DocumentType[] = ["unknown", "invoice", "customs", "specification", "contract"];

interface Props {
  value: DocumentType;
  onChange: (value: DocumentType) => void;
  disabled?: boolean;
}

export function DocumentTypeSelector({ value, onChange, disabled }: Props) {
  const { t } = useTranslation();
  return (
    <div className="space-y-1.5">
      <Label htmlFor="document-type">{t("document.typeLabel")}</Label>
      <select
        id="document-type"
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
        value={value}
        onChange={(e) => onChange(e.target.value as DocumentType)}
        disabled={disabled}
      >
        {VALUES.map((v) => (
          <option key={v} value={v}>
            {t(`document.type.${v}`)}
          </option>
        ))}
      </select>
    </div>
  );
}
