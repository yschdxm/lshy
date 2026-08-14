'use client'

import { useState, useEffect } from 'react'
import { Save, RotateCcw, Info, Sparkles, Bell, Palette, Lock, Server } from 'lucide-react'
import { getSettings, saveSettings, resetSettings, clearCache } from '@/lib/admin-api'
import { PageHeader, Panel } from '@/components/admin/admin-ui'
import { cn } from '@/lib/utils'

/* ---------- 表单原语 ---------- */
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2 py-4 md:grid-cols-[220px_1fr] md:items-center md:gap-6">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div>{children}</div>
    </div>
  )
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full max-w-md rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary placeholder:text-muted-foreground"
    />
  )
}

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      type="button" role="switch" aria-checked={on} onClick={onChange}
      className={cn('relative h-6 w-11 rounded-full transition-colors', on ? 'bg-primary' : 'bg-secondary')}
    >
      <span className={cn('absolute top-0.5 size-5 rounded-full bg-card shadow transition-all', on ? 'left-[22px]' : 'left-0.5')} />
    </button>
  )
}

function Segmented({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-secondary/50 p-0.5">
      {options.map((o) => (
        <button key={o} type="button" onClick={() => onChange(o)}
          className={cn('rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
            value === o ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
        >{o}</button>
      ))}
    </div>
  )
}

/* ---------- 区块标题 ---------- */
function SectionHeader({ icon: Icon, title, desc }: { icon: React.ElementType; title: string; desc: string }) {
  return (
    <div className="flex items-center gap-3 mb-1 pb-3 border-b border-border/60">
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-4" />
      </span>
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const [toast, setToast] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<Record<string, string>>({})

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2000) }

  useEffect(() => {
    getSettings().then(d => setForm(d.settings)).catch(() => showToast('加载设置失败')).finally(() => setLoading(false))
  }, [])

  const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }))

  const handleSave = async () => {
    try { await saveSettings(form); showToast('设置已保存') } catch { showToast('保存失败') }
  }

  const handleReset = async () => {
    try { const d = await resetSettings(); setForm(d.settings); showToast('已恢复默认设置') } catch { showToast('操作失败') }
  }

  const handleClearCache = async () => {
    try { await clearCache(); showToast('缓存已清理') } catch { showToast('清理失败') }
  }

  if (loading) {
    return <div>
      <PageHeader title="系统设置" desc="配置景区基础信息、AI 服务、通知与安全策略等系统参数。" />
      <p className="text-sm text-muted-foreground py-8 text-center">加载中...</p>
    </div>
  }

  return (
    <div>
      <PageHeader
        title="系统设置"
        desc="配置景区基础信息、AI 服务、通知与安全策略等系统参数。"
        actions={
          <div className="flex items-center gap-2">
            <button type="button" onClick={handleReset}
              className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary">
              <RotateCcw className="size-4" />恢复默认
            </button>
            <button type="button" onClick={handleSave}
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90">
              <Save className="size-4" />保存设置
            </button>
          </div>
        }
      />

      <div className="space-y-4">
        {/* 基础信息 */}
        <Panel className="p-5">
          <SectionHeader icon={Info} title="基础信息" desc="景区对外展示的核心信息" />
          <div className="divide-y divide-border">
            <Field label="景区名称" hint="展示在用户端与后台顶部">
              <TextInput value={form.site_name || ''} onChange={(e) => set('site_name', e.target.value)} />
            </Field>
            <Field label="服务热线">
              <TextInput value={form.hotline || ''} onChange={(e) => set('hotline', e.target.value)} />
            </Field>
            <Field label="开放时间">
              <TextInput value={form.opening_hours || ''} onChange={(e) => set('opening_hours', e.target.value)} />
            </Field>
          </div>
        </Panel>

        {/* AI 服务 */}
        <Panel className="p-5">
          <SectionHeader icon={Sparkles} title="AI 服务" desc="智能问答与讲解生成的模型参数" />
          <div className="divide-y divide-border">
            <Field label="对话模型" hint="用于智能问答与讲解生成">
              <Segmented options={['GPT-4o', 'Claude', 'Gemini']} value={form.ai_model || 'GPT-4o'} onChange={(v) => set('ai_model', v)} />
            </Field>
            <Field label="回答风格" hint="控制回答的发散程度">
              <Segmented options={['严谨', '标准', '活泼']} value={form.temperature || '标准'} onChange={(v) => set('temperature', v)} />
            </Field>
            <Field label="文档自动向量化" hint="上传后自动进行向量化处理">
              <Toggle on={form.auto_vectorize === 'true'} onChange={() => set('auto_vectorize', form.auto_vectorize === 'true' ? 'false' : 'true')} />
            </Field>
            <Field label="流式回复" hint="逐字返回回答内容">
              <Toggle on={form.stream_reply === 'true'} onChange={() => set('stream_reply', form.stream_reply === 'true' ? 'false' : 'true')} />
            </Field>
          </div>
        </Panel>

        {/* 通知设置 */}
        <Panel className="p-5">
          <SectionHeader icon={Bell} title="通知设置" desc="管理员消息提醒与告警策略" />
          <div className="divide-y divide-border">
            <Field label="游客反馈提醒" hint="收到新反馈时通知管理员">
              <Toggle on={form.notify_feedback === 'true'} onChange={() => set('notify_feedback', form.notify_feedback === 'true' ? 'false' : 'true')} />
            </Field>
            <Field label="异常告警提醒" hint="系统异常与安全事件通知">
              <Toggle on={form.notify_warning === 'true'} onChange={() => set('notify_warning', form.notify_warning === 'true' ? 'false' : 'true')} />
            </Field>
            <Field label="每日数据日报" hint="每日推送运营数据摘要">
              <Toggle on={form.notify_daily === 'true'} onChange={() => set('notify_daily', form.notify_daily === 'true' ? 'false' : 'true')} />
            </Field>
          </div>
        </Panel>

        {/* 外观与语言 */}
        <Panel className="p-5">
          <SectionHeader icon={Palette} title="外观与语言" desc="后台界面的视觉风格与显示语言" />
          <div className="divide-y divide-border">
            <Field label="后台主题">
              <Segmented options={['浅色', '深色', '跟随系统']} value={form.theme || '浅色'} onChange={(v) => set('theme', v)} />
            </Field>
            <Field label="默认语言">
              <Segmented options={['简体中文', 'English', '日本語']} value={form.language || '简体中文'} onChange={(v) => set('language', v)} />
            </Field>
          </div>
        </Panel>

        {/* 安全策略 */}
        <Panel className="p-5">
          <SectionHeader icon={Lock} title="安全策略" desc="登录安全与访问控制相关配置" />
          <div className="divide-y divide-border">
            <Field label="双因素认证" hint="登录时需二次验证">
              <Toggle on={form.two_factor === 'true'} onChange={() => set('two_factor', form.two_factor === 'true' ? 'false' : 'true')} />
            </Field>
            <Field label="IP 白名单" hint="仅允许指定 IP 登录后台">
              <Toggle on={form.ip_whitelist === 'true'} onChange={() => set('ip_whitelist', form.ip_whitelist === 'true' ? 'false' : 'true')} />
            </Field>
            <Field label="会话超时" hint="无操作自动退出登录">
              <Segmented options={['15 分钟', '30 分钟', '1 小时']} value={form.session_timeout || '30 分钟'} onChange={(v) => set('session_timeout', v)} />
            </Field>
          </div>
        </Panel>

        {/* 系统与存储 */}
        <Panel className="p-5">
          <SectionHeader icon={Server} title="系统与存储" desc="数据备份、存储方式与缓存管理" />
          <div className="divide-y divide-border">
            <Field label="数据备份频率">
              <Segmented options={['实时', '每日', '每周']} value={form.backup_frequency || '每日'} onChange={(v) => set('backup_frequency', v)} />
            </Field>
            <Field label="存储方式" hint="知识库与素材文件存储位置">
              <Segmented options={['本地', '云端', '本地 + 云端']} value={form.storage_mode || '本地 + 云端'} onChange={(v) => set('storage_mode', v)} />
            </Field>
            <Field label="清理缓存" hint="清除系统临时文件与索引缓存">
              <button type="button" onClick={handleClearCache}
                className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary">
                立即清理
              </button>
            </Field>
          </div>
        </Panel>
      </div>

      {/* 底部固定保存栏 */}
      <div className="mt-6 flex items-center justify-end gap-3 rounded-2xl border border-border bg-card p-4 shadow-[0_4px_14px_rgb(80,120,200,0.05)]">
        <button type="button" onClick={handleReset}
          className="flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary">
          <RotateCcw className="size-4" />恢复默认
        </button>
        <button type="button" onClick={handleSave}
          className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90">
          <Save className="size-4" />保存设置
        </button>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}
