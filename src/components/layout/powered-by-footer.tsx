/**
 * Fixed platform branding, shown to every tenant regardless of their own
 * brand settings - the mobile menu drawer and the desktop sidebar both
 * render this below their own nav/Logout so it's always the last thing
 * visible in that panel.
 */
export function PoweredByFooter() {
  return (
    <div className="mt-4 flex flex-col items-center gap-2 border-t border-border pt-3 text-center">
      <p className="text-[11px] font-bold uppercase tracking-widest text-accent">
        Powered by Falcon UPS Server
      </p>
      <a
        href="https://t.me/falconupsserver"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-1.5 text-xs font-semibold text-accent-foreground shadow-sm transition-transform active:scale-95"
      >
        <span aria-hidden>📣</span>
        Channel
      </a>
    </div>
  );
}
