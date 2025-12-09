"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { BaseSelect } from "@/components/base-select";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type Profile = {
  display_name: string | null;
  username: string | null;
  location: string | null;
  default_sport: string | null;
  avatar_url: string | null;
};

type SportOption = {
  id: string;
  label: string;
};

type ProfileCopy = {
  title: string;
  subtitle: string;
  displayName: string;
  username: string;
  usernameHint: string;
  location: string;
  defaultSport: string;
  defaultSportPlaceholder: string;
  avatarLabel: string;
  avatarHelper: string;
  avatarLimit: string;
  avatarUpload: string;
  save: string;
  saving: string;
  success: string;
  usernameTaken: string;
  genericError: string;
};

type ProfileFormProps = {
  userId: string;
  initialProfile: Profile;
  sports: SportOption[];
  copy: ProfileCopy;
};

const AVATAR_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_AVATAR_BUCKET || "avatars";

export function ProfileForm({
  userId,
  initialProfile,
  sports,
  copy,
}: ProfileFormProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [form, setForm] = useState({
    display_name: initialProfile.display_name ?? "",
    username: initialProfile.username ?? "",
    location: initialProfile.location ?? "",
    default_sport: initialProfile.default_sport ?? "",
    avatar_url: initialProfile.avatar_url ?? "",
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const defaultSportOptions = useMemo(
    () => [
      { value: "", label: copy.defaultSportPlaceholder },
      ...sports.map((sport) => ({
        value: sport.id,
        label: sport.label,
      })),
    ],
    [sports, copy.defaultSportPlaceholder],
  );

  useEffect(() => {
    return () => {
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAvatarChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setSuccess(null);
    setError(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    let avatarUrl = form.avatar_url;
    if (avatarFile) {
      setUploading(true);
      const fileExt = avatarFile.name.split(".").pop();
      const fileName = `${userId}-${Date.now()}.${fileExt ?? "png"}`;
      const filePath = fileName;
      const { error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(filePath, avatarFile, {
          cacheControl: "3600",
          upsert: true,
          contentType: avatarFile.type,
        });

      if (uploadError) {
        setError(uploadError.message);
        setSaving(false);
        setUploading(false);
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(filePath);
      avatarUrl = publicUrl;
      setAvatarFile(null);
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
        setAvatarPreview(null);
      }
      setForm((prev) => ({
        ...prev,
        avatar_url: publicUrl,
      }));
      setUploading(false);
    }

    const response = await fetch("/api/profile/update", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        display_name: form.display_name,
        username: form.username,
        location: form.location,
        default_sport: form.default_sport || null,
        avatar_url: avatarUrl || null,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    setSaving(false);

    if (!response.ok) {
      if (payload?.error === "USERNAME_TAKEN") {
        setError(copy.usernameTaken);
      } else {
        setError(payload?.error || copy.genericError);
      }
      return;
    }

    setSuccess(copy.success);
  };

  const avatarInitial =
    avatarPreview ||
    form.avatar_url ||
    initialProfile.avatar_url ||
    initialProfile.display_name?.[0] ||
    "R";

  return (
    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative h-20 w-20 overflow-hidden rounded-3xl bg-slate-200">
          {avatarPreview || form.avatar_url ? (
            <Image
              src={avatarPreview || form.avatar_url}
              alt="Avatar preview"
              fill
              sizes="80px"
              className="object-cover"
            />
          ) : (
            <span className="flex h-full items-center justify-center text-2xl font-semibold text-slate-600">
              {avatarInitial.toUpperCase()}
            </span>
          )}
        </div>
        <div className="space-y-2 text-sm text-slate-600">
          <p className="font-semibold text-slate-900">{copy.avatarLabel}</p>
          <p>{copy.avatarHelper}</p>
          <p className="text-xs text-slate-500">{copy.avatarLimit}</p>
          <label className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-500">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
            />
            {uploading ? `${copy.saving}...` : copy.avatarUpload}
          </label>
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700">
          {copy.displayName}
        </label>
        <input
          type="text"
          name="display_name"
          value={form.display_name}
          onChange={handleInputChange}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:bg-white"
          maxLength={80}
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700">
          {copy.username}
        </label>
        <input
          type="text"
          name="username"
          value={form.username}
          onChange={(event) => {
            const sanitized = event.target.value.replace(/[^a-zA-Z0-9_]/g, "");
            setForm((prev) => ({ ...prev, username: sanitized.toLowerCase() }));
          }}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm lowercase outline-none focus:border-slate-400 focus:bg-white"
          maxLength={32}
          required
        />
        <p className="text-xs text-slate-500">{copy.usernameHint}</p>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700">
          {copy.location}
        </label>
        <input
          type="text"
          name="location"
          value={form.location}
          onChange={handleInputChange}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:bg-white"
          maxLength={120}
        />
      </div>

      <BaseSelect
        label={copy.defaultSport}
        name="default_sport"
        value={form.default_sport}
        onChange={handleInputChange}
        options={defaultSportOptions}
      />

      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-emerald-600">{success}</p>}

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? `${copy.saving}...` : copy.save}
      </button>
    </form>
  );
}
