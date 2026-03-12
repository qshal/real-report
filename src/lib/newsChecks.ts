import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

type NewsCheck = Tables<"news_checks">;
type Profile = Tables<"profiles">;

export const listUserNewsChecks = async (userId: string, limit = 100) => {
  const { data, error } = await supabase
    .from("news_checks")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data as NewsCheck[];
};

const isRetryableError = (error: unknown) => {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return message.includes("failed to fetch") || message.includes("network") || message.includes("timeout");
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const createNewsCheck = async (payload: TablesInsert<"news_checks"> & Record<string, unknown>) => {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const { data, error } = await supabase.from("news_checks").insert(payload).select("*").single();
      if (error) throw error;
      return data as NewsCheck;
    } catch (error) {
      if (attempt === 0 && isRetryableError(error)) {
        await sleep(300);
        continue;
      }
      throw error;
    }
  }

  throw new Error("Unable to persist analysis record.");
};

export const updateNewsCheckVerification = async (
  newsCheckId: string,
  userId: string,
  verifiedLabel: "real" | "fake" | "misleading" | null,
) => {
  const { data, error } = await supabase
    .from("news_checks")
    .update({ verified_label: verifiedLabel } as TablesUpdate<"news_checks">)
    .eq("id", newsCheckId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) throw error;
  return data as NewsCheck;
};

export const updateProfile = async (userId: string, payload: TablesUpdate<"profiles">) => {
  const { data, error } = await supabase.from("profiles").update(payload).eq("id", userId).select("*").single();
  if (error) throw error;
  return data as Profile;
};
