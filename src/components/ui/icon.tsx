import type { SVGProps } from "react";

/**
 * A small hand-rolled stroke-icon set, replacing the emoji the UI used to
 * lean on. Emoji render as each platform's own glyph - Apple's, Google's,
 * Samsung's - so the same screen looked different per device, none of them
 * matching the app's own visual language, and they can't take the
 * surrounding text color. These are plain inline SVG: one consistent look
 * everywhere, `currentColor` so they inherit tone from their container,
 * and no icon-font or third-party dependency to ship.
 */
export type IconName =
  | "home"
  | "receipt"
  | "wallet"
  | "user"
  | "clock"
  | "check-circle"
  | "x-circle"
  | "plus"
  | "bell"
  | "menu"
  | "chevron-right"
  | "cart"
  | "message"
  | "help"
  | "settings"
  | "news"
  | "list"
  | "smartphone"
  | "server"
  | "unlock"
  | "shield"
  | "signal"
  | "wrench"
  | "package"
  | "apple";

const PATHS: Record<IconName, React.ReactNode> = {
  home: (
    <>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </>
  ),
  receipt: (
    <>
      <path d="M6 3v18l2-1.5L10 21l2-1.5L14 21l2-1.5L18 21V3l-2 1.5L14 3l-2 1.5L10 3 8 4.5Z" />
      <path d="M9 8h6M9 12h6" />
    </>
  ),
  wallet: (
    <>
      <path d="M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
      <path d="M16 12h3" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  "check-circle": (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.5 2.5 2.5 4.5-5" />
    </>
  ),
  "x-circle": (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m9 9 6 6M15 9l-6 6" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  bell: (
    <>
      <path d="M18 8a6 6 0 1 0-12 0c0 6-2 7-2 7h16s-2-1-2-7" />
      <path d="M10.5 20a2 2 0 0 0 3 0" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  "chevron-right": <path d="m9 5 7 7-7 7" />,
  cart: (
    <>
      <circle cx="9" cy="20" r="1.5" />
      <circle cx="18" cy="20" r="1.5" />
      <path d="M2 3h3l2.6 12.4a1 1 0 0 0 1 .8h8.8a1 1 0 0 0 1-.8L21 7H6" />
    </>
  ),
  message: <path d="M21 12a8 8 0 0 1-8 8H4l2-3a8 8 0 1 1 15-5Z" />,
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.6 2.6 0 1 1 3.4 2.4c-.6.2-.9.8-.9 1.4v.4" />
      <path d="M12 17.2h.01" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.5v2.2M12 19.3v2.2M21.5 12h-2.2M4.7 12H2.5M18.7 5.3l-1.5 1.5M6.8 17.2l-1.5 1.5M18.7 18.7l-1.5-1.5M6.8 6.8 5.3 5.3" />
    </>
  ),
  news: (
    <>
      <path d="M4 5h13v14H4Z" />
      <path d="M17 9h3v8a2 2 0 0 1-3 1.7" />
      <path d="M7 9h7M7 13h7" />
    </>
  ),
  list: (
    <>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <path d="M4.5 6h.01M4.5 12h.01M4.5 18h.01" />
    </>
  ),
  smartphone: (
    <>
      <rect x="6" y="2.5" width="12" height="19" rx="2.5" />
      <path d="M11 18.5h2" />
    </>
  ),
  server: (
    <>
      <rect x="3" y="4" width="18" height="7" rx="2" />
      <rect x="3" y="13" width="18" height="7" rx="2" />
      <path d="M7 7.5h.01M7 16.5h.01" />
    </>
  ),
  unlock: (
    <>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
      <path d="M8 10.5V7a4 4 0 0 1 7.6-1.7" />
    </>
  ),
  shield: (
    <>
      <path d="M12 2.5 20 6v6c0 5-3.4 8.2-8 9.5-4.6-1.3-8-4.5-8-9.5V6Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  signal: <path d="M3 18h2.5v-4H3Zm5.5 0H11V9H8.5Zm5.5 0h2.5V5H14Zm5.5 0H22V2h-2.5Z" />,
  wrench: <path d="M15.5 3a5.5 5.5 0 0 0-4.9 8L3 18.6 5.4 21l7.6-7.6A5.5 5.5 0 1 0 15.5 3Z" />,
  package: (
    <>
      <path d="m12 2.8 8.5 4.6v9.2L12 21.2 3.5 16.6V7.4Z" />
      <path d="M3.5 7.4 12 12l8.5-4.6M12 12v9.2" />
    </>
  ),
  apple: (
    <>
      <path d="M15.5 12.4c0-2.2 1.8-3.2 1.9-3.3-1-1.5-2.6-1.7-3.2-1.8-1.4-.1-2.7.8-3.3.8-.7 0-1.7-.8-2.8-.8-1.5 0-2.8.8-3.6 2.2-1.5 2.7-.4 6.6 1.1 8.8.7 1 1.6 2.2 2.7 2.2 1.1 0 1.5-.7 2.8-.7s1.7.7 2.8.7 1.9-1.1 2.6-2.1c.8-1.2 1.1-2.4 1.2-2.4-.1 0-2.2-.9-2.2-3.6Z" />
      <path d="M13.6 5.6c.6-.7 1-1.7.9-2.7-.9 0-2 .6-2.6 1.3-.6.6-1.1 1.7-.9 2.6 1 .1 2-.5 2.6-1.2Z" />
    </>
  ),
};

export function Icon({
  name,
  className = "h-5 w-5",
  ...props
}: { name: IconName; className?: string } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
      {...props}
    >
      {PATHS[name]}
    </svg>
  );
}
