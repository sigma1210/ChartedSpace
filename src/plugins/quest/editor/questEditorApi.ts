import type { QuestDefinitionFile } from "./types";
import type { QuestFileSummary } from "../questSlice";

type ApiError = { error?: string };
type QuestDocumentResponse = { quest: QuestFileSummary; definition: QuestDefinitionFile };

const bodyOrError = async <T>(response: Response, fallback: string): Promise<T> => {
  const body = await response.json() as ApiError & Partial<T>;
  if (!response.ok) throw new Error(body.error ?? fallback);
  return body as T;
};

export const listQuestDocuments = async () => {
  const response = await fetch("/api/quests", { cache: "no-store" });
  const body = await bodyOrError<{ quests: QuestFileSummary[] }>(response, "Could not list quests.");
  return body.quests;
};

export const loadQuestDocument = async (id: string) => {
  const response = await fetch(`/api/quests/${encodeURIComponent(id)}`, { cache: "no-store" });
  const body = await bodyOrError<{ definition: QuestDefinitionFile }>(response, "Could not load quest.");
  return body.definition;
};

export const createQuestDocument = async (name: string, definition: QuestDefinitionFile) => {
  const response = await fetch("/api/quests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, definition }),
  });
  return bodyOrError<QuestDocumentResponse>(response, "Could not create quest.");
};

export const updateQuestDocument = async (id: string, definition: QuestDefinitionFile) => {
  const response = await fetch(`/api/quests/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ definition }),
  });
  return bodyOrError<QuestDocumentResponse>(response, "Could not save quest.");
};

export const deleteQuestDocument = async (id: string) => {
  const response = await fetch(`/api/quests/${encodeURIComponent(id)}`, { method: "DELETE" });
  return bodyOrError<{ deleted: { id: string; title: string } }>(response, "Could not delete quest.");
};

