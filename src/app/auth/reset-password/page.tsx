'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { AuthError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import Button from '@/components/Button';
import { isValidAuthPassword, PASSWORD_POLICY_MESSAGE } from '@/lib/auth-validation';

function authErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const auth = error as AuthError;
    const code = 'code' in auth && auth.code ? ` (${String(auth.code)})` : '';
    return `${auth.message}${code}`;
  }
  if (error instanceof Error) return error.message;
  return '알 수 없는 오류가 발생했습니다.';
}

type Phase = 'loading' | 'form' | 'invalid' | 'done';

export default function ResetPasswordPage() {
  const [phase, setPhase] = useState<Phase>('loading');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const recoveryRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initialHref = window.location.href;
    const hadCode = initialHref.includes('code=');
    const hadRecoveryHash =
      initialHref.includes('type=recovery') || initialHref.includes('type%3Drecovery');

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        recoveryRef.current = true;
        setPhase('form');
      }
    });

    void (async () => {
      if (hadCode) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(initialHref);
        if (exchangeError) {
          console.error(exchangeError);
          setPhase('invalid');
          return;
        }
        window.history.replaceState({}, '', '/auth/reset-password');
        recoveryRef.current = true;
        setPhase('form');
        return;
      }

      await new Promise((r) => setTimeout(r, 0));

      const hashLooksLikeRecovery =
        hadRecoveryHash ||
        initialHref.includes('access_token') ||
        initialHref.includes('refresh_token');

      let session: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session'] = null;
      let sessionError: Awaited<ReturnType<typeof supabase.auth.getSession>>['error'] = null;

      for (let i = 0; i < 10; i++) {
        const r = await supabase.auth.getSession();
        session = r.data.session;
        sessionError = r.error;
        if (recoveryRef.current || session) break;
        if (!hashLooksLikeRecovery) break;
        await new Promise((r) => setTimeout(r, 100));
      }

      if (sessionError) {
        console.error(sessionError);
        setPhase('invalid');
        return;
      }

      if (recoveryRef.current) {
        setPhase('form');
        return;
      }

      if (!session) {
        setPhase('invalid');
        return;
      }

      if (hadRecoveryHash) {
        setPhase('form');
        return;
      }

      setPhase('invalid');
    })();

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (phase !== 'loading') return;
    const t = window.setTimeout(() => {
      setPhase((p) => (p === 'loading' ? 'invalid' : p));
    }, 10000);
    return () => window.clearTimeout(t);
  }, [phase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!isValidAuthPassword(password)) {
      setError(PASSWORD_POLICY_MESSAGE);
      return;
    }
    if (password !== confirm) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }
    setSubmitting(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setPhase('done');
      await supabase.auth.signOut();
    } catch (err: unknown) {
      console.error(err);
      setError(authErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (phase === 'loading') {
    return (
      <main className='min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-5'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto mb-4' />
          <p className='text-slate-400'>링크 확인 중...</p>
        </div>
      </main>
    );
  }

  if (phase === 'invalid') {
    return (
      <main className='min-h-screen bg-slate-950 text-slate-50 px-5 py-8 flex items-center justify-center'>
        <div className='mx-auto max-w-md w-full rounded-4xl border border-white/10 bg-slate-900/80 p-6 text-center space-y-4'>
          <h1 className='text-xl font-semibold text-slate-100'>링크를 사용할 수 없습니다</h1>
          <p className='text-sm text-slate-400'>
            비밀번호 재설정 메일의 링크가 만료되었거나 이미 사용되었습니다. 다시 요청해 주세요.
          </p>
          <Link href='/' className='inline-block text-sm text-cyan-300 hover:underline'>
            홈으로 돌아가기
          </Link>
        </div>
      </main>
    );
  }

  if (phase === 'done') {
    return (
      <main className='min-h-screen bg-slate-950 text-slate-50 px-5 py-8 flex items-center justify-center'>
        <div className='mx-auto max-w-md w-full rounded-4xl border border-white/10 bg-slate-900/80 p-6 text-center space-y-4'>
          <h1 className='text-xl font-semibold text-cyan-300'>비밀번호가 변경되었습니다</h1>
          <p className='text-sm text-slate-400'>새 비밀번호로 다시 로그인해 주세요.</p>
          <Link href='/' className='inline-block text-sm text-cyan-300 hover:underline'>
            로그인하러 가기
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className='min-h-screen bg-slate-950 text-slate-50 px-5 py-8 sm:px-6 flex items-center justify-center'>
      <div className='mx-auto w-full max-w-md'>
        <div className='rounded-4xl border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/30 backdrop-blur-xl space-y-6'>
          <div className='space-y-2 text-center'>
            <p className='text-sm uppercase tracking-[0.35em] text-cyan-300'>check plan</p>
            <h1 className='text-2xl font-semibold text-slate-100'>새 비밀번호 설정</h1>
            <p className='text-sm text-slate-400'>새 비밀번호를 입력하고 저장하세요.</p>
          </div>

          <form onSubmit={handleSubmit} className='space-y-5'>
            <div>
              <div className='mb-2 flex items-center justify-between gap-2'>
                <label className='text-sm font-medium text-slate-200 sm:text-[0.9375rem]'>새 비밀번호</label>
                <button
                  type='button'
                  onClick={() => setShowPw((s) => !s)}
                  className='shrink-0 rounded-md px-2 py-1 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200 sm:text-sm'
                >
                  {showPw ? '숨기기' : '보기'}
                </button>
              </div>
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete='new-password'
                className='min-h-11 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-base text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20'
                placeholder='영문·숫자·특수문자 6자 이상'
              />
              <p className='mt-1.5 text-xs leading-relaxed text-slate-500 sm:text-sm'>{PASSWORD_POLICY_MESSAGE}</p>
            </div>
            <div>
              <div className='mb-2 flex items-center justify-between gap-2'>
                <label className='text-sm font-medium text-slate-200 sm:text-[0.9375rem]'>비밀번호 확인</label>
                <button
                  type='button'
                  onClick={() => setShowPw2((s) => !s)}
                  className='shrink-0 rounded-md px-2 py-1 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200 sm:text-sm'
                >
                  {showPw2 ? '숨기기' : '보기'}
                </button>
              </div>
              <input
                type={showPw2 ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                autoComplete='new-password'
                className='min-h-11 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-base text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20'
                placeholder='한 번 더 입력'
              />
            </div>
            {error ? <p className='text-sm text-rose-400 text-center'>{error}</p> : null}
            <Button
              type='submit'
              disabled={submitting}
              className='w-full justify-center sm:min-h-12 sm:text-base'
            >
              {submitting ? '저장 중...' : '비밀번호 저장'}
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
