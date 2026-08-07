let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioContextClass =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioContext) audioContext = new AudioContextClass();
  return audioContext;
}

function playTone(ctx: AudioContext, frequency: number, startTime: number, duration: number) {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(0.25, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(startTime);
  oscillator.stop(startTime + duration + 0.02);
}

/**
 * Short two-note chime for a new admin-relevant request (order, support
 * ticket, recharge proof) arriving while the app is open, alongside the
 * existing haptic nudge. Synthesized with the Web Audio API instead of a
 * bundled audio file - no asset to ship, and browsers/Telegram's WebView
 * only allow audio after the user has already interacted with the page,
 * which by the time an alert lands (the admin is actively using the app)
 * has always happened.
 */
export function playAdminAlertSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
  const now = ctx.currentTime;
  playTone(ctx, 880, now, 0.15);
  playTone(ctx, 1174.66, now + 0.12, 0.18);
}
