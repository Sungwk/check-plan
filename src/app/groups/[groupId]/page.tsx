'use client';

import { useParams } from 'next/navigation';

export default function Page() {
  const params = useParams();
  const groupId = params.groupId;

  return <div>group {groupId}</div>;
}
