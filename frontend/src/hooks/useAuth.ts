'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@/types';
import { getStoredUser, getStoredToken, clearAuth } from '@/lib/auth';

export function useAuth(requireAuth = true) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const stored = getStoredUser();
    const token  = getStoredToken();

    if (!stored || !token) {
      if (requireAuth) router.replace('/login');
      setLoading(false);
      return;
    }
    setUser(stored);
    setLoading(false);
  }, [requireAuth, router]);

  const logout = () => {
    clearAuth();
    router.replace('/login');
  };

  return { user, loading, logout };
}
