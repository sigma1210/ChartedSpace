"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import type { CharacterAvatar } from "@/lib/characters/avatar";
import { usePluginDispatch } from "@/plugin-api";
import { selectShipLocation } from "@/plugins/ship";
import { useAppSelector } from "@/store/hooks";
import { setHudVisible } from "@/store/slices/hudSlice";
import { selectedCharacterProfileHudId } from "./metadata";
import { fetchCharacters, invalidateCharacters, setSelectedProfileCharacter } from "./charactersSlice";

interface CharacterPostingSummary {
  id: string;
  type: string;
  title: string;
  description: string | null;
  location: string | null;
  role: string | null;
  status: string;
  characterId: string;
  characterName: string;
  characterGender: "female" | "male" | null;
  characterAvatar: CharacterAvatar | null;
  createdAt: string;
}

type PostingStatus = "idle" | "loading" | "loaded" | "error";
type PostingFilter = "crew_available" | "patron_job";

const typeLabel = (type: string) => {
  if (type === "crew_available") return "Crew";
  if (type === "patron_job") return "Patron";
  return type;
};

const PostingCard = ({
  item,
  onOpenProfile,
}: {
  item: CharacterPostingSummary;
  onOpenProfile: (characterId: string) => void;
}) => {
  const [failedPortraitPath, setFailedPortraitPath] = useState<string | null>(null);
  const portraitPath = item.characterAvatar?.currentPortraitPath ?? null;
  const showPortrait = portraitPath && failedPortraitPath !== portraitPath;

  return (
    <li className="border border-(--hud-border-subtle) bg-(--hud-surface-2)/60">
      <button
        type="button"
        onClick={() => onOpenProfile(item.characterId)}
        className="block w-full px-1.5 py-1 text-left transition-colors hover:bg-(--hud-surface-2)"
      >
        <div className="flex gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-[9px] text-(--hud-text)">
                {item.characterName}
              </span>
              <span className="shrink-0 border border-(--hud-border-subtle) px-1 text-[7px] text-(--hud-text-dim)">
                {typeLabel(item.type)}
              </span>
            </div>
            <div className="mt-0.5 flex items-center justify-between gap-2 text-(--hud-text-dim)">
              <span className="truncate">{item.title}</span>
              {item.role && <span className="shrink-0">{item.role}</span>}
            </div>
            {item.description && (
              <p className="mt-0.5 line-clamp-2 normal-case tracking-normal text-(--hud-text-dim)">
                {item.description}
              </p>
            )}
          </div>
          <div className="relative h-12 w-12 shrink-0 overflow-hidden border border-(--hud-border-subtle) bg-(--hud-surface)">
            {showPortrait && (
              <Image
                src={portraitPath}
                alt={`${item.characterName} portrait`}
                fill
                sizes="48px"
                onError={() => setFailedPortraitPath(portraitPath)}
                className="object-cover"
              />
            )}
            {!showPortrait && (
              <span className="flex h-full w-full items-center justify-center text-[12px] text-(--hud-text-dim)">
                {item.characterName.slice(0, 1)}
              </span>
            )}
          </div>
        </div>
      </button>
    </li>
  );
};

export const CharacterProfessionalBoardHudContent = () => {
  const dispatch = usePluginDispatch();
  const shipLocation = useAppSelector(selectShipLocation);
  const locationKey = shipLocation?.sectorAbbr && shipLocation.hex
    ? `${shipLocation.sectorAbbr}:${shipLocation.hex}`
    : null;
  const [items, setItems] = useState<CharacterPostingSummary[]>([]);
  const [activeType, setActiveType] = useState<PostingFilter>("crew_available");
  const [status, setStatus] = useState<PostingStatus>("idle");
  const [actionState, setActionState] = useState<"idle" | "creating">("idle");
  const [error, setError] = useState<string | null>(null);

  const filteredItems = useMemo(
    () => items.filter((item) => item.type === activeType),
    [activeType, items],
  );

  const loadPostings = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      if (!locationKey) {
        setItems([]);
        setStatus("loaded");
        return;
      }

      const params = new URLSearchParams();
      params.set("location", locationKey);
      const query = params.toString();
      const response = await fetch(`/api/characters/postings${query ? `?${query}` : ""}`);
      if (!response.ok) throw new Error("Failed to load postings");
      const body = await response.json() as { items: CharacterPostingSummary[] };
      setItems(body.items);
      setStatus("loaded");
    } catch (err) {
      console.error("[professional board]", err);
      setError("Failed to load postings");
      setStatus("error");
    }
  }, [locationKey]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadPostings();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [loadPostings]);

  const createPosting = async () => {
    if (actionState === "creating") return;
    if (!locationKey) {
      setError("Current system unavailable");
      return;
    }

    setActionState("creating");
    setError(null);
    try {
      const response = await fetch("/api/characters/postings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: activeType, location: locationKey }),
      });
      if (!response.ok) throw new Error("Failed to create posting");
      dispatch(invalidateCharacters());
      await Promise.all([
        loadPostings(),
        dispatch(fetchCharacters()),
      ]);
    } catch (err) {
      console.error("[professional board create]", err);
      setError("Failed to create posting");
    } finally {
      setActionState("idle");
    }
  };

  const openProfile = (characterId: string) => {
    dispatch(setSelectedProfileCharacter(characterId));
    dispatch(setHudVisible({ id: selectedCharacterProfileHudId, visible: true }));
  };

  return (
    <div className="flex max-h-[40vh] w-80 flex-col gap-1 overflow-hidden p-0.5 font-mono text-[8px] uppercase tracking-wider text-(--hud-text)">
      <div className="flex items-center justify-between border-b border-(--hud-border-subtle) pb-1">
        <span className="text-(--hud-text-dim)">
          {shipLocation?.worldName ?? "Local"} Board
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveType("crew_available")}
            className={`h-5 border px-1.5 transition-colors hover:border-(--hud-accent) hover:text-(--hud-text) ${
              activeType === "crew_available"
                ? "border-(--hud-accent) text-(--hud-text)"
                : "border-(--hud-border) text-(--hud-text-dim)"
            }`}
          >
            Crew
          </button>
          <button
            type="button"
            onClick={() => setActiveType("patron_job")}
            className={`h-5 border px-1.5 transition-colors hover:border-(--hud-accent) hover:text-(--hud-text) ${
              activeType === "patron_job"
                ? "border-(--hud-accent) text-(--hud-text)"
                : "border-(--hud-border) text-(--hud-text-dim)"
            }`}
          >
            Job
          </button>
          <button
            type="button"
            onClick={createPosting}
            disabled={actionState === "creating" || !locationKey}
            title={`Create ${typeLabel(activeType).toLowerCase()} posting`}
            className="flex h-5 w-5 items-center justify-center border border-(--hud-border) text-(--hud-text-dim) transition-colors hover:border-(--hud-accent) hover:text-(--hud-text) disabled:cursor-not-allowed disabled:opacity-40"
          >
            {actionState === "creating" ? (
              <Loader2 size={10} className="animate-spin" aria-hidden="true" />
            ) : (
              <Plus size={11} aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="border border-(--hud-error)/40 bg-(--hud-error)/5 px-1.5 py-1 text-(--hud-error)">
          {error}
        </div>
      )}

      <div className="min-h-0 overflow-y-auto pr-1">
        {status === "loading" && (
          <div className="flex items-center justify-center gap-1.5 py-5 text-(--hud-text-dim)">
            <Loader2 size={14} className="animate-spin" />
            Loading…
          </div>
        )}

        {status === "loaded" && filteredItems.length === 0 && (
          <div className="flex flex-col items-center gap-1.5 py-5 text-center text-(--hud-text-dim)">
            <span>
              {locationKey
                ? `No local ${typeLabel(activeType).toLowerCase()} postings`
                : "Current system unavailable"}
            </span>
            {locationKey && (
              <button
                type="button"
                onClick={createPosting}
                disabled={actionState === "creating"}
                className="flex h-5 items-center gap-1 border border-(--hud-border) px-1.5 text-(--hud-text-dim) transition-colors hover:border-(--hud-accent) hover:text-(--hud-text) disabled:cursor-not-allowed disabled:opacity-40"
              >
                {actionState === "creating" ? (
                  <Loader2 size={10} className="animate-spin" aria-hidden="true" />
                ) : (
                  <Plus size={11} aria-hidden="true" />
                )}
                Create {typeLabel(activeType)}
              </button>
            )}
          </div>
        )}

        {status === "loaded" && filteredItems.length > 0 && (
          <ul className="flex flex-col gap-1">
            {filteredItems.map((item) => (
              <PostingCard
                key={item.id}
                item={item}
                onOpenProfile={openProfile}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default CharacterProfessionalBoardHudContent;
