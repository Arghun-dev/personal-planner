"use server";

import { createClient } from "@/lib/supabase/server";
import type { AppState } from "@/lib/types";

const PLANNER_KEY = "personal";

export async function loadState(): Promise<AppState | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("planner_state")
    .select("data")
    .eq("key", PLANNER_KEY)
    .maybeSingle();
  return (data?.data as AppState) ?? null;
}

export async function saveState(state: AppState): Promise<void> {
  const supabase = await createClient();
  await supabase.from("planner_state").upsert({
    key: PLANNER_KEY,
    data: state,
    updated_at: new Date().toISOString(),
  });
}
