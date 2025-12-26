"use client";

import { useEffect } from "react";
import { useHeaderConfig } from "@/components/header-context";

export function HeaderSportScope({
  sportSlug,
}: {
  sportSlug?: string | null;
}) {
  const { setSportSlug } = useHeaderConfig();

  useEffect(() => {
    setSportSlug(sportSlug ?? undefined);
    return () => setSportSlug(undefined);
  }, [sportSlug, setSportSlug]);

  return null;
}
