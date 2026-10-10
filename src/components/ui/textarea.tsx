import * as React from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[96px] w-full rounded-xl border border-input bg-secondary/[0.55] px-3.5 py-3 text-sm text-foreground shadow-inner shadow-black/10 transition-colors placeholder:text-muted-foreground/80 focus-visible:border-primary/[0.55] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/[0.15] disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
