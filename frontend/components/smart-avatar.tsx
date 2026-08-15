'use client'

import { useState, useEffect } from 'react'
import { XfyunAvatar } from '@/components/xfyun-avatar'

type Props = {
  bubbleText?: string
  showStatus?: boolean
  status?: 'idle' | 'listening' | 'thinking' | 'speaking'
}

// 模块级缓存：配置只需查一次，之后所有页面挂载时立即渲染，
// 否则每个页面都要等一次 fetch 才出现数字人 DOM（切页空窗的来源）
let cachedUseXfyun: boolean | null = null
let pendingFetch: Promise<boolean> | null = null

function checkXfyunEnabled(): Promise<boolean> {
  if (!pendingFetch) {
    pendingFetch = fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/digital-human/active`)
      .then((r) => r.json())
      .then((cfg) => { cachedUseXfyun = !!cfg.avatar_id; return cachedUseXfyun })
      .catch(() => { cachedUseXfyun = false; return false })
      .finally(() => { pendingFetch = null })
  }
  return pendingFetch
}

export function SmartAvatar(props: Props) {
  const [useXfyun, setUseXfyun] = useState<boolean | null>(cachedUseXfyun)

  useEffect(() => {
    checkXfyunEnabled().then(setUseXfyun)
  }, [])

  return (
    <aside className="relative hidden w-75 shrink-0 xl:block 2xl:w-96 mt-[0px] h-[calc(100vh-80px)] flex flex-col">
      {useXfyun === true && <XfyunAvatar message={props.bubbleText} />}
    </aside>
  )
}
