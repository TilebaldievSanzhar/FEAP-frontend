import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-[var(--r-md)] text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_var(--primary-tint-strong)] disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-3.5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--primary)] text-white border border-[var(--primary)] hover:bg-[var(--primary-hover)] hover:border-[var(--primary-hover)]",
        destructive:
          "border border-[var(--border)] bg-card text-[var(--danger)] hover:bg-[var(--danger-tint)] hover:border-[var(--danger-border)]",
        outline:
          "border border-[var(--border)] bg-card text-[var(--text)] hover:bg-[var(--bg-subtle)]",
        secondary:
          "border border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text)] hover:bg-[var(--bg-muted)]",
        ghost:
          "bg-transparent border border-transparent text-[var(--text-muted)] hover:bg-[var(--bg-muted)] hover:text-[var(--text)]",
        link: "text-[var(--primary)] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-[34px] px-3.5",
        sm: "h-7 px-2.5 text-[12px] rounded-[5px] [&_svg]:size-3.5",
        lg: "h-10 px-[18px] text-[14px]",
        icon: "h-[34px] w-[34px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
