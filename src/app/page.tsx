'use client';

import { useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { displayNameForStorage } from '@/lib/auth-validation';
import Button from '@/components/Button';
import Auth from '@/components/Auth';

function rowNameFromUser(user: User): string {
  const raw = user.user_metadata?.name;
  if (typeof raw === 'string' && raw.trim()) return displayNameForStorage(raw);
  return user.email?.split('@')[0] || 'User';
}

export default function Page() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [groupLink, setGroupLink] = useState('');
  const [userGroups, setUserGroups] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    const loadUserGroups = async (userId: string) => {
      try {
        const { data: groups } = await supabase
          .from('rel_groups_users')
          .select('groups(id, name)')
          .eq('user_id', userId);

        const groupList = (groups ?? [])
          .map((item: unknown) => {
            const itemObj = item as {
              groups?:
                | { id: string; name: string }
                | { id: string; name: string }[];
            };

            const groupsField = itemObj.groups;

            if (Array.isArray(groupsField)) return groupsField[0];

            return groupsField;
          })
          .filter((g): g is { id: string; name: string } => Boolean(g));

        setUserGroups(groupList);
      } catch (error) {
        console.error('그룹 목록 로드 오류:', error);
      }
    };

    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUser(user);
      setLoading(false);

      if (user) {
        await loadUserGroups(user.id);
      }
    };

    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_, session) => {
      const currentUser = session?.user ?? null;

      setUser(currentUser);
      setLoading(false);

      if (currentUser) {
        await loadUserGroups(currentUser.id);
      } else {
        setUserGroups([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleJoinGroup = async () => {
    if (!groupLink.trim() || !user) return;

    setLoading(true);
    try {
      // users 테이블에 사용자가 있는지 확인
      const { data: userExists } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single();

      // 없으면 추가
      if (!userExists) {
        const { error: createUserError } = await supabase
          .from('users')
          .insert({
            id: user.id,
            email: user.email,
            name: rowNameFromUser(user),
            color: '#45B7D1'
          });
        if (createUserError) throw createUserError;
      }

      // 그룹 코드로 그룹 찾기
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .select('id, name')
        .eq('code', groupLink.trim().toUpperCase())
        .single();

      if (groupError || !group) {
        alert('존재하지 않는 그룹 코드입니다.');
        setLoading(false);
        return;
      }

      // 이미 그룹에 참가했는지 확인
      const { data: existingMember } = await supabase
        .from('rel_groups_users')
        .select('id')
        .eq('group_id', group.id)
        .eq('user_id', user.id)
        .single();

      if (existingMember) {
        alert('이미 이 그룹에 참가하셨습니다.');
        router.push(`/groups/${group.id}`);
        setLoading(false);
        return;
      }

      // 그룹에 참가
      const { error: joinError } = await supabase
        .from('rel_groups_users')
        .insert({
          group_id: group.id,
          user_id: user.id,
          role: 'member'
        });

      if (joinError) {
        alert('그룹 참가에 실패했습니다.');
        setLoading(false);
        return;
      }

      alert(`${group.name} 그룹에 참가했습니다!`);
      setGroupLink('');
      router.push(`/groups/${group.id}`);
    } catch (error) {
      console.error('Error joining group:', error);
      alert('그룹 참가 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
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
    // 로그인되지 않은 상태
    return (
      <main className='min-h-screen bg-slate-950 text-slate-50 px-5 py-8 sm:px-6 lg:px-8'>
        <div className='mx-auto max-w-xl'>
          <div className='rounded-4xl border border-white/10 bg-slate-900/80 p-6 sm:p-8 shadow-2xl shadow-slate-950/30 backdrop-blur-xl'>
            <div className='space-y-8'>
              <section className='space-y-4'>
                <p className='text-xs font-medium uppercase tracking-[0.28em] text-cyan-300/90 sm:text-sm sm:tracking-[0.32em]'>
                  check plan
                </p>
                <h1 className='text-3xl font-semibold leading-snug tracking-tight text-slate-50 sm:text-4xl'>
                  그룹 일정, 한눈에 관리
                </h1>
                <p className='max-w-prose text-base leading-relaxed text-slate-300 sm:text-[1.05rem]'>
                  여러 유저의 일정을 그룹 단위로 통합하여 관리하세요. 시작하기 전에 로그인해주세요.
                </p>
              </section>

              <section className='rounded-[1.75rem] bg-slate-950/90 p-6 sm:p-7'>
                <Auth onAuthSuccess={() => {}} />
              </section>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // 로그인된 상태 - 기존 그룹 생성/입력 UI
  return (
    <main className='min-h-screen bg-slate-950 text-slate-50 px-5 py-8 sm:px-6 lg:px-8'>
      <div className='mx-auto max-w-xl'>
        <div className='rounded-4xl border border-white/10 bg-slate-900/80 p-6 sm:p-8 shadow-2xl shadow-slate-950/30 backdrop-blur-xl'>
          <div className='space-y-8'>
            <section className='space-y-4'>
              <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6'>
                <div className='min-w-0 space-y-3'>
                  <p className='text-xs font-medium uppercase tracking-[0.28em] text-cyan-300/90 sm:text-sm sm:tracking-[0.32em]'>
                    check plan
                  </p>
                  <h1 className='text-3xl font-semibold leading-snug tracking-tight text-slate-50 sm:text-4xl'>
                    그룹 일정, 한눈에 관리
                  </h1>
                </div>
                <Button
                  onClick={handleLogout}
                  variant='secondary'
                  className='w-full shrink-0 sm:w-auto sm:self-start'
                >
                  로그아웃
                </Button>
              </div>
              <p className='text-base leading-relaxed text-slate-300 sm:text-[1.05rem]'>
                환영합니다! {user.user_metadata?.name}님. 그룹을 생성하거나 코드로 참가해보세요.
              </p>
            </section>

            <section className='space-y-5 rounded-[1.75rem] bg-slate-950/90 p-6 sm:p-7'>
              <Button
                onClick={() => router.push('/groups/new')}
                className='w-full justify-center sm:min-h-12 sm:text-base'
              >
                그룹 만들기
              </Button>

              <div className='rounded-3xl border border-slate-700 bg-slate-900/90 p-5 sm:p-6'>
                <p className='text-base font-semibold text-slate-100'>그룹 코드 입력하기</p>
                <p className='mt-1.5 text-sm leading-relaxed text-slate-400'>
                  그룹 코드를 붙여넣어 참가하세요.
                </p>

                <div className='mt-5 flex flex-col gap-3 sm:flex-row sm:items-stretch'>
                  <input
                    type='text'
                    value={groupLink}
                    onChange={(event) => setGroupLink(event.target.value)}
                    placeholder='그룹 코드 입력'
                    className='min-h-11 min-w-0 flex-1 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-base text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20'
                  />
                  <Button
                    onClick={handleJoinGroup}
                    variant='secondary'
                    className='w-full min-h-11 shrink-0 px-6 sm:w-auto sm:min-w-[7rem]'
                  >
                    입력
                  </Button>
                </div>
              </div>
            </section>

            {userGroups.length > 0 ? (
              <section className='space-y-4 rounded-[1.75rem] bg-slate-950/90 p-6 sm:p-7'>
                <div>
                  <p className='text-base font-semibold text-slate-100'>내 그룹</p>
                  <p className='mt-1 text-sm leading-relaxed text-slate-400'>
                    {userGroups.length}개 그룹에 참가 중입니다.
                  </p>
                </div>
                <div className='space-y-2'>
                  {userGroups.map((group) => (
                    <button
                      key={group.id}
                      onClick={() => router.push(`/groups/${group.id}`)}
                      className='w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-left transition hover:border-cyan-400 hover:bg-slate-800 sm:text-sm'
                    >
                      <p className='font-medium text-slate-100'>{group.name}</p>
                      <p className='mt-1 text-xs text-slate-400'>클릭하여 이동</p>
                    </button>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}
