'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, UserPlus, Users, ShieldCheck, Activity, X } from 'lucide-react'
import { getUsersStats, getUsers, createUser, updateUser, toggleUserStatus, type UserStats, type UserItem } from '@/lib/admin-api'
import { PageHeader, StatCard, Panel, Pagination } from '@/components/admin/admin-ui'
import { cn } from '@/lib/utils'

const ROLE_OPTIONS = ['超级管理员', '内容运营', '客服专员', '数据分析']
const DEPT_OPTIONS = ['运营中心', '内容部', '客服部', '数据部']
const ROLE_TABS = ['全部', '超级管理员', '内容运营', '客服专员', '数据分析', '游客']

export default function UsersPage() {
  const [users, setUsers] = useState<UserItem[]>([])
  const [stats, setStats] = useState<UserStats | null>(null)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [roleTab, setRoleTab] = useState('全部')
  const pageSize = 6

  // 弹窗状态
  const [showCreate, setShowCreate] = useState(false)
  const [showEdit, setShowEdit] = useState<UserItem | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (m: string) => {
    setToast(m)
    setTimeout(() => setToast(null), 2000)
  }

  const fetchData = useCallback(() => {
    setLoading(true)
    const params: any = { page, page_size: pageSize, keyword }
    if (roleTab !== '全部') {
      if (roleTab === '游客') {
        params.role = 'tourist'
      } else {
        params.role_label = roleTab
      }
    }
    getUsers(params)
      .then(d => {
        setUsers(d.items)
        setTotal(d.total)
      })
      .catch(() => showToast('加载失败，请确认后端已启动'))
      .finally(() => setLoading(false))
  }, [page, keyword, roleTab])

  useEffect(() => { fetchData() }, [fetchData])

  // 独立加载 stats
  useEffect(() => {
    getUsersStats().then(setStats).catch(() => {})
  }, [])

  const handleToggle = async (id: number) => {
    try {
      const res = await toggleUserStatus(id)
      setUsers(prev => prev.map(u => u.id === id ? { ...u, status: res.is_active } : u))
      showToast(res.is_active === '启用' ? '已启用' : '已禁用')
      getUsersStats().then(setStats)
    } catch { showToast('操作失败') }
  }

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    try {
      await createUser({
        account: fd.get('account') as string,
        password: fd.get('password') as string,
        name: fd.get('name') as string,
        role: fd.get('role') as string,
        department: fd.get('department') as string,
      })
      showToast('用户创建成功')
      setShowCreate(false)
      fetchData()
      getUsersStats().then(setStats)
    } catch (err: any) { showToast(err.message || '创建失败') }
  }

  const handleEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!showEdit) return
    const fd = new FormData(e.currentTarget)
    try {
      await updateUser(showEdit.id, {
        name: fd.get('name') as string,
        role: fd.get('role') as string,
        department: fd.get('department') as string,
      })
      showToast('用户信息已更新')
      setShowEdit(null)
      fetchData()
    } catch { showToast('保存失败') }
  }

  const roleTone = (label: string) => {
    const map: Record<string, string> = {
      '超级管理员': 'text-rose-600 bg-rose-50',
      '内容运营': 'text-blue-600 bg-blue-50',
      '客服专员': 'text-teal-600 bg-teal-50',
      '数据分析': 'text-orange-600 bg-orange-50',
      '游客': 'text-slate-600 bg-slate-100',
    }
    return map[label] || 'text-slate-600 bg-slate-100'
  }

  return (
    <div>
      <PageHeader
        title="用户管理"
        desc="管理后台账号、游客账号与访问权限，保障系统安全运行。"
        actions={
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
          >
            <UserPlus className="size-4" />
            新增用户
          </button>
        }
      />

      {/* 统计卡片 — 保持原布局 */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="用户总数" value={stats ? String(stats.total) : '—'} icon={Users} tint="text-blue-500 bg-blue-50" />
        <StatCard label="后台账号" value={stats ? String(stats.admin_count) : '—'} icon={ShieldCheck} tint="text-emerald-500 bg-emerald-50" />
        <StatCard label="今日活跃" value={stats ? String(stats.active_today) : '—'} icon={Activity} tint="text-teal-500 bg-teal-50" />
        <StatCard label="禁用账号" value={stats ? String(stats.disabled) : '—'} icon={Users} tint="text-rose-500 bg-rose-50" />
      </div>

      {/* 角色筛选 */}
      <div className="mt-4 flex items-center gap-1 rounded-lg bg-secondary p-1 w-fit">
        {ROLE_TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => { setRoleTab(t); setPage(1) }}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              roleTab === t ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* 用户列表 */}
      <Panel className="mt-4 p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-foreground">账号列表</h2>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
            <Search className="size-4 text-muted-foreground" />
            <input
              value={keyword}
              onChange={(e) => { setKeyword(e.target.value); setPage(1) }}
              placeholder="搜索姓名或账号..."
              className="w-52 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-2 py-3 font-medium">用户</th>
                <th className="px-2 py-3 font-medium">角色</th>
                <th className="px-2 py-3 font-medium">部门</th>
                <th className="px-2 py-3 font-medium">状态</th>
                <th className="px-2 py-3 font-medium">最近登录</th>
                <th className="px-2 py-3 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="py-12 text-center text-sm text-muted-foreground">加载中...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-sm text-muted-foreground">没有匹配的用户</td></tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="border-b border-border/70 text-sm transition-colors hover:bg-secondary/40">
                    <td className="px-2 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                          {(u.name || u.account).slice(0, 1)}
                        </span>
                        <div>
                          <p className="font-medium text-foreground">{u.name || u.account}</p>
                          <p className="text-xs text-muted-foreground">{u.account}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-3">
                      <span className={cn('rounded-md px-2 py-0.5 text-xs font-medium', roleTone(u.role_label))}>
                        {u.role_label}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-muted-foreground">{u.department || '—'}</td>
                    <td className="px-2 py-3">
                      <span className={cn(
                        'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium',
                        u.status === '启用' ? 'bg-emerald-50 text-emerald-600' : 'bg-secondary text-muted-foreground',
                      )}>
                        <span className={cn('size-1.5 rounded-full', u.status === '启用' ? 'bg-emerald-500' : 'bg-muted-foreground')} />
                        {u.status}
                      </span>
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap text-muted-foreground">{u.last_login}</td>
                    <td className="px-2 py-3">
                      <div className="flex items-center justify-end gap-3">
                        <button type="button" onClick={() => setShowEdit(u)} className="text-primary hover:opacity-70">
                          编辑
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggle(u.id)}
                          className={cn('hover:opacity-70', u.status === '启用' ? 'text-rose-500' : 'text-emerald-600')}
                        >
                          {u.status === '启用' ? '禁用' : '启用'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">共 {total} 条</span>
          <Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} />
        </div>
      </Panel>

      {/* 新增用户弹窗 */}
      {showCreate && (
        <Modal onClose={() => setShowCreate(false)} title="新增用户">
          <form onSubmit={handleCreate} className="space-y-4">
            <Field label="账号" name="account" required placeholder="登录账号" />
            <Field label="密码" name="password" type="password" required placeholder="至少6位" />
            <Field label="姓名" name="name" placeholder="显示名称" />
            <SelectField label="角色" name="role" options={ROLE_OPTIONS} />
            <SelectField label="部门" name="department" options={DEPT_OPTIONS} />
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowCreate(false)} className="rounded-lg border border-border px-4 py-2 text-sm">取消</button>
              <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">创建</button>
            </div>
          </form>
        </Modal>
      )}

      {/* 编辑用户弹窗 */}
      {showEdit && (
        <Modal onClose={() => setShowEdit(null)} title="编辑用户">
          <form onSubmit={handleEdit} className="space-y-4">
            <Field label="账号" value={showEdit.account} disabled />
            <Field label="姓名" name="name" defaultValue={showEdit.name} />
            <SelectField label="角色" name="role" options={ROLE_OPTIONS} defaultValue={showEdit.role_label} />
            <SelectField label="部门" name="department" options={DEPT_OPTIONS} defaultValue={showEdit.department} />
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

function Field({ label, name, required, placeholder, defaultValue, value, disabled, type = 'text' }: {
  label: string; name?: string; required?: boolean; placeholder?: string; defaultValue?: string; value?: string; disabled?: boolean; type?: string
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <input
        name={name} type={type} required={required} placeholder={placeholder}
        defaultValue={defaultValue} value={value} disabled={disabled}
        className="mt-1 w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm text-foreground outline-none focus:border-primary disabled:opacity-50"
      />
    </label>
  )
}

function SelectField({ label, name, options, defaultValue }: {
  label: string; name: string; options: string[]; defaultValue?: string
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <select name={name} defaultValue={defaultValue || options[0]}
        className="mt-1 w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm text-foreground outline-none focus:border-primary">
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  )
}
