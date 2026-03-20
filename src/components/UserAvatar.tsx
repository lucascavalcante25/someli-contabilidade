import { useEffect, useRef, useState } from 'react';
import { API_BASE_URL } from '@/lib/api';
import { apiFetch } from '@/lib/http';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface UserAvatarProps {
  userId?: number;
  fotoUrl?: string;
  nome?: string;
  /** Quando muda, força novo fetch da foto (ex: após editar perfil) */
  avatarVersion?: number;
  className?: string;
}

export default function UserAvatar({ userId, fotoUrl, nome, avatarVersion, className }: UserAvatarProps) {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!userId) {
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
      setImgSrc(null);
      return;
    }
    let cancelled = false;
    apiFetch(`${API_BASE_URL}/usuarios/${userId}/foto`, { headers: {} })
      .then(res => {
        if (cancelled || !res.ok) return null;
        return res.blob();
      })
      .then(blob => {
        if (cancelled || !blob) return;
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        const url = URL.createObjectURL(blob);
        urlRef.current = url;
        setImgSrc(url);
      })
      .catch(() => !cancelled && setImgSrc(null));
    return () => {
      cancelled = true;
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
      setImgSrc(null);
    };
  }, [userId, fotoUrl, avatarVersion]);

  return (
    <Avatar
      className={cn(
        'h-8 w-8 ring-[1.5px] ring-primary ring-offset-1 ring-offset-background',
        className
      )}
    >
      {imgSrc && <AvatarImage src={imgSrc} alt={nome} className="object-cover" />}
      <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
        {nome?.charAt(0) || 'U'}
      </AvatarFallback>
    </Avatar>
  );
}
