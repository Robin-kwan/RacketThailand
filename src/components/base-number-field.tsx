import { forwardRef } from "react";
import { BaseTextField, type BaseTextFieldProps } from "@/components/base-text-field";

type BaseNumberFieldProps = BaseTextFieldProps & {
  allowDecimal?: boolean;
};

function sanitizeValue(value: string, allowDecimal: boolean) {
  const pattern = allowDecimal ? /[^0-9.]/g : /\D/g;
  if (!value) return "";
  const sanitized = value.replace(pattern, "");
  if (!allowDecimal) {
    return sanitized;
  }
  const parts = sanitized.split(".");
  if (parts.length <= 1) {
    return sanitized;
  }
  return `${parts[0]}.${parts.slice(1).join("")}`;
}

function isModifierKey(event: React.KeyboardEvent<HTMLInputElement>) {
  return event.metaKey || event.ctrlKey || event.altKey;
}

const ALLOWED_CONTROL_KEYS = [
  "Backspace",
  "Tab",
  "ArrowLeft",
  "ArrowRight",
  "Delete",
  "Home",
  "End",
];

export const BaseNumberField = forwardRef<HTMLInputElement, BaseNumberFieldProps>(
  (
    {
      onChange,
      onKeyDown,
      onPaste,
      allowDecimal = false,
      inputMode = "numeric",
      variant,
      ...props
    },
    ref,
  ) => {
    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (isModifierKey(event) || ALLOWED_CONTROL_KEYS.includes(event.key)) {
        onKeyDown?.(event);
        return;
      }

      const isDigit = /^[0-9]$/.test(event.key);
      const isDecimalPoint = allowDecimal && event.key === ".";

      if (!isDigit && !isDecimalPoint) {
        event.preventDefault();
        return;
      }

      onKeyDown?.(event);
    };

    const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
      const text = event.clipboardData.getData("text");
      const pattern = allowDecimal ? /^[0-9.]+$/ : /^\d+$/;
      if (!pattern.test(text)) {
        event.preventDefault();
        return;
      }
      onPaste?.(event);
    };

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const sanitized = sanitizeValue(event.currentTarget.value, allowDecimal);
      if (sanitized !== event.currentTarget.value) {
        event.currentTarget.value = sanitized;
        event.target.value = sanitized;
      }
      onChange?.(event);
    };

    return (
      <BaseTextField
        {...props}
        ref={ref}
        type="text"
        inputMode={inputMode}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        variant={variant}
      />
    );
  },
);

BaseNumberField.displayName = "BaseNumberField";
