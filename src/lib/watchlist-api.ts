// Watchlist data access — thin wrappers around the add_to_watchlist /
// remove_from_watchlist / list_watchlist RPCs. object_type is currently
// always "project"; the RPCs accept other values but the server side only
// validates "project" for now.
import { supabase } from "@/lib/supabase";

export interface WatchlistItem {
  id: string;
  tenant_id: string;
  user_central_id: string;
  object_type: string;
  object_id: string;
  created_at: string;
}

export async function addToWatchlist(objectType: string, objectId: string): Promise<WatchlistItem> {
  const { data, error } = await supabase.rpc("add_to_watchlist", {
    p_object_type: objectType,
    p_object_id: objectId,
  });
  if (error) throw error;
  return data as WatchlistItem;
}

export async function removeFromWatchlist(objectType: string, objectId: string): Promise<void> {
  const { error } = await supabase.rpc("remove_from_watchlist", {
    p_object_type: objectType,
    p_object_id: objectId,
  });
  if (error) throw error;
}

export async function listWatchlist(objectType?: string): Promise<WatchlistItem[]> {
  const { data, error } = await supabase.rpc("list_watchlist", {
    p_object_type: objectType,
  });
  if (error) throw error;
  return (data as WatchlistItem[]) ?? [];
}
