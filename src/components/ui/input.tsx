import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        "flex h-9 w-full rounded-[var(--r-md)] border border-[var(--border)] bg-card px-2.5 py-1.5 text-[13px] outline-none transition-shadow placeholder:text-[var(--text-faint)] file:border-0 file:bg-transparent file:text-sm file:font-medium focus:border-[var(--primary)] focus:shadow-[0_0_0_3px_var(--primary-tint-strong)] disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
