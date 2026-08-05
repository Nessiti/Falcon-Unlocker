export function ComingSoon({ title, chapter }: { title: string; chapter: string }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <h1 className="text-lg font-semibold text-foreground">{title}</h1>
      <p className="text-sm text-hint">Coming in {chapter}.</p>
    </main>
  );
}
