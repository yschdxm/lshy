'use client'

import { useState, useEffect } from 'react'
import { XfyunAvatar } from '@/components/xfyun-avatar'

type Props = {
  bubbleText?: string
  showStatus?: boolean
  status?: 'idle' | 'listening' | 'thinking' | 'speaking'
}

export function SmartAvatar(props: Props) {
  const [useXfyun, setUseXfyun] = useState<boolean | null>(null)

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/digital-human/active`)
      .then((r) => r.json())
      .then((cfg) => setUseXfyun(!!cfg.avatar_id))
      .catch(() => setUseXfyun(false))
  }, [])

  return (
    <aside className="relative hidden w-75 shrink-0 xl:block 2xl:w-96 mt-[0px] h-[calc(100vh-80px)] flex flex-col">
      {useXfyun === true && <XfyunAvatar message={props.bubbleText} />}
    </aside>
  )
}
