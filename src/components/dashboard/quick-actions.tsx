import Link from "next/link";

const QUICK_ACTIONS = [
  { label: "Recharge", href: "/wallet" },
  { label: "Orders", href: "/orders" },
  { label: "Profile", href: "/settings" },
  { label: "Support", href: "/support" },
];

export function QuickActions() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {QUICK_ACTIONS.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          className="rounded-xl border border-border bg-surface px-3 py-3 text-center text-sm font-medium text-foreground hover:bg-background"
        >
          {action.label}
        </Link>
      ))}
    </div>
  );
}
