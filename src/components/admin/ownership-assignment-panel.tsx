"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { showToast } from "@/components/toaster";

type ProfileOption = {
  id: string;
  label: string;
  username?: string | null;
  displayName?: string | null;
};

export type OwnershipAssignmentCopy = {
  title: string;
  subtitle: string;
  currentLabel: string;
  searchLabel: string;
  searchPlaceholder: string;
  searching: string;
  noResults: string;
  save: string;
  saving: string;
  success: string;
  error: string;
  unchanged: string;
  unassigned: string;
};

type OwnershipAssignmentPanelProps = {
  entityType: "court" | "group";
  entityId: string;
  currentProfile: ProfileOption | null;
  copy: OwnershipAssignmentCopy;
};

function buildOwnerEndpoint(entityType: "court" | "group", entityId: string) {
  const segment = entityType === "court" ? "courts" : "groups";
  return `/api/admin/${segment}/${entityId}/owner`;
}

export function OwnershipAssignmentPanel({
  entityType,
  entityId,
  currentProfile,
  copy,
}: OwnershipAssignmentPanelProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [current, setCurrent] = useState<ProfileOption | null>(currentProfile);
  const [selected, setSelected] = useState<ProfileOption | null>(
    currentProfile,
  );
  const [query, setQuery] = useState(currentProfile?.label ?? "");
  const [options, setOptions] = useState<ProfileOption[]>(
    currentProfile ? [currentProfile] : [],
  );
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const hasChanges = selected?.id !== current?.id;
  const currentLabel = current?.label ?? copy.unassigned;
  const visibleOptions = useMemo(() => {
    const merged = new Map<string, ProfileOption>();
    if (current) {
      merged.set(current.id, current);
    }
    options.forEach((option) => merged.set(option.id, option));
    return Array.from(merged.values());
  }, [current, options]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (
        containerRef.current &&
        event.target instanceof Node &&
        !containerRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/admin/profiles?search=${encodeURIComponent(query)}`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data?.error ?? copy.error);
        }
        setOptions(Array.isArray(data?.profiles) ? data.profiles : []);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        console.error(error);
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [copy.error, open, query]);

  const handleSelect = (profile: ProfileOption) => {
    setSelected(profile);
    setQuery(profile.label);
    setOpen(false);
  };

  const handleSave = () => {
    if (!selected || !hasChanges || isPending) {
      showToast({ variant: "info", message: copy.unchanged });
      return;
    }

    startTransition(async () => {
      const response = await fetch(buildOwnerEndpoint(entityType, entityId), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: selected.id }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        showToast({
          variant: "error",
          message: data?.error ?? copy.error,
        });
        return;
      }

      const savedProfile = data?.profile as ProfileOption | undefined;
      const nextProfile = savedProfile ?? selected;
      setCurrent(nextProfile);
      setSelected(nextProfile);
      setQuery(nextProfile.label);
      showToast({ variant: "success", message: copy.success });
    });
  };

  return (
    <section className="rounded-[32px] border border-emerald-100 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            {copy.title}
          </h2>
          <p className="mt-1 text-sm text-slate-600">{copy.subtitle}</p>
        </div>
        <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
          <span className="block text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">
            {copy.currentLabel}
          </span>
          <span className="mt-1 block font-semibold">{currentLabel}</span>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="space-y-2" ref={containerRef}>
          <label className="text-sm font-semibold text-slate-700">
            {copy.searchLabel}
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              strokeWidth={1.8}
              aria-hidden
            />
            <input
              type="text"
              value={query}
              placeholder={copy.searchPlaceholder}
              onFocus={() => setOpen(true)}
              onChange={(event) => {
                setQuery(event.target.value);
                setSelected(null);
                setOpen(true);
              }}
              className="w-full rounded-2xl border border-slate-200 bg-white px-10 py-3 pr-12 text-sm text-slate-900 outline-none transition focus:border-slate-400"
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-slate-500"
              onClick={() => setOpen((previous) => !previous)}
              aria-label="Toggle profile options"
            >
              <ChevronDown
                className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`}
                strokeWidth={1.8}
                aria-hidden
              />
            </button>
            {open && (
              <div className="absolute z-50 mt-2 max-h-64 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-xl">
                {loading ? (
                  <p className="px-3 py-2 text-sm text-slate-500">
                    {copy.searching}
                  </p>
                ) : visibleOptions.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-slate-500">
                    {copy.noResults}
                  </p>
                ) : (
                  visibleOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition ${
                        option.id === selected?.id
                          ? "bg-slate-100 text-slate-900"
                          : "text-slate-700 hover:bg-slate-100"
                      }`}
                      onClick={() => handleSelect(option)}
                    >
                      <span>{option.label}</span>
                      {option.id === selected?.id && (
                        <Check
                          className="h-3.5 w-3.5"
                          strokeWidth={2}
                          aria-hidden
                        />
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={!selected || !hasChanges || isPending}
          className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isPending ? copy.saving : copy.save}
        </button>
      </div>
    </section>
  );
}
