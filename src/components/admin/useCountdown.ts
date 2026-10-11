import { useEffect, useState } from 'react';

/** Counts down whole seconds; re-arm it with start(). */
export function useCountdown() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setTimeout(() => setSeconds((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);

  return { seconds, start: setSeconds };
}

export function formatClock(totalSeconds: number): string {
  return `${Math.floor(totalSeconds / 60)}:${(totalSeconds % 60).toString().padStart(2, '0')}`;
}
