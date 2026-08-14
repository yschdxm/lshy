'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, ShieldCheck, Users as UsersIcon, Lock, X } from 'lucide-react'
import {
  getRolesStats, getRoles, createRole, updateRole, updateRolePerms, toggleRoleStatus,
  type RoleStats, type RoleItem,
} from '@/lib/admin-api'
import { permModules, permLevelMeta } from '@/lib/admin-data'
import { PageHeader, StatCard, Panel } from '@/components/admin/admin-ui'
import { cn } from '@/lib/utils'

const PERM_ORDER = ['none', 'view', 'edit', 'full'] as const

export default function RolesPage() {
  const [roles, setRoles] = useState<RoleItem[]>([])
  const [stats, setStats] = useState<RoleStats | null>(null)
  const [activeId, setActiveId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)

  // 弹窗
  const [showCreate, setShowCreate] = useState(false)
  const [showEdit, setShowEdit] = useState<RoleItem | null>(null)

  const showToast = (m: string) => {
    setToast(m)
    setTimeout(() => setToast(null), 2000)
  }

  const fetchData = useCallback(() => {
    setLoading(true)
    Promise.all([getRolesStats(), getRoles()])
      .then(([s, d]) => {
        setStats(s)
        setRoles(d.items)
        // 默认选中第一个
        if (d.items.length > 0 && !activeId) setActiveId(d.items[0].id)
        // 如果当前选中角色被删除，回退到第一个
        if (!d.items.find(r => r.id === activeId)) setActiveId(d.items[0]?.id ?? null)
      })
      .catch(() => showToast('加载失败'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const active = roles.find(r => r.id === activeId) ?? roles[0]

  const handleToggle = async (id: number) => {
    try {
      const res = await toggleRoleStatus(id)
      setRoles(prev => prev.map(r => r.id === id ? { ...r, status: res.is_active ? '启用' : '停用' } : r))
      showToast(res.is_active ? '角色已启用' : '角色已停用')
      getRolesStats().then(setStats)
    } catch { showToast('操作失败') }
  }

  const cyclePerm = (moduleKey: string) => {
    if (!active || active.built_in) {
      showToast('内置角色权限不可修改')
      return
    }
    const cur = active.perms[moduleKey] ?? 'none'
    const next = PERM_ORDER[(PERM_ORDER.indexOf(cur as any) + 1) % PERM_ORDER.length]
    setRoles(prev => prev.map(r =>
      r.id === active.id ? { ...r, perms: { ...r.perms, [moduleKey]: next } } : r
    ))
  }

  const handleSavePerms = async () => {
    if (!active) return
    if (active.built_in) { showToast('内置角色不可保存修改'); return }
    try {
      await updateRolePerms(active.id, active.perms)
      showToast(`已保存：${active.name}`)
    } catch { showToast('保存失败') }
  }

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    try {
      const res = await createRole({
        name: fd.get('name') as string,
        desc: fd.get('desc') as string,
      })
      showToast('角色创建成功')
      setShowCreate(false)
      fetchData()
    } catch (err: any) { showToast(err.message || '创建失败') }
  }

  const handleEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!showEdit) return
    const fd = new FormData(e.currentTarget)
    try {
      await updateRole(showEdit.id, {
        name: fd.get('name') as string,
        desc: fd.get('desc') as string,
      })
      showToast('角色信息已更新')
      setShowEdit(null)
      fetchData()
    } catch { showToast('保存失败') }
  }

  const roleTone = (name: string) => {
    const map: Record<string, string> = {
      '超级管理员': 'text-rose-600 bg-rose-50',
      '内容运营': 'text-blue-600 bg-blue-50',
      '数据分析师': 'text-teal-600 bg-teal-50',
      '客服专员': 'text-orange-600 bg-orange-50',
      '讲解编辑': 'text-violet-600 bg-violet-50',
      '访客只读': 'text-slate-600 bg-slate-100',
    }
    return map[name] || 'text-blue-600 bg-blue-50'
  }

  if (loading) {
    return <div>
      <PageHeader title="角色权限管理" desc="管理后台角色及其功能权限，控制不同岗位人员的操作范围。" />
      <p className="text-sm text-muted-foreground py-8 text-center">加载中...</p>
    </div>
  }

  return (
    <div>
      <PageHeader
        title="角色权限管理"
        desc="管理后台角色及其功能权限，控制不同岗位人员的操作范围。"
        actions={
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
          >
            <Plus className="size-4" />
            新建角色
          </button>
        }
      />

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="角色总数" value={String(stats?.total_roles ?? '—')} icon={ShieldCheck} tint="text-blue-500 bg-blue-50" />
        <StatCard label="关联成员" value={String(stats?.total_members ?? '—')} icon={UsersIcon} tint="text-emerald-500 bg-emerald-50" />
        <StatCard label="权限项" value={String(stats?.total_perms ?? '—')} icon={ShieldCheck} tint="text-teal-500 bg-teal-50" />
        <StatCard label="自定义角色" value={String(stats?.custom_roles ?? '—')} icon={UsersIcon} tint="text-violet-500 bg-violet-50" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[340px_1fr]">
        {/* 角色列表 */}
        <Panel title="角色列表" className="p-4">
          <div className="flex flex-col gap-2">
            {roles.map((r) => {
              const isActive = r.id === active?.id
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setActiveId(r.id)}
                  className={cn(
                    'rounded-xl border p-3 text-left transition-colors',
                    isActive
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-card hover:bg-secondary/50',
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={cn('rounded-md px-2 py-0.5 text-xs font-medium', roleTone(r.name))}>
                        {r.name}
                      </span>
                      {r.built_in && (
                        <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                          <Lock className="size-3" />
                          内置
                        </span>
                      )}
                    </div>
                    <span
                      className={cn(
                        'size-1.5 rounded-full',
                        r.status === '启用' ? 'bg-emerald-500' : 'bg-muted-foreground',
                      )}
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">{r.desc}</p>
                  <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                    <UsersIcon className="size-3.5" />
                    {r.members} 名成员
                  </p>
                </button>
              )
            })}
          </div>
        </Panel>

        {/* 权限矩阵 */}
        {active && (
          <Panel
            title={`权限配置 · ${active.name}`}
            action={
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleToggle(active.id)}
                  className={cn(
                    'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                    active.status === '启用'
                      ? 'border-rose-200 text-rose-500 hover:bg-rose-50'
                      : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50',
                  )}
                >
                  {active.status === '启用' ? '停用角色' : '启用角色'}
                </button>
                {!active.built_in && (
                  <button
                    type="button"
                    onClick={() => setShowEdit(active)}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary transition-colors"
                  >
                    编辑
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSavePerms}
                  className={cn(
                    'rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:opacity-90',
                    active.built_in && 'opacity-50 cursor-not-allowed',
                  )}
                >
                  保存
                </button>
              </div>
            }
            className="p-4"
          >
            <div className="mb-3 flex items-center gap-2 rounded-lg bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">
              <ShieldCheck className="size-4 shrink-0 text-primary" />
              {active.built_in
                ? '该角色为系统内置角色，权限受保护不可修改。'
                : '点击各模块的权限标签可在「无 → 查看 → 编辑 → 完全」之间循环切换。'}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="px-2 py-3 font-medium">功能模块</th>
                    <th className="px-2 py-3 font-medium">当前权限</th>
                    <th className="px-2 py-3 text-right font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {permModules.map((m) => {
                    const level = active.perms[m.key] ?? 'none'
                    const meta = permLevelMeta[level as keyof typeof permLevelMeta]
                    return (
                      <tr
                        key={m.key}
                        className="border-b border-border/70 text-sm transition-colors hover:bg-secondary/40"
                      >
                        <td className="px-2 py-3 font-medium text-foreground">{m.label}</td>
                        <td className="px-2 py-3">
                          <span
                            className={cn(
                              'inline-flex rounded-md border px-2 py-0.5 text-xs font-medium',
                              meta.tone,
                            )}
                          >
                            {meta.label}
                          </span>
                        </td>
                        <td className="px-2 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => cyclePerm(m.key)}
                            className={cn(
                              'rounded-lg border border-border px-3 py-1 text-xs transition-colors',
                              active.built_in
                                ? 'cursor-not-allowed text-muted-foreground opacity-60'
                                : 'text-foreground hover:bg-secondary',
                            )}
                          >
                            调整
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
        )}
      </div>

      {/* 新建角色弹窗 */}
      {showCreate && (
        <Modal onClose={() => setShowCreate(false)} title="新建角色">
          <form onSubmit={handleCreate} className="space-y-4">
            <Field label="角色名称" name="name" required placeholder="例如：运营主管" />
            <Field label="角色描述" name="desc" placeholder="描述该角色的职责范围" />
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowCreate(false)} className="rounded-lg border border-border px-4 py-2 text-sm">取消</button>
              <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">创建</button>
            </div>
          </form>
        </Modal>
      )}

      {/* 编辑角色弹窗 */}
      {showEdit && (
        <Modal onClose={() => setShowEdit(null)} title={`编辑角色 · ${showEdit.name}`}>
          <form onSubmit={handleEdit} className="space-y-4">
            <Field label="角色名称" name="name" required defaultValue={showEdit.name} />
            <Field label="角色描述" name="desc" defaultValue={showEdit.desc} />
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowEdit(null)} className="rounded-lg border border-border px-4 py-2 text-sm">取消</button>
              <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">保存</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}

/* ---------- 弹窗 & 表单小组件 ---------- */

function Modal({ onClose, title, children }: { onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1 hover:bg-secondary"><X className="size-5" /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Field({ label, name, required, placeholder, defaultValue, disabled, type = 'text' }: {
  label: string; name?: string; required?: boolean; placeholder?: string; defaultValue?: string; disabled?: boolean; type?: string
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <input
        name={name} type={type} required={required} placeholder={placeholder}
        defaultValue={defaultValue} disabled={disabled}
        className="mt-1 w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm text-foreground outline-none focus:border-primary disabled:opacity-50"
      />
    </label>
  )
}
