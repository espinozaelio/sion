import { useEffect, useState } from 'react';

export function useLiveClock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const date = now.toLocaleDateString('es-VE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const time = now.toLocaleTimeString('es-VE', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
  });

  return { date: date.charAt(0).toUpperCase() + date.slice(1), time };
}
