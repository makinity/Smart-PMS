// Canonical fallback avatar. Matches the backend default returned by
// User::getProfilePhotoUrlAttribute() (storage/app/public/profiles/default.jpeg).
export const DEFAULT_AVATAR = '/storage/profiles/default.jpeg';

// Resolve an avatar source, always falling back to the default image
// (never initials). Pass any of: profile_photo_url, avatar, a preview blob URL.
export function avatarSrc(...candidates) {
    return candidates.find(Boolean) || DEFAULT_AVATAR;
}

// onError handler for <img> — swap a broken/missing upload for the default.
export function onAvatarError(e) {
    if (e.currentTarget.src.endsWith(DEFAULT_AVATAR)) return;
    e.currentTarget.src = DEFAULT_AVATAR;
}
