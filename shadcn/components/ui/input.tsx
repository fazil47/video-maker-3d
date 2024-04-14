import { VariantProps, cva } from "class-variance-authority";
import { InputHTMLAttributes, forwardRef } from "react";

import { cn } from "shadcn/lib/utils";

const inputVariants = cva(
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      controlSize: {
        default: "h-10 px-3 py-2",
        sm: "h-7 px-2 py-1",
      },
    },
    defaultVariants: {
      controlSize: "default",
    },
  }
);

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

const Input = forwardRef<
  HTMLInputElement,
  InputProps & VariantProps<typeof inputVariants>
>(({ className, type, controlSize, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(inputVariants({ controlSize, className }))}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
