import { createAsyncThunk } from "@reduxjs/toolkit";
import { fetchCharacters, invalidateCharacters } from "@/store/slices/characterSlice";
import {
  fetchShip,
  invalidateShip,
} from "@/plugins/ship/actions";

export const buyCargoAndRefresh = createAsyncThunk(
  "trade/buyCargoAndRefresh",
  async ({ commodity, tons }: { commodity: string; tons: number }, { dispatch }) => {
    const response = await fetch("/api/ship/cargo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commodity, tons }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({})) as { error?: string };
      throw new Error(error.error ?? "Purchase failed");
    }

    dispatch(invalidateShip());
    await dispatch(fetchShip());
    dispatch(invalidateCharacters());
    await dispatch(fetchCharacters());
  },
);

export const sellCargoAndRefresh = createAsyncThunk(
  "trade/sellCargoAndRefresh",
  async ({ lotId }: { lotId: string }, { dispatch }) => {
    const response = await fetch(`/api/ship/cargo/${lotId}/sell`, { method: "POST" });

    if (!response.ok) {
      const error = await response.json().catch(() => ({})) as { error?: string };
      throw new Error(error.error ?? "Sale failed");
    }

    dispatch(invalidateShip());
    await dispatch(fetchShip());
    dispatch(invalidateCharacters());
    await dispatch(fetchCharacters());
  },
);
