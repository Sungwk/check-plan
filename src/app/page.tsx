'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/Button';

export default function Page() {
  const router = useRouter();
  const [groupLink, setGroupLink] = useState('');

  return (
    <main className='min-h-screen bg-slate-950 text-slate-50 px-5 py-8 sm:px-6 lg:px-8'>
      <div className='mx-auto max-w-xl'>
        <div className='rounded-4xl border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/30 backdrop-blur-xl'>
          <div className='space-y-8'>
            <section className='space-y-5'>
              <p className='text-sm uppercase tracking-[0.35em] text-cyan-300'>check plan</p>
              <h1 className='text-4xl font-semibold leading-tight sm:text-5xl'>그룹 일정, 한눈에 관리</h1>
              <p className='text-slate-300 leading-relaxed sm:text-lg'>
                여러 유저의 일정을 그룹 단위로 통합하여 관리하세요. 모바일 화면 중심으로 설계된 첫 화면에서 그룹 생성과
                링크 입력으로 빠르게 시작할 수 있습니다.
              </p>
            </section>

            <section className='space-y-4 rounded-[1.75rem] bg-slate-950/90 p-5 sm:p-6'>
              <Button onClick={() => router.push('/groups/new')} className='w-full justify-center text-base sm:text-lg'>
                그룹 만들기
              </Button>

              <div className='rounded-3xl border border-slate-700 bg-slate-900/90 p-4 sm:p-5'>
                <p className='text-sm font-semibold text-slate-200'>그룹 코드 입력하기</p>
                <p className='mt-1 text-xs text-slate-400'>그룹 코드를 붙여넣어 참가하세요.</p>

                <div className='mt-4 flex flex-col gap-3 sm:flex-row'>
                  <input
                    type='text'
                    value={groupLink}
                    onChange={(event) => setGroupLink(event.target.value)}
                    placeholder='그룹 코드 입력'
                    className='min-w-0 flex-1 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20'
                  />
                  <Button variant='secondary' className='w-full sm:w-auto shrink-0'>
                    입력
                  </Button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
