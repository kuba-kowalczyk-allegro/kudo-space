import type { User } from "@supabase/supabase-js";

import type { SupabaseClient } from "../../db/supabase.client.ts";
import type { Database } from "../../db/database.types.ts";
import type { UserProfileDTO } from "../../types.ts";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];

interface ListUsersParams {
  requesterId: string;
  search?: string;
  excludeMe: boolean;
}

/**
 * Ensures a user profile exists in the database
 * Creates a new profile from OAuth metadata if it doesn't exist
 * Does not overwrite existing profile data
 *
 * @param supabase - Supabase client instance with active session
 * @param user - Authenticated user from OAuth
 * @returns The user's profile or null if creation failed
 */
export async function ensureProfile(supabase: SupabaseClient, user: User): Promise<Profile | null> {
  try {
    // First, try to get existing profile
    const { data: existingProfile, error: fetchError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    // If profile exists, return it
    if (existingProfile && !fetchError) {
      return existingProfile;
    }

    // Profile doesn't exist, create it from OAuth metadata
    const profileData: ProfileInsert = {
      id: user.id,
      display_name: extractDisplayName(user),
      avatar_url: user.user_metadata?.avatar_url || null,
      email: user.email || null,
    };

    const { data: newProfile, error: insertError } = await supabase
      .from("profiles")
      .insert(profileData)
      .select()
      .single();

    if (insertError) {
      // Profile creation failed - this is a critical error but we can't throw
      // as it would break the auth flow. Log for debugging and return null.
      // eslint-disable-next-line no-console
      console.error("Failed to create profile:", insertError);
      return null;
    }

    return newProfile;
  } catch (error) {
    // Unexpected error during profile operations
    // eslint-disable-next-line no-console
    console.error("Error in ensureProfile:", error);
    return null;
  }
}

/**
 * Extracts a display name from OAuth user metadata
 * Falls back to email username if no name is available
 *
 * @param user - Authenticated user from OAuth
 * @returns Display name for the user
 */
function extractDisplayName(user: User): string {
  // Try to get full name from metadata
  if (user.user_metadata?.full_name) {
    return user.user_metadata.full_name;
  }

  // Try to get name from metadata
  if (user.user_metadata?.name) {
    return user.user_metadata.name;
  }

  // Try to get preferred username (GitHub username)
  if (user.user_metadata?.preferred_username) {
    return user.user_metadata.preferred_username;
  }

  // Try to get user name (GitHub user_name)
  if (user.user_metadata?.user_name) {
    return user.user_metadata.user_name;
  }

  // Fall back to email username
  if (user.email) {
    return user.email.split("@")[0];
  }

  // Last resort: use "User" with first 8 chars of ID
  return `User ${user.id.substring(0, 8)}`;
}

/**
 * Lists user profiles with optional filtering
 * Supports case-insensitive search and excluding the requesting user
 *
 * @param supabase - Supabase client instance with active session
 * @param params - Query parameters for filtering users
 * @returns Array of user profiles matching the criteria
 */
export async function listUsers(supabase: SupabaseClient, params: ListUsersParams): Promise<UserProfileDTO[]> {
  const { requesterId, search, excludeMe } = params;

  // Build query to select profile fields
  let query = supabase
    .from("profiles")
    .select("id, display_name, avatar_url, email")
    .order("display_name", { ascending: true })
    .order("created_at", { ascending: true });

  // Exclude current user if requested
  if (excludeMe) {
    query = query.neq("id", requesterId);
  }

  // Apply case-insensitive search filter if provided
  if (search && search.trim().length > 0) {
    const searchPattern = `%${search.trim()}%`;
    query = query.or(`display_name.ilike.${searchPattern},email.ilike.${searchPattern}`);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  // Map database rows to UserProfileDTO (fields align, so direct cast is safe)
  return (data ?? []) as UserProfileDTO[];
}

export type { ListUsersParams };
