"use client";

import { useEffect } from "react";
import { useHeaderConfig } from "@/components/header-context";

export function HeaderSubLabel({ value }: { value?: string | null }) {
  const { setSubLabel } = useHeaderConfig();
  useEffect(() => {
    setSubLabel(value ?? undefined);
    return () => {
      setSubLabel(undefined);
    };
  }, [value, setSubLabel]);
  return null;
}
