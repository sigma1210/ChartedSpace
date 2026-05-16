"use client";

import { ChevronLeft, Plus } from "lucide-react";
import HudModal from "./HudModal";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { goBack, openCharacterProfile, openCharacterCreate } from "../../store/slices/uiSlice";
import { selectIsOwnProfile, selectActiveUserId } from "../../store/selectors/ui.selectors";

// Placeholder — will be replaced with live data
const OWN_PLACEHOLDER = {
  displayName: "Traveller",
  email: "",
  memberSince: "2026",
  imageUrl: null as string | null,
  characters: [] as { id: string; name: string; worldName: string | null; sectorAbbr: string | null; hex: string | null }[],
};

const OTHER_PLACEHOLDER = {
  displayName: "Unknown Traveller",
  memberSince: "2026",
  imageUrl: null as string | null,
  characters: [] as { id: string; name: string; worldName: string | null; sectorAbbr: string | null; hex: string | null }[],
};

const UserProfileModal = () => {
  const dispatch = useAppDispatch();
  const isOwn = useAppSelector(selectIsOwnProfile);
  const userId = useAppSelector(selectActiveUserId);

  const profile = isOwn ? OWN_PLACEHOLDER : OTHER_PLACEHOLDER;

  const headerRight = !isOwn && (
    <button
      onClick={() => dispatch(goBack())}
      className="flex items-center gap-1 border border-(--hud-border) px-2 py-0.5 text-[10px] uppercase tracking-wider text-(--hud-text) hover:border-(--hud-accent) transition-colors"
    >
      <ChevronLeft size={10} />
      Back
    </button>
  );

  return (
    <HudModal
      title={isOwn ? "My Profile" : "Traveller Profile"}
      headerRight={headerRight || undefined}
    >
      {/* User info */}
      <div className="flex items-center gap-4 border-b border-(--hud-border) p-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-(--hud-border) bg-(--hud-surface-2) text-(--hud-text-dim)">
          {profile.imageUrl ? (
            <img
              src={profile.imageUrl}
              alt={profile.displayName}
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            <span className="font-mono text-lg">◈</span>
          )}
        </div>
        <div>
          <p className="font-mono text-sm text-(--hud-text)">{profile.displayName}</p>
          {isOwn && OWN_PLACEHOLDER.email && (
            <p className="text-xs text-(--hud-text-dim)">{OWN_PLACEHOLDER.email}</p>
          )}
          <p className="text-xs text-(--hud-text-dim)">Member since {profile.memberSince}</p>
        </div>
      </div>

      {/* Characters */}
      <div className="flex flex-col gap-2 p-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-wider text-(--hud-text-dim)">
            {isOwn ? "My Characters" : "Characters"}
          </p>
          {isOwn && (
            <button
              onClick={() => dispatch(openCharacterCreate())}
              className="flex items-center gap-1 border border-(--hud-border) px-2 py-0.5 text-[10px] uppercase tracking-wider text-(--hud-text) hover:border-(--hud-accent) transition-colors"
            >
              <Plus size={10} />
              New
            </button>
          )}
        </div>

        {profile.characters.length === 0 ? (
          <p className="py-4 text-center text-xs text-(--hud-text-dim) uppercase tracking-wider">
            No characters
          </p>
        ) : (
          profile.characters.map((c) => (
            <button
              key={c.id}
              onClick={() => dispatch(openCharacterProfile(c.id))}
              className="flex items-center justify-between border border-(--hud-border-subtle) bg-(--hud-surface-2) px-3 py-2 text-left hover:border-(--hud-border) transition-colors"
            >
              <div>
                <p className="font-mono text-sm text-(--hud-text)">{c.name}</p>
                {c.worldName && (
                  <p className="text-xs text-(--hud-text-dim)">
                    ◉ {c.worldName}
                    {c.sectorAbbr && ` · ${c.sectorAbbr}`}
                    {c.hex && ` · ${c.hex}`}
                  </p>
                )}
              </div>
              <ChevronLeft size={14} strokeWidth={1.5} className="text-(--hud-text-dim) rotate-180" />
            </button>
          ))
        )}
      </div>
    </HudModal>
  );
}
export default UserProfileModal
