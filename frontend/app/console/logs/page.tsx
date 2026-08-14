'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Download, Trash2, Info, AlertTriangle, ShieldAlert, LogIn, FilePenLine, Server } from 'lucide-react'
import { getLogsStats, getLogs, cleanLogs, type LogStats, type LogEntry } from '@/lib/admin-api'
import { logLevelMeta, type LogLevel, type LogType } from '@/lib/admin-data'
import { PageHeader, StatCard, Panel, Pagination } from '@/components/admin/admin-ui'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

const typeTabs: (LogType | '全部')[] = ['全部', '登录', '操作', '系统']
const levelTabs: (LogLevel | '全部')[] = ['全部', '信息', '警告', '错误']

const logTypeIcon: Record<string, LucideIcon> = {
  '登录': LogIn,
  '操作': FilePenLine,
  '系统': Server,
}

export default function LogsPage() {
  const [stats, setStats] = useState<LogStats | null>(null)
  const [items, setItems] = useState<LogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [type, setType] = useState<LogType | '全部'>('全部')
  const [level, setLevel] = useState<LogLevel | '全部'>('全部')
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [toast, setToast] = useState<string | null>(null)
  const pageSize = 8

  const showToast = (m: string) => {
    setToast(m)
    setTimeout(() => setToast(null), 2000)
  }

  const fetchData = useCallback(() => {
    setLoading(true)
    getLogs({
      page, page_size: pageSize, keyword,
      type: type === '全部' ? '' : type,
      level: level === '全部' ? '' : level,
    }).then(d => {
      setItems(d.items)
      setTotal(d.total)
    }).catch(() => showToast('加载失败'))
      .finally(() => setLoading(false))
  }, [page, type, level, keyword])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    getLogsStats().then(setStats).catch(() => {})
  }, [])

  const handleClean = async () => {
    try {
      const res = await cleanLogs(30)
      showToast(`已清理 ${res.deleted} 条 30 天前日志`)
      fetchData()
      getLogsStats().then(setStats)
    } catch { showToast('清理失败') }
  }

  const handleExport = () => {
    // 导出 CSV
    const header = '时间,操作账号,类型,级别,操作详情,IP地址\n'
    const csv = header + items.map(l =>
      `"${l.time}","${l.user}","${l.type}","${l.level}","${l.action}","${l.ip}"`
    ).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `审计日志_${new Date().toISOString().slice(0, 10)}.csv`
    a.click(); URL.revokeObjectURL(url)
    showToast('日志已导出')
  }

  const resetPage = () => setPage(1)

  return (
    <div>
      <PageHeader
        title="日志管理"
        desc="记录并检索后台操作、登录与系统事件日志，保障可追溯与安全审计。"
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExport}
              className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
            >
              <Download className="size-4" />
              导出日志
            </button>
            <button
              type="button"
              onClick={handleClean}
              className="flex items-center gap-2 rounded-xl border border-rose-200 bg-card px-4 py-2 text-sm font-medium text-rose-500 transition-colors hover:bg-rose-50"
            >
              <Trash2 className="size-4" />
              清理日志
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="今日日志" value={String(stats?.today ?? '—')} icon={Server} tint="text-blue-500 bg-blue-50" />
        <StatCard label="登录记录" value={String(stats?.login_count ?? '—')} icon={LogIn} tint="text-emerald-500 bg-emerald-50" />
        <StatCard label="操作记录" value={String(stats?.ops_count ?? '—')} icon={FilePenLine} tint="text-teal-500 bg-teal-50" />
        <StatCard label="异常告警" value={String(stats?.warn_count ?? '—')} icon={ShieldAlert} tint="text-rose-500 bg-rose-50" />
      </div>

      <Panel className="mt-4 p-4">
        {/* filters */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">类型</span>
              <div className="inline-flex rounded-lg border border-border bg-secondary/50 p-0.5">
                {typeTabs.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { setType(t); resetPage() }}
                    className={cn(
                      'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                      type === t ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">级别</span>
              <div className="inline-flex rounded-lg border border-border bg-secondary/50 p-0.5">
                {levelTabs.map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => { setLevel(l); resetPage() }}
                    className={cn(
                      'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                      level === l ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
            <Search className="size-4 text-muted-foreground" />
            <input
              value={keyword}
              onChange={(e) => { setKeyword(e.target.value); resetPage() }}
              placeholder="搜索操作、账号或 IP..."
              className="w-52 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* table */}
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-2 py-3 font-medium">时间</th>
                <th className="px-2 py-3 font-medium">操作账号</th>
                <th className="px-2 py-3 font-medium">类型</th>
                <th className="px-2 py-3 font-medium">级别</th>
                <th className="px-2 py-3 font-medium">操作详情</th>
                <th className="px-2 py-3 font-medium">IP 地址</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="py-12 text-center text-sm text-muted-foreground">加载中...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-sm text-muted-foreground">没有匹配的日志记录</td></tr>
              ) : (
                items.map((l) => {
                  const TypeIcon = logTypeIcon[l.type] || FilePenLine
                  const meta = logLevelMeta[l.level as LogLevel] || logLevelMeta['信息']
                  const LevelIcon = meta.icon
                  return (
                    <tr
                      key={l.id}
                      className="border-b border-border/70 text-sm transition-colors hover:bg-secondary/40"
                    >
                      <td className="whitespace-nowrap px-2 py-3 text-muted-foreground">{l.time}</td>
                      <td className="px-2 py-3 font-medium text-foreground">{l.user}</td>
                      <td className="px-2 py-3">
                        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                          <TypeIcon className="size-3.5" />
                          {l.type}
                        </span>
                      </td>
                      <td className="px-2 py-3">
                        <span className={cn(
                          'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium',
                          meta.tone,
                        )}>
                          <LevelIcon className="size-3" />
                          {l.level}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-foreground">{l.action}</td>
                      <td className="whitespace-nowrap px-2 py-3 font-mono text-xs text-muted-foreground">
                        {l.ip}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">共 {total} 条</span>
          <Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} />
        </div>
      </Panel>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}
