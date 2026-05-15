'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/Button';
import { supabase } from '@/lib/supabase';

function generateGroupCode(length = 6) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
}

export default function Page() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [code, setCode] = useState(() => generateGroupCode());
  const [error, setError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    // 로그인 상태 확인
    const checkUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        router.push('/');
        return;
      }
      setUser(user);
      setLoading(false);
    };

    checkUser();
  }, [router]);

  const handleCreateGroup = async () => {
    setError('');
    if (!name.trim() || !user) {
      setError('그룹 이름을 입력해주세요.');
      return;
    }

    setAuthLoading(true);
    try {
      // 그룹 생성
      const { data, error: insertError } = await supabase
        .from('groups')
        .insert({
          name: name.trim(),
          code,
          created_by: user.id
        })
        .select('id')
        .single();

      if (insertError) {
        setError(insertError.message);
        setAuthLoading(false);
        return;
      }

      if (data?.id) {
        // 생성자를 그룹 멤버로 추가
        const { error: memberError } = await supabase
          .from('rel_groups_users')
          .insert({
            group_id: data.id,
            user_id: user.id,
            role: 'owner'
          });

        if (memberError) {
          setError(memberError.message);
          setAuthLoading(false);
          return;
        }

        router.push(`/groups/${data.id}`);
      } else {
        setError('그룹 생성에 실패했습니다. 다시 시도해주세요.');
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
      setError(message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegenerateCode = () => {
    setCode(generateGroupCode());
  };

  if (loading) {
    return (
      <main className='min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto mb-4'></div>
          <p className='text-slate-400'>로딩 중...</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return null; // 리다이렉트 중
  }

  return (
    <main className='min-h-screen bg-slate-950 text-slate-50 px-5 py-8 sm:px-6 lg:px-8'>
      <div className='mx-auto max-w-xl'>
        <div className='rounded-4xl border border-white/10 bg-slate-900/80 p-6 sm:p-8 shadow-2xl shadow-slate-950/30 backdrop-blur-xl'>
          <div className='space-y-8'>
            <section className='space-y-4'>
              <p className='text-xs font-medium uppercase tracking-[0.28em] text-cyan-300/90 sm:text-sm sm:tracking-[0.32em]'>
                그룹 생성
              </p>
              <h1 className='text-3xl font-semibold leading-snug tracking-tight text-slate-50 sm:text-4xl'>
                새로운 그룹을 만들어보세요
              </h1>
              <p className='text-base leading-relaxed text-slate-300 sm:text-[1.05rem]'>
                그룹 이름과 코드를 입력하면 새로운 일정 그룹이 생성됩니다.
              </p>
            </section>

            <section className='space-y-6 rounded-[1.75rem] bg-slate-950/90 p-6 sm:p-7'>
              <div className='space-y-3'>
                <label className='block text-sm font-semibold text-slate-200 sm:text-[0.9375rem]'>그룹 이름</label>
                <input
                  type='text'
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder='예: 여행 일정'
                  className='min-h-11 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-base text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20'
                />
              </div>

              <div className='space-y-3'>
                <div className='flex items-center justify-between gap-3'>
                  <label className='text-sm font-semibold text-slate-200 sm:text-[0.9375rem]'>그룹 코드</label>
                  <button
                    type='button'
                    onClick={handleRegenerateCode}
                    className='shrink-0 rounded-lg py-1.5 text-sm font-medium text-cyan-300/95 underline-offset-2 hover:text-cyan-200 hover:underline'
                  >
                    코드 재생성
                  </button>
                </div>
                <div className='flex flex-col gap-3 sm:flex-row sm:items-stretch'>
                  <div className='flex min-h-11 flex-1 items-center rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-base tracking-[0.25em] text-slate-100'>
                    {code}
                  </div>
                  <Button
                    onClick={() => navigator.clipboard.writeText(code)}
                    variant='secondary'
                    className='w-full shrink-0 sm:w-auto'
                  >
                    복사
                  </Button>
                </div>
              </div>

              {error ? <p className='text-sm leading-relaxed text-rose-400 sm:text-[0.9375rem]'>{error}</p> : null}

              <Button
                onClick={handleCreateGroup}
                disabled={authLoading}
                className='w-full justify-center sm:min-h-12 sm:text-base'
              >
                {authLoading ? '생성 중...' : '그룹 생성하기'}
              </Button>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
