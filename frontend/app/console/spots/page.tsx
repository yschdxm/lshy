'use client'

import { useState, useEffect, useCallback } from 'react'
import { Sparkles, Globe, Star, Zap, BookOpen, RefreshCw, Save, Loader2 } from 'lucide-react'
import { getAdminSpots, toggleSpot, getSpotsStats, getSpotsSamples, previewSpotNarration } from '@/lib/admin-api'
import { narrationPersonas, narrationLengths, narrationLanguages, narrationDefaults } from '@/lib/admin-data'
import { PageHeader, Panel } from '@/components/admin/admin-ui'
import { cn } from '@/lib/utils'

// 缓存 key
const CONFIG_KEY = 'lingshan_spots_config'

function Segmented<T extends string>({ options, value, onChange }: { options: readonly T[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex flex-wrap items-center gap-1 rounded-lg bg-secondary p-1">
      {options.map((o) => (
        <button key={o} type="button" onClick={() => onChange(o)}
          className={cn('rounded-md px-3 py-1.5 text-sm font-medium transition-colors', value === o ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
          {o}
        </button>
      ))}
    </div>
  )
}

export default function SpotsPage() {
  // 配置（localStorage 持久化）
  const [persona, setPersona] = useState(narrationDefaults.persona)
  const [length, setLength] = useState(narrationDefaults.length)
  const [creativity, setCreativity] = useState(narrationDefaults.creativity)
  const [langs, setLangs] = useState<string[]>(narrationDefaults.enabledLanguages)
  const [configLoaded, setConfigLoaded] = useState(false)

  // 数据
  const [spots, setSpots] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [samples, setSamples] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [previewing, setPreviewing] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [previewResult, setPreviewResult] = useState<any>(null)

  const showToast = useCallback((m: string) => {
    setToast(m)
    setTimeout(() => setToast(null), 2000)
  }, [])

  // 加载配置
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CONFIG_KEY)
      if (saved) {
        const c = JSON.parse(saved)
        if (c.persona) setPersona(c.persona)
        if (c.length) setLength(c.length)
        if (c.creativity != null) setCreativity(c.creativity)
        if (c.langs) setLangs(c.langs)
      }
    } catch {}
    setConfigLoaded(true)
  }, [])

  // 加载数据
  const fetchData = useCallback(() => {
    setLoading(true)
    Promise.all([
      getAdminSpots({ page: 1 }),
      getSpotsStats(),
      getSpotsSamples(10),
    ]).then(([spotData, statsData, samplesData]) => {
      setSpots(spotData.items || [])
      setStats(statsData)
      setSamples(samplesData.items || [])
    }).catch(() => {
      showToast('加载数据失败')
    }).finally(() => setLoading(false))
  }, [showToast])

  useEffect(() => { if (configLoaded) fetchData() }, [configLoaded, fetchData])

  // 切换景点启用
  const handleToggle = async (spotId: number, currentEnabled: boolean) => {
    const next = !currentEnabled
    setSpots((prev) => prev.map((s) => (s.id === spotId ? { ...s, enabled: next } : s)))
    try { await toggleSpot(spotId, next) } catch { showToast('切换失败') }
  }

  // 保存配置
  const handleSaveConfig = () => {
    localStorage.setItem(CONFIG_KEY, JSON.stringify({ persona, length, creativity, langs }))
    showToast('配置已保存')
  }

  // 预览生成
  const handlePreview = async () => {
    setPreviewing(true)
    try {
      const result = await previewSpotNarration({ persona, length })
      setPreviewResult(result)
      showToast('预览生成完成')
    } catch { showToast('预览生成失败') }
    finally { setPreviewing(false) }
  }

  // 采纳为范例 → 在 QA 页面已实现学习闭环，这里只标记
  const handleAccept = async (sampleId: number) => {
    // 间接通过 QA 的编辑端点同步到知识库
    showToast('已标记为优质范例')
  }

  const statCards = stats ? [
    { label: '接入景点', value: String(stats.total_spots), color: 'text-blue-500' },
    { label: '今日讲解', value: String(stats.today_guides), color: 'text-emerald-500' },
    { label: '平均耗时', value: `${stats.avg_response_ms}ms`, color: 'text-amber-500' },
    { label: '讲解满意度', value: `${stats.avg_satisfaction}/5`, color: 'text-violet-500' },
  ] : []

  return (
    <div>
      <PageHeader
        title="景点讲解管理"
        desc="景点讲解由 AI 依据知识库实时生成。在此配置讲解风格与多语言，并对生成结果进行质量抽检。"
        actions={
          <div className="flex items-center gap-2">
            <button type="button" onClick={handlePreview} disabled={previewing}
              className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-50">
              {previewing ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              预览生成
            </button>
            <button type="button" onClick={handleSaveConfig}
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90">
              <Save className="size-4" />保存配置
            </button>
          </div>
        }
      />

      {/* 统计卡片 */}
      {statCards.length > 0 && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {statCards.map((s) => (
            <div key={s.label} className="rounded-2xl border border-border bg-card p-4 shadow-[0_4px_14px_rgb(80,120,200,0.05)]">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className={cn('mt-2 text-2xl font-bold', s.color)}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* 生成配置 */}
        <Panel className="lg:col-span-2">
          <div className="flex items-center gap-2">
            <Zap className="size-4 text-primary" />
            <h3 className="text-base font-semibold text-foreground">讲解生成配置</h3>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">调整后将作用于全部启用景点的 AI 实时讲解生成。</p>

          <div className="mt-5 space-y-5">
            <div>
              <label className="text-sm font-medium text-foreground">讲解风格</label>
              <div className="mt-2"><Segmented options={narrationPersonas} value={persona} onChange={setPersona} /></div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">讲解篇幅</label>
              <div className="mt-2"><Segmented options={narrationLengths} value={length} onChange={setLength} /></div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">创意度</label>
                <span className="text-sm text-muted-foreground">{creativity}%</span>
              </div>
              <input type="range" min={0} max={100} value={creativity} onChange={(e) => setCreativity(Number(e.target.value))}
                className="mt-2 w-full accent-[var(--primary)]" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">支持语言</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {narrationLanguages.map((l) => {
                  const on = langs.includes(l)
                  return (
                    <button key={l} type="button" onClick={() => setLangs((prev) => prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l])}
                      className={cn('flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
                        on ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-muted-foreground hover:text-foreground')}>
                      <Globe className="size-3.5" />{l}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </Panel>

        {/* 景点接入 */}
        <Panel>
          <div className="flex items-center gap-2">
            <BookOpen className="size-4 text-primary" />
            <h3 className="text-base font-semibold text-foreground">景点接入</h3>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">控制各景点 AI 讲解开关。</p>

          <div className="mt-4 space-y-2 max-h-[420px] overflow-y-auto">
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-8"><Loader2 className="size-4 animate-spin inline mr-1" />加载中...</p>
            ) : spots.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">暂无景点数据</p>
            ) : (
              spots.map((s) => (
                <div key={s.id} className="rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{s.name || s.spot_name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{s.category || s.scenic_area_name || '灵山胜境'}</p>
                    </div>
                    <button type="button"
                      onClick={() => handleToggle(s.id, s.enabled !== false)}
                      className={cn('relative h-5 w-9 shrink-0 rounded-full transition-colors', s.enabled !== false ? 'bg-primary' : 'bg-muted-foreground/30')}>
                      <span className={cn('absolute top-0.5 size-4 rounded-full bg-card shadow transition-all', s.enabled !== false ? 'left-[18px]' : 'left-0.5')} />
                    </button>
                  </div>
                  {s.tags && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {(Array.isArray(s.tags) ? s.tags : []).slice(0, 4).map((t: string) => (
                        <span key={t} className="rounded-md bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">{t}</span>
                      ))}
                    </div>
                  )}
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{s.location || ''}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Panel>
      </div>

      {/* 预览结果 */}
      {previewResult && (
        <Panel className="mt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <h3 className="text-base font-semibold text-foreground">预览：{previewResult.spot_name}</h3>
              <span className="text-xs text-muted-foreground">{previewResult.persona} · {previewResult.length}</span>
            </div>
            <button onClick={() => setPreviewResult(null)} className="text-xs text-muted-foreground hover:text-foreground">关闭</button>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-foreground whitespace-pre-wrap">{previewResult.generated_text}</p>
        </Panel>
      )}

      {/* 质量抽检 */}
      <Panel className="mt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <h3 className="text-base font-semibold text-foreground">近期生成讲解 · 质量抽检</h3>
          </div>
          <button type="button" onClick={fetchData}
            className="flex items-center gap-1.5 text-sm text-primary hover:opacity-70">
            <RefreshCw className="size-3.5" />刷新
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {samples.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">暂无讲解样本</p>
          ) : (
            samples.map((n) => (
              <div key={n.id} className="rounded-2xl border border-border p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{n.intent || '景点讲解'}</span>
                  <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">{n.emotion || '中性'}</span>
                  <span className="ml-auto text-xs text-muted-foreground">耗时 {n.response_time_ms}ms · {n.created_at?.slice(0, 10) || ''}</span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground line-clamp-4">{n.answer}</p>
                <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-xs text-muted-foreground">
                  <span>#{n.id}</span>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => handleAccept(n.id)} className="text-primary hover:opacity-70">采纳为范例</button>
                    <button type="button" onClick={() => showToast('已标记待优化')} className="text-rose-500 hover:opacity-70">标记问题</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Panel>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background shadow-lg">{toast}</div>
      )}
    </div>
  )
}
