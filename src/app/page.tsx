'use client';

import { useRouter } from 'next/navigation';
import Button from '@/components/Button';

export default function Page() {
  const router = useRouter();

  return;
  <div>
    <Button onClick={() => router.push('/groups/new')}>그룹 만들기</Button>
  </div>;
}
