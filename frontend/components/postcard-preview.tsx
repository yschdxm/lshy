import { cn } from '@/lib/utils'

type PostcardPreviewProps = {
  sceneImage: string; sceneName: string; title: string; message: string; signature: string; date: string
  aiBg?: string; style?: string; portrait?: boolean
}

const STYLE_COLORS: Record<string, { border: string; bg: string; text: string; muted: string; seal: string }> = {
  guofeng:    { border: '#c5a55a', bg: '#faf7f0', text: '#5a4a3a', muted: '#8a7a6a', seal: '#c54040' },
  watercolor: { border: '#7ab8d4', bg: '#f0f6fa', text: '#4a6a7a', muted: '#6a8a9a', seal: '#d490a0' },
  vintage:    { border: '#b8976e', bg: '#f5edd8', text: '#5a4530', muted: '#8a7560', seal: '#8b3a3a' },
  night:      { border: '#4a6a9a', bg: '#1e2d3d', text: '#e0e8f0', muted: '#a0b0c0', seal: '#e8c860' },
  cartoon:    { border: '#8cc88c', bg: '#fffef5', text: '#5a6a4a', muted: '#8a9a6a', seal: '#f09050' },
}

// 每种风格的专属装饰纹理（覆盖在卡片背景上、内容之下）
const STYLE_DECOR: Record<string, React.CSSProperties> = {
  // 国风：四角宣纸晕染 + 祥云感
  guofeng: {
    backgroundImage:
      'radial-gradient(circle at 6% 6%, rgba(197,165,90,0.18) 0, transparent 34%),' +
      'radial-gradient(circle at 94% 94%, rgba(197,165,90,0.18) 0, transparent 34%),' +
      'repeating-linear-gradient(45deg, rgba(197,165,90,0.05) 0 2px, transparent 2px 14px)',
  },
  // 水彩：柔和色块晕染
  watercolor: {
    backgroundImage:
      'radial-gradient(ellipse at 15% 20%, rgba(122,184,212,0.20) 0, transparent 45%),' +
      'radial-gradient(ellipse at 85% 30%, rgba(212,144,160,0.16) 0, transparent 40%),' +
      'radial-gradient(ellipse at 50% 90%, rgba(160,200,170,0.16) 0, transparent 45%)',
  },
  // 复古：做旧颗粒 + 泛黄边角
  vintage: {
    backgroundImage:
      'radial-gradient(ellipse at 0% 0%, rgba(138,117,96,0.22) 0, transparent 40%),' +
      'radial-gradient(ellipse at 100% 100%, rgba(138,117,96,0.22) 0, transparent 40%),' +
      'repeating-radial-gradient(circle at 50% 50%, rgba(138,117,96,0.04) 0 1px, transparent 1px 4px)',
  },
  // 夜景：星空
  night: {
    backgroundImage:
      'radial-gradient(1px 1px at 12% 18%, rgba(255,255,255,0.9) 50%, transparent 51%),' +
      'radial-gradient(1.5px 1.5px at 32% 8%, rgba(255,255,255,0.7) 50%, transparent 51%),' +
      'radial-gradient(1px 1px at 58% 14%, rgba(255,255,255,0.8) 50%, transparent 51%),' +
      'radial-gradient(1px 1px at 78% 26%, rgba(232,200,96,0.9) 50%, transparent 51%),' +
      'radial-gradient(1.5px 1.5px at 90% 10%, rgba(255,255,255,0.6) 50%, transparent 51%),' +
      'radial-gradient(1px 1px at 44% 30%, rgba(255,255,255,0.5) 50%, transparent 51%),' +
      'radial-gradient(1px 1px at 22% 34%, rgba(232,200,96,0.6) 50%, transparent 51%),' +
      'radial-gradient(ellipse at 85% 85%, rgba(74,106,154,0.35) 0, transparent 55%)',
  },
  // 卡通：波点
  cartoon: {
    backgroundImage:
      'radial-gradient(4px 4px at 10% 12%, rgba(240,144,80,0.18) 50%, transparent 51%),' +
      'radial-gradient(4px 4px at 30% 28%, rgba(140,200,140,0.18) 50%, transparent 51%),' +
      'radial-gradient(4px 4px at 70% 10%, rgba(240,144,80,0.14) 50%, transparent 51%),' +
      'radial-gradient(4px 4px at 90% 30%, rgba(140,200,140,0.16) 50%, transparent 51%),' +
      'radial-gradient(4px 4px at 50% 45%, rgba(240,144,80,0.10) 50%, transparent 51%)',
  },
}

// 复古风格的外框用虚线模拟邮票齿孔
const STYLE_OUTER_BORDER: Record<string, string> = {
  vintage: 'dashed',
}

export function PostcardPreview({ sceneImage, sceneName, title, message, signature, date, aiBg, style = 'guofeng', portrait = false }: PostcardPreviewProps) {
  const C = STYLE_COLORS[style] || STYLE_COLORS.guofeng

  return (
    <div
      className={`relative w-full overflow-hidden rounded-lg ${portrait ? 'aspect-[3/4]' : 'aspect-[1.6/1]'}`}
      style={{ backgroundColor: C.bg, maxWidth: portrait ? '320px' : '100%', margin: portrait ? '0 auto' : '0' }}
    >
      <div className="relative h-full w-full overflow-hidden rounded-lg border-2" style={{ borderColor: C.border, borderStyle: STYLE_OUTER_BORDER[style] || 'solid' }}>
        <div className="pointer-events-none absolute inset-1.5 z-20 rounded-md border opacity-60" style={{ borderColor: C.border }} />

        {/* 风格装饰纹理层 */}
        <div className="pointer-events-none absolute inset-0 z-10" style={STYLE_DECOR[style]} aria-hidden="true" />

        {aiBg && (
          <div className="absolute inset-0 z-10" style={{ backgroundImage: `url(${aiBg})`, backgroundSize: 'cover', backgroundPosition: 'center' }} aria-hidden="true" />
        )}

        <div className={`relative z-30 flex h-full ${portrait ? 'flex-col' : 'flex-row'}`}>
          {/* 照片区 */}
          <div className={`relative shrink-0 p-2.5 ${portrait ? 'h-[60%] w-full' : 'w-1/2 h-full'}`}>
            <div className="relative h-full w-full overflow-hidden rounded-md ring-1" style={{ borderColor: C.border + '99' }}>
              <img src={sceneImage || '/placeholder.svg'} alt="" className="h-full w-full object-cover" />
            </div>
          </div>

          {/* 文字区 */}
          <div className={`relative flex flex-col ${portrait ? 'h-[40%] w-full px-3 py-2' : 'w-1/2 py-3 pr-3'}`}>
            <div className="flex items-start justify-between">
              <div className={`flex flex-col items-center justify-center rounded-full border text-center ${portrait ? 'size-9' : 'size-12'}`} style={{ borderColor: C.border, color: C.border }}>
                <span className="text-[6px] leading-none tracking-wide">灵山胜境</span>
                <span className="my-0.5 text-[7px] font-bold leading-none">LINGSHAN</span>
                <span className="text-[6px] leading-none">{date ? date.replaceAll('-','.') : '2026.05.20'}</span>
              </div>
              <div className={`shrink-0 rounded-sm border border-dashed bg-white/90 ${portrait ? 'w-9' : 'w-12'}`} style={{ borderColor: C.border }}>
                <img src="/postcard-stamp.png" alt="纪念邮票" className="aspect-[3/4] w-full object-cover" />
              </div>
            </div>

            <div className="mt-1 min-w-0 flex-1">
              <h4 className={`truncate font-serif font-bold ${portrait ? 'text-sm' : 'text-base'}`} style={{ color: C.text }}>{title || '写下你的明信片标题'}</h4>
              <p className={`leading-relaxed ${portrait ? 'text-[10px] line-clamp-2 mt-0.5' : 'text-xs line-clamp-2 mt-1.5'}`} style={{ color: C.muted }}>{message || '在这里写下此刻的心情与祝福……'}</p>
            </div>

            <div className="mt-1 flex items-end justify-between">
              <div className={`min-w-0 ${portrait ? 'text-[9px]' : 'text-[11px]'}`} style={{ color: C.muted }}>
                <p className="truncate">署名：{signature || '游客'}</p>
                <p className="truncate">日期：{formatDate(date)}</p>
              </div>
              <div className={cn(`flex shrink-0 items-center justify-center rounded-[4px] border-2 rotate-3 ${portrait ? 'size-7' : 'size-9'}`)} style={{ borderColor: C.seal, color: C.seal }} aria-hidden="true">
                <span className={`font-bold leading-tight ${portrait ? 'text-[7px]' : 'text-[9px]'}`}>灵山<br />纪念</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function formatDate(date: string) {
  if (!date) return '2026.05.20'
  return date.replaceAll('-', '.')
}
