"use client";

import { useEffect, useState } from "react";
import { useRawInitData } from "@telegram-apps/sdk-react";
import { useTelegramUser } from "@/components/telegram-user-provider";
import { listUsersAction, type AdminUserSummary } from "@/lib/actions/admin-users";
import { UserRow } from "@/components/admin/user-row";
import { Role } from "@/generated/prisma/browser";

export default function AdminUsersPage() {
  const auth = useTelegramUser();
  const initData = useRawInitData();
  const [users, setUsers] = useState<AdminUserSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    if (!initData) return;
    listUsersAction(initData).then((result) => {
      if (result.ok) setUsers(result.users);
      else setError(result.error);
    });
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initData]);

  if (auth.status !== "authenticated" || !initData) return null;
  const isAdmin = auth.user.role === Role.ADMIN;

  if (error) return <p className="text-sm text-accent">{error}</p>;
  if (!users) return <p className="text-sm text-hint">Loading…</p>;

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
      {users.map((user) => (
        <UserRow
          key={user.id}
          user={user}
          initData={initData}
          isAdmin={isAdmin}
          onChanged={refresh}
        />
      ))}
    </div>
  );
}
