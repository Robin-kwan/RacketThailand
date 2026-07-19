"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Eye, Pencil, Plus, X } from "lucide-react";
import { BaseCard } from "@/components/base-card";
import { BaseNumberField } from "@/components/base-number-field";
import { BaseSelect } from "@/components/base-select";
import { BaseTextArea } from "@/components/base-text-area";
import { BaseTextField } from "@/components/base-text-field";
import { showToast } from "@/components/toaster";

type SportOption = { id: string; code: string; label: string };

export type ExistingSportProfile = {
  profile_id: string;
  sport_id: string;
  skill_level: string | null;
  rating_system: string | null;
  rating_value: number | null;
  area: string | null;
  availability_days: string[] | null;
  time_preference: string | null;
  play_format: string | null;
  looking_note: string | null;
  looking_until: string | null;
  allow_group_invites: boolean | null;
};

type Copy = {
  sport: string;
  skillLevel: string;
  ratingSystem: string;
  ratingSystemPlaceholder: string;
  ratingValue: string;
  area: string;
  areaPlaceholder: string;
  availabilityDays: string;
  timePreference: string;
  playFormat: string;
  lookingNote: string;
  lookingNotePlaceholder: string;
  looking: string;
  lookingHelp: string;
  allowGroupInvites: string;
  save: string;
  saving: string;
  success: string;
  genericError: string;
  schemaRequired: string;
  add: string;
  addTitle: string;
  edit: string;
  viewProfile: string;
  editTitle: string;
  active: string;
  inactive: string;
  statusUpdated: string;
  emptyTitle: string;
  emptyDescription: string;
  allSportsAdded: string;
  notSet: string;
  yes: string;
  no: string;
  cancel: string;
};

type FormOption = { value: string; label: string };

type Props = {
  sports: SportOption[];
  initialSportId: string;
  existingProfiles: ExistingSportProfile[];
  skillOptions: FormOption[];
  timeOptions: FormOption[];
  formatOptions: FormOption[];
  dayOptions: FormOption[];
  copy: Copy;
  singleSportMode?: boolean;
};

function isActive(profile: ExistingSportProfile) {
  return Boolean(
    profile.looking_until && new Date(profile.looking_until) > new Date(),
  );
}

function createForm(
  sportId: string,
  existingProfiles: ExistingSportProfile[],
) {
  const profile = existingProfiles.find((item) => item.sport_id === sportId);
  return {
    sportId,
    skillLevel: profile?.skill_level ?? "",
    ratingSystem: profile?.rating_system ?? "",
    ratingValue:
      profile?.rating_value === null || profile?.rating_value === undefined
        ? ""
        : String(profile.rating_value),
    area: profile?.area ?? "",
    availabilityDays: profile?.availability_days ?? [],
    timePreference: profile?.time_preference ?? "flexible",
    playFormat: profile?.play_format ?? "either",
    lookingNote: profile?.looking_note ?? "",
    looking: profile ? isActive(profile) : true,
    allowGroupInvites: profile?.allow_group_invites ?? true,
  };
}

function getOptionLabel(
  options: FormOption[],
  value: string | null,
  fallback: string,
) {
  return options.find((option) => option.value === value)?.label ?? fallback;
}

export function PlayerProfileForm({
  sports,
  initialSportId,
  existingProfiles,
  skillOptions,
  timeOptions,
  formatOptions,
  dayOptions,
  copy,
  singleSportMode = false,
}: Props) {
  const titleId = useId();
  const [profiles, setProfiles] = useState(existingProfiles);
  const [form, setForm] = useState(() => createForm("", existingProfiles));
  const [editingSportId, setEditingSportId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusSportId, setStatusSportId] = useState<string | null>(null);

  const sportById = useMemo(
    () => new Map(sports.map((sport) => [sport.id, sport])),
    [sports],
  );
  const availableSports = useMemo(
    () =>
      sports.filter(
        (sport) => !profiles.some((profile) => profile.sport_id === sport.id),
      ),
    [profiles, sports],
  );
  const modalSportOptions = useMemo(() => {
    const options = editingSportId
      ? sports.filter((sport) => sport.id === editingSportId)
      : availableSports;
    return options.map((sport) => ({ value: sport.id, label: sport.label }));
  }, [availableSports, editingSportId, sports]);
  const editingSport = editingSportId ? sportById.get(editingSportId) : null;

  useEffect(() => {
    if (!modalOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) {
        setModalOpen(false);
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [modalOpen, saving]);

  const updateValue = (name: string, value: string | boolean | string[]) => {
    setForm((current) => ({ ...current, [name]: value }));
  };

  const openAddModal = () => {
    const preferredSport = availableSports.find(
      (sport) => sport.id === initialSportId,
    );
    const sportId = preferredSport?.id ?? availableSports[0]?.id ?? "";
    if (!sportId) return;
    setEditingSportId(null);
    setForm(createForm(sportId, profiles));
    setModalOpen(true);
  };

  const openEditModal = (sportId: string) => {
    setEditingSportId(sportId);
    setForm(createForm(sportId, profiles));
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
  };

  const toggleDay = (day: string) => {
    const next = form.availabilityDays.includes(day)
      ? form.availabilityDays.filter((item) => item !== day)
      : [...form.availabilityDays, day];
    updateValue("availabilityDays", next);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    const response = await fetch("/api/player-profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const payload = await response.json().catch(() => ({}));
    setSaving(false);

    if (!response.ok) {
      showToast({
        variant: "error",
        message:
          payload?.error === "PLAYER_FINDER_SCHEMA_REQUIRED"
            ? copy.schemaRequired
            : payload?.error || copy.genericError,
      });
      return;
    }

    if (payload.profile) {
      setProfiles((current) => [
        ...current.filter((item) => item.sport_id !== form.sportId),
        payload.profile,
      ]);
    }
    setModalOpen(false);
    showToast({ variant: "success", message: copy.success });
  };

  const handleStatusChange = async (
    profile: ExistingSportProfile,
    active: boolean,
  ) => {
    setStatusSportId(profile.sport_id);
    const response = await fetch("/api/player-profiles", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sportId: profile.sport_id, active }),
    });
    const payload = await response.json().catch(() => ({}));
    setStatusSportId(null);

    if (!response.ok || !payload.profile) {
      showToast({
        variant: "error",
        message: payload?.error || copy.genericError,
      });
      return;
    }

    setProfiles((current) =>
      current.map((item) =>
        item.sport_id === profile.sport_id ? payload.profile : item,
      ),
    );
    showToast({ variant: "success", message: copy.statusUpdated });
  };

  return (
    <>
      {(!singleSportMode || profiles.length === 0) && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">
            {availableSports.length === 0
              ? copy.allSportsAdded
              : copy.lookingHelp}
          </p>
          {availableSports.length > 0 && (
            <button
              type="button"
              onClick={openAddModal}
              className="rt-btn-primary inline-flex min-h-11 items-center justify-center gap-2 px-4 py-2.5 text-sm"
            >
              <Plus className="h-4 w-4" strokeWidth={2.2} aria-hidden />
              {copy.add}
            </button>
          )}
        </div>
      )}

      {profiles.length === 0 ? (
        <div className="mt-5 rounded-lg border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
          <h3 className="text-base font-semibold text-slate-900">
            {copy.emptyTitle}
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
            {copy.emptyDescription}
          </p>
        </div>
      ) : (
        <div className={`${singleSportMode ? "" : "mt-5"} grid gap-4`}>
          {profiles.map((profile) => {
            const sport = sportById.get(profile.sport_id);
            const active = isActive(profile);
            const rating = [profile.rating_system, profile.rating_value]
              .filter((value) => value !== null && value !== "")
              .join(" ");
            const days = (profile.availability_days ?? [])
              .map((day) => getOptionLabel(dayOptions, day, day))
              .join(", ");

            return (
              <BaseCard
                key={profile.sport_id}
                as="article"
                className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-950">
                      {sport?.label ?? copy.sport}
                    </h3>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={active}
                        aria-label={`${sport?.label ?? copy.sport}: ${active ? copy.active : copy.inactive}`}
                        disabled={statusSportId === profile.sport_id}
                        onClick={() => handleStatusChange(profile, !active)}
                        className={`relative h-6 w-11 shrink-0 rounded-full transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-600/20 disabled:cursor-wait disabled:opacity-60 ${
                          active ? "bg-emerald-600" : "bg-slate-300"
                        }`}
                      >
                        <span
                          className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                            active ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                      <span
                        className={`text-sm font-semibold ${
                          active ? "text-emerald-700" : "text-slate-500"
                        }`}
                      >
                        {active ? copy.active : copy.inactive}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => openEditModal(profile.sport_id)}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    {singleSportMode ? (
                      <Eye className="h-4 w-4" strokeWidth={2} aria-hidden />
                    ) : (
                      <Pencil className="h-4 w-4" strokeWidth={2} aria-hidden />
                    )}
                    {singleSportMode ? copy.viewProfile : copy.edit}
                  </button>
                </div>

                {!singleSportMode && (
                <dl className="mt-5 grid gap-x-6 gap-y-4 border-t border-slate-100 pt-5 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-semibold text-slate-500">
                      {copy.skillLevel}
                    </dt>
                    <dd className="mt-1 text-sm font-medium text-slate-900">
                      {getOptionLabel(skillOptions, profile.skill_level, copy.notSet)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-slate-500">
                      {copy.ratingValue}
                    </dt>
                    <dd className="mt-1 text-sm font-medium text-slate-900">
                      {rating || copy.notSet}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-slate-500">{copy.area}</dt>
                    <dd className="mt-1 text-sm font-medium text-slate-900">
                      {profile.area || copy.notSet}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-slate-500">
                      {copy.availabilityDays}
                    </dt>
                    <dd className="mt-1 text-sm font-medium text-slate-900">
                      {days || copy.notSet}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-slate-500">
                      {copy.timePreference}
                    </dt>
                    <dd className="mt-1 text-sm font-medium text-slate-900">
                      {getOptionLabel(timeOptions, profile.time_preference, copy.notSet)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-slate-500">
                      {copy.playFormat}
                    </dt>
                    <dd className="mt-1 text-sm font-medium text-slate-900">
                      {getOptionLabel(formatOptions, profile.play_format, copy.notSet)}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-semibold text-slate-500">
                      {copy.lookingNote}
                    </dt>
                    <dd className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                      {profile.looking_note || copy.notSet}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-semibold text-slate-500">
                      {copy.allowGroupInvites}
                    </dt>
                    <dd className="mt-1 text-sm font-medium text-slate-900">
                      {profile.allow_group_invites === false ? copy.no : copy.yes}
                    </dd>
                  </div>
                </dl>
                )}
              </BaseCard>
            );
          })}
        </div>
      )}

      {modalOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[9000] flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-6"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeModal();
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              className="relative max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-lg border border-white/80 bg-white shadow-[0_24px_80px_rgb(15_23_42/0.28)] sm:rounded-lg"
            >
              <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-slate-100 bg-white px-5 py-4 sm:px-6">
                <h2 id={titleId} className="text-lg font-semibold text-slate-950">
                  {editingSport
                    ? `${copy.editTitle}: ${editingSport.label}`
                    : copy.addTitle}
                </h2>
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800 disabled:opacity-60"
                  aria-label={copy.cancel}
                >
                  <X className="h-4 w-4" strokeWidth={2} aria-hidden />
                </button>
              </div>

              <form className="space-y-6 p-5 sm:p-6" onSubmit={handleSubmit}>
                <BaseSelect
                  label={copy.sport}
                  name="sportId"
                  value={form.sportId}
                  onChange={(event) =>
                    setForm(createForm(event.target.value, profiles))
                  }
                  options={modalSportOptions}
                  disabled={Boolean(editingSportId)}
                  variant="light"
                />

                <div className="grid gap-5 sm:grid-cols-2">
                  <BaseSelect
                    label={copy.skillLevel}
                    name="skillLevel"
                    value={form.skillLevel}
                    onChange={(event) =>
                      updateValue("skillLevel", event.target.value)
                    }
                    options={skillOptions}
                    placeholder={copy.skillLevel}
                    variant="light"
                  />
                  <BaseSelect
                    label={copy.playFormat}
                    name="playFormat"
                    value={form.playFormat}
                    onChange={(event) =>
                      updateValue("playFormat", event.target.value)
                    }
                    options={formatOptions}
                    variant="light"
                  />
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="player-rating-system" className="block text-sm font-semibold text-slate-700">
                      {copy.ratingSystem}
                    </label>
                    <BaseTextField
                      id="player-rating-system"
                      name="ratingSystem"
                      value={form.ratingSystem}
                      onChange={(event) =>
                        updateValue("ratingSystem", event.target.value)
                      }
                      placeholder={copy.ratingSystemPlaceholder}
                      maxLength={40}
                      variant="light"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="player-rating-value" className="block text-sm font-semibold text-slate-700">
                      {copy.ratingValue}
                    </label>
                    <BaseNumberField
                      id="player-rating-value"
                      name="ratingValue"
                      allowDecimal
                      min="0"
                      max="10"
                      value={form.ratingValue}
                      onChange={(event) =>
                        updateValue("ratingValue", event.target.value)
                      }
                      variant="light"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="player-area" className="block text-sm font-semibold text-slate-700">
                    {copy.area}
                  </label>
                  <BaseTextField
                    id="player-area"
                    name="area"
                    value={form.area}
                    onChange={(event) => updateValue("area", event.target.value)}
                    placeholder={copy.areaPlaceholder}
                    maxLength={120}
                    variant="light"
                  />
                </div>

                <fieldset>
                  <legend className="text-sm font-semibold text-slate-700">
                    {copy.availabilityDays}
                  </legend>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {dayOptions.map((day) => (
                      <label
                        key={day.value}
                        className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
                      >
                        <input
                          type="checkbox"
                          checked={form.availabilityDays.includes(day.value)}
                          onChange={() => toggleDay(day.value)}
                          className="h-4 w-4 accent-emerald-600"
                        />
                        {day.label}
                      </label>
                    ))}
                  </div>
                </fieldset>

                <BaseSelect
                  label={copy.timePreference}
                  name="timePreference"
                  value={form.timePreference}
                  onChange={(event) =>
                    updateValue("timePreference", event.target.value)
                  }
                  options={timeOptions}
                  variant="light"
                />

                <div className="space-y-2">
                  <label htmlFor="player-looking-note" className="block text-sm font-semibold text-slate-700">
                    {copy.lookingNote}
                  </label>
                  <BaseTextArea
                    id="player-looking-note"
                    name="lookingNote"
                    value={form.lookingNote}
                    onChange={(event) =>
                      updateValue("lookingNote", event.target.value)
                    }
                    placeholder={copy.lookingNotePlaceholder}
                    maxLength={240}
                    rows={3}
                    className="resize-y border-slate-300 focus-visible:border-[var(--rt-primary)] focus-visible:ring-4 focus-visible:ring-[rgb(var(--rt-primary-rgb)/0.12)]"
                    variant="light"
                  />
                </div>

                <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-slate-50 px-4">
                  <div className="flex items-center justify-between gap-4 py-4">
                    <span>
                      <span className="block text-sm font-semibold text-slate-900">
                        {copy.looking}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-slate-500">
                        {copy.lookingHelp}
                      </span>
                    </span>
                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className={`text-xs font-semibold ${
                          form.looking ? "text-emerald-700" : "text-slate-500"
                        }`}
                      >
                        {form.looking ? copy.active : copy.inactive}
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={form.looking}
                        aria-label={copy.looking}
                        onClick={() => updateValue("looking", !form.looking)}
                        className={`relative h-6 w-11 shrink-0 rounded-full transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-600/20 ${
                          form.looking ? "bg-emerald-600" : "bg-slate-300"
                        }`}
                      >
                        <span
                          className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                            form.looking ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                  <label className="flex cursor-pointer items-center gap-3 py-4 text-sm font-semibold text-slate-800">
                    <input
                      type="checkbox"
                      checked={form.allowGroupInvites}
                      onChange={(event) =>
                        updateValue("allowGroupInvites", event.target.checked)
                      }
                      className="h-4 w-4 accent-emerald-600"
                    />
                    {copy.allowGroupInvites}
                  </label>
                </div>

                <div className="flex justify-end border-t border-slate-100 pt-5">
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={closeModal}
                      disabled={saving}
                      className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 sm:flex-none"
                    >
                      {copy.cancel}
                    </button>
                    <button
                      type="submit"
                      disabled={saving || !form.sportId}
                      className="rt-btn-primary inline-flex min-h-11 flex-1 items-center justify-center px-5 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
                    >
                      {saving ? copy.saving : copy.save}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
