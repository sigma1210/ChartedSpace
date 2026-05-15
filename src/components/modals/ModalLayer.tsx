"use client";

import { useAppSelector } from "../../store/hooks";
import { selectActiveModal } from "../../store/selectors/ui.selectors";
import CharacterListModal from "./CharacterListModal";
import CharacterProfileModal from "./CharacterProfileModal";
import CharacterCreateModal from "./CharacterCreateModal";
import SearchModal from "./SearchModal";
import NotificationsModal from "./NotificationsModal";
import MapModal from "./MapModal";
import SystemDetailModal from "./SystemDetailModal";
import UserProfileModal from "./UserProfileModal";

export default function ModalLayer() {
  const activeModal = useAppSelector(selectActiveModal);

  if (!activeModal) return null;

  return (
    <div className="absolute inset-0 z-10 flex flex-col justify-end pb-[64px]">
      <div className="flex flex-col justify-end h-full pointer-events-none">
        <div className="pointer-events-auto mx-auto w-full max-w-3xl px-4 pb-4">
          {activeModal === "characterList"    && <CharacterListModal />}
          {activeModal === "characterProfile" && <CharacterProfileModal />}
          {activeModal === "characterCreate"  && <CharacterCreateModal />}
          {activeModal === "search"           && <SearchModal />}
          {activeModal === "notifications"    && <NotificationsModal />}
          {activeModal === "map"              && <MapModal />}
          {activeModal === "systemDetail"     && <SystemDetailModal />}
          {activeModal === "userProfile"      && <UserProfileModal />}
        </div>
      </div>
    </div>
  );
}
