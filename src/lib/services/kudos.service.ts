import type { SupabaseClient } from "../../db/supabase.client.ts";
import type { Database } from "../../db/database.types.ts";
import type { ErrorCode, ErrorDetails, KudoDTO, KudoListResponseDTO } from "../../types.ts";

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

export class CreateKudoServiceError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: ErrorDetails;

  constructor(code: ErrorCode, message: string, status: number, details?: ErrorDetails) {
    super(message);
    this.name = "CreateKudoServiceError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export interface CreateKudoParams {
  senderId: string;
  recipientId: string;
  message: string;
}

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

export const createKudo = async (
  client: SupabaseClient,
  { senderId, recipientId, message }: CreateKudoParams
): Promise<KudoDTO> => {
  const { data: recipient, error: recipientError } = await client
    .from("profiles")
    .select("id")
    .eq("id", recipientId)
    .maybeSingle();

  if (recipientError) {
    throw new Error(recipientError.message);
  }

  if (!recipient) {
    throw new CreateKudoServiceError("INVALID_RECIPIENT", "Recipient does not exist.", 400);
  }

  const { data: insertedKudo, error: insertError } = await client
    .from("kudos")
    .insert({
      sender_id: senderId,
      recipient_id: recipientId,
      message,
    })
    .select("id")
    .single();

  if (insertError) {
    if (insertError.code === "23503") {
      throw new CreateKudoServiceError("INVALID_RECIPIENT", "Recipient does not exist.", 400);
    }

    if (insertError.code === "42501") {
      throw new CreateKudoServiceError("FORBIDDEN", "You are not allowed to create kudos.", 403);
    }

    throw new Error(insertError.message);
  }

  if (!insertedKudo) {
    throw new Error("Failed to insert kudo record.");
  }

  const { data: createdKudoRow, error: fetchError } = await client
    .from(KUDOS_VIEW)
    .select(KUDOS_COLUMNS)
    .eq("id", insertedKudo.id)
    .single();

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  if (!createdKudoRow) {
    throw new Error("Failed to retrieve newly created kudo.");
  }

  return mapRowToDto(createdKudoRow);
};

export type { ListKudosParams };
