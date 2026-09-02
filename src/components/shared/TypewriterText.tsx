import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface TypewriterTextProps {
  text: string;
  className?: string;
  /** ms por caractere */
  speedMs?: number;
  onDone?: () => void;
}

/** Animação estilo máquina de escrever. */
export default function TypewriterText({
  text,
  className,
  speedMs = 28,
  onDone,
}: TypewriterTextProps) {
  const [shown, setShown] = useState('');
  const [done, setDone] = useState(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    setShown('');
    setDone(false);
    if (!text) return;

    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) {
        window.clearInterval(id);
        setDone(true);
        onDoneRef.current?.();
      }
    }, Math.max(12, speedMs));

    return () => window.clearInterval(id);
  }, [text, speedMs]);

  return (
    <span className={cn('inline', className)}>
      {shown}
      <span
        className={cn(
          'inline-block w-[0.55ch] ml-0.5 align-baseline bg-current opacity-70',
          done ? 'opacity-0' : 'animate-pulse'
        )}
        style={{ height: '1em' }}
        aria-hidden
      />
    </span>
  );
}
