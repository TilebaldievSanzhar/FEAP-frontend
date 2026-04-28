import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/lib/format";

const ACCEPT = ["application/pdf", "image/png", "image/jpeg", "image/tiff", "image/webp"];

interface Props {
  file: File | null;
  onFileChange: (file: File | null) => void;
  maxSizeMb: number;
  disabled?: boolean;
}

export function DocumentDropzone({ file, onFileChange, maxSizeMb, disabled }: Props) {
  const { t } = useTranslation();
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validate = useCallback(
    (candidate: File): string | null => {
      if (candidate.size > maxSizeMb * 1024 * 1024) {
        return t("document.errorTooLarge", { max: maxSizeMb });
      }
      if (ACCEPT.length && candidate.type && !ACCEPT.includes(candidate.type)) {
        return t("document.errorType");
      }
      return null;
    },
    [maxSizeMb, t],
  );

  function handleFiles(list: FileList | null) {
    setError(null);
    if (!list?.length) return;
    const chosen = list[0];
    const err = validate(chosen);
    if (err) {
      setError(err);
      return;
    }
    onFileChange(chosen);
  }

  function onDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragOver(false);
    if (disabled) return;
    handleFiles(event.dataTransfer.files);
  }

  if (file) {
    const ext = file.name.split(".").pop()?.toUpperCase() ?? "FILE";
    return (
      <div className="space-y-2">
        <div className="kicker">{t("document.uploadedLabel")}</div>
        <div className="flex items-center gap-3 rounded-[var(--r-md)] border border-[var(--border)] bg-card px-3.5 py-3">
          <div className="grid h-[44px] w-9 shrink-0 place-items-center rounded bg-[var(--primary-tint)] font-mono text-[10px] font-semibold text-[var(--primary)]">
            {ext}
          </div>
          <div className="flex-1 overflow-hidden">
            <div className="truncate text-[13px] font-medium">{file.name}</div>
            <div className="text-[11.5px] text-[var(--text-subtle)]">{formatBytes(file.size)}</div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={t("actions.remove")}
            onClick={() => onFileChange(null)}
            disabled={disabled}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        role="button"
        tabIndex={0}
        aria-disabled={disabled}
        aria-label={t("document.dropzoneClick")}
        aria-describedby="dropzone-hint"
        onClick={() => (disabled ? undefined : inputRef.current?.click())}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDrop={onDrop}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        className={cn(
          "dropzone outline-none",
          dragOver && "dragover",
          disabled && "cursor-not-allowed opacity-60",
        )}
      >
        <div className="dropzone-ico">
          <Upload className="h-5 w-5" />
        </div>
        <h4 className="m-0 text-[15px] font-semibold">{t("document.dropzoneTitle")}</h4>
        <p id="dropzone-hint" className="m-0 text-[13px] text-[var(--text-subtle)]">
          {t("document.dropzoneSubtitle", { max: maxSizeMb })}
        </p>
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          accept={ACCEPT.join(",")}
          onChange={(e) => handleFiles(e.target.files)}
          disabled={disabled}
          tabIndex={-1}
          aria-hidden
        />
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
