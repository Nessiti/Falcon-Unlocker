import { ConnectionStatus } from "@/components/connection-status";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center sm:px-10">
      <span className="text-4xl">🦅</span>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Falcon Unlocker
      </h1>
      <p className="max-w-sm text-sm text-hint">
        The first Telegram-native GSM Server.
      </p>
      <div className="mt-4">
        <ConnectionStatus />
      </div>
    </main>
  );
}
