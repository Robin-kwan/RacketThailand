"use client";

import {
  createContext,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useContext,
  useState,
} from "react";

type HeaderConfigContextValue = {
  subLabel?: string;
  sportSlug?: string;
  setSubLabel: Dispatch<SetStateAction<string | undefined>>;
  setSportSlug: Dispatch<SetStateAction<string | undefined>>;
};

const HeaderConfigContext = createContext<HeaderConfigContextValue | null>(
  null,
);

export function HeaderConfigProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [subLabel, setSubLabel] = useState<string | undefined>();
  const [sportSlug, setSportSlug] = useState<string | undefined>();
  return (
    <HeaderConfigContext.Provider
      value={{ subLabel, sportSlug, setSubLabel, setSportSlug }}
    >
      {children}
    </HeaderConfigContext.Provider>
  );
}

export function useHeaderConfig() {
  const context = useContext(HeaderConfigContext);
  if (!context) {
    throw new Error("useHeaderConfig must be used within HeaderConfigProvider");
  }
  return context;
}
