import * as React from "react";
import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-[80px] w-full resize-y rounded-[var(--r-md)] border border-[var(--border)] bg-card px-2.5 py-2 text-[13px] leading-6 outline-none transition-shadow placeholder:text-[var(--text-faint)] focus:border-[var(--primary)] focus:shadow-[0_0_0_3px_var(--primary-tint-strong)] disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";
