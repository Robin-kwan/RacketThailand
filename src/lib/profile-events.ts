export const PROFILE_UPDATED_EVENT = "racketthailand:profile-updated";

export type ProfileUpdatedDetail = {
  avatarUrl?: string | null;
  fullName?: string | null;
};
