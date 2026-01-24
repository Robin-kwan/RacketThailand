import type {
  ComponentPropsWithoutRef,
  ElementType,
  PropsWithChildren,
} from "react";

type BaseCardVariant = "default" | "muted" | "ghost";

const VARIANT_CLASSNAME: Record<BaseCardVariant, string> = {
  default: "rt-card",
  muted: "rt-card rt-card-muted",
  ghost: "rt-card-ghost",
};

export type BaseCardProps<C extends ElementType = "div"> =
  PropsWithChildren<{
    as?: C;
    variant?: BaseCardVariant;
    className?: string;
  }> &
    ComponentPropsWithoutRef<C>;

export function BaseCard<C extends ElementType = "div">({
  as,
  variant = "default",
  className,
  children,
  ...props
}: BaseCardProps<C>) {
  const Component = (as ?? "div") as ElementType;
  const variantClass = VARIANT_CLASSNAME[variant] ?? VARIANT_CLASSNAME.default;
  const mergedClassName = [variantClass, className]
    .filter(Boolean)
    .join(" ")
    .trim();
  return (
    <Component className={mergedClassName} {...props}>
      {children}
    </Component>
  );
}
