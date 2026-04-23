import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FileText, UploadCloud, X } from "lucide-react";
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
    return (
      <div className="flex items-center justify-between rounded-md border bg-muted/30 p-3">
        <div className="flex items-center gap-3 overflow-hidden">
          <FileText className="h-8 w-8 shrink-0 text-muted-foreground" aria-hidden />
          <div className="overflow-hidden">
            <div className="truncate font-medium">{file.name}</div>
            <div className="text-xs text-muted-foreground">{formatBytes(file.size)}</div>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t("actions.remove")}
          onClick={() => onFileChange(null)}
          disabled={disabled}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        role="button"
        tabIndex={0}
        aria-disabled={disabled}
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
          "flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-8 text-center transition-colors",
          dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/30",
          disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-accent/40",
        )}
      >
        <UploadCloud className="h-10 w-10 text-muted-foreground" aria-hidden />
        <div className="text-sm">
          <span className="font-medium">{t("document.dropzoneClick")}</span>{" "}
          <span className="text-muted-foreground">{t("document.dropzoneOr")}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {t("document.dropzoneHint", { max: maxSizeMb })}
        </p>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={ACCEPT.join(",")}
          onChange={(e) => handleFiles(e.target.files)}
          disabled={disabled}
        />
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
