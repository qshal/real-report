import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

type NewsCheck = Tables<"news_checks">;
type Profile = Tables<"profiles">;

export const listUserNewsChecks = async (userId: string, limit = 20) => {
  const { data, error } = await supabase
    .from("news_checks")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data as NewsCheck[];
};

export const createNewsCheck = async (payload: TablesInsert<"news_checks">) => {
  const { data, error } = await supabase.from("news_checks").insert(payload).select("*").single();
  if (error) throw error;
  return data as NewsCheck;
};

export const updateProfile = async (userId: string, payload: TablesUpdate<"profiles">) => {
  const { data, error } = await supabase.from("profiles").update(payload).eq("id", userId).select("*").single();
  if (error) throw error;
  return data as Profile;
};
