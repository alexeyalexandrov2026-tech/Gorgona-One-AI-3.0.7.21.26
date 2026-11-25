"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../components/AuthProvider';
import { useLocale } from '../../components/LocaleProvider';
import { getSocialAuthCopy } from '../../../lib/socialAuthCopy.mjs';
import { postLoginPath } from '../../../lib/postLoginPath.mjs';

export default function AuthCallbackPage() {
  const router = useRouter();
  const auth = useAuth();
  const locale = useLocale();
  const copy = getSocialAuthCopy(locale);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const next = params.get('next');
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }
        const session = await auth?.refresh();
        if (cancelled) return;
        if (!session) {
          setFailed(true);
          return;
        }
        router.replace(postLoginPath(session?.role, next));
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => { cancelled = true; };
  }, [auth, router]);

  return (
    <main className="flex flex-1 items-center justify-center py-20">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 text-center shadow-premium backdrop-blur-md">
        {failed ? (
          <div className="grid gap-4">
            <p role="alert" className="text-sm text-red-300">{copy.callbackError}</p>
            <Link href="/login" className="inline-flex justify-center rounded-full bg-brand-gold px-5 py-2.5 text-sm font-medium text-black">
              {copy.backToLogin}
            </Link>
          </div>
        ) : (
          <p role="status" className="text-sm text-zinc-300">{copy.callbackLoading}</p>
        )}
      </div>
    </main>
  );
}
