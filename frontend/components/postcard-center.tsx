'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Sparkles, Wand2, RefreshCw, Download, Share2, Printer, Upload, ImageIcon,
  Calendar, ChevronDown, Check, Loader2, Landmark, Droplet, Stamp, Moon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { savePostcard, getPostcards, getEnabledStyles, generateImage } from '@/lib/api'
import { PostcardPreview } from '@/components/postcard-preview'
import { useSpots } from '@/lib/data-adapter'

const SPOT_IMAGES: Record<string, string> = {
  '灵山大照壁':'/LS-001.jpg','五明桥':'/LS-002.jpg','佛足坛':'/LS-003.jpg','五智门':'/LS-004.jpg','山门殿':'/LS-004.jpg',
  '菩提大道':'/LS-005.jpg','九龙灌浴':'/LS-006.jpg','降魔浮雕':'/LS-007.jpg','阿育王柱':'/LS-008.jpg',
  '百子戏弥勒':'/LS-009.jpg','弥勒戏沙图':'/LS-009.jpg','祥符禅寺':'/LS-010.jpg','灵山大佛':'/LS-011.jpg',
  '佛教文化博览馆':'/LS-012.jpg','佛教文化博物馆':'/LS-012.jpg',
  '灵山梵宫':'/LS-013.jpg','五印坛城':'/LS-014.jpg','曼飞龙塔':'/LS-015.jpg','曼荼罗塔':'/LS-015.jpg',
  '无尽意斋':'/LS-016.jpg','拈花广场':'/NH-001.jpg','四季花海':'/NH-002.jpg','梵天花海':'/NH-002.jpg',
  '禅意商街':'/NH-003.jpg','香月花街':'/NH-003.jpg','拈花堂':'/NH-004.jpg',
}

/** 获取当前用户 ID */
function getUserId(): string {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    return String(user.id || '0')
  } catch { return '0' }
}

export function PostcardCenter() {
  const { spots } = useSpots()
  const previewRef = useRef<HTMLDivElement>(null)
  const [spot, setSpot] = useState('灵山大佛') // 固定初始值防止闪烁
  const [style, setStyle] = useState('guofeng') // 默认，稍后从 API 加载列表
  const [enabledStyles, setEnabledStyles] = useState<{ key: string; label: string }[]>([])
  const [portrait, setPortrait] = useState(false)  // 竖版/横版
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [signature, setSignature] = useState('游客')
  // 从 localStorage 读取用户昵称预填署名（客户端执行，避免 SSR 不匹配）
  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      if (user.nickname) setSignature(user.nickname)
    } catch {}
  }, [])
  // 客户端挂载后自动填入用户昵称
  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      if (user.nickname) setSignature(user.nickname)
    } catch {}
  }, [])

  // 加载启用的明信片风格列表
  useEffect(() => {
    getEnabledStyles().then(d => {
      const list = d.styles || []
      setEnabledStyles(list)
      if (list.length > 0 && !list.find(s => s.key === style)) {
        setStyle(list[0].key)
      }
    }).catch(() => {})
  }, [])

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [spotOpen, setSpotOpen] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [records, setRecords] = useState<{ title: string; spot: string; style: string; time: string; image: string }[]>([])
  const [uploadedPhoto, setUploadedPhoto] = useState('')  // 用户上传的照片
  const [aiBg, setAiBg] = useState('')                    // AI 生成的底板背景
  const [bgLoading, setBgLoading] = useState(false)
  const [bgError, setBgError] = useState('')
  const [showCamera, setShowCamera] = useState(false)
  const [qLoading, setQLoading] = useState(false)
  const [copyIdx, setCopyIdx] = useState(0)  // 文案序号
  const spotRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // 景点列表：API 优先，用 name 作为唯一标识（避免 mock key 与 API spot_id 不匹配）
  const defaultSpots = [
    { name: '灵山大佛', image: '/LS-011.jpg' }, { name: '九龙灌浴', image: '/LS-006.jpg' },
    { name: '灵山梵宫', image: '/LS-013.jpg' }, { name: '五印坛城', image: '/LS-014.jpg' },
    { name: '祥符禅寺', image: '/LS-010.jpg' }, { name: '阿育王柱', image: '/LS-008.jpg' },
  ]
  const displaySpots = spots.length > 0
    ? spots.map(s => ({ name: s.spot_name, image: SPOT_IMAGES[s.spot_name] || '' }))
    : defaultSpots

  const activeSpot = displaySpots.find(s => s.name === spot) || displaySpots[0]

  // 加载历史记录（从后端获取当前用户的）
  useEffect(() => {
    const userId = getUserId()
    getPostcards().then(data => {
      const items = (data.items || []).map((c: any) => ({
        title: c.title,
        spot: c.spot_name,
        style: c.style,
        time: c.created_at ? new Date(c.created_at).toLocaleString('zh-CN') : '',
        image: '/placeholder.svg',  // 不存大图，用景点缩略图兜底
      }))
      setRecords(items)
    }).catch(() => {
      // 降级：从 localStorage 读取缓存
      try {
        const saved = localStorage.getItem(`postcard_records_${userId}`)
        if (saved) {
          const parsed = JSON.parse(saved)
          setRecords(parsed.map((r: any) => ({ ...r, image: '/placeholder.svg' })))
        }
      } catch {}
    })
  }, [])

  // 点击外部关闭
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (spotRef.current && !spotRef.current.contains(e.target as Node)) setSpotOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  // 每个景点 3 套专属文案 + 10 套通用兜底
  const SPOT_COPIES: Record<string, { title: string; message: string }[]> = {
    '灵山大佛': [
      { title: '佛光普照', message: '88米大佛脚下，仰望即是放下，合掌便是得到' },
      { title: '抱佛脚', message: '摸摸佛脚抱平安，愿你岁岁安康，万事顺遂' },
      { title: '大佛庄严', message: '青铜大佛巍然矗立，千年佛光普照太湖之畔' },
    ],
    '九龙灌浴': [
      { title: '花开见佛', message: '九龙喷涌，莲花绽放，见证佛陀诞生的祥瑞瞬间' },
      { title: '浴佛圣境', message: '音乐与水幕交织，每一朵水花都是祝福' },
      { title: '九龙祥瑞', message: '九条飞龙齐吐圣水，洗去尘埃，留下吉祥' },
    ],
    '灵山梵宫': [
      { title: '东方卢浮宫', message: '东阳木雕与敦煌壁画交相辉映，艺术殿堂令人叹为观止' },
      { title: '梵宫圣境', message: '步入梵宫，仿佛穿越时空，进入佛国天宫' },
      { title: '艺术瑰宝', message: '七万平米的佛教艺术殿堂，每一处细节都值得细品' },
    ],
    '五印坛城': [
      { title: '坛城秘境', message: '转经筒的声音回荡在湖光山色间，心也随之宁静' },
      { title: '藏地风情', message: '不用去西藏，在灵山也能感受最纯粹的藏传佛教文化' },
      { title: '转经祈福', message: '转动经筒，念一声六字真言，为所爱之人祈福' },
    ],
    '祥符禅寺': [
      { title: '千年古刹', message: '唐代古寺，千年银杏，聆听玄奘与灵山的故事' },
      { title: '禅意时光', message: '古井与银杏见证千年沧桑，一炷心香，片刻宁静' },
      { title: '晨钟暮鼓', message: '钟声悠远，穿越千年，唤醒内心最深处的安宁' },
    ],
    '菩提大道': [
      { title: '菩提树下', message: '漫步林荫拱廊，菩提叶沙沙作响，每一步都是修行' },
      { title: '林荫禅意', message: '两侧菩提树从印度远道而来，撑起一片清凉天地' },
      { title: '菩提之路', message: '捡一片菩提叶做书签，带走灵山的禅意与祝福' },
    ],
    '降魔浮雕': [
      { title: '降魔成道', message: '佛陀成道前的最后一关，震撼心灵的视觉史诗' },
      { title: '石刻史诗', message: '每一刀都是虔诚，每一笔都是信仰，讲述千古传奇' },
      { title: '成道之路', message: '浮雕无声，却讲述着最动人心魄的故事' },
    ],
    '百子戏弥勒': [
      { title: '皆大欢喜', message: '弥勒开怀大笑，百子嬉戏环绕，人间烟火最抚人心' },
      { title: '百子纳福', message: '摸摸弥勒肚，笑口常开好运自然来' },
      { title: '童趣灵山', message: '一百个孩子的一百种快乐，弥勒佛的笑容温暖了整个灵山' },
    ],
    '灵山大照壁': [
      { title: '灵山初印象', message: '赵朴初先生亲笔题字，照壁之后便是佛国胜境' },
      { title: '照壁迎客', message: '巍巍照壁，既是屏障也是序章，灵山之旅由此开始' },
      { title: '入胜境', message: '穿过照壁，满目湖光山色，佛国世界徐徐展开' },
    ],
  }
  const GENERAL_COPIES = [
    { title: '灵山一梦', message: '千年古刹，一炷心香，愿所念皆如愿' },
    { title: '山水相逢', message: '太湖之畔，灵山胜境，每一步都是风景' },
    { title: '静心之旅', message: '梵音袅袅，步步生莲，寻一场心灵的皈依' },
    { title: '拈花一笑', message: '禅意小镇，四季花海，时光在此慢下来' },
    { title: '祈福纳祥', message: '为家人祈福，愿平安喜乐，万事顺遂' },
    { title: '印象灵山', message: '青铜大佛，九龙灌浴，东阳木雕，不虚此行' },
    { title: '云水禅心', message: '菩提树下听风，梵宫之中观心，此处是归处' },
    { title: '诗意江南', message: '烟雨朦胧灵山路，一步一景皆入画' },
    { title: '万象更新', message: '登高望远，万象更新，愿你前程似锦' },
    { title: '灵山记忆', message: '每张明信片都是独一无二的灵山故事' },
  ]

  // 获取兜底文案（按序轮换）
  function getFallbackCopy(): { title: string; message: string } {
    if (!uploadedPhoto && activeSpot && SPOT_COPIES[activeSpot.name]) {
      const copies = SPOT_COPIES[activeSpot.name]
      return copies[copyIdx % copies.length]
    }
    return GENERAL_COPIES[copyIdx % GENERAL_COPIES.length]
  }

  // 点击时序号递增，按序轮换文案
  function nextCopy() {
    const pool = (!uploadedPhoto && activeSpot && SPOT_COPIES[activeSpot.name])
      ? SPOT_COPIES[activeSpot.name]
      : GENERAL_COPIES
    setCopyIdx(prev => (prev + 1) % pool.length)
    const fb = pool[copyIdx % pool.length]
    setTitle(fb.title); setMessage(fb.message)
  }

  // AI 生成文案
  const generateCopy = useCallback(async () => {
    setAiLoading(true)
    try {
      const sid = localStorage.getItem('last_session_id') || 'postcard_demo'
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/souvenir/generate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sid }),
      })
      const data = await res.json()
      if (data.journey_summary) {
        setTitle(`${activeSpot.name}的记忆`)
        setMessage(data.journey_summary.slice(0, 50))
      } else {
        nextCopy()
      }
    } catch {
      nextCopy()
    } finally { setAiLoading(false) }
  }, [activeSpot])

  // 生成明信片图片（dom-to-image 支持现代 CSS）
  // 注意：不要与上方 import 的 API 函数 generateImage 重名（会遮蔽导致 AI 生图调用失败）
  const [capturing, setCapturing] = useState(false)  // 截图时隐藏 badge
  const capturePostcardPng = useCallback(async () => {
    if (!previewRef.current) return
    setGenerating(true); setCapturing(true)
    // 等一帧让 React 隐藏 badge
    await new Promise(r => setTimeout(r, 50))
    try {
      const domtoimage = await import('dom-to-image-more')
      const dataUrl = await domtoimage.toPng(previewRef.current, { quality: 1, scale: 2 })
      return dataUrl
    } finally { setGenerating(false); setCapturing(false) }
  }, [])

  // 下载
  const handleDownload = async () => {
    const dataUrl = await capturePostcardPng()
    if (!dataUrl) return
    const a = document.createElement('a')
    a.href = dataUrl; a.download = `灵山明信片-${activeSpot.name}.png`; a.click()
    saveRecord(dataUrl)
  }

  // 分享
  const handleShare = async () => {
    const dataUrl = await capturePostcardPng()
    if (!dataUrl) return
    if (navigator.share) {
      const blob = await (await fetch(dataUrl)).blob()
      const file = new File([blob], 'postcard.png', { type: 'image/png' })
      navigator.share({ title: '灵山明信片', files: [file] }).catch(() => {})
    } else {
      navigator.clipboard.writeText('灵山胜境一游！这是我的专属明信片 🌄')
      alert('图片已生成，可右键保存预览图')
    }
    saveRecord(dataUrl)
  }

  // 保存记录
  function saveRecord(dataUrl: string) {
    // 生成小缩略图（200px宽），避免 base64 撑爆 localStorage
    const thumb = dataUrl.length > 50000 ? '/placeholder.svg' : dataUrl
    const record = { title: title || activeSpot.name, spot: activeSpot.name, style, time: new Date().toLocaleString('zh-CN'), image: thumb }
    const updated = [record, ...records].slice(0, 6)
    setRecords(updated)
    // localStorage 只存元数据，不存大图
    const lightRecords = updated.map(r => ({ title: r.title, spot: r.spot, style: r.style, time: r.time }))
    try { localStorage.setItem(`postcard_records_${getUserId()}`, JSON.stringify(lightRecords)) } catch {}
    // 同步全量数据到后端
    const STYLE_NAME_MAP: Record<string, string> = {
      guofeng: '国风插画', watercolor: '清新水彩', vintage: '复古邮票',
      night: '夜景梦幻', cartoon: '卡通治愈',
    }
    savePostcard({
      title: title || activeSpot.name,
      spot_name: activeSpot.name,
      style: STYLE_NAME_MAP[style] || style,
      image_data: dataUrl,
    }).catch(() => {})
  }

  // 重新生成
  const handleRegenerate = () => { nextCopy() }

  // 风格→生图 prompt 映射
  // 风格图标映射
  const STYLE_ICONS: Record<string, React.ElementType> = {
    guofeng: Landmark, watercolor: Droplet, vintage: Stamp, night: Moon, cartoon: Sparkles,
  }

  const STYLE_PROMPTS: Record<string, string> = {
    guofeng: 'Traditional Chinese ink wash painting style, elegant gold foil border pattern, rice paper texture background, vertical composition, classical landscape elements, soft warm tones, subtle mountain and water motifs',
    watercolor: 'Soft watercolor wash texture, delicate floral border, light pastel colors, dreamy atmosphere, gentle brush strokes, cherry blossom petals scattered, pale blue and pink tones',
    vintage: 'Aged vintage paper texture, retro postmark stamps, sepia tones, antique border ornaments, old letter aesthetic, slight grain texture, warm brown and cream palette',
    night: 'Dreamy night sky gradient, scattered stars, deep blue to purple fade, golden constellation lines, romantic moonlight atmosphere, subtle sparkle effects',
    cartoon: 'Cute kawaii style, pastel polka dot pattern, rounded corner decoration, soft candy colors, playful doodle border, warm yellow and pink tones, cheerful atmosphere',
  }

  // AI 生成明信片底板
  const generateBg = async () => {
    setBgLoading(true); setAiBg(''); setBgError('')
    const prompt = `${STYLE_PROMPTS[style] || STYLE_PROMPTS.guofeng}, postcard background, seamless texture, no text, no people, simple composition, vertical aspect ratio`
    try {
      const data = await generateImage({ model: 'Tongyi-MAI/Z-Image-Turbo', prompt })
      if (data?.image_base64) {
        setAiBg(data.image_base64)
      } else {
        setBgError('生成失败，请重试')
      }
    } catch (e: any) { setBgError(e?.message?.slice(0, 50) || '网络异常，请重试') }
    finally { setBgLoading(false) }
  }

  // 上传照片
  const handleUpload = () => fileRef.current?.click()
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setUploadedPhoto(reader.result as string)
    reader.readAsDataURL(file)
  }

  // 相机拍照
  const openCamera = async () => {
    setShowCamera(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1024 }, height: { ideal: 1024 } } })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
    } catch { setShowCamera(false); alert('无法访问相机') }
  }
  const closeCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    setShowCamera(false)
  }
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return
    const canvas = canvasRef.current
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0)
    setUploadedPhoto(canvas.toDataURL('image/jpeg', 0.9))
    closeCamera()
  }

  // AI Q版化
  const toQVersion = async () => {
    if (!uploadedPhoto) return
    setQLoading(true)
    try {
      const data = await generateImage({ model: 'Qwen/Qwen-Image-Edit', prompt: 'chibi cartoon style, cute Q-version, big eyes, soft pastel colors, keeping the person recognizable', image: uploadedPhoto })
      if (data?.image_base64) {
        setUploadedPhoto(data.image_base64)
      }
    } catch {} finally { setQLoading(false) }
  }

  // 当前使用的场景图：上传 > 景点配图
  const sceneImage = uploadedPhoto || activeSpot?.image || '/LS-011.jpg'
  const sceneName = uploadedPhoto ? '' : activeSpot?.name || '灵山'

  return (
    <section className="flex min-w-0 flex-1 flex-col">
      <div>
        <h2 className="inline-block border-b-2 border-primary pb-1 text-2xl font-bold text-foreground">明信片DIY</h2>
        <p className="mt-2 text-sm text-muted-foreground">定制您的专属景区纪念明信片</p>
      </div>

      <div className="relative mt-4 overflow-hidden rounded-xl shadow-[0_6px_18px_rgb(80,120,200,0.18)]">
        <img src="/postcard-banner.png" alt="" className="h-28 w-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-r from-[oklch(0.9_0.06_255)] via-[oklch(0.92_0.05_255)]/70 to-transparent" />
        <div className="absolute inset-y-0 left-0 flex flex-col justify-center p-5">
          <h3 className="text-lg font-bold text-slate-800">留下旅途中的美好记忆</h3>
          <p className="mt-1 max-w-md text-xs text-slate-600">选好景点，写下寄语，生成专属明信片，记录此刻的心动</p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* Left: editors */}
        <div className="flex flex-col gap-6">
          <div className="rounded-2xl border border-white/60 bg-white p-4 shadow-[0_6px_16px_rgb(80,120,200,0.10)]">
            <div className="mb-3 flex items-center justify-between flex-wrap gap-2">
              <p className="text-sm font-semibold text-foreground">场景照片</p>
              <div className="flex items-center gap-2">
                {/* 横竖切换 */}
                <div className="flex rounded-lg border border-border bg-secondary/30 p-0.5">
                  <button onClick={() => setPortrait(false)} className={`px-2.5 py-1 text-xs rounded-md transition-colors ${!portrait ? 'bg-white text-primary shadow font-medium' : 'text-muted-foreground'}`}>横版</button>
                  <button onClick={() => setPortrait(true)} className={`px-2.5 py-1 text-xs rounded-md transition-colors ${portrait ? 'bg-white text-primary shadow font-medium' : 'text-muted-foreground'}`}>竖版</button>
                </div>
                <button type="button" onClick={handleUpload} className="flex items-center gap-1 rounded-lg border border-border bg-white px-2.5 py-1 text-xs text-muted-foreground hover:bg-secondary">
                  <Upload className="size-3" />上传
                </button>
                <button type="button" onClick={openCamera} className="flex items-center gap-1 rounded-lg border border-border bg-white px-2.5 py-1 text-xs text-muted-foreground hover:bg-secondary">
                  📷 拍照
                </button>
                {uploadedPhoto && (
                  <button type="button" onClick={toQVersion} disabled={qLoading} className="flex items-center gap-1 rounded-lg border border-pink-300 bg-pink-50 px-2.5 py-1 text-xs font-medium text-pink-600 hover:bg-pink-100 disabled:opacity-50">
                    {qLoading ? <Loader2 className="size-3 animate-spin" /> : '✨'} Q版化
                  </button>
                )}
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            <div ref={spotRef} className="relative">
              <button type="button" onClick={() => setSpotOpen(v => !v)}
                className={cn('flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors', spotOpen ? 'border-primary bg-primary/5' : 'border-border bg-secondary/30 hover:bg-secondary')}>
                {activeSpot?.image ? <img src={activeSpot.image} alt={activeSpot.name} className="size-9 shrink-0 rounded-lg object-cover" />
                  : <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">{activeSpot?.name?.slice(0,2)}</span>}
                <span className="flex-1 truncate text-sm font-medium text-foreground">{activeSpot?.name}</span>
                <ChevronDown className={cn('size-4 shrink-0 text-muted-foreground transition-transform', spotOpen && 'rotate-180')} />
              </button>
              {spotOpen && (
                <ul role="listbox" className="absolute z-20 mt-2 max-h-72 w-full overflow-auto rounded-xl border border-border bg-white p-1.5 shadow-[0_12px_32px_rgb(80,120,200,0.18)]">
                  {displaySpots.map(s => {
                    const isActive = s.name === spot
                    return (
                      <li key={s.name} role="option" aria-selected={isActive}>
                        <button type="button" onClick={() => { setSpot(s.name); setSpotOpen(false) }}
                          className={cn('flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors', isActive ? 'bg-primary/10' : 'hover:bg-secondary')}>
                          {s.image ? <img src={s.image} alt={s.name} className="size-8 shrink-0 rounded-lg object-cover" />
                            : <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">{s.name.slice(0,2)}</span>}
                          <span className={cn('flex-1 truncate text-sm font-medium', isActive ? 'text-primary' : 'text-foreground')}>{s.name}</span>
                          {isActive && <Check className="size-4 shrink-0 text-primary" />}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/60 bg-white p-4 shadow-[0_6px_16px_rgb(80,120,200,0.10)]">
            <p className="mb-3 text-sm font-semibold text-foreground">风格选择</p>
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5">
              {enabledStyles.map(st => {
                const isActive = st.key === style
                const Icon = STYLE_ICONS[st.key] || Sparkles
                return (
                  <button key={st.key} type="button" onClick={() => setStyle(st.key)}
                    className={cn('flex flex-col items-center gap-2 rounded-xl border px-2 py-4 transition-colors', isActive ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-white text-muted-foreground hover:bg-secondary')}>
                    <Icon className="size-5" /><span className="text-xs font-medium">{st.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-white/60 bg-white p-4 shadow-[0_6px_16px_rgb(80,120,200,0.10)]">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">寄语填写</p>
              <button type="button" onClick={generateCopy} disabled={aiLoading}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50">
                {aiLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Wand2 className="size-3.5" />}智能生成文案
              </button>
            </div>
            <div className="flex flex-col gap-4">
              <label className="flex items-center gap-3"><span className="w-10 shrink-0 text-sm text-muted-foreground">标题</span>
                <div className="relative flex-1"><input value={title} onChange={e => setTitle(e.target.value.slice(0,20))} className="w-full rounded-lg border border-border bg-secondary/30 px-3 py-3 text-sm text-foreground outline-none focus:border-primary" /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{title.length}/20</span></div></label>
              <label className="flex items-center gap-3"><span className="w-10 shrink-0 text-sm text-muted-foreground">寄语</span>
                <div className="relative flex-1"><input value={message} onChange={e => setMessage(e.target.value.slice(0,50))} className="w-full rounded-lg border border-border bg-secondary/30 px-3 py-3 text-sm text-foreground outline-none focus:border-primary" /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{message.length}/50</span></div></label>
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex flex-1 items-center gap-3"><span className="w-10 shrink-0 text-sm text-muted-foreground">署名</span><input value={signature} onChange={e => setSignature(e.target.value.slice(0,12))} className="w-full flex-1 rounded-lg border border-border bg-secondary/30 px-3 py-2 text-sm text-foreground outline-none focus:border-primary" /></label>
                <label className="flex flex-1 items-center gap-3"><span className="w-10 shrink-0 text-sm text-muted-foreground">日期</span>
                  <div className="relative flex-1"><Calendar className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full rounded-lg border border-border bg-secondary/30 py-2 pl-9 pr-3 text-sm text-foreground outline-none focus:border-primary" /></div></label>
              </div>
            </div>
          </div>
        </div>

        {/* Right: preview */}
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-white/60 bg-white p-4 shadow-[0_6px_16px_rgb(80,120,200,0.10)]">
            <p className="mb-3 text-sm font-semibold text-foreground">明信片预览</p>
            <div className="rounded-xl p-2 shadow-[0_10px_30px_rgb(80,120,200,0.18)] min-h-[320px]">
            <div ref={previewRef} className="relative">
              <PostcardPreview sceneImage={sceneImage} sceneName={sceneName} title={title} message={message} signature={signature} date={date} aiBg={aiBg} style={style} portrait={portrait} />
              {/* AI 生成状态层 */}
              {bgLoading && !capturing && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-xl bg-black/50 backdrop-blur-sm">
                  <Loader2 className="size-8 animate-spin text-white mb-3" />
                  <p className="text-sm font-medium text-white">AI 正在生成底板中…</p>
                  <p className="mt-1 text-xs text-white/60">预计 10-20 秒</p>
                </div>
              )}
              {!bgLoading && aiBg && !capturing && (
                <div className="absolute top-2 right-2 z-50 rounded-full bg-emerald-500 px-3 py-1 text-xs font-medium text-white shadow">✅ 底板已生成</div>
              )}
              {!bgLoading && bgError && !capturing && (
                <div className="absolute top-2 right-2 z-50 rounded-full bg-red-500 px-3 py-1 text-xs font-medium text-white shadow">❌ {bgError}</div>
              )}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button type="button" onClick={generateBg} disabled={bgLoading}
                className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-[0_6px_16px_rgb(80,120,200,0.28)] transition-colors hover:bg-primary/90 disabled:opacity-50">
                {bgLoading ? <Loader2 className="size-4 animate-spin" /> : <ImageIcon className="size-4" />}{bgLoading ? '生成中...' : 'AI 生成底板'}
              </button>
              <button type="button" onClick={handleRegenerate} className="flex items-center gap-2 rounded-xl border border-border bg-white px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"><RefreshCw className="size-4 text-primary" />重新生成</button>
              <button type="button" onClick={handleDownload} disabled={generating} className="flex items-center gap-2 rounded-xl border border-border bg-white px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"><Download className="size-4 text-primary" />{generating ? '下载中...' : '下载图片'}</button>
            </div>
          </div>
          </div>
        </div>
      </div>

      {/* 相机弹窗 */}
      {showCamera && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={closeCamera}>
          <div className="relative rounded-2xl bg-white p-4 shadow-xl max-w-md w-full" onClick={e => e.stopPropagation()}>
            <video ref={videoRef} autoPlay playsInline className="w-full aspect-square rounded-xl bg-black object-cover" />
            <div className="mt-3 flex gap-3">
              <button onClick={capturePhoto} className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground">📸 拍照</button>
              <button onClick={closeCamera} className="rounded-xl border border-border px-4 py-2.5 text-sm text-foreground">取消</button>
            </div>
          </div>
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />

      {/* 生成记录 */}
      {records.length > 0 && (
        <div className="mt-4 rounded-2xl border border-white/60 bg-white p-4 shadow-[0_6px_16px_rgb(80,120,200,0.10)]">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">生成记录</p>
            <button type="button" onClick={() => { setRecords([]); localStorage.removeItem(`postcard_records_${getUserId()}`) }} className="text-xs text-muted-foreground hover:text-red-500">清空</button>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {records.map((r, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-secondary/20 p-2.5">
                <img src={r.image} alt={r.title} className="size-14 shrink-0 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{r.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{r.spot} · {r.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
