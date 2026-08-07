"use server";

import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/telegram/admin";
import { requireTenantId } from "@/lib/telegram/tenant";
import { TelegramAuthError } from "@/lib/telegram/auth";

export type NewsPostSummary = {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  publishAt: string | null;
  createdAt: string;
};

/**
 * News (Chapter 11): Create/Edit/Schedule/Pin. Public read, admin-editable.
 * Hardcoded to the Falcon Unlocker tenant: this has no initData/request-time
 * identity to resolve the real tenant from — same blocker as listFaqAction
 * (Chapter 31). Keeps today's behavior exactly correct and never leaks a
 * second tenant's posts unfiltered, until bot->tenant resolution extends to
 * this call site too.
 */
export async function listNewsAction(): Promise<NewsPostSummary[]> {
  const posts = await prisma.newsPost.findMany({
    where: {
      tenantId: "falcon-unlocker",
      OR: [{ publishAt: null }, { publishAt: { lte: new Date() } }],
    },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
  });

  return posts.map((post) => ({
    id: post.id,
    title: post.title,
    body: post.body,
    pinned: post.pinned,
    publishAt: post.publishAt?.toISOString() ?? null,
    createdAt: post.createdAt.toISOString(),
  }));
}

export type CreateNewsInput = {
  title: string;
  body: string;
  pinned: boolean;
  publishAt: string | null;
};
export type CreateNewsResult = { ok: true } | { ok: false; error: string };

export async function createNewsAction(
  initData: string,
  input: CreateNewsInput,
): Promise<CreateNewsResult> {
  try {
    const staff = await requireStaff(initData);
    const tenantId = requireTenantId(staff);

    const title = input.title.trim();
    const body = input.body.trim();
    if (!title) return { ok: false, error: "Title is required" };
    if (!body) return { ok: false, error: "Body is required" };

    await prisma.newsPost.create({
      data: {
        title,
        body,
        pinned: input.pinned,
        publishAt: input.publishAt ? new Date(input.publishAt) : null,
        tenantId,
      },
    });

    return { ok: true };
  } catch (error) {
    const message = error instanceof TelegramAuthError ? error.message : "Failed to add news";
    return { ok: false, error: message };
  }
}
