import type { SupabaseClient } from "../../db/supabase.client.ts";
import type { Database } from "../../db/database.types.ts";
import type { KudoDTO, KudoListResponseDTO } from "../../types.ts";

const KUDOS_VIEW = "kudos_with_users" satisfies keyof Database["public"]["Views"];

interface ListKudosParams {
  limit: number;
  offset: number;
}

type KudosWithUsersRow = Database["public"]["Views"][typeof KUDOS_VIEW]["Row"];
type CompleteKudosRow = KudosWithUsersRow & {
  id: string;
  sender_id: string;
  sender_name: string;
  recipient_id: string;
  recipient_name: string;
  message: string;
  created_at: string;
  updated_at: string;
};

const KUDOS_COLUMNS = `
  id,
  sender_id,
  sender_name,
  sender_email,
  sender_avatar,
  recipient_id,
  recipient_name,
  recipient_email,
  recipient_avatar,
  message,
  created_at,
  updated_at
`;

const ensureCompleteRow = (row: KudosWithUsersRow): row is CompleteKudosRow => {
  return (
    typeof row.id === "string" &&
    typeof row.sender_id === "string" &&
    typeof row.sender_name === "string" &&
    typeof row.recipient_id === "string" &&
    typeof row.recipient_name === "string" &&
    typeof row.message === "string" &&
    typeof row.created_at === "string" &&
    typeof row.updated_at === "string"
  );
};

const mapRowToDto = (row: KudosWithUsersRow): KudoDTO => {
  if (!ensureCompleteRow(row)) {
    throw new Error("Incomplete kudo data returned from database");
  }

  const {
    id,
    sender_id,
    recipient_id,
    message,
    created_at,
    updated_at,
    sender_name,
    sender_avatar,
    sender_email,
    recipient_name,
    recipient_avatar,
    recipient_email,
  } = row;

  return {
    id,
    sender_id,
    recipient_id,
    message,
    created_at,
    updated_at,
    sender: {
      id: sender_id,
      display_name: sender_name,
      avatar_url: sender_avatar ?? null,
      email: sender_email ?? null,
    },
    recipient: {
      id: recipient_id,
      display_name: recipient_name,
      avatar_url: recipient_avatar ?? null,
      email: recipient_email ?? null,
    },
  } satisfies KudoDTO;
};

export const listKudos = async (
  client: SupabaseClient,
  { limit, offset }: ListKudosParams
): Promise<KudoListResponseDTO> => {
  const rangeEnd = offset + limit - 1;

  const { data, count, error } = await client
    .from(KUDOS_VIEW)
    .select(KUDOS_COLUMNS, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, rangeEnd);

  if (error) {
    throw new Error(error.message);
  }

  const kudos = (data ?? []).map(mapRowToDto);
  const total = typeof count === "number" ? count : offset + kudos.length;

  return {
    data: kudos,
    pagination: {
      limit,
      offset,
      total,
    },
  } satisfies KudoListResponseDTO;
};

export type { ListKudosParams };
