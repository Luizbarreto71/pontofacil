import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  trailing?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, icon, trailing, ...props }, ref) => {
    return (
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground [&_svg]:size-[18px]">
            {icon}
          </span>
        )}
        <input
          type={type}
          ref={ref}
          className={cn(
            "flex h-13 w-full rounded-xl border border-input bg-card px-4 py-3 text-[15px] text-foreground shadow-sm transition-all placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-50",
            "h-13",
            icon && "pl-11",
            trailing && "pr-11",
            className
          )}
          style={{ height: "3.25rem" }}
          {...props}
        />
        {trailing && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {trailing}
          </span>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
