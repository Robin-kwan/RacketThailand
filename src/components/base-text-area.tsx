import { forwardRef, type TextareaHTMLAttributes } from "react";

type TextAreaVariant = "light" | "dark";

function mergeClassNames(
  base: string,
  additional?: string,
) {
  return additional ? `${base} ${additional}` : base;
}

const VARIANT_STYLES: Record<TextAreaVariant, string> = {
  dark:
    "w-full rounded-2xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus-visible:border-slate-500 focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-0",
  light:
    "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-500 outline-none transition focus-visible:border-slate-400 focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-0",
};

export type BaseTextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  variant?: TextAreaVariant;
};

export const BaseTextArea = forwardRef<HTMLTextAreaElement, BaseTextAreaProps>(
  ({ className, variant = "dark", ...props }, ref) => {
    const baseClass = VARIANT_STYLES[variant] ?? VARIANT_STYLES.dark;
    return (
      <textarea
        ref={ref}
        className={mergeClassNames(baseClass, className)}
        {...props}
      />
    );
  },
);

BaseTextArea.displayName = "BaseTextArea";
