import { cva, type VariantProps } from "class-variance-authority";
import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-medium tracking-tight transition-[transform,background-color,opacity,box-shadow] duration-150 ease-[var(--ease-out)] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
  {
    variants: {
      variant: {
        primary: "bg-accent text-accent-fg shadow-[var(--shadow-play)] hover:brightness-110",
        secondary: "bg-surface-2 text-fg shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)]",
        ghost: "bg-transparent text-muted hover:text-fg hover:bg-surface",
        danger: "bg-danger/90 text-fg hover:bg-danger",
        outline: "bg-transparent text-fg shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)]",
      },
      size: {
        lg: "h-12 min-h-12 px-6 rounded-md text-base",
        md: "h-11 min-h-11 px-4 rounded-md text-sm",
        sm: "h-9 min-h-9 px-3 rounded-sm text-sm",
        icon: "size-11 rounded-md",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>
>(function Button({ className, variant, size, type = "button", ...props }, ref) {
  return <button ref={ref} type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
});
