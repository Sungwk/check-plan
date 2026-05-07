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
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setCode(generateGroupCode());
  }, []);

  const handleCreateGroup = async () => {
    setError('');
    if (!name.trim()) {
      setError('그룹 이름을 입력해주세요.');
      return;
    }

    setLoading(true);
    const { data, error: insertError } = await supabase
      .from('groups')
      .insert({ name: name.trim(), code })
      .select('id')
      .single();

    setLoading(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    if (data?.id) {
      router.push(`/groups/${data.id}`);
    } else {
      setError('그룹 생성에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const handleRegenerateCode = () => {
    setCode(generateGroupCode());
  };

  return (
    <main className='min-h-screen bg-slate-950 text-slate-50 px-5 py-8 sm:px-6 lg:px-8'>
      <div className='mx-auto max-w-xl'>
        <div className='rounded-4xl border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/30 backdrop-blur-xl'>
          <div className='space-y-8'>
            <section className='space-y-5'>
              <p className='text-sm uppercase tracking-[0.35em] text-cyan-300'>그룹 생성</p>
              <h1 className='text-4xl font-semibold leading-tight sm:text-5xl'>새로운 그룹을 만들어보세요</h1>
              <p className='text-slate-300 leading-relaxed sm:text-lg'>그룹 이름과 코드를 입력하면 새로운 일정 그룹이 생성됩니다.</p>
            </section>

            <section className='space-y-6 rounded-[1.75rem] bg-slate-950/90 p-5 sm:p-6'>
              <div className='space-y-3'>
                <label className='block text-sm font-semibold text-slate-200'>그룹 이름</label>
                <input
                  type='text'
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder='예: 여행 일정'                
                  className='w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20'
                />
              </div>

              <div className='space-y-3'>
                <div className='flex items-center justify-between'>
                  <label className='text-sm font-semibold text-slate-200'>그룹 코드</label>
                  <button type='button' onClick={handleRegenerateCode} className='text-xs text-cyan-300 hover:underline'>코드 재생성</button>
                </div>
                <div className='flex items-center gap-3'>
                  <div className='flex-1 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-base tracking-[0.25em] text-slate-100'>{code}</div>
                  <Button
                    onClick={() => navigator.clipboard.writeText(code)}
                    variant='secondary'
                    className='shrink-0'
                  >
                    복사
                  </Button>
                </div>
              </div>

              {error ? <p className='text-sm text-rose-400'>{error}</p> : null}

              <Button onClick={handleCreateGroup} disabled={loading} className='w-full justify-center text-base sm:text-lg'>
                {loading ? '생성 중...' : '그룹 생성하기'}
              </Button>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
