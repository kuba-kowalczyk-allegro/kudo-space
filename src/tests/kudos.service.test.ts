import { afterEach, describe, expect, it, vi } from "vitest";

import {
  CreateKudoServiceError,
  DeleteKudoServiceError,
  createKudo,
  deleteKudo,
  listKudos,
} from "../lib/services/kudos.service.ts";
import type { SupabaseClient } from "../db/supabase.client.ts";

const VIEW_NAME = "kudos_with_users";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("listKudos", () => {
  it("maps database rows into DTOs with pagination info", async () => {
    const fromMock = vi.fn();

    const rangeMock = vi.fn().mockResolvedValue({
      data: [
        {
          id: "kudo-1",
          sender_id: "sender-1",
          sender_name: "Sender One",
          sender_email: "sender@example.com",
          sender_avatar: "https://cdn.example.com/sender.png",
          recipient_id: "recipient-1",
          recipient_name: "Recipient One",
          recipient_email: "recipient@example.com",
          recipient_avatar: "https://cdn.example.com/recipient.png",
          message: "Great job!",
          created_at: "2025-01-01T00:00:00.000Z",
          updated_at: "2025-01-01T00:00:00.000Z",
        },
      ],
      count: 5,
      error: null,
    });

    const client = { from: fromMock } as unknown as SupabaseClient;

    fromMock.mockImplementation((table) => {
      expect(table).toBe(VIEW_NAME);
      return {
        select: vi.fn().mockImplementation((columns, options) => {
          expect(columns).toBeDefined();
          expect(options).toEqual({ count: "exact" });
          return {
            order: vi.fn().mockReturnValue({
              range: rangeMock,
            }),
          };
        }),
      };
    });

    const result = await listKudos(client, { limit: 2, offset: 0 });

    expect(result).toEqual({
      data: [
        {
          id: "kudo-1",
          sender_id: "sender-1",
          recipient_id: "recipient-1",
          message: "Great job!",
          created_at: "2025-01-01T00:00:00.000Z",
          updated_at: "2025-01-01T00:00:00.000Z",
          sender: {
            id: "sender-1",
            display_name: "Sender One",
            avatar_url: "https://cdn.example.com/sender.png",
            email: "sender@example.com",
          },
          recipient: {
            id: "recipient-1",
            display_name: "Recipient One",
            avatar_url: "https://cdn.example.com/recipient.png",
            email: "recipient@example.com",
          },
        },
      ],
      pagination: {
        limit: 2,
        offset: 0,
        total: 5,
      },
    });
    expect(rangeMock).toHaveBeenCalledWith(0, 1);
  });

  it("throws when Supabase returns an error", async () => {
    const fromMock = vi.fn().mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          range: vi.fn().mockResolvedValue({
            data: null,
            count: null,
            error: { message: "range failed" },
          }),
        }),
      }),
    }));

    const client = { from: fromMock } as unknown as SupabaseClient;

    await expect(listKudos(client, { limit: 1, offset: 0 })).rejects.toThrow("range failed");
  });

  it("throws when returned rows are incomplete", async () => {
    const fromMock = vi.fn().mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          range: vi.fn().mockResolvedValue({
            data: [
              {
                id: "kudo-1",
                sender_name: "Sender One",
                recipient_id: "recipient-1",
                recipient_name: "Recipient One",
                message: "Nice work",
                created_at: "2025-01-01T00:00:00.000Z",
                updated_at: "2025-01-01T00:00:00.000Z",
              },
            ],
            count: 1,
            error: null,
          }),
        }),
      }),
    }));

    const client = { from: fromMock } as unknown as SupabaseClient;

    await expect(listKudos(client, { limit: 1, offset: 0 })).rejects.toThrow(
      "Incomplete kudo data returned from database"
    );
  });
});

describe("createKudo", () => {
  const senderId = "sender-1";
  const recipientId = "recipient-1";
  const message = "Congrats!";

  it("creates a kudo and returns hydrated data", async () => {
    const fromMock = vi.fn();
    const client = { from: fromMock } as unknown as SupabaseClient;

    fromMock.mockImplementation((table) => {
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: { id: recipientId }, error: null }),
            }),
          }),
        };
      }

      if (table === "kudos") {
        return {
          insert: vi.fn().mockImplementation((payload) => {
            expect(payload).toEqual({
              sender_id: senderId,
              recipient_id: recipientId,
              message,
            });
            return {
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: "kudo-123" }, error: null }),
              }),
            };
          }),
        };
      }

      if (table === VIEW_NAME) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: "kudo-123",
                  sender_id: senderId,
                  sender_name: "Sender One",
                  sender_email: "sender@example.com",
                  sender_avatar: null,
                  recipient_id: recipientId,
                  recipient_name: "Recipient One",
                  recipient_email: "recipient@example.com",
                  recipient_avatar: null,
                  message,
                  created_at: "2025-01-01T00:00:00.000Z",
                  updated_at: "2025-01-01T00:00:00.000Z",
                },
                error: null,
              }),
            }),
          }),
        };
      }

      throw new Error(`Unexpected table ${table}`);
    });

    const result = await createKudo(client, { senderId, recipientId, message });

    expect(result).toEqual({
      id: "kudo-123",
      sender_id: senderId,
      recipient_id: recipientId,
      message,
      created_at: "2025-01-01T00:00:00.000Z",
      updated_at: "2025-01-01T00:00:00.000Z",
      sender: {
        id: senderId,
        display_name: "Sender One",
        avatar_url: null,
        email: "sender@example.com",
      },
      recipient: {
        id: recipientId,
        display_name: "Recipient One",
        avatar_url: null,
        email: "recipient@example.com",
      },
    });
    expect(fromMock).toHaveBeenCalledWith("profiles");
    expect(fromMock).toHaveBeenCalledWith("kudos");
    expect(fromMock).toHaveBeenCalledWith(VIEW_NAME);
  });

  it("throws CreateKudoServiceError when recipient does not exist", async () => {
    const fromMock = vi.fn().mockImplementation((table) => {
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        };
      }
      throw new Error(`Unexpected table ${table}`);
    });

    const client = { from: fromMock } as unknown as SupabaseClient;

    await expect(createKudo(client, { senderId, recipientId, message })).rejects.toMatchObject({
      code: "INVALID_RECIPIENT",
      status: 400,
    } satisfies Pick<CreateKudoServiceError, "code" | "status">);
  });

  it("translates Supabase 42501 error into CreateKudoServiceError", async () => {
    const fromMock = vi.fn().mockImplementation((table) => {
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: { id: recipientId }, error: null }),
            }),
          }),
        };
      }

      if (table === "kudos") {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { code: "42501", message: "forbidden" },
              }),
            }),
          }),
        };
      }

      throw new Error(`Unexpected table ${table}`);
    });

    const client = { from: fromMock } as unknown as SupabaseClient;

    await expect(createKudo(client, { senderId, recipientId, message })).rejects.toMatchObject({
      code: "FORBIDDEN",
      status: 403,
    } satisfies Pick<CreateKudoServiceError, "code" | "status">);
  });
});

describe("deleteKudo", () => {
  const kudoId = "kudo-777";
  const senderId = "sender-1";

  it("deletes a kudo owned by the requester", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { id: kudoId, sender_id: senderId },
      error: null,
    });
    const eqSelect = vi.fn().mockReturnValue({ maybeSingle });
    const selectMock = vi.fn().mockReturnValue({ eq: eqSelect });

    const deleteEq = vi.fn().mockResolvedValue({ error: null });
    const deleteMock = vi.fn().mockReturnValue({ eq: deleteEq });

    const fromMock = vi.fn().mockReturnValue({
      select: selectMock,
      delete: deleteMock,
    });

    const client = { from: fromMock } as unknown as SupabaseClient;

    await expect(deleteKudo(client, { id: kudoId, requesterId: senderId })).resolves.toEqual({ id: kudoId });

    expect(selectMock).toHaveBeenCalledWith("id, sender_id");
    expect(eqSelect).toHaveBeenCalledWith("id", kudoId);
    expect(deleteMock).toHaveBeenCalled();
    expect(deleteEq).toHaveBeenCalledWith("id", kudoId);
  });

  it("throws DeleteKudoServiceError when kudo does not exist", async () => {
    const fromMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) }),
      }),
      delete: vi.fn(),
    });

    const client = { from: fromMock } as unknown as SupabaseClient;

    await expect(deleteKudo(client, { id: kudoId, requesterId: senderId })).rejects.toMatchObject({
      code: "KUDO_NOT_FOUND",
      status: 404,
    } satisfies Pick<DeleteKudoServiceError, "code" | "status">);
  });

  it("throws DeleteKudoServiceError when requester is not the sender", async () => {
    const fromMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: kudoId, sender_id: senderId },
            error: null,
          }),
        }),
      }),
      delete: vi.fn(),
    });

    const client = { from: fromMock } as unknown as SupabaseClient;

    await expect(deleteKudo(client, { id: kudoId, requesterId: "other-user" })).rejects.toMatchObject({
      code: "FORBIDDEN",
      status: 403,
    } satisfies Pick<DeleteKudoServiceError, "code" | "status">);
  });

  it("translates Supabase 42501 deletion error", async () => {
    const deleteEq = vi.fn().mockResolvedValue({
      error: { code: "42501", message: "forbidden" },
    });

    const fromMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: kudoId, sender_id: senderId },
            error: null,
          }),
        }),
      }),
      delete: vi.fn().mockReturnValue({ eq: deleteEq }),
    });

    const client = { from: fromMock } as unknown as SupabaseClient;

    await expect(deleteKudo(client, { id: kudoId, requesterId: senderId })).rejects.toMatchObject({
      code: "FORBIDDEN",
      status: 403,
    } satisfies Pick<DeleteKudoServiceError, "code" | "status">);
  });
});

describe("workflow guard", () => {
  it("fails intentionally to exercise CI protections", () => {
    expect(true).toBe(false);
  });
});
