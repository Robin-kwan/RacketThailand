"use client";

import { useEffect, useState } from "react";
import { Toaster } from "@/components/toaster";

export function ToasterProvider() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted) {
    return null;
  }

  return <Toaster />;
}
