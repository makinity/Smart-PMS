// Canonical fallback avatar in public/images/ (always accessible, never 404s)
export const DEFAULT_AVATAR = '/images/default-avatar.svg';

// Resolve an avatar source, always falling back to the default image
export function avatarSrc(...candidates) {
    return candidates.find(Boolean) || DEFAULT_AVATAR;
}

// onError handler for <img> — swap a broken/missing upload for the default.
export function onAvatarError(e) {
    if (e.currentTarget.src && e.currentTarget.src.endsWith(DEFAULT_AVATAR)) return;
    e.currentTarget.src = DEFAULT_AVATAR;
}
