'use client';

import { useMemo, useState } from 'react';
import type { AuthError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import Button from './Button';
import {
  DISPLAY_NAME_MAX_LEN,
  PASSWORD_POLICY_MESSAGE,
  displayNameForStorage,
  isValidAuthPassword,
  validateDisplayName,
} from '@/lib/auth-validation';

type AuthMode = 'login' | 'signup' | 'forgot';

interface AuthProps {
  onAuthSuccess: () => void;
}

type PasswordConfirmStatus = 'idle' | 'match' | 'mismatch';

function PasswordConfirmFeedback({ status }: { status: PasswordConfirmStatus }) {
  if (status === 'idle') return null;

  if (status === 'match') {
    return (
      <p className='mt-1.5 flex items-center gap-1.5 text-sm text-emerald-400'>
        <span className='flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15' aria-hidden>
          <svg className='h-3.5 w-3.5' viewBox='0 0 20 20' fill='none'>
            <path
              d='M5 10.5l3 3 7-7'
              stroke='currentColor'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'
            />
          </svg>
        </span>
        비밀번호가 일치합니다
      </p>
    );
  }

  return (
    <p className='mt-1.5 flex items-center gap-1.5 text-sm text-rose-400'>
      <span className='flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-500/15' aria-hidden>
        <svg className='h-3.5 w-3.5' viewBox='0 0 20 20' fill='none'>
          <path
            d='M6 6l8 8M14 6l-8 8'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
          />
        </svg>
      </span>
      비밀번호가 일치하지 않습니다
    </p>
  );
}

function authErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const auth = error as AuthError;
    const code = 'code' in auth && auth.code ? ` (${String(auth.code)})` : '';
    return `${auth.message}${code}`;
  }
  if (error instanceof Error) return error.message;
  return '알 수 없는 오류가 발생했습니다.';
}

export default function Auth({ onAuthSuccess }: AuthProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showLoginPw, setShowLoginPw] = useState(false);
  const [showSignupPw, setShowSignupPw] = useState(false);
  const [showSignupPw2, setShowSignupPw2] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: origin ? `${origin}/auth/reset-password` : undefined,
      });
      if (resetError) throw resetError;
      setInfo('재설정 링크를 이메일로 보냈습니다. 메일함·스팸함을 확인해 주세요.');
    } catch (error: unknown) {
      console.error('Password reset request:', error);
      setError(authErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);

    try {
      if (mode === 'signup') {
        const nameErr = validateDisplayName(displayName);
        if (nameErr) {
          setError(nameErr);
          setLoading(false);
          return;
        }
        if (!isValidAuthPassword(password)) {
          setError(PASSWORD_POLICY_MESSAGE);
          setLoading(false);
          return;
        }

        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const storedName = displayNameForStorage(displayName);
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: origin ? `${origin}/` : undefined,
            data: { name: storedName },
          },
        });
        if (signUpError) throw signUpError;

        if (data.session) {
          setInfo('가입이 완료되었습니다. 바로 이용할 수 있어요.');
          onAuthSuccess();
        } else {
          setInfo('가입 확인 메일을 보냈습니다. 메일함·스팸함을 확인해 주세요.');
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
        onAuthSuccess();
      }
    } catch (error: unknown) {
      console.error('Auth error:', error);
      setError(authErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const passwordFieldType =
    mode === 'login'
      ? showLoginPw
        ? 'text'
        : 'password'
      : showSignupPw
        ? 'text'
        : 'password';

  const passwordConfirmStatus: PasswordConfirmStatus = useMemo(() => {
    if (confirmPassword.length === 0) return 'idle';
    return password === confirmPassword ? 'match' : 'mismatch';
  }, [password, confirmPassword]);

  const signupCanSubmit = useMemo(() => {
    if (mode !== 'signup') return true;
    return (
      !validateDisplayName(displayName) &&
      email.trim().length > 0 &&
      isValidAuthPassword(password) &&
      passwordConfirmStatus === 'match'
    );
  }, [mode, displayName, email, password, passwordConfirmStatus]);

  const loginCanSubmit = email.trim().length > 0 && password.length > 0;
  const forgotCanSubmit = email.trim().length > 0;

  const submitDisabled =
    loading ||
    (mode === 'signup' && !signupCanSubmit) ||
    (mode === 'login' && !loginCanSubmit) ||
    (mode === 'forgot' && !forgotCanSubmit);

  const confirmInputBorder =
    passwordConfirmStatus === 'match'
      ? 'border-emerald-500/70 focus:border-emerald-400 focus:ring-emerald-400/20'
      : passwordConfirmStatus === 'mismatch'
        ? 'border-rose-500/70 focus:border-rose-400 focus:ring-rose-400/20'
        : 'border-slate-700 focus:border-cyan-400 focus:ring-cyan-400/20';

  return (
    <div className='space-y-5'>
      <div className='text-center'>
        <h2 className='text-xl font-semibold tracking-tight text-slate-100 sm:text-2xl'>
          {mode === 'login' ? '로그인' : mode === 'signup' ? '회원가입' : '비밀번호 재설정'}
        </h2>
        <p className='mt-2 text-sm leading-relaxed text-slate-400 sm:text-base'>
          {mode === 'login'
            ? '계정으로 로그인하세요'
            : mode === 'signup'
              ? '새 계정을 만들어보세요'
              : '가입한 이메일로 재설정 링크를 보냅니다'}
        </p>
      </div>

      <form
        onSubmit={mode === 'forgot' ? handleForgotSubmit : handleAuth}
        className='space-y-5'
      >
        {mode === 'signup' ? (
          <div>
            <label className='mb-2 flex items-baseline justify-between gap-2 text-sm font-medium text-slate-200 sm:text-[0.9375rem]'>
              <span>이름</span>
              <span className='text-xs font-normal text-slate-500'>
                {displayName.trim().length}/{DISPLAY_NAME_MAX_LEN}자
              </span>
            </label>
            <input
              type='text'
              name='displayName'
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value.slice(0, DISPLAY_NAME_MAX_LEN))}
              required
              maxLength={DISPLAY_NAME_MAX_LEN}
              autoComplete='nickname'
              className='min-h-11 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-base text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20'
              placeholder='표시 이름'
            />
          </div>
        ) : null}

        <div>
          <label className='mb-2 block text-sm font-medium text-slate-200 sm:text-[0.9375rem]'>
            이메일
          </label>
          <input
            type='email'
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className='min-h-11 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-base text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20'
            placeholder='your@email.com'
          />
        </div>

        {mode !== 'forgot' ? (
          <div className='space-y-2'>
            <div className='mb-1 flex items-center justify-between gap-3'>
              <label className='text-sm font-medium text-slate-200 sm:text-[0.9375rem]'>
                비밀번호
              </label>
              <div className='flex shrink-0 items-center gap-2'>
                <button
                  type='button'
                  onClick={() =>
                    mode === 'login'
                      ? setShowLoginPw((s) => !s)
                      : setShowSignupPw((s) => !s)
                  }
                  className='rounded-md px-2 py-1 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200 sm:text-sm'
                >
                  {mode === 'login'
                    ? showLoginPw
                      ? '숨기기'
                      : '보기'
                    : showSignupPw
                      ? '숨기기'
                      : '보기'}
                </button>
                {mode === 'login' ? (
                  <button
                    type='button'
                    onClick={() => {
                      setMode('forgot');
                      setError('');
                      setInfo('');
                    }}
                    className='rounded-lg py-1.5 text-sm font-medium text-cyan-300/95 underline-offset-2 hover:text-cyan-200 hover:underline sm:text-[0.9375rem]'
                  >
                    비밀번호를 잊으셨나요?
                  </button>
                ) : null}
              </div>
            </div>
            <input
              type={passwordFieldType}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className='min-h-11 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-base text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20'
              placeholder={mode === 'signup' ? '영문·숫자·특수문자 6자 이상' : '비밀번호'}
            />
            {mode === 'signup' ? (
              <p className='text-xs leading-relaxed text-slate-500 sm:text-sm'>
                {PASSWORD_POLICY_MESSAGE}
              </p>
            ) : null}
          </div>
        ) : null}

        {mode === 'signup' ? (
          <div>
            <div className='mb-1 flex items-center justify-between gap-3'>
              <label className='text-sm font-medium text-slate-200 sm:text-[0.9375rem]'>
                비밀번호 확인
              </label>
              <button
                type='button'
                onClick={() => setShowSignupPw2((s) => !s)}
                className='shrink-0 rounded-md px-2 py-1 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200 sm:text-sm'
              >
                {showSignupPw2 ? '숨기기' : '보기'}
              </button>
            </div>
            <div className='relative'>
              <input
                type={showSignupPw2 ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete='new-password'
                aria-invalid={passwordConfirmStatus === 'mismatch'}
                className={`min-h-11 w-full rounded-2xl border bg-slate-950 py-3 pl-4 pr-12 text-base text-slate-100 outline-none transition placeholder:text-slate-500 focus:ring-2 ${confirmInputBorder}`}
                placeholder='비밀번호 다시 입력'
              />
              {passwordConfirmStatus !== 'idle' ? (
                <span
                  className='pointer-events-none absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center'
                  aria-hidden
                >
                  {passwordConfirmStatus === 'match' ? (
                    <span className='flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400'>
                      <svg className='h-4 w-4' viewBox='0 0 20 20' fill='none'>
                        <path
                          d='M5 10.5l3 3 7-7'
                          stroke='currentColor'
                          strokeWidth='2'
                          strokeLinecap='round'
                          strokeLinejoin='round'
                        />
                      </svg>
                    </span>
                  ) : (
                    <span className='flex h-7 w-7 items-center justify-center rounded-full bg-rose-500/20 text-rose-400'>
                      <svg className='h-4 w-4' viewBox='0 0 20 20' fill='none'>
                        <path
                          d='M6 6l8 8M14 6l-8 8'
                          stroke='currentColor'
                          strokeWidth='2'
                          strokeLinecap='round'
                        />
                      </svg>
                    </span>
                  )}
                </span>
              ) : null}
            </div>
            <PasswordConfirmFeedback status={passwordConfirmStatus} />
          </div>
        ) : null}

        {error ? (
          <p className='text-center text-sm leading-relaxed text-rose-400 sm:text-[0.9375rem]'>{error}</p>
        ) : null}
        {info ? (
          <p className='text-center text-sm leading-relaxed text-cyan-300/95 sm:text-[0.9375rem]'>{info}</p>
        ) : null}

        <Button
          type='submit'
          disabled={submitDisabled}
          className='w-full justify-center sm:min-h-12 sm:text-base'
        >
          {loading
            ? (mode === 'login'
                ? '로그인 중...'
                : mode === 'signup'
                  ? '회원가입 중...'
                  : '전송 중...')
            : (mode === 'login'
                ? '로그인'
                : mode === 'signup'
                  ? '회원가입'
                  : '재설정 링크 보내기')
          }
        </Button>
      </form>

      <div className='text-center'>
        {mode === 'forgot' ? (
          <button
            type='button'
            onClick={() => {
              setMode('login');
              setError('');
              setInfo('');
            }}
            className='min-h-11 rounded-lg px-3 text-sm font-medium text-cyan-300/95 underline-offset-2 hover:text-cyan-200 hover:underline sm:text-[0.9375rem]'
          >
            로그인으로 돌아가기
          </button>
        ) : (
          <button
            type='button'
            onClick={() => {
              const next = mode === 'login' ? 'signup' : 'login';
              setMode(next);
              setError('');
              setInfo('');
              setPassword('');
              setConfirmPassword('');
              setShowLoginPw(false);
              setShowSignupPw(false);
              setShowSignupPw2(false);
              if (next === 'login') {
                setDisplayName('');
              }
            }}
            className='min-h-11 rounded-lg px-3 text-sm font-medium text-cyan-300/95 underline-offset-2 hover:text-cyan-200 hover:underline sm:text-[0.9375rem]'
          >
            {mode === 'login'
              ? '계정이 없으신가요? 회원가입'
              : '이미 계정이 있으신가요? 로그인'
            }
          </button>
        )}
      </div>
    </div>
  );
}
