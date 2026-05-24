'use client';

import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Button from '@/components/Button';
import type { User } from '@supabase/supabase-js';

type Group = {
  id: string;
  name: string;
  code?: string | null;
};

type SupabaseUserRelation = {
  id: string;
  name: string;
  color?: string | null;
};

type GroupMember = {
  user_id: string;
  role: string;
  users?: SupabaseUserRelation | null;
};

type ScheduleEvent = {
  id: string;
  group_id: string;
  user_id: string;
  title: string;
  start_at: string;
  end_at: string;
  users?: SupabaseUserRelation | null;
};

function normalizeSupabaseUser(
  value: SupabaseUserRelation | SupabaseUserRelation[] | null | undefined
): SupabaseUserRelation | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}


function formatDateLabel(value: string) {
  const date = new Date(value);
  return date.toLocaleDateString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  });
}

function formatTime(value: string) {
  const date = new Date(value);
  return date.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getLocalDateTimeInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function getCalendarMonthDays(month: Date) {
  const start = new Date(month.getFullYear(), month.getMonth(), 1);
  const end = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const days: Date[] = [];

  const leadingDays = start.getDay();
  for (let i = leadingDays; i > 0; i -= 1) {
    days.push(new Date(month.getFullYear(), month.getMonth(), 1 - i));
  }

  for (let date = 1; date <= end.getDate(); date += 1) {
    days.push(new Date(month.getFullYear(), month.getMonth(), date));
  }

  const trailingDays = 7 - (days.length % 7);
  if (trailingDays < 7) {
    for (let i = 1; i <= trailingDays; i += 1) {
      days.push(new Date(month.getFullYear(), month.getMonth() + 1, i));
    }
  }

  return days;
}

function formatCalendarTitle(month: Date) {
  return month.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
  });
}

function getLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function Page() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.groupId as string;

  const [user, setUser] = useState<User | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formStart, setFormStart] = useState(() => getLocalDateTimeInputValue(new Date()));
  const [formEnd, setFormEnd] = useState(() => getLocalDateTimeInputValue(new Date(Date.now() + 60 * 60 * 1000)));
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  const startInputRef = useRef<HTMLInputElement>(null);
  const endInputRef = useRef<HTMLInputElement>(null);
  const editStartInputRef = useRef<HTMLInputElement>(null);
  const editEndInputRef = useRef<HTMLInputElement>(null);

  const openDateTimePicker = (inputRef: RefObject<HTMLInputElement | null>) => {
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    const pickerInput = input as HTMLInputElement & { showPicker?: () => void };
    pickerInput.showPicker?.();
  };

  const eventsByDay = useMemo(() => {
    const grouped: Record<string, ScheduleEvent[]> = {};
    events.forEach((event) => {
      const start = new Date(event.start_at);
      const end = new Date(event.end_at);

      const current = new Date(start);

      current.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);

      while (current <= end) {
        const dayKey = getLocalDateKey(current);

        if (!grouped[dayKey]) grouped[dayKey] = [];

        grouped[dayKey].push(event);

        current.setDate(current.getDate() + 1);
      }
    });

    return grouped;
  }, [events]);

  const calendarDays = useMemo(() => getCalendarMonthDays(calendarMonth), [calendarMonth]);
  const selectedDayEvents = eventsByDay[selectedDate] ?? [];
  const calendarTitle = formatCalendarTitle(calendarMonth);

  const handlePrevMonth = () => {
    setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1));
  };

  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

  useEffect(() => {
    const loadGroupData = async () => {
      setLoading(true);
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (!authData.user) {
          router.push('/');
          return;
        }
        setUser(authData.user);

        const [groupResult, memberResult, scheduleResult] = await Promise.all([
          supabase.from('groups').select('id, name, code').eq('id', groupId).single(),
          supabase
            .from('rel_groups_users')
            .select('user_id, role, users(id, name, color)')
            .eq('group_id', groupId),
          supabase
            .from('group_schedules')
            .select('id, group_id, user_id, title, start_at, end_at, users(id, name, color)')
            .eq('group_id', groupId)
            .order('start_at', { ascending: true }),
        ]);

        if (!groupResult.data) {
          router.push('/');
          return;
        }

        setGroup(groupResult.data as Group);

        const normalizedMembers = ((memberResult.data ?? []) as unknown as Array<{
          user_id: string;
          role: string;
          users?: SupabaseUserRelation | SupabaseUserRelation[] | null;
        }>).map((item) => ({
          ...item,
          users: normalizeSupabaseUser(item.users),
        })) as GroupMember[];

        const normalizedEvents = ((scheduleResult.data ?? []) as unknown as Array<{
          id: string;
          group_id: string;
          user_id: string;
          title: string;
          start_at: string;
          end_at: string;
          users?: SupabaseUserRelation | SupabaseUserRelation[] | null;
        }>).map((item) => ({
          ...item,
          users: normalizeSupabaseUser(item.users),
        })) as ScheduleEvent[];

        setMembers(normalizedMembers);
        setEvents(normalizedEvents);
      } catch (error) {
        console.error('그룹 데이터 로드 오류:', error);
      } finally {
        setLoading(false);
      }
    };

    if (groupId) {
      loadGroupData();
    }
  }, [groupId, router]);

  const handleCreateSchedule = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    if (!formTitle.trim()) {
      setErrorMessage('일정 제목을 입력해주세요.');
      return;
    }

    const start = new Date(formStart);
    const end = new Date(formEnd);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setErrorMessage('유효한 날짜/시간을 입력해주세요.');
      return;
    }

    if (end <= start) {
      setErrorMessage('종료 시간은 시작 시간보다 이후여야 합니다.');
      return;
    }

    if (!user) {
      setErrorMessage('사용자 정보를 불러오는 중입니다.');
      return;
    }

    setSubmitLoading(true);
    try {
      const { error: insertError, data: inserted } = await supabase
        .from('group_schedules')
        .insert({
          group_id: groupId,
          user_id: user.id,
          title: formTitle.trim(),
          start_at: start.toISOString(),
          end_at: end.toISOString(),
        })
        .select('id, group_id, user_id, title, start_at, end_at, users(id, name, color)')
        .single();

      if (insertError) {
        console.error('일정 저장 오류:', insertError);
        setErrorMessage('일정 저장 중 오류가 발생했습니다.');
        return;
      }

      if (inserted) {
        const normalizedInserted = {
          ...inserted,
          users: normalizeSupabaseUser(inserted.users),
        } as ScheduleEvent;

        setEvents((prev) => [...prev, normalizedInserted].sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()));
        setFormTitle('');
        setFormStart(getLocalDateTimeInputValue(new Date()));
        setFormEnd(getLocalDateTimeInputValue(new Date(Date.now() + 60 * 60 * 1000)));
        setSuccessMessage('일정이 저장되어 공유 달력에 추가되었습니다.');
      }
    } catch (error) {
      console.error('일정 저장 예외:', error);
      setErrorMessage('일정 저장 중 예외가 발생했습니다.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const attendeeName = (event: ScheduleEvent) => event.users?.name || event.user_id;

  const startEditEvent = (event: ScheduleEvent) => {
    setEditingEventId(event.id);
    setEditTitle(event.title);
    setEditStart(getLocalDateTimeInputValue(new Date(event.start_at)));
    setEditEnd(getLocalDateTimeInputValue(new Date(event.end_at)));
    setEditError('');
  };

  const cancelEdit = () => {
    setEditingEventId(null);
    setEditTitle('');
    setEditStart('');
    setEditEnd('');
    setEditError('');
  };

  const handleUpdateSchedule = async (eventId: string) => {
    setEditError('');
    if (!editTitle.trim()) {
      setEditError('일정 제목을 입력해주세요.');
      return;
    }

    const start = new Date(editStart);
    const end = new Date(editEnd);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setEditError('유효한 날짜/시간을 입력해주세요.');
      return;
    }

    if (end <= start) {
      setEditError('종료 시간은 시작 시간보다 이후여야 합니다.');
      return;
    }

    setEditLoading(true);
    try {
      const { error: updateError, data: updated } = await supabase
        .from('group_schedules')
        .update({
          title: editTitle.trim(),
          start_at: start.toISOString(),
          end_at: end.toISOString(),
        })
        .eq('id', eventId)
        .select('id, group_id, user_id, title, start_at, end_at, users(id, name, color)')
        .single();

      if (updateError) {
        console.error('일정 수정 오류:', updateError);
        setEditError('일정 수정 중 오류가 발생했습니다.');
        return;
      }

      if (updated) {
        const normalizedUpdated = {
          ...updated,
          users: normalizeSupabaseUser(updated.users),
        } as ScheduleEvent;

        setEvents((prev) =>
          prev.map((e) => (e.id === eventId ? normalizedUpdated : e)).sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
        );
        cancelEdit();
      }
    } catch (error) {
      console.error('일정 수정 예외:', error);
      setEditError('일정 수정 중 예외가 발생했습니다.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteSchedule = async (eventId: string) => {
    if (!confirm('이 일정을 삭제하시겠습니까?')) {
      return;
    }

    try {
      const { error: deleteError } = await supabase
        .from('group_schedules')
        .delete()
        .eq('id', eventId);

      if (deleteError) {
        console.error('일정 삭제 오류:', deleteError);
        alert('일정 삭제 중 오류가 발생했습니다.');
        return;
      }

      setEvents((prev) => prev.filter((e) => e.id !== eventId));
      if (editingEventId === eventId) {
        cancelEdit();
      }
    } catch (error) {
      console.error('일정 삭제 예외:', error);
      alert('일정 삭제 중 예외가 발생했습니다.');
    }
  };

  if (loading) {
    return (
      <main className='min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-5 py-8'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto mb-4'></div>
          <p className='text-slate-400'>그룹 일정을 불러오는 중...</p>
        </div>
      </main>
    );
  }

  if (!group) {
    return (
      <main className='min-h-screen bg-slate-950 text-slate-50 px-5 py-8'>
        <div className='mx-auto max-w-xl rounded-4xl border border-white/10 bg-slate-900/80 p-6 text-center'>
          <p className='text-slate-200'>그룹을 찾을 수 없습니다.</p>
          <Button onClick={() => router.push('/')}>홈으로 이동</Button>
        </div>
      </main>
    );
  }

  return (
    <main className='min-h-screen bg-slate-950 text-slate-50 px-5 py-8 sm:px-6 lg:px-8'>
      <div className='mx-auto max-w-6xl space-y-8'>
        <section className='rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/30 backdrop-blur-xl'>
          <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
            <div>
              <p className='text-xs font-medium uppercase tracking-[0.28em] text-cyan-300/90'>그룹 일정</p>
              <h1 className='mt-3 text-3xl font-semibold text-slate-50 sm:text-4xl'>{group.name}</h1>
              <p className='mt-2 text-sm leading-relaxed text-slate-400'>공유 달력에 본인 일정을 입력하면 그룹원이 함께 볼 수 있습니다.</p>
            </div>
            <div className='rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-slate-200'>
              <p className='font-medium text-slate-100'>그룹 코드</p>
              <p className='mt-1 text-base tracking-[0.25em] text-cyan-200'>{group.code ?? '-'}</p>
            </div>
          </div>
        </section>

        <div className='grid gap-8'>
          <section className='rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-xl shadow-slate-950/20'>
            <div className='flex items-center justify-between gap-4'>
              <div>
                <h2 className='text-xl font-semibold text-slate-50'>내 일정 입력</h2>
                <p className='mt-2 text-sm text-slate-400'>시작/종료 시간을 넣고 간단한 일정을 등록하세요.</p>
              </div>
            </div>

            <form onSubmit={handleCreateSchedule} className='mt-6 space-y-5'>
              <div className='space-y-4'>
                <label className='block text-sm font-medium text-slate-200'>일정 내용</label>
                <input
                  type='text'
                  value={formTitle}
                  onChange={(event) => setFormTitle(event.target.value)}
                  placeholder='예: 회의, 점심, 과제 마감'
                  className='min-h-11 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-base text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20'
                />
              </div>

                <div className='grid gap-4 sm:grid-cols-2'>
                <div onClick={() => openDateTimePicker(startInputRef)} className='cursor-text'>
                  <label className='block text-sm font-medium text-slate-200'>시작</label>
                  <input
                    ref={startInputRef}
                    type='datetime-local'
                    value={formStart}
                    onChange={(event) => setFormStart(event.target.value)}
                    step='60'
                    className='mt-2 min-h-11 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-base text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20'
                  />
                </div>
                <div onClick={() => openDateTimePicker(endInputRef)} className='cursor-text'>
                  <label className='block text-sm font-medium text-slate-200'>종료</label>
                  <input
                    ref={endInputRef}
                    type='datetime-local'
                    value={formEnd}
                    onChange={(event) => setFormEnd(event.target.value)}
                    step='60'
                    className='mt-2 min-h-11 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-base text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20'
                  />
                </div>
              </div>

              {errorMessage ? <p className='text-sm text-rose-400'>{errorMessage}</p> : null}
              {successMessage ? <p className='text-sm text-emerald-400'>{successMessage}</p> : null}

              <Button type='submit' disabled={submitLoading} className='w-full justify-center'>
                {submitLoading ? '저장 중...' : '일정 공유하기'}
              </Button>
            </form>

            <div className='mt-8 rounded-3xl border border-slate-700 bg-slate-950/80 p-5 text-sm text-slate-300'>
              <p className='font-semibold text-slate-100'>그룹 멤버</p>
              <div className='mt-4 flex flex-wrap gap-2'>
                {members.length > 0 ? (
                  members.map((member) => (
                    <span
                      key={member.user_id}
                      className='rounded-full border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100'
                    >
                      {member.users?.name ?? member.user_id}
                    </span>
                  ))
                ) : (
                  <p className='text-slate-400'>멤버가 아직 없습니다.</p>
                )}
              </div>
            </div>
          </section>

          <section className='rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-xl shadow-slate-950/20'>
            <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
              <div>
                <h2 className='text-xl font-semibold text-slate-50'>공유 달력</h2>
                <p className='mt-2 text-sm text-slate-400'>모든 멤버의 일정이 있는 날짜에 이름이 표시됩니다.</p>
                <p className='mt-3 text-sm font-medium text-slate-200'>{calendarTitle}</p>
              </div>
              <div className='flex items-center gap-2'>
                <Button onClick={handlePrevMonth} variant='secondary' className='px-4 py-2 text-sm'>이전</Button>
                <Button onClick={handleNextMonth} variant='secondary' className='px-4 py-2 text-sm'>다음</Button>
              </div>
            </div>

            <div className='mt-6 rounded-3xl border border-slate-700 bg-slate-950/80 p-4'>
              <div className='grid grid-cols-7 gap-2 text-center text-xs uppercase tracking-[0.24em] text-slate-500 sm:text-sm'>
                {dayNames.map((name) => (
                  <div key={name} className='py-2'>{name}</div>
                ))}
              </div>

              <div className='mt-3 grid grid-cols-7 gap-2'>
                {calendarDays.map((date) => {
                  const dateKey = getLocalDateKey(date);
                  const dayEvents = eventsByDay[dateKey] ?? [];
                  const isCurrentMonth = date.getMonth() === calendarMonth.getMonth();
                  const isSelected = selectedDate === dateKey;
                  const names = Array.from(new Set(dayEvents.map((eventItem) => attendeeName(eventItem))));

                  return (
                    <button
                      key={dateKey}
                      type='button'
                      onClick={() => setSelectedDate(dateKey)}
                      className={`min-h-[5.5rem] rounded-3xl border px-2 py-3 text-left transition ${
                        isCurrentMonth ? 'bg-slate-900 border-slate-700' : 'bg-slate-950/50 border-slate-800 text-slate-500'
                      } ${isSelected ? 'ring-2 ring-cyan-400/80' : 'hover:border-cyan-400 hover:bg-slate-900'} `}
                    >
                      <div className='flex items-center justify-between gap-2'>
                        <span className='text-sm font-semibold'>{date.getDate()}</span>
                        {dayEvents.length > 0 ? (
                          <span className='rounded-full bg-cyan-500/15 px-2 py-0.5 text-[0.65rem] font-semibold text-cyan-200'>
                            {dayEvents.length}
                          </span>
                        ) : null}
                      </div>
                      <div className='mt-3 space-y-1 text-[0.75rem] leading-snug text-slate-300'>
                        {names.slice(0, 2).map((name) => (
                          <div key={name} className='truncate'>{name}</div>
                        ))}
                        {names.length > 2 ? <div className='truncate text-slate-400'>+{names.length - 2} more</div> : null}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className='mt-6 rounded-3xl border border-slate-700 bg-slate-950/90 p-4'>
                <div className='flex items-center justify-between gap-3'>
                  <div>
                    <p className='text-xs uppercase tracking-[0.24em] text-slate-500'>선택된 날짜</p>
                    <p className='mt-2 text-lg font-semibold text-slate-100'>{formatDateLabel(selectedDate)}</p>
                  </div>
                  <p className='rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-300'>{selectedDayEvents.length}개 일정</p>
                </div>

                {selectedDayEvents.length === 0 ? (
                  <p className='mt-4 text-sm text-slate-400'>해당 날짜에 일정이 없습니다.</p>
                ) : (
                  <div className='mt-4 space-y-3'>
                    {selectedDayEvents.map((eventItem) => (
                      <div key={eventItem.id} className='rounded-3xl border border-slate-700 bg-slate-950/95 p-3'>
                        {editingEventId === eventItem.id ? (
                          <form onSubmit={(e) => {
                            e.preventDefault();
                            handleUpdateSchedule(eventItem.id);
                          }} className='space-y-3'>
                            <input
                              type='text'
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              placeholder='일정 제목'
                              className='w-full rounded-xl border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20'
                            />
                            <div className='grid gap-2 sm:grid-cols-2'>
                              <div onClick={() => editStartInputRef.current?.focus()} className='cursor-text'>
                                <input
                                  ref={editStartInputRef}
                                  type='datetime-local'
                                  value={editStart}
                                  onChange={(e) => setEditStart(e.target.value)}
                                  step='60'
                                  className='w-full rounded-xl border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20'
                                />
                              </div>
                              <div onClick={() => editEndInputRef.current?.focus()} className='cursor-text'>
                                <input
                                  ref={editEndInputRef}
                                  type='datetime-local'
                                  value={editEnd}
                                  onChange={(e) => setEditEnd(e.target.value)}
                                  step='60'
                                  className='w-full rounded-xl border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20'
                                />
                              </div>
                            </div>
                            {editError ? <p className='text-xs text-rose-400'>{editError}</p> : null}
                            <div className='flex gap-2'>
                              <button
                                type='submit'
                                disabled={editLoading}
                                className='flex-1 rounded-xl bg-cyan-500 px-3 py-2 text-xs font-medium text-white hover:bg-cyan-600 disabled:opacity-50'
                              >
                                {editLoading ? '저장 중...' : '저장'}
                              </button>
                              <button
                                type='button'
                                onClick={cancelEdit}
                                disabled={editLoading}
                                className='flex-1 rounded-xl border border-slate-600 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800'
                              >
                                취소
                              </button>
                            </div>
                          </form>
                        ) : (
                          <>
                            <p className='text-sm font-semibold text-slate-100'>{eventItem.title}</p>
                            <p className='mt-1 text-xs text-slate-400'>등록자: {attendeeName(eventItem)}</p>
                            <p className='mt-1 text-xs text-slate-400'>시간: {formatTime(eventItem.start_at)} - {formatTime(eventItem.end_at)}</p>
                            {user?.id === eventItem.user_id ? (
                              <div className='mt-3 flex gap-2'>
                                <button
                                  type='button'
                                  onClick={() => startEditEvent(eventItem)}
                                  className='flex-1 rounded-xl bg-blue-500/70 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-600 transition'
                                >
                                  수정
                                </button>
                                <button
                                  type='button'
                                  onClick={() => handleDeleteSchedule(eventItem.id)}
                                  className='flex-1 rounded-xl bg-rose-500/70 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-600 transition'
                                >
                                  삭제
                                </button>
                              </div>
                            ) : null}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
      <style jsx global>{`
        input[type='datetime-local'] {
          accent-color: #ffffff;
          color: #f8fafc;
        }

        input[type='datetime-local']::-webkit-calendar-picker-indicator {
          filter: invert(1) brightness(1.8);
        }

        input[type='datetime-local']::-webkit-datetime-edit,
        input[type='datetime-local']::-webkit-datetime-edit-fields-wrapper,
        input[type='datetime-local']::-webkit-textfield-decoration-container {
          color: #f8fafc;
        }
      `}</style>
    </main>
  );
}
