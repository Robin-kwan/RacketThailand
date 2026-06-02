"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { ChevronDown } from "lucide-react";
import {
  CourtFormFields,
  LocationDetailsCard,
  type CourtFormValues,
} from "@/components/admin/court-form-fields";
import {
  PlaceSearchField,
  type ExistingCourt,
  type PlaceResolution,
} from "@/components/admin/place-search-field";
import { showToast } from "@/components/toaster";

export type CourtOwnerProfileOption = {
  value: string;
  label: string;
};

export type CourtOwnerSportOption = {
  id: string;
  label: string;
};

export type CourtOwnerTableRow = {
  id: string;
  sportId: string;
  sportIds?: string[];
  name: string | null;
  address: string | null;
  district: string | null;
  province: string | null;
  districtId?: string | null;
  provinceId?: string | null;
  sportCode: string | null;
  sportName: string | null;
  managerId: string | null;
  managerName: string | null;
  description: string | null;
  price_note: string | null;
  phone: string | null;
  line_id: string | null;
  website_url: string | null;
  latitude: string | null;
  longitude: string | null;
  googlePlaceId: string | null;
};

type CourtOwnersTableCopy = {
  sportFilter: string;
  allSports: string;
  courtFilter: string;
  courtPlaceholder: string;
  managerFilter: string;
  managerPlaceholder: string;
  locationFilter: string;
  locationPlaceholder: string;
  sportColumn: string;
  courtColumn: string;
  managerColumn: string;
  locationColumn: string;
  assignColumn: string;
  actionsColumn: string;
  resultsLabel: string;
  unassigned: string;
  save: string;
  saving: string;
  noResults: string;
  success: string;
  error: string;
  editButton: string;
  closeDialog: string;
  updateTitle: string;
  selectSport: string;
  name: string;
  description: string;
  address: string;
  district: string;
  province: string;
  locationDetailsTitle: string;
  locationDetailsHelper: string;
  locationDetailsEmpty: string;
  locationLockedBadge: string;
  price: string;
  phone: string;
  line: string;
  website: string;
  placeSearch: string;
  placeSearchHelper: string;
  placeSearchNoResults: string;
  placeAlreadyRegistered?: string;
  placeExistingCourtLinkFallback?: string;
  updateSubmit: string;
  updateSubmitting: string;
  updateSuccess: string;
  locationMissing: string;
};

type CourtOwnersTableProps = {
  rows: CourtOwnerTableRow[];
  profiles: CourtOwnerProfileOption[];
  sports: CourtOwnerSportOption[];
  copy: CourtOwnersTableCopy;
};

function normalizeValue(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function buildLocation(row: CourtOwnerTableRow) {
  return [row.address, row.district, row.province].filter(Boolean).join(" · ");
}

function buildFormFromRow(row: CourtOwnerTableRow): CourtFormValues {
  const sportIds =
    row.sportIds && row.sportIds.length > 0
      ? row.sportIds
      : row.sportId
        ? [row.sportId]
        : [];
  return {
    sportId: sportIds[0] ?? "",
    sportIds,
    name: row.name ?? "",
    description: row.description ?? "",
    address: row.address ?? "",
    district: row.district ?? "",
    province: row.province ?? "",
    districtId: row.districtId ?? "",
    provinceId: row.provinceId ?? "",
    price_note: row.price_note ?? "",
    phone: row.phone ?? "",
    line_id: row.line_id ?? "",
    website_url: row.website_url ?? "",
    latitude: row.latitude ?? "",
    longitude: row.longitude ?? "",
    googlePlaceId: row.googlePlaceId ?? "",
  };
}

export function CourtOwnersTable({
  rows,
  profiles,
  sports,
  copy,
}: CourtOwnersTableProps) {
  const [items, setItems] = useState(rows);
  const [sportFilter, setSportFilter] = useState("all");
  const [courtQuery, setCourtQuery] = useState("");
  const [managerQuery, setManagerQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [pendingCourtId, setPendingCourtId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [draftAssignments, setDraftAssignments] = useState<Record<string, string>>(
    () => Object.fromEntries(rows.map((row) => [row.id, row.managerId ?? ""])),
  );
  const [editingCourtId, setEditingCourtId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<CourtFormValues | null>(null);
  const [duplicateCourt, setDuplicateCourt] = useState<ExistingCourt | null>(
    null,
  );
  const [editingPending, setEditingPending] = useState(false);

  const profileNameById = useMemo(
    () => new Map(profiles.map((profile) => [profile.value, profile.label])),
    [profiles],
  );
  const sportNameById = useMemo(
    () => new Map(sports.map((sport) => [sport.id, sport.label])),
    [sports],
  );
  const assignmentOptions = useMemo(
    () => [{ value: "", label: copy.unassigned }, ...profiles],
    [copy.unassigned, profiles],
  );
  const sportOptions = useMemo(() => {
    const unique = new Map<string, string>();
    items.forEach((row) => {
      const code = row.sportCode?.trim();
      if (!code) return;
      unique.set(code, row.sportName ?? code);
    });
    return [
      { value: "all", label: copy.allSports },
      ...Array.from(unique.entries())
        .sort((a, b) => a[1].localeCompare(b[1]))
        .map(([value, label]) => ({ value, label })),
    ];
  }, [copy.allSports, items]);

  const editingRow = useMemo(
    () => items.find((row) => row.id === editingCourtId) ?? null,
    [editingCourtId, items],
  );

  useEffect(() => {
    if (!editingCourtId) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !editingPending) {
        setEditingCourtId(null);
        setEditForm(null);
        setDuplicateCourt(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [editingCourtId, editingPending]);

  const filteredRows = useMemo(() => {
    const normalizedCourt = normalizeValue(courtQuery);
    const normalizedManager = normalizeValue(managerQuery);
    const normalizedLocation = normalizeValue(locationQuery);

    return items
      .filter((row) => {
        if (sportFilter !== "all" && row.sportCode !== sportFilter) {
          return false;
        }
        if (
          normalizedCourt &&
          !normalizeValue(row.name).includes(normalizedCourt)
        ) {
          return false;
        }
        if (
          normalizedManager &&
          !normalizeValue(row.managerName).includes(normalizedManager)
        ) {
          return false;
        }
        if (
          normalizedLocation &&
          !normalizeValue(buildLocation(row)).includes(normalizedLocation)
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        const sportCompare = (a.sportName ?? a.sportCode ?? "").localeCompare(
          b.sportName ?? b.sportCode ?? "",
        );
        if (sportCompare !== 0) return sportCompare;
        return (a.name ?? "").localeCompare(b.name ?? "");
      });
  }, [courtQuery, items, locationQuery, managerQuery, sportFilter]);

  const handleAssignmentChange = (courtId: string, profileId: string) => {
    setDraftAssignments((previous) => ({
      ...previous,
      [courtId]: profileId,
    }));
  };

  const handleSaveManager = (courtId: string) => {
    const nextProfileId = draftAssignments[courtId] ?? "";
    setPendingCourtId(courtId);
    startTransition(async () => {
      const response = await fetch("/api/admin/court-owners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courtId,
          profileId: nextProfileId,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        showToast({
          variant: "error",
          message: data?.error || copy.error,
        });
        setPendingCourtId(null);
        return;
      }

      setItems((previous) =>
        previous.map((row) =>
          row.id === courtId
            ? {
                ...row,
                managerId: nextProfileId || null,
                managerName: nextProfileId
                  ? profileNameById.get(nextProfileId) ?? null
                  : null,
              }
            : row,
        ),
      );
      showToast({
        variant: "success",
        message: copy.success,
      });
      setPendingCourtId(null);
    });
  };

  const handleOpenEdit = (row: CourtOwnerTableRow) => {
    setEditingCourtId(row.id);
    setEditForm(buildFormFromRow(row));
    setDuplicateCourt(null);
  };

  const handleCloseEdit = () => {
    if (editingPending) return;
    setEditingCourtId(null);
    setEditForm(null);
    setDuplicateCourt(null);
  };

  const handleEditChange = (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = event.target;
    setEditForm((previous) =>
      previous ? { ...previous, [name]: value } : previous,
    );
  };

  const handleSportIdsChange = (sportIds: string[]) => {
    setEditForm((previous) =>
      previous
        ? {
            ...previous,
            sportIds,
            sportId: sportIds[0] ?? "",
          }
        : previous,
    );
  };

  const handlePlaceResolution = (resolution: PlaceResolution) => {
    const coords = resolution.coordinates;
    setEditForm((previous) => {
      if (!previous) return previous;
      return {
        ...previous,
        latitude:
          coords.latitude != null ? String(coords.latitude) : previous.latitude,
        longitude:
          coords.longitude != null
            ? String(coords.longitude)
            : previous.longitude,
        name: resolution.place?.name ?? previous.name,
        address: resolution.place?.address ?? previous.address,
        district: resolution.place?.district ?? previous.district,
        province: resolution.place?.province ?? previous.province,
        districtId:
          resolution.place?.districtId != null
            ? String(resolution.place.districtId)
            : previous.districtId,
        provinceId:
          resolution.place?.provinceId != null
            ? String(resolution.place.provinceId)
            : previous.provinceId,
        phone: resolution.place?.phone ?? previous.phone,
        website_url: resolution.place?.website ?? previous.website_url,
        googlePlaceId:
          resolution.place?.placeId ?? resolution.placeId ?? previous.googlePlaceId,
      };
    });
  };

  const handleSaveCourt = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingRow || !editForm || editingPending) return;

    if (duplicateCourt) {
      showToast({
        variant: "error",
        message: `${
          copy.placeAlreadyRegistered ??
          "This place is already registered as"
        } ${duplicateCourt.name ?? copy.placeExistingCourtLinkFallback ?? "existing court"}.`,
      });
      return;
    }

    if (
      !editForm.latitude ||
      !editForm.longitude ||
      !editForm.provinceId ||
      !editForm.districtId
    ) {
      showToast({
        variant: "error",
        message: copy.locationMissing,
      });
      return;
    }

    setEditingPending(true);
    try {
      const response = await fetch(`/api/courts/${editingRow.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sportId: editForm.sportId,
          sportIds: editForm.sportIds,
          name: editForm.name,
          description: editForm.description,
          address: editForm.address,
          district: editForm.district,
          province: editForm.province,
          provinceId: Number(editForm.provinceId),
          districtId: Number(editForm.districtId),
          price_note: editForm.price_note,
          phone: editForm.phone,
          line_id: editForm.line_id,
          website_url: editForm.website_url,
          latitude: Number(editForm.latitude),
          longitude: Number(editForm.longitude),
          googlePlaceId: editForm.googlePlaceId || null,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || copy.error);
      }

      setItems((previous) =>
        previous.map((row) =>
          row.id === editingRow.id
            ? {
                ...row,
                sportId: editForm.sportId,
                sportIds: editForm.sportIds,
                sportName: sportNameById.get(editForm.sportId) ?? row.sportName,
                name: editForm.name,
                description: editForm.description,
                address: editForm.address,
                district: editForm.district,
                province: editForm.province,
                districtId: editForm.districtId,
                provinceId: editForm.provinceId,
                price_note: editForm.price_note,
                phone: editForm.phone,
                line_id: editForm.line_id,
                website_url: editForm.website_url,
                latitude: editForm.latitude,
                longitude: editForm.longitude,
                googlePlaceId: editForm.googlePlaceId,
              }
            : row,
        ),
      );
      showToast({
        variant: "success",
        message: copy.updateSuccess,
      });
      setEditingCourtId(null);
      setEditForm(null);
      setDuplicateCourt(null);
    } catch (error) {
      showToast({
        variant: "error",
        message: error instanceof Error ? error.message : copy.error,
      });
    } finally {
      setEditingPending(false);
    }
  };

  return (
    <>
      <div className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">
              {copy.sportFilter}
            </label>
            <div className="relative">
              <select
                value={sportFilter}
                onChange={(event) => setSportFilter(event.target.value)}
                className="w-full appearance-none rounded-2xl border border-slate-200 bg-white px-3 py-3 pr-12 text-sm text-slate-900 outline-none transition focus:border-slate-400"
              >
                {sportOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                strokeWidth={1.8}
                aria-hidden
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">
              {copy.courtFilter}
            </label>
            <input
              type="text"
              value={courtQuery}
              onChange={(event) => setCourtQuery(event.target.value)}
              placeholder={copy.courtPlaceholder}
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">
              {copy.managerFilter}
            </label>
            <input
              type="text"
              value={managerQuery}
              onChange={(event) => setManagerQuery(event.target.value)}
              placeholder={copy.managerPlaceholder}
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">
              {copy.locationFilter}
            </label>
            <input
              type="text"
              value={locationQuery}
              onChange={(event) => setLocationQuery(event.target.value)}
              placeholder={copy.locationPlaceholder}
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
            />
          </div>
        </div>

        <p className="text-sm text-slate-500">
          {filteredRows.length.toLocaleString()} {copy.resultsLabel}
        </p>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1160px] border-collapse text-sm">
            <thead className="bg-slate-100 text-left text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">{copy.sportColumn}</th>
                <th className="px-4 py-3">{copy.courtColumn}</th>
                <th className="px-4 py-3">{copy.locationColumn}</th>
                <th className="px-4 py-3">{copy.managerColumn}</th>
                <th className="px-4 py-3">{copy.assignColumn}</th>
                <th className="px-4 py-3 text-right">{copy.actionsColumn}</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8">
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-600">
                      {copy.noResults}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const location = buildLocation(row);
                  const draftValue = draftAssignments[row.id] ?? "";
                  const hasChanges = draftValue !== (row.managerId ?? "");
                  const isRowPending = isPending && pendingCourtId === row.id;

                  return (
                    <tr
                      key={row.id}
                      className="border-t border-slate-200 align-top"
                    >
                      <td className="px-4 py-4 text-slate-700">
                        {row.sportName ?? row.sportCode ?? "—"}
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-semibold text-slate-900">
                          {row.name?.trim() || "—"}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {location || "—"}
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        {row.managerName ?? copy.unassigned}
                      </td>
                      <td className="px-4 py-4">
                        <div className="relative">
                          <select
                            value={draftValue}
                            onChange={(event) =>
                              handleAssignmentChange(row.id, event.target.value)
                            }
                            className="w-full appearance-none rounded-2xl border border-slate-200 bg-white px-3 py-2.5 pr-12 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                          >
                            {assignmentOptions.map((option) => (
                              <option
                                key={`${row.id}-${option.value}`}
                                value={option.value}
                              >
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <ChevronDown
                            className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                            strokeWidth={1.8}
                            aria-hidden
                          />
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleSaveManager(row.id)}
                            disabled={!hasChanges || isRowPending}
                            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                          >
                            {isRowPending ? copy.saving : copy.save}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(row)}
                            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-500"
                          >
                            {copy.editButton}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingRow && editForm && (
        <div
          className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/55 px-4 py-8 backdrop-blur-sm"
          onClick={handleCloseEdit}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={copy.updateTitle}
            className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[32px] border border-slate-200 bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-slate-900">
                {copy.updateTitle}
              </h2>
              <button
                type="button"
                onClick={handleCloseEdit}
                disabled={editingPending}
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
              >
                {copy.closeDialog}
              </button>
            </div>

            <form className="mt-6 space-y-5" onSubmit={handleSaveCourt}>
              <PlaceSearchField
                label={copy.placeSearch}
                placeholder={copy.placeSearch}
                helper={copy.placeSearchHelper}
                noResults={copy.placeSearchNoResults}
                duplicateLabel={copy.placeAlreadyRegistered}
                duplicateLinkLabel={copy.placeExistingCourtLinkFallback}
                onResolve={handlePlaceResolution}
                onDuplicateCourtChange={setDuplicateCourt}
                currentCourtId={editingRow.id}
                initialQuery={
                  editForm.googlePlaceId
                    ? [editForm.name, editForm.address].filter(Boolean).join(" · ")
                    : ""
                }
                selectedCoordinates={
                  editForm.latitude && editForm.longitude
                    ? {
                        latitude: Number(editForm.latitude),
                        longitude: Number(editForm.longitude),
                      }
                    : null
                }
              />
              <LocationDetailsCard
                values={editForm}
                copy={{
                  address: copy.address,
                  district: copy.district,
                  province: copy.province,
                  locationDetailsTitle: copy.locationDetailsTitle,
                  locationDetailsHelper: copy.locationDetailsHelper,
                  locationDetailsEmpty: copy.locationDetailsEmpty,
                  locationLockedBadge: copy.locationLockedBadge,
                }}
              />

              <CourtFormFields
                values={editForm}
                sports={sports}
                copy={{
                  selectSport: copy.selectSport,
                  name: copy.name,
                  description: copy.description,
                  address: copy.address,
                  district: copy.district,
                  province: copy.province,
                  locationDetailsTitle: copy.locationDetailsTitle,
                  locationDetailsHelper: copy.locationDetailsHelper,
                  locationDetailsEmpty: copy.locationDetailsEmpty,
                  locationLockedBadge: copy.locationLockedBadge,
                  price: copy.price,
                  openingHours: "",
                  phone: copy.phone,
                  line: copy.line,
                  lineQr: "",
                  website: copy.website,
                }}
                onChange={handleEditChange}
                onSportIdsChange={handleSportIdsChange}
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCloseEdit}
                  disabled={editingPending}
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                >
                  {copy.closeDialog}
                </button>
                <button
                  type="submit"
                  disabled={editingPending}
                  className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {editingPending ? copy.updateSubmitting : copy.updateSubmit}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
