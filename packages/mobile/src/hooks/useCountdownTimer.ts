import { useState, useEffect, useRef } from "react";

interface CountdownResult {
  secondsLeft: number;
  isActive: boolean;
}

export function useCountdownTimer(restEndTime: number | null): CountdownResult {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!restEndTime) {
      setSecondsLeft(0);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const update = () => {
      const remaining = Math.max(0, Math.ceil((restEndTime - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining <= 0 && intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    update();
    intervalRef.current = setInterval(update, 250);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [restEndTime]);

  return {
    secondsLeft,
    isActive: restEndTime !== null && secondsLeft > 0,
  };
}
