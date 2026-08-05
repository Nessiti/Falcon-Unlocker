"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/telegram/current-user";
import { requireAdmin } from "@/lib/telegram/admin";
import { TelegramAuthError } from "@/lib/telegram/auth";
import { Role, TicketStatus } from "@/generated/prisma/client";
import { notifySupportReply } from "@/lib/telegram/notifications";

export type TicketMessageSummary = {
  id: string;
  body: string;
  createdAt: string;
  authorId: string;
  authorName: string;
};

export type TicketSummary = {
  id: string;
  subject: string;
  status: TicketStatus;
  createdAt: string;
  lastMessageAt: string;
};

export type TicketDetail = TicketSummary & {
  ownerId: string;
  messages: TicketMessageSummary[];
};

export type CreateTicketInput = { subject: string; message: string };
export type CreateTicketResult = { ok: true; ticketId: string } | { ok: false; error: string };

/** Opening a ticket starts the chat thread (Chapter 10: Chat and Tickets are the same feature). */
export async function createTicketAction(
  initData: string,
  input: CreateTicketInput,
): Promise<CreateTicketResult> {
  try {
    const user = await getCurrentUser(initData);
    const subject = input.subject.trim();
    const message = input.message.trim();
    if (!subject) return { ok: false, error: "Subject is required" };
    if (!message) return { ok: false, error: "Message is required" };

    const ticket = await prisma.supportTicket.create({
      data: {
        subject,
        userId: user.id,
        messages: { create: { body: message, authorId: user.id } },
      },
    });

    return { ok: true, ticketId: ticket.id };
  } catch (error) {
    const message =
      error instanceof TelegramAuthError ? error.message : "Failed to create ticket";
    return { ok: false, error: message };
  }
}

export type ListMyTicketsResult = { ok: true; tickets: TicketSummary[] } | { ok: false; error: string };

export async function listMyTicketsAction(initData: string): Promise<ListMyTicketsResult> {
  try {
    const user = await getCurrentUser(initData);
    const tickets = await prisma.supportTicket.findMany({
      where: { userId: user.id },
      include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
      orderBy: { createdAt: "desc" },
    });

    return {
      ok: true,
      tickets: tickets.map((ticket) => ({
        id: ticket.id,
        subject: ticket.subject,
        status: ticket.status,
        createdAt: ticket.createdAt.toISOString(),
        lastMessageAt: (ticket.messages[0]?.createdAt ?? ticket.createdAt).toISOString(),
      })),
    };
  } catch (error) {
    const message = error instanceof TelegramAuthError ? error.message : "Failed to load tickets";
    return { ok: false, error: message };
  }
}

export type GetTicketResult = { ok: true; ticket: TicketDetail } | { ok: false; error: string };

export async function getTicketAction(
  initData: string,
  ticketId: string,
): Promise<GetTicketResult> {
  try {
    const user = await getCurrentUser(initData);
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: { messages: { orderBy: { createdAt: "asc" }, include: { author: true } } },
    });
    if (!ticket) return { ok: false, error: "Ticket not found" };
    if (ticket.userId !== user.id && user.role !== Role.ADMIN) {
      return { ok: false, error: "Not authorized to view this ticket" };
    }

    return {
      ok: true,
      ticket: {
        id: ticket.id,
        subject: ticket.subject,
        status: ticket.status,
        createdAt: ticket.createdAt.toISOString(),
        lastMessageAt: (
          ticket.messages[ticket.messages.length - 1]?.createdAt ?? ticket.createdAt
        ).toISOString(),
        ownerId: ticket.userId,
        messages: ticket.messages.map((message) => ({
          id: message.id,
          body: message.body,
          createdAt: message.createdAt.toISOString(),
          authorId: message.authorId,
          authorName: message.author.firstName,
        })),
      },
    };
  } catch (error) {
    const message = error instanceof TelegramAuthError ? error.message : "Failed to load ticket";
    return { ok: false, error: message };
  }
}

export type SendTicketMessageInput = { ticketId: string; body: string };
export type SendTicketMessageResult = { ok: true } | { ok: false; error: string };

export async function sendTicketMessageAction(
  initData: string,
  input: SendTicketMessageInput,
): Promise<SendTicketMessageResult> {
  try {
    const user = await getCurrentUser(initData);
    const body = input.body.trim();
    if (!body) return { ok: false, error: "Message is required" };

    const ticket = await prisma.supportTicket.findUnique({ where: { id: input.ticketId } });
    if (!ticket) return { ok: false, error: "Ticket not found" };

    const isOwner = ticket.userId === user.id;
    const isAdmin = user.role === Role.ADMIN;
    if (!isOwner && !isAdmin) {
      return { ok: false, error: "Not authorized to reply to this ticket" };
    }
    if (ticket.status === TicketStatus.CLOSED) {
      return { ok: false, error: "This ticket is closed" };
    }

    await prisma.$transaction([
      prisma.supportMessage.create({ data: { ticketId: ticket.id, authorId: user.id, body } }),
      prisma.supportTicket.update({
        where: { id: ticket.id },
        data: { status: isAdmin ? TicketStatus.ANSWERED : TicketStatus.OPEN },
      }),
    ]);

    if (isAdmin && !isOwner) {
      const owner = await prisma.user.findUnique({ where: { id: ticket.userId } });
      if (owner) await notifySupportReply(owner.telegramId, body);
    }

    return { ok: true };
  } catch (error) {
    const message = error instanceof TelegramAuthError ? error.message : "Failed to send message";
    return { ok: false, error: message };
  }
}

export type AdminTicketSummary = TicketSummary & { customerName: string };
export type GetAdminTicketQueueResult =
  | { ok: true; tickets: AdminTicketSummary[] }
  | { ok: false; error: string };

export async function getAdminTicketQueueAction(
  initData: string,
): Promise<GetAdminTicketQueueResult> {
  try {
    await requireAdmin(initData);

    const tickets = await prisma.supportTicket.findMany({
      where: { status: { not: TicketStatus.CLOSED } },
      include: { user: true, messages: { orderBy: { createdAt: "desc" }, take: 1 } },
      orderBy: { createdAt: "desc" },
    });

    return {
      ok: true,
      tickets: tickets.map((ticket) => ({
        id: ticket.id,
        subject: ticket.subject,
        status: ticket.status,
        createdAt: ticket.createdAt.toISOString(),
        lastMessageAt: (ticket.messages[0]?.createdAt ?? ticket.createdAt).toISOString(),
        customerName: [ticket.user.firstName, ticket.user.lastName].filter(Boolean).join(" "),
      })),
    };
  } catch (error) {
    const message =
      error instanceof TelegramAuthError ? error.message : "Failed to load ticket queue";
    return { ok: false, error: message };
  }
}

export type CloseTicketResult = { ok: true } | { ok: false; error: string };

export async function closeTicketAction(
  initData: string,
  ticketId: string,
): Promise<CloseTicketResult> {
  try {
    const user = await getCurrentUser(initData);
    const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) return { ok: false, error: "Ticket not found" };
    if (ticket.userId !== user.id && user.role !== Role.ADMIN) {
      return { ok: false, error: "Not authorized to close this ticket" };
    }

    await prisma.supportTicket.update({
      where: { id: ticket.id },
      data: { status: TicketStatus.CLOSED },
    });

    return { ok: true };
  } catch (error) {
    const message = error instanceof TelegramAuthError ? error.message : "Failed to close ticket";
    return { ok: false, error: message };
  }
}
