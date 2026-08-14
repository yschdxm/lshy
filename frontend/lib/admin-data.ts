import {
  LayoutDashboard,
  Database,
  FileText,
  FolderTree,
  MessageSquareQuote,
  MessagesSquare,
  Landmark,
  Route,
  HeartHandshake,
  Images,
  UserSquare,
  BarChart3,
  Activity,
  MonitorPlay,
  Users,
  ShieldCheck,
  Settings,
  ScrollText,
  FileType2,
  FileSpreadsheet,
  FileImage,
  Toilet,
  Utensils,
  LogOut,
  Cross,
  Info,
  ParkingSquare,
  Accessibility,
  Baby,
  Clock,
  MapPin,
  Eye,
  CheckCircle2,
  Download,
  Share2,
  Video,
  Sparkles,
  Footprints,
  Star,
  Smile,
  Meh,
  Frown,
  ThumbsUp,
  Timer,
  Navigation,
  Camera,
  UserCheck,
  Repeat,
  Percent,
  Key,
  UserCog,
  Lock,
  Bell,
  Palette,
  Server,
  ShieldAlert,
  LogIn,
  FilePenLine,
  AlertTriangle,
  type LucideIcon,
} from 'lucide-react'

export type AdminNavItem = {
  key: string
  label: string
  icon: LucideIcon
  href?: string
  children?: { key: string; label: string; href: string }[]
}

export type AdminNavSection = {
  title: string
  items: AdminNavItem[]
}

export const adminNav: AdminNavSection[] = [
  {
    title: '',
    items: [{ key: 'workbench', label: '工作台', icon: LayoutDashboard, href: '/console' }],
  },
  {
    title: '核心功能管理',
    items: [
      {
        key: 'knowledge',
        label: '知识库管理',
        icon: Database,
        children: [
          { key: 'docs', label: '知识文档管理', href: '/console/knowledge' },
          { key: 'category', label: '知识分类管理', href: '/console/knowledge/category' },
          { key: 'faq', label: 'FAQ管理', href: '/console/knowledge/faq' },
        ],
      },
      { key: 'qa', label: '智能问答管理', icon: MessagesSquare, href: '/console/qa' },
      { key: 'spots', label: '景点讲解管理', icon: Landmark, href: '/console/spots' },
      { key: 'route', label: '个性化路线管理', icon: Route, href: '/console/route' },
      { key: 'service', label: '便民服务管理', icon: HeartHandshake, href: '/console/service' },
      { key: 'postcard', label: 'AI明信片管理', icon: Images, href: '/console/postcard' },
      { key: 'avatar', label: '数字人形象管理', icon: UserSquare, href: '/console/avatar' },
    ],
  },
  {
    title: '数据分析与反馈',
    items: [
      { key: 'satisfaction', label: '游客感受度报告', icon: MessageSquareQuote, href: '/console/satisfaction' },
      { key: 'behavior', label: '游客行为分析', icon: Activity, href: '/console/behavior' },
      { key: 'screen', label: '数据大屏', icon: MonitorPlay, href: '/console/screen' },
    ],
  },
  {
    title: '系统管理',
    items: [
      { key: 'users', label: '用户管理', icon: Users, href: '/console/users' },
      { key: 'roles', label: '角色权限管理', icon: ShieldCheck, href: '/console/roles' },
      { key: 'settings', label: '系统设置', icon: Settings, href: '/console/settings' },
      { key: 'logs', label: '日志管理', icon: ScrollText, href: '/console/logs' },
    ],
  },
]

/* Breadcrumb / page title lookup */
export const routeMeta: Record<string, { title: string; parent?: string; desc?: string }> = {
  '/console': { title: '工作台', desc: '灵境云游 AI 数字人导览系统运营总览' },
  '/console/knowledge': {
    title: '知识文档管理',
    parent: '知识库管理',
    desc: '管理景区知识库文档，支持文档上传、解析、向量化处理及状态管理，为 AI 问答和讲解提供知识支持。',
  },
  '/console/qa': {
    title: '智能问答管理',
    parent: '核心功能管理',
    desc: '查看游客提问、维护标准答案与命中效果，持续优化 AI 问答质量。',
  },
  '/console/spots': {
    title: '景点讲解管理',
    parent: '核心功能管理',
    desc: '配置景点讲解的 AI 实时生成能力——讲解风格、知识取材来源与多语言，并抽样审核生成质量。',
  },
  '/console/users': {
    title: '用户管理',
    parent: '系统管理',
    desc: '管理后台账号、游客账号与访问权限，保障系统安全运行。',
  },
  '/console/postcard': {
    title: 'AI明信片管理',
    parent: '核心功能管理',
    desc: '管理明信片生成风格模板与游客作品，监控生成、下载与分享数据。',
  },
  '/console/avatar': {
    title: '数字人形象管理',
    parent: '核心功能管理',
    desc: '维护数字人形象、音色与多语言配置，管理其在各业务场景的应用。',
  },
  '/console/route': {
    title: '个性化路线管理',
    parent: '核心功能管理',
    desc: '配置个性化路线的 AI 实时生成引擎——景点调度池、主题时长与规划规则，并监控实时生成记录。',
  },
  '/console/satisfaction': {
    title: '游客感受度报告',
    parent: '数据分析与反馈',
    desc: '汇总游客满意度评价与情感倾向，洞察服务口碑与改进方向。',
  },
  '/console/behavior': {
    title: '游客行为分析',
    parent: '数据分析与反馈',
    desc: '分析游客访问、讲解收听、路线偏好等行为数据，辅助运营决策。',
  },
  '/console/roles': {
    title: '角色权限管理',
    parent: '系统管理',
    desc: '管理后台角色及其功能权限，控制不同岗位人员的操作范围。',
  },
  '/console/settings': {
    title: '系统设置',
    parent: '系统管理',
    desc: '配置景区基础信息、AI 服务、通知与安全策略等系统参数。',
  },
  '/console/logs': {
    title: '日志管理',
    parent: '系统管理',
    desc: '记录并检索后台操作、登录与系统事件日志，保障可追溯与安全审计。',
  },
}

/* ---------- 工作台 dashboard ---------- */
export type Trend = { value: string; up: boolean }

export type WorkbenchStat = {
  key: string
  label: string
  value: string
  trend: Trend
  icon: LucideIcon
  tint: string
}

export const workbenchStats: WorkbenchStat[] = [
  { key: 'visitors', label: '今日访客', value: '12,486', trend: { value: '8.2%', up: true }, icon: Users, tint: 'text-blue-500 bg-blue-50' },
  { key: 'qa', label: 'AI问答次数', value: '8,932', trend: { value: '6.7%', up: true }, icon: MessagesSquare, tint: 'text-teal-500 bg-teal-50' },
  { key: 'guide', label: '讲解播放量', value: '5,214', trend: { value: '5.3%', up: true }, icon: Landmark, tint: 'text-emerald-500 bg-emerald-50' },
  { key: 'postcard', label: '明信片生成', value: '1,326', trend: { value: '3.1%', up: true }, icon: Images, tint: 'text-orange-500 bg-orange-50' },
  { key: 'satisfaction', label: '满意度', value: '96.4%', trend: { value: '2.6%', up: true }, icon: MessageSquareQuote, tint: 'text-sky-500 bg-sky-50' },
  { key: 'pending', label: '待处理反馈', value: '23', trend: { value: '1.2%', up: false }, icon: Activity, tint: 'text-rose-500 bg-rose-50' },
]

export type TrafficPoint = { label: string; visitors: number; qa: number }

export const trafficTrend: TrafficPoint[] = [
  { label: '周一', visitors: 8200, qa: 5600 },
  { label: '周二', visitors: 9100, qa: 6200 },
  { label: '周三', visitors: 8600, qa: 5900 },
  { label: '周四', visitors: 10400, qa: 7100 },
  { label: '周五', visitors: 11800, qa: 8300 },
  { label: '周六', visitors: 15200, qa: 10600 },
  { label: '周日', visitors: 14300, qa: 9800 },
]

export type HotSpotStat = { name: string; plays: number; pct: number }

export const hotSpotStats: HotSpotStat[] = [
  { name: '灵山大佛', plays: 3280, pct: 100 },
  { name: '灵山梵宫', plays: 2640, pct: 80 },
  { name: '九龙灌浴', plays: 2110, pct: 64 },
  { name: '五印坛城', plays: 1580, pct: 48 },
  { name: '祥符禅寺', plays: 1240, pct: 38 },
]

export type TodoItem = { key: string; title: string; tag: string; tone: 'warn' | 'info' | 'danger'; time: string }

export const workbenchTodos: TodoItem[] = [
  { key: 't1', title: '18 篇文档待向量化处理', tag: '知识库', tone: 'warn', time: '10��钟前' },
  { key: 't2', title: '23 条游客反馈待回复', tag: '反馈', tone: 'danger', time: '32分钟前' },
  { key: 't3', title: '5 条问答未命中需补充答案', tag: '问答', tone: 'info', time: '1小时前' },
  { key: 't4', title: '新增 3 个数字人形象待审核', tag: '数字人', tone: 'info', time: '2小时前' },
]

/* ---------- 知识文档管理 ---------- */
export type DocStatus = '向量化完成' | '已解析' | '解析中' | '待解析'

export type KnowledgeDoc = {
  id: string
  title: string
  desc: string
  category: string
  categoryTone: string
  source: string
  fileType: 'PDF' | 'DOCX' | 'TXT' | 'PPTX' | 'XLSX' | 'MD'
  size: string
  status: DocStatus
  updatedAt: string
}

export const docFileTypeMeta: Record<
  KnowledgeDoc['fileType'],
  { icon: LucideIcon; tint: string }
> = {
  PDF: { icon: FileText, tint: 'text-rose-500 bg-rose-50' },
  DOCX: { icon: FileType2, tint: 'text-blue-500 bg-blue-50' },
  TXT: { icon: FileText, tint: 'text-emerald-500 bg-emerald-50' },
  PPTX: { icon: FileImage, tint: 'text-orange-500 bg-orange-50' },
  XLSX: { icon: FileSpreadsheet, tint: 'text-green-600 bg-green-50' },
  MD: { icon: FileText, tint: 'text-sky-500 bg-sky-50' },
}

export const docStatusMeta: Record<DocStatus, string> = {
  向量化完成: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  已解析: 'text-blue-600 bg-blue-50 border-blue-200',
  解析中: 'text-amber-600 bg-amber-50 border-amber-200',
  待解析: 'text-muted-foreground bg-secondary border-border',
}

export const categoryToneMeta: Record<string, string> = {
  历史文化: 'text-orange-600 bg-orange-50',
  景点讲解: 'text-blue-600 bg-blue-50',
  FAQ: 'text-sky-600 bg-sky-50',
  便民服务: 'text-rose-600 bg-rose-50',
  文化特色: 'text-amber-600 bg-amber-50',
  活动信息: 'text-teal-600 bg-teal-50',
}

export const knowledgeDocs: KnowledgeDoc[] = [
  { id: 'd1', title: '灵山胜境历史文化概述.pdf', desc: '包含景区整体历史背景和文化发展脉络', category: '历史文化', categoryTone: categoryToneMeta['历史文化'], source: '景区官方', fileType: 'PDF', size: '2.45 MB', status: '向量化完成', updatedAt: '2025-05-20 10:30' },
  { id: 'd2', title: '核心景点讲解词汇总.docx', desc: '包含主要景点的标准讲解词和扩展内容', category: '景点讲解', categoryTone: categoryToneMeta['景点讲解'], source: '景区官方', fileType: 'DOCX', size: '1.87 MB', status: '向量化完成', updatedAt: '2025-05-20 09:45' },
  { id: 'd3', title: '游客常见问题FAQ.txt', desc: '游客常见问题与标准答案整理', category: 'FAQ', categoryTone: categoryToneMeta['FAQ'], source: '客服整理', fileType: 'TXT', size: '356 KB', status: '已解析', updatedAt: '2025-05-19 16:20' },
  { id: 'd4', title: '景区服务设施介绍.pptx', desc: '景区服务设施位置和使用说明', category: '便民服务', categoryTone: categoryToneMeta['便民服务'], source: '景区官方', fileType: 'PPTX', size: '3.12 MB', status: '解析中', updatedAt: '2025-05-19 14:15' },
  { id: 'd5', title: '非遗文化项目介绍.pdf', desc: '景区内非物质文化遗产详细介绍', category: '文化特色', categoryTone: categoryToneMeta['文化特色'], source: '文化局提供', fileType: 'PDF', size: '4.56 MB', status: '向量化完成', updatedAt: '2025-05-19 11:30' },
  { id: 'd6', title: '活动日程安排表.xlsx', desc: '景区各类活动时间安排和详情', category: '活动信息', categoryTone: categoryToneMeta['活动信息'], source: '景区官方', fileType: 'XLSX', size: '892 KB', status: '待解析', updatedAt: '2025-05-19 10:05' },
  { id: 'd7', title: '灵山传说故事集.md', desc: '收录景区相关民间传说和故事', category: '历史文化', categoryTone: categoryToneMeta['历史文化'], source: '文旅研究', fileType: 'MD', size: '156 KB', status: '已解析', updatedAt: '2025-05-19 09:20' },
  { id: 'd8', title: '梵宫建筑艺术详解.pdf', desc: '灵山梵宫建筑结构与艺术价值解读', category: '文化特色', categoryTone: categoryToneMeta['文化特色'], source: '景区官方', fileType: 'PDF', size: '5.23 MB', status: '向量化完成', updatedAt: '2025-05-18 17:40' },
  { id: 'd9', title: '无障碍游览指南.docx', desc: '面向特殊人群的无障碍设施与路线', category: '便民服务', categoryTone: categoryToneMeta['便民服务'], source: '景区官方', fileType: 'DOCX', size: '742 KB', status: '已解析', updatedAt: '2025-05-18 15:10' },
  { id: 'd10', title: '祈福礼佛习俗介绍.txt', desc: '灵山祈福礼佛相关文化习俗说明', category: '历史文化', categoryTone: categoryToneMeta['历史文化'], source: '文旅研究', fileType: 'TXT', size: '284 KB', status: '待解析', updatedAt: '2025-05-18 09:00' },
]

export const docStats = [
  { key: 'total', label: '文档总数', value: '256', trend: { value: '8.2%', up: true }, icon: FileText, tint: 'text-blue-500 bg-blue-50' },
  { key: 'parsed', label: '已解析文档', value: '238', trend: { value: '6.7%', up: true }, icon: FileType2, tint: 'text-emerald-500 bg-emerald-50' },
  { key: 'vector', label: '向量化完成', value: '214', trend: { value: '5.3%', up: true }, icon: Database, tint: 'text-orange-500 bg-orange-50' },
  { key: 'faq', label: 'FAQ条目', value: '126', trend: { value: '3.1%', up: true }, icon: MessagesSquare, tint: 'text-violet-500 bg-violet-50' },
  { key: 'coverage', label: '知识覆盖率', value: '92.4%', trend: { value: '2.6%', up: true }, icon: BarChart3, tint: 'text-teal-500 bg-teal-50' },
  { key: 'pending', label: '待处理文档', value: '18', trend: { value: '1.2%', up: false }, icon: FolderTree, tint: 'text-rose-500 bg-rose-50' },
]

export type DocCategoryDist = { name: string; count: number; pct: string; color: string }

export const docCategoryDist: DocCategoryDist[] = [
  { name: '历史文化', count: 86, pct: '33.6%', color: 'var(--chart-1)' },
  { name: '景点讲解', count: 68, pct: '26.6%', color: 'var(--chart-3)' },
  { name: '便民服务', count: 45, pct: '17.6%', color: 'var(--chart-2)' },
  { name: 'FAQ', count: 28, pct: '10.9%', color: 'var(--chart-4)' },
  { name: '活动信息', count: 18, pct: '7.0%', color: 'var(--chart-5)' },
  { name: '其他', count: 11, pct: '4.3%', color: 'oklch(0.7 0.04 260)' },
]

export const docFilters = {
  categories: ['全部分类', '历史文化', '景点讲解', 'FAQ', '便民服务', '文化特色', '活动信息'],
  statuses: ['全部状态', '向量化完成', '已解析', '解析中', '待解析'],
  sources: ['全部来源', '景区官方', '客服整理', '文化局提供', '文旅研究'],
}

/* ---------- 智能问答管理 ---------- */
export type QaRecord = {
  id: string
  question: string
  intent: string
  answerSource: string
  hit: boolean
  count: number
  updatedAt: string
}

export const qaStats = [
  { key: 'total', label: '问答总量', value: '8,932', trend: { value: '6.7%', up: true }, icon: MessagesSquare, tint: 'text-blue-500 bg-blue-50' },
  { key: 'hitrate', label: '命中率', value: '94.2%', trend: { value: '1.8%', up: true }, icon: BarChart3, tint: 'text-emerald-500 bg-emerald-50' },
  { key: 'miss', label: '未命中', value: '52', trend: { value: '3.4%', up: false }, icon: Activity, tint: 'text-rose-500 bg-rose-50' },
  { key: 'avgtime', label: '平均响应', value: '0.8s', trend: { value: '5.0%', up: true }, icon: MessageSquareQuote, tint: 'text-teal-500 bg-teal-50' },
]

export const qaRecords: QaRecord[] = [
  { id: 'q1', question: '灵山大佛有多高？', intent: '景点信息', answerSource: '知识库', hit: true, count: 1286, updatedAt: '2025-05-20 10:12' },
  { id: 'q2', question: '梵宫开放时间是什么时候？', intent: '开放时间', answerSource: '知识库', hit: true, count: 964, updatedAt: '2025-05-20 09:40' },
  { id: 'q3', question: '景区里���以带宠物吗？', intent: '入园规则', answerSource: '人工补充', hit: true, count: 512, updatedAt: '2025-05-19 18:22' },
  { id: 'q4', question: '九龙灌浴表演几点开始？', intent: '活动信息', answerSource: '知识库', hit: true, count: 843, updatedAt: '2025-05-19 16:05' },
  { id: 'q5', question: '附近有没有充电宝租借？', intent: '便民服务', answerSource: '未命中', hit: false, count: 76, updatedAt: '2025-05-19 15:18' },
  { id: 'q6', question: '灵山门票能退吗？', intent: '票务问题', answerSource: '知识库', hit: true, count: 398, updatedAt: '2025-05-19 11:47' },
  { id: 'q7', question: '素斋餐厅在哪里？', intent: '便民服务', answerSource: '知识库', hit: true, count: 265, updatedAt: '2025-05-18 14:30' },
  { id: 'q8', question: '可以帮我讲讲阿育王柱吗？', intent: '景点讲解', answerSource: '未命中', hit: false, count: 41, updatedAt: '2025-05-18 10:11' },
]

/* ---------- 景点讲解管理（AI 实时生成引擎） ---------- */
export const narrationStats = [
  { key: 'spots', label: '接入讲解景点', value: '42', trend: { value: '4.2%', up: true }, icon: Landmark, tint: 'text-blue-500 bg-blue-50' },
  { key: 'today', label: '今日生成讲解', value: '3,860', trend: { value: '6.7%', up: true }, icon: Sparkles, tint: 'text-orange-500 bg-orange-50' },
  { key: 'latency', label: '平均生成耗时', value: '1.4s', trend: { value: '5.1%', up: true }, icon: Timer, tint: 'text-teal-500 bg-teal-50' },
  { key: 'satisfaction', label: '讲解满意度', value: '96.2%', trend: { value: '1.8%', up: true }, icon: ThumbsUp, tint: 'text-emerald-500 bg-emerald-50' },
]

// AI 讲解生成的全局参数：讲解风格、篇幅、创意度、支持语言
export const narrationPersonas = ['知性讲解', '生动故事', '简洁导览', '禅意讲述'] as const
export const narrationLengths = ['简短', '标准', '详尽'] as const
export const narrationLanguages = ['中文', 'English', '日本語', '한국어'] as const

export const narrationDefaults = {
  persona: '知性讲解' as (typeof narrationPersonas)[number],
  length: '标准' as (typeof narrationLengths)[number],
  creativity: 40, // 0-100，对应生成温度
  enabledLanguages: ['中文', 'English', '日本語'] as string[],
}

export type NarrationSpot = {
  id: string
  name: string
  category: string
  sources: string[] // 关联的知识库分类（AI 讲解取材来源）
  languages: string[]
  genToday: number
  satisfaction: number
  enabled: boolean
}

export const narrationSpots: NarrationSpot[] = [
  { id: 's1', name: '灵山大佛', category: '标志景点', sources: ['历史文化', '景点讲解'], languages: ['中', 'EN', '日'], genToday: 986, satisfaction: 98, enabled: true },
  { id: 's2', name: '灵山梵宫', category: '标志景点', sources: ['历史文化', '文化特色'], languages: ['中', 'EN'], genToday: 742, satisfaction: 97, enabled: true },
  { id: 's3', name: '九龙灌浴', category: '文化演艺', sources: ['景点讲解', '活动信息'], languages: ['中', 'EN', '日', '韩'], genToday: 634, satisfaction: 96, enabled: true },
  { id: 's4', name: '五印坛城', category: '文化建筑', sources: ['历史文化', '文化特色'], languages: ['中', 'EN'], genToday: 468, satisfaction: 94, enabled: true },
  { id: 's5', name: '祥符禅寺', category: '宗教建筑', sources: ['历史文化'], languages: ['中'], genToday: 352, satisfaction: 95, enabled: true },
  { id: 's6', name: '阿育王柱', category: '文化地标', sources: ['历史文化'], languages: ['中', 'EN'], genToday: 218, satisfaction: 92, enabled: false },
]

// 近期实时生成的讲解记录（供质量审核与抽样监控）
export type NarrationSample = {
  id: string
  spot: string
  language: string
  persona: string
  excerpt: string
  rating: number
  latency: string
  time: string
}

export const narrationSamples: NarrationSample[] = [
  { id: 'ns1', spot: '灵山大佛', language: '中文', persona: '知性讲解', excerpt: '灵山大佛通高 88 米，是世界著名的青铜释迦牟尼立像。它依山而立、面朝太湖，法相庄严慈祥，落成于 1997 年……', rating: 5, latency: '1.2s', time: '2025-05-20 10:32' },
  { id: 'ns2', spot: '九龙灌浴', language: 'English', persona: '生动故事', excerpt: 'As the music swells, nine dragons rise and pour purifying water over the golden baby Buddha—reenacting the legend of Sakyamuni\u2019s birth……', rating: 5, latency: '1.5s', time: '2025-05-20 10:28' },
  { id: 'ns3', spot: '灵山梵宫', language: '中文', persona: '禅意讲述', excerpt: '步入梵宫，琉璃与木雕交相辉映。请放缓脚步，让心随廊柱间流转的光影一同沉静下来……', rating: 4, latency: '1.6s', time: '2025-05-20 10:15' },
  { id: 'ns4', spot: '五印坛城', language: '中文', persona: '知性讲解', excerpt: '五印坛城以藏传佛教坛城为原型，融合汉藏建筑艺术，金顶与彩绘诉说着多元文化的交融……', rating: 5, latency: '1.3s', time: '2025-05-20 09:58' },
  { id: 'ns5', spot: '祥符禅寺', language: '中文', persona: '简洁导览', excerpt: '祥符禅寺始建于唐，是灵山大佛的依托祖庭。前方为天王殿，两侧为钟鼓楼，请沿中轴线依次参观……', rating: 4, latency: '1.1s', time: '2025-05-20 09:41' },
  { id: 'ns6', spot: '灵山大佛', language: '日本語', persona: '知性讲解', excerpt: '霊山大仏は高さ 88 メートル、太湖を望んで立つ青銅の釈迦牟尼像です。1997 年に完成しました……', rating: 5, latency: '1.4s', time: '2025-05-20 09:22' },
]

/* ---------- 用户管理 ---------- */
export type AdminUser = {
  id: string
  name: string
  account: string
  role: string
  roleTone: string
  dept: string
  status: '启用' | '禁用'
  lastLogin: string
}

export const userStats = [
  { key: 'total', label: '用户总数', value: '1,284', trend: { value: '5.6%', up: true }, icon: Users, tint: 'text-blue-500 bg-blue-50' },
  { key: 'admin', label: '后台账号', value: '28', trend: { value: '2.0%', up: true }, icon: ShieldCheck, tint: 'text-emerald-500 bg-emerald-50' },
  { key: 'active', label: '今日活跃', value: '486', trend: { value: '7.1%', up: true }, icon: Activity, tint: 'text-teal-500 bg-teal-50' },
  { key: 'disabled', label: '禁用账号', value: '9', trend: { value: '1.0%', up: false }, icon: Users, tint: 'text-rose-500 bg-rose-50' },
]

export const userRoleTone: Record<string, string> = {
  超级管理员: 'text-rose-600 bg-rose-50',
  内容运营: 'text-blue-600 bg-blue-50',
  客服专员: 'text-teal-600 bg-teal-50',
  数据分析: 'text-orange-600 bg-orange-50',
}

export const adminUsers: AdminUser[] = [
  { id: 'u1', name: '张伟', account: 'admin', role: '超级管理员', roleTone: userRoleTone['超级管理员'], dept: '运营中心', status: '启用', lastLogin: '2025-05-20 10:20' },
  { id: 'u2', name: '李静', account: 'lijing', role: '内容运营', roleTone: userRoleTone['内容运营'], dept: '内容部', status: '启用', lastLogin: '2025-05-20 09:05' },
  { id: 'u3', name: '王强', account: 'wangqiang', role: '客服专员', roleTone: userRoleTone['客服专员'], dept: '客服部', status: '启用', lastLogin: '2025-05-19 18:40' },
  { id: 'u4', name: '赵敏', account: 'zhaomin', role: '数据分析', roleTone: userRoleTone['数据分析'], dept: '数据部', status: '禁用', lastLogin: '2025-05-15 14:12' },
  { id: 'u5', name: '陈曦', account: 'chenxi', role: '内容运营', roleTone: userRoleTone['内容运营'], dept: '内容部', status: '启用', lastLogin: '2025-05-19 16:28' },
  { id: 'u6', name: '刘洋', account: 'liuyang', role: '客服专员', roleTone: userRoleTone['客服专员'], dept: '客服部', status: '启用', lastLogin: '2025-05-19 11:55' },
]

/* ---------- 知识分类管理 ---------- */
export type KnowledgeCategory = {
  id: string
  name: string
  desc: string
  color: string
  dot: string
  docCount: number
  faqCount: number
  sort: number
  status: '启用' | '停用'
  updatedAt: string
}

export const categoryStats = [
  { key: 'total', label: '分类总数', value: '12', trend: { value: '2.0%', up: true }, icon: FolderTree, tint: 'text-blue-500 bg-blue-50' },
  { key: 'linked', label: '关联文档', value: '256', trend: { value: '8.2%', up: true }, icon: FileText, tint: 'text-emerald-500 bg-emerald-50' },
  { key: 'enabled', label: '启用分类', value: '10', trend: { value: '1.5%', up: true }, icon: CheckCircle2, tint: 'text-teal-500 bg-teal-50' },
  { key: 'empty', label: '空分类', value: '2', trend: { value: '1.0%', up: false }, icon: Activity, tint: 'text-rose-500 bg-rose-50' },
]

export const knowledgeCategories: KnowledgeCategory[] = [
  { id: 'c1', name: '历史文化', desc: '景区历史背景、文化脉络与传说故事', color: 'var(--chart-1)', dot: 'bg-blue-500', docCount: 86, faqCount: 32, sort: 1, status: '启用', updatedAt: '2025-05-20 10:30' },
  { id: 'c2', name: '景点讲解', desc: '各景点标准讲解词与扩展内容', color: 'var(--chart-3)', dot: 'bg-emerald-500', docCount: 68, faqCount: 24, sort: 2, status: '启用', updatedAt: '2025-05-20 09:45' },
  { id: 'c3', name: '便民服务', desc: '卫生间、餐饮、医务室等服务设施说明', color: 'var(--chart-2)', dot: 'bg-teal-500', docCount: 45, faqCount: 28, sort: 3, status: '启用', updatedAt: '2025-05-19 16:20' },
  { id: 'c4', name: 'FAQ', desc: '游客常见问题与标准答案', color: 'var(--chart-4)', dot: 'bg-orange-500', docCount: 28, faqCount: 62, sort: 4, status: '启用', updatedAt: '2025-05-19 14:15' },
  { id: 'c5', name: '活动信息', desc: '景区各类活动日程与详情', color: 'var(--chart-5)', dot: 'bg-violet-500', docCount: 18, faqCount: 9, sort: 5, status: '启用', updatedAt: '2025-05-19 11:30' },
  { id: 'c6', name: '文化特色', desc: '非遗项目、建筑艺术等特色文化', color: 'oklch(0.72 0.13 60)', dot: 'bg-amber-500', docCount: 11, faqCount: 4, sort: 6, status: '启用', updatedAt: '2025-05-19 10:05' },
  { id: 'c7', name: '交通指引', desc: '景区内外交通与停车指引', color: 'oklch(0.7 0.04 260)', dot: 'bg-slate-400', docCount: 0, faqCount: 0, sort: 7, status: '停用', updatedAt: '2025-05-18 09:20' },
]

/* ---------- FAQ管理 ---------- */
export type FaqItem = {
  id: string
  question: string
  answer: string
  category: string
  categoryTone: string
  views: number
  status: '已发布' | '草稿' | '待完善'
  updatedAt: string
}

export const faqStats = [
  { key: 'total', label: 'FAQ总数', value: '126', trend: { value: '3.1%', up: true }, icon: MessagesSquare, tint: 'text-blue-500 bg-blue-50' },
  { key: 'published', label: '已发布', value: '108', trend: { value: '4.2%', up: true }, icon: Eye, tint: 'text-emerald-500 bg-emerald-50' },
  { key: 'views', label: '总浏览量', value: '48.6K', trend: { value: '6.7%', up: true }, icon: BarChart3, tint: 'text-orange-500 bg-orange-50' },
  { key: 'todo', label: '待完善', value: '9', trend: { value: '1.2%', up: false }, icon: Activity, tint: 'text-rose-500 bg-rose-50' },
]

export const faqStatusMeta: Record<FaqItem['status'], string> = {
  已发布: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  草稿: 'text-muted-foreground bg-secondary border-border',
  待完善: 'text-amber-600 bg-amber-50 border-amber-200',
}

export const faqItems: FaqItem[] = [
  { id: 'f1', question: '灵山大佛有多高？', answer: '灵山大佛高 88 米，加莲花座总高约 101.5 米，是世界著名的青铜释迦牟尼立像。', category: '景点讲解', categoryTone: categoryToneMeta['景点讲解'], views: 12860, status: '已发布', updatedAt: '2025-05-20 10:12' },
  { id: 'f2', question: '景区开放时间是几点？', answer: '景区每日 07:30 开园，17:30 停止入园，18:00 闭园；节假日可能延长，��以现场公告为准。', category: 'FAQ', categoryTone: categoryToneMeta['FAQ'], views: 9640, status: '已发布', updatedAt: '2025-05-20 09:40' },
  { id: 'f3', question: '九龙灌浴表演几点开始？', answer: '九龙灌浴每日固定场次为 09:30、11:00、14:00、16:00，旺季会加场，建议提前 15 分钟到场。', category: '活动信息', categoryTone: categoryToneMeta['活动信息'], views: 8430, status: '已发布', updatedAt: '2025-05-19 16:05' },
  { id: 'f4', question: '景区里可以带宠物吗？', answer: '除导盲犬等工作犬外，景区谢绝携带宠物入园，敬请配合。', category: 'FAQ', categoryTone: categoryToneMeta['FAQ'], views: 5120, status: '已发布', updatedAt: '2025-05-19 18:22' },
  { id: 'f5', question: '素斋餐厅在哪里？', answer: '景区内素斋餐厅位于梵宫东侧文创广场，营业时间 10:30-14:30、16:30-19:00。', category: '便民服务', categoryTone: categoryToneMeta['便民服务'], views: 2650, status: '已发布', updatedAt: '2025-05-18 14:30' },
  { id: 'f6', question: '有没有充电宝租借服务？', answer: '暂未完善：拟在游客中心与主要出入口增设共享充电宝点位，内容待补充。', category: '便民服务', categoryTone: categoryToneMeta['便民服务'], views: 760, status: '待完善', updatedAt: '2025-05-19 15:18' },
  { id: 'f7', question: '灵山门票如何预订与退改？', answer: '可通过官方小程序、OTA 平台预订，未使用门票可在有效期内在线申请退款。', category: 'FAQ', categoryTone: categoryToneMeta['FAQ'], views: 3980, status: '草稿', updatedAt: '2025-05-19 11:47' },
  { id: 'f8', question: '祥符禅寺可以烧香祈福吗？', answer: '祥符禅寺提供免费环保香，祈福区域设有专人引导，请遵守文明敬香规定。', category: '历史文化', categoryTone: categoryToneMeta['历史文化'], views: 4210, status: '已发布', updatedAt: '2025-05-18 10:11' },
]

/* ---------- 便民服务管理 ---------- */
export type ServiceFacility = {
  id: string
  name: string
  type: '卫生间' | '餐饮' | '出口' | '医务室' | '游客中心' | '停车点'
  location: string
  features: string[]
  hours: string
  guidedToday: number
  status: '开放中' | '维护中' | '已关闭'
  updatedAt: string
}

export const serviceTypeMeta: Record<
  ServiceFacility['type'],
  { icon: LucideIcon; tint: string }
> = {
  卫生间: { icon: Toilet, tint: 'text-blue-500 bg-blue-50' },
  餐饮: { icon: Utensils, tint: 'text-orange-500 bg-orange-50' },
  出口: { icon: LogOut, tint: 'text-emerald-500 bg-emerald-50' },
  医务室: { icon: Cross, tint: 'text-rose-500 bg-rose-50' },
  游客中心: { icon: Info, tint: 'text-teal-500 bg-teal-50' },
  停车点: { icon: ParkingSquare, tint: 'text-violet-500 bg-violet-50' },
}

export const serviceStatusMeta: Record<ServiceFacility['status'], string> = {
  开放中: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  维护中: 'text-amber-600 bg-amber-50 border-amber-200',
  已关闭: 'text-muted-foreground bg-secondary border-border',
}

export const serviceStats = [
  { key: 'total', label: '服务设施', value: '68', trend: { value: '3.5%', up: true }, icon: HeartHandshake, tint: 'text-blue-500 bg-blue-50' },
  { key: 'open', label: '开放中', value: '61', trend: { value: '2.1%', up: true }, icon: Clock, tint: 'text-emerald-500 bg-emerald-50' },
  { key: 'guided', label: '今日引导', value: '3,842', trend: { value: '7.8%', up: true }, icon: MapPin, tint: 'text-orange-500 bg-orange-50' },
  { key: 'maintain', label: '维护中', value: '7', trend: { value: '1.4%', up: false }, icon: Activity, tint: 'text-rose-500 bg-rose-50' },
]

export const serviceFacilities: ServiceFacility[] = [
  // === 游客中心 ===
  { id: 'sv01', name: '游客服务中心（主）', type: '游客中心', location: '景区南门主入口西侧', features: ['咨询', '失物招领', '轮椅租借', '母婴间'], hours: '07:00-17:30', guidedToday: 1124, status: '开放中', updatedAt: '2025-07-10 08:30' },
  { id: 'sv02', name: '东门游客服务点', type: '游客中心', location: '景区东门入口处', features: ['咨询'], hours: '07:30-17:00', guidedToday: 356, status: '开放中', updatedAt: '2025-07-10 08:15' },
  { id: 'sv03', name: '北门游客咨询台', type: '游客中心', location: '景区北门停车场旁', features: ['咨询', '失物招领'], hours: '08:00-17:00', guidedToday: 278, status: '开放中', updatedAt: '2025-07-10 07:50' },

  // === 卫生间 ===
  { id: 'sv04', name: '入口广场卫生间', type: '卫生间', location: '大照壁后方东侧', features: ['无障碍', '母婴间'], hours: '06:00-22:00', guidedToday: 923, status: '开放中', updatedAt: '2025-07-10 06:00' },
  { id: 'sv05', name: '大佛景区卫生间（东）', type: '卫生间', location: '大佛景区登云道东侧', features: ['无障碍', '母婴间'], hours: '06:00-22:00', guidedToday: 658, status: '开放中', updatedAt: '2025-07-10 06:30' },
  { id: 'sv06', name: '大佛景区卫生间（西）', type: '卫生间', location: '大佛景区电梯入口旁', features: ['无障碍'], hours: '06:00-22:00', guidedToday: 591, status: '开放中', updatedAt: '2025-07-10 07:00' },
  { id: 'sv07', name: '九龙灌浴广场卫生间', type: '卫生间', location: '九龙灌浴表演区南侧', features: ['无障碍', '母婴间'], hours: '07:00-20:00', guidedToday: 743, status: '开放中', updatedAt: '2025-07-10 07:30' },
  { id: 'sv08', name: '梵宫一层卫生间', type: '卫生间', location: '梵宫一层大厅东侧', features: ['无障碍'], hours: '09:00-17:30', guidedToday: 482, status: '开放中', updatedAt: '2025-07-10 09:00' },
  { id: 'sv09', name: '梵宫观景台卫生间', type: '卫生间', location: '梵宫西侧观景平台', features: ['无障碍'], hours: '06:00-22:00', guidedToday: 312, status: '维护中', updatedAt: '2025-07-09 14:20' },
  { id: 'sv10', name: '五印坛城卫生间', type: '卫生间', location: '五印坛城北侧广场', features: ['无障碍'], hours: '09:00-17:30', guidedToday: 267, status: '开放中', updatedAt: '2025-07-10 09:15' },
  { id: 'sv11', name: '祥符禅寺卫生间', type: '卫生间', location: '祥符禅寺北侧配殿旁', features: [], hours: '07:30-17:30', guidedToday: 176, status: '开放中', updatedAt: '2025-07-10 08:40' },
  { id: 'sv12', name: '菩提大道卫生间', type: '卫生间', location: '菩提大道中段休息区', features: ['无障碍'], hours: '07:00-18:30', guidedToday: 334, status: '开放中', updatedAt: '2025-07-10 08:20' },

  // === 餐饮 ===
  { id: 'sv13', name: '梵宫素斋餐厅', type: '餐饮', location: '梵宫东侧文创广场二楼', features: ['团餐预订'], hours: '10:30-14:30 / 16:30-19:00', guidedToday: 486, status: '开放中', updatedAt: '2025-07-10 09:15' },
  { id: 'sv14', name: '灵山素面馆', type: '餐饮', location: '祥符禅寺东侧50米', features: [], hours: '09:00-16:30', guidedToday: 312, status: '开放中', updatedAt: '2025-07-10 11:00' },
  { id: 'sv15', name: '入口美食广场', type: '餐饮', location: '景区主入口广场北侧', features: ['直饮水', '团餐预订'], hours: '08:00-17:00', guidedToday: 678, status: '开放中', updatedAt: '2025-07-10 10:30' },
  { id: 'sv16', name: '五印坛城茶歇区', type: '餐饮', location: '五印坛城一层西侧', features: ['直饮水', '休息区'], hours: '09:30-17:00', guidedToday: 189, status: '开放中', updatedAt: '2025-07-10 09:30' },
  { id: 'sv17', name: '大佛脚下小吃亭', type: '餐饮', location: '大佛平台东侧', features: [], hours: '09:00-16:30', guidedToday: 445, status: '开放中', updatedAt: '2025-07-10 10:15' },

  // === 医务室 ===
  { id: 'sv18', name: '景区医务室', type: '医务室', location: '游客中心一楼东侧', features: ['急救', '轮椅租借'], hours: '08:00-18:00', guidedToday: 45, status: '开放中', updatedAt: '2025-07-10 07:45' },

  // === 停车点 ===
  { id: 'sv19', name: 'P1 主停车场', type: '停车点', location: '景区正门外东侧150米', features: ['充电桩'], hours: '全天', guidedToday: 1206, status: '开放中', updatedAt: '2025-07-10 07:00' },
  { id: 'sv20', name: 'P2 生态停车场', type: '停车点', location: '景区北入口外200米', features: ['充电桩', '大巴车位'], hours: '全天', guidedToday: 892, status: '开放中', updatedAt: '2025-07-10 08:00' },
  { id: 'sv21', name: 'P3 临时停车场', type: '停车点', location: '景区东门外300米', features: [], hours: '节假日/旺季开放', guidedToday: 0, status: '已关闭', updatedAt: '2025-07-08 15:00' },

  // === 出口 ===
  { id: 'sv22', name: '南门主出口', type: '出口', location: '景区南门', features: [], hours: '07:00-18:30', guidedToday: 0, status: '开放中', updatedAt: '2025-07-10 06:00' },
  { id: 'sv23', name: '东出口便民驿站', type: '出口', location: '大佛景区东出口', features: ['直饮水', '休息区', '咨询'], hours: '07:30-18:30', guidedToday: 534, status: '开放中', updatedAt: '2025-07-10 10:00' },
  { id: 'sv24', name: '北门出口', type: '出口', location: '景区北门停车场方向', features: [], hours: '07:30-18:00', guidedToday: 0, status: '开放中', updatedAt: '2025-07-10 06:30' },
]

export const serviceFeatureMeta: Record<string, LucideIcon> = {
  无障碍: Accessibility,
  母婴间: Baby,
}

/* ---------- AI明信片管理 ---------- */
export type PostcardStyle = {
  id: string
  name: string
  cover: string
  usage: number
  status: '已上线' | '已下线'
}

export type PostcardWork = {
  id: string
  title: string
  spot: string
  spotImage: string
  style: string
  styleTone: string
  creator: string
  likes: number
  downloads: number
  status: '已生成' | '生成中' | '已分享'
  createdAt: string
}

export const postcardStats = [
  { key: 'total', label: '生成总量', value: '1,326', trend: { value: '3.1%', up: true }, icon: Images, tint: 'text-blue-500 bg-blue-50' },
  { key: 'today', label: '今日生成', value: '96', trend: { value: '5.4%', up: true }, icon: Sparkles, tint: 'text-orange-500 bg-orange-50' },
  { key: 'download', label: '下载次数', value: '842', trend: { value: '4.7%', up: true }, icon: Download, tint: 'text-emerald-500 bg-emerald-50' },
  { key: 'share', label: '分享次数', value: '518', trend: { value: '6.2%', up: true }, icon: Share2, tint: 'text-teal-500 bg-teal-50' },
]

export const postcardStyleTone: Record<string, string> = {
  国风插画: 'text-blue-600 bg-blue-50',
  清新水彩: 'text-teal-600 bg-teal-50',
  复古邮票: 'text-orange-600 bg-orange-50',
  夜景梦幻: 'text-violet-600 bg-violet-50',
  卡通治愈: 'text-rose-600 bg-rose-50',
  敦煌映像: 'text-amber-600 bg-amber-50',
  禅意留白: 'text-slate-600 bg-slate-100',
}

export const postcardStatusMeta: Record<PostcardWork['status'], string> = {
  已生成: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  生成中: 'text-amber-600 bg-amber-50 border-amber-200',
  已分享: 'text-blue-600 bg-blue-50 border-blue-200',
}

export const postcardStyles: PostcardStyle[] = [
  { id: 'ps1', name: '国风插画', cover: '/spot-fangong.png', usage: 486, status: '已上线' },
  { id: 'ps2', name: '清新水彩', cover: '/banner-landscape.png', usage: 352, status: '已上线' },
  { id: 'ps3', name: '复古邮票', cover: '/rec-oldtown.png', usage: 214, status: '已上线' },
  { id: 'ps4', name: '夜景梦幻', cover: '/rec-night.png', usage: 168, status: '已上线' },
  { id: 'ps5', name: '卡通治愈', cover: '/spot-tancheng.png', usage: 106, status: '已下线' },
  { id: 'ps6', name: '敦煌映像', cover: '/spot-dafo.png', usage: 98, status: '已上线' },
  { id: 'ps7', name: '禅意留白', cover: '/spot-xiangfu.png', usage: 67, status: '已上线' },
]

export const postcardWorks: PostcardWork[] = [
  { id: 'pc1', title: '灵山礼佛纪念', spot: '灵山大佛', spotImage: '/spot-dafo.png', style: '国风插画', styleTone: postcardStyleTone['国风插画'], creator: '游客-王先生', likes: 328, downloads: 96, status: '已分享', createdAt: '2025-07-10 10:24' },
  { id: 'pc2', title: '梵宫琉璃之美', spot: '灵山梵宫', spotImage: '/spot-fangong.png', style: '清新水彩', styleTone: postcardStyleTone['清新水彩'], creator: '游客-李女士', likes: 265, downloads: 82, status: '已生成', createdAt: '2025-07-10 09:48' },
  { id: 'pc3', title: '九龙灌浴瞬间', spot: '九龙灌浴', spotImage: '/spot-jiulong.png', style: '夜景梦幻', styleTone: postcardStyleTone['夜景梦幻'], creator: '游客-张同学', likes: 198, downloads: 54, status: '已生成', createdAt: '2025-07-10 11:12' },
  { id: 'pc4', title: '坛城印象', spot: '五印坛城', spotImage: '/spot-tancheng.png', style: '复古邮票', styleTone: postcardStyleTone['复古邮票'], creator: '游客-陈先生', likes: 142, downloads: 38, status: '已生成', createdAt: '2025-07-09 14:30' },
  { id: 'pc5', title: '禅寺清晨', spot: '祥符禅寺', spotImage: '/spot-xiangfu.png', style: '国风插画', styleTone: postcardStyleTone['国风插画'], creator: '游客-赵女士', likes: 116, downloads: 27, status: '已生成', createdAt: '2025-07-09 11:20' },
  { id: 'pc6', title: '阿育王柱剪影', spot: '阿育王柱', spotImage: '/spot-ayuwang.png', style: '卡通治愈', styleTone: postcardStyleTone['卡通治愈'], creator: '游客-孙同学', likes: 88, downloads: 19, status: '已生成', createdAt: '2025-07-09 15:40' },
  { id: 'pc7', title: '梵宫飞天壁画', spot: '灵山梵宫', spotImage: '/spot-fangong.png', style: '敦煌映像', styleTone: postcardStyleTone['敦煌映像'], creator: '游客-周女士', likes: 156, downloads: 43, status: '已分享', createdAt: '2025-07-10 08:30' },
  { id: 'pc8', title: '灵山·空寂', spot: '灵山大佛', spotImage: '/spot-dafo.png', style: '禅意留白', styleTone: postcardStyleTone['禅意留白'], creator: '游客-吴先生', likes: 92, downloads: 31, status: '已生成', createdAt: '2025-07-10 10:05' },
  { id: 'pc9', title: '祥符禅意', spot: '祥符禅寺', spotImage: '/spot-xiangfu.png', style: '禅意留白', styleTone: postcardStyleTone['禅意留白'], creator: '游客-郑女士', likes: 64, downloads: 15, status: '已生成', createdAt: '2025-07-09 16:50' },
]

/* ---------- 数字人形象管理 ---------- */
export type DigitalAvatar = {
  id: string
  name: string
  image: string
  style: string
  voice: string
  languages: string[]
  scenes: string[]
  usage: number
  status: '使用中' | '待审核' | '已停用'
  updatedAt: string
}

export const avatarStats = [
  { key: 'total', label: '形象总数', value: '8', trend: { value: '2.0%', up: true }, icon: UserSquare, tint: 'text-blue-500 bg-blue-50' },
  { key: 'active', label: '使用中', value: '5', trend: { value: '1.5%', up: true }, icon: Video, tint: 'text-emerald-500 bg-emerald-50' },
  { key: 'interactions', label: '今日互动', value: '8,932', trend: { value: '6.7%', up: true }, icon: MessagesSquare, tint: 'text-orange-500 bg-orange-50' },
  { key: 'review', label: '待审核', value: '2', trend: { value: '1.0%', up: false }, icon: Activity, tint: 'text-amber-500 bg-amber-50' },
]

export const avatarStatusMeta: Record<DigitalAvatar['status'], string> = {
  使用中: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  待审核: 'text-amber-600 bg-amber-50 border-amber-200',
  已停用: 'text-muted-foreground bg-secondary border-border',
}

export const digitalAvatars: DigitalAvatar[] = [
  { id: 'av1', name: '灵儿', image: '/digital-human.png', style: '古风少女', voice: '温柔女声', languages: ['中', 'EN', '日'], scenes: ['首页导览', '景点讲解'], usage: 5820, status: '使用中', updatedAt: '2025-05-20 10:10' },
  { id: 'av2', name: '小灵', image: '/avatar.png', style: '活泼少年', voice: '青年男声', languages: ['中', 'EN'], scenes: ['便民服务', '智能问答'], usage: 3260, status: '使用中', updatedAt: '2025-05-19 17:30' },
  { id: 'av3', name: '禅心', image: '/spot-xiangfu.png', style: '禅意僧侣', voice: '沉稳男声', languages: ['中'], scenes: ['祈福讲解'], usage: 1480, status: '使用中', updatedAt: '2025-05-19 15:05' },
  { id: 'av4', name: '云裳', image: '/rec-family.png', style: '典雅女官', voice: '知性女声', languages: ['中', 'EN'], scenes: ['文化讲解'], usage: 960, status: '待审核', updatedAt: '2025-05-19 11:18' },
  { id: 'av5', name: '墨言', image: '/pagoda.png', style: '文人书生', voice: '磁性男声', languages: ['中', '日'], scenes: ['历史文化'], usage: 720, status: '待审核', updatedAt: '2025-05-18 16:42' },
  { id: 'av6', name: '福娃', image: '/rec-oldtown.png', style: '卡通吉祥物', voice: '童声', languages: ['中'], scenes: ['亲子导览'], usage: 340, status: '已停用', updatedAt: '2025-05-18 09:22' },
]

/* ---------- 个性化路线管理（AI 实时生成引擎） ---------- */
export const routeGenStats = [
  { key: 'today', label: '今日生成路线', value: '1,264', trend: { value: '7.5%', up: true }, icon: Route, tint: 'text-blue-500 bg-blue-50' },
  { key: 'pool', label: '���调度景点', value: '32', trend: { value: '2.0%', up: true }, icon: MapPin, tint: 'text-teal-500 bg-teal-50' },
  { key: 'success', label: '生成成功率', value: '99.2%', trend: { value: '0.6%', up: true }, icon: CheckCircle2, tint: 'text-emerald-500 bg-emerald-50' },
  { key: 'rating', label: '平均满意度', value: '4.8', trend: { value: '1.2%', up: true }, icon: Star, tint: 'text-amber-500 bg-amber-50' },
]

export const routeThemeTone: Record<string, string> = {
  经典必游: 'text-blue-600 bg-blue-50',
  祈福礼佛: 'text-orange-600 bg-orange-50',
  亲子研学: 'text-teal-600 bg-teal-50',
  摄影打卡: 'text-violet-600 bg-violet-50',
  无障碍: 'text-emerald-600 bg-emerald-50',
}

// AI 路线生成的时长档位与可选主题标签
export const routeDurationOptions = ['2小时轻松游', '半日游', '一日游'] as const
export const routeThemeOptions = ['经典必游', '祈福礼佛', '亲子研学', '摄影打卡', '无障碍'] as const

// AI 生成规则（约束）开关
export type RouteRule = { key: string; label: string; enabled: boolean }
export const routeGenRules: RouteRule[] = [
  { key: 'avoidClosed', label: '自动避开维护中/已关闭的景点', enabled: true },
  { key: 'accessibility', label: '无障碍优先，规划轮椅友好路径', enabled: true },
  { key: 'limitWalk', label: '控制单程步行距离（≤ 5 km）', enabled: true },
  { key: 'insertRest', label: '智能插入餐饮与休息点', enabled: true },
  { key: 'peakAvoid', label: '高峰时段错峰推荐', enabled: false },
]

// 可被 AI 调度的景点池（是否允许纳入生成）
export type RouteSpot = { id: string; name: string; category: string; enabled: boolean }
export const routeSpotPool: RouteSpot[] = [
  { id: 'rp1', name: '灵山大佛', category: '标志景点', enabled: true },
  { id: 'rp2', name: '九龙灌浴', category: '文化演艺', enabled: true },
  { id: 'rp3', name: '灵山梵宫', category: '标志景点', enabled: true },
  { id: 'rp4', name: '五印坛城', category: '文化建筑', enabled: true },
  { id: 'rp5', name: '祥符禅寺', category: '宗教建筑', enabled: true },
  { id: 'rp6', name: '阿育王柱', category: '文化地标', enabled: true },
  { id: 'rp7', name: '太湖景观带', category: '自然景观', enabled: true },
  { id: 'rp8', name: '文创中心', category: '商业配套', enabled: false },
]

// 近期游客发起、AI 实时生成的路线记录
export type RouteGenRecord = {
  id: string
  visitor: string
  duration: string
  theme: string
  themeTone: string
  crowd: string // 人群偏好
  spots: string[]
  latency: string // 生成用时
  status: '成功' | '生成中' | '失败'
  rating: number | null
  time: string
}

export const routeGenStatusMeta: Record<RouteGenRecord['status'], string> = {
  成功: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  生成中: 'text-amber-600 bg-amber-50 border-amber-200',
  失败: 'text-rose-600 bg-rose-50 border-rose-200',
}

export const routeGenRecords: RouteGenRecord[] = [
  { id: 'gr1', visitor: '游客-王**', duration: '一日游', theme: '经典必游', themeTone: routeThemeTone['经典必游'], crowd: '家庭亲子', spots: ['灵山大佛', '九龙灌浴', '灵山梵宫', '五印坛城', '祥符禅寺'], latency: '2.1s', status: '成功', rating: 5, time: '2025-05-20 10:34' },
  { id: 'gr2', visitor: '游客-李**', duration: '半日游', theme: '祈福礼佛', themeTone: routeThemeTone['祈福礼佛'], crowd: '中老年', spots: ['祥符禅寺', '灵山大佛', '九龙灌浴'], latency: '1.8s', status: '成功', rating: 5, time: '2025-05-20 10:20' },
  { id: 'gr3', visitor: '游客-张**', duration: '2小时轻���游', theme: '摄影打卡', themeTone: routeThemeTone['摄影打卡'], crowd: '摄影爱好者', spots: ['灵山梵宫', '五印坛城', '太湖景观带'], latency: '1.6s', status: '生成中', rating: null, time: '2025-05-20 10:12' },
  { id: 'gr4', visitor: '游客-陈**', duration: '半日游', theme: '亲子研学', themeTone: routeThemeTone['亲子研学'], crowd: '家庭亲子', spots: ['灵山梵宫', '五印坛城', '九龙灌浴', '灵山大佛'], latency: '2.0s', status: '成功', rating: 4, time: '2025-05-20 09:52' },
  { id: 'gr5', visitor: '游客-刘**', duration: '半日游', theme: '无障碍', themeTone: routeThemeTone['无障碍'], crowd: '轮椅出行', spots: ['游客中心', '灵山大佛', '九龙灌浴', '灵山梵宫'], latency: '1.9s', status: '成功', rating: 5, time: '2025-05-20 09:33' },
  { id: 'gr6', visitor: '游客-赵**', duration: '一日游', theme: '经典必游', themeTone: routeThemeTone['经典必游'], crowd: '年轻情侣', spots: ['灵山大佛', '灵山梵宫', '五印坛城'], latency: '—', status: '失败', rating: null, time: '2025-05-20 09:18' },
  { id: 'gr7', visitor: '游客-孙**', duration: '2小时轻松游', theme: '摄影打卡', themeTone: routeThemeTone['摄影打卡'], crowd: '摄影爱好者', spots: ['灵山大佛', '太湖景观带', '阿育王柱'], latency: '1.7s', status: '成功', rating: 4, time: '2025-05-20 08:56' },
]

/* ---------- 游客感受度���告 ---------- */
export const satisfactionStats = [
  { key: 'score', label: '综合满意度', value: '96.4%', trend: { value: '2.6%', up: true }, icon: Smile, tint: 'text-emerald-500 bg-emerald-50' },
  { key: 'reviews', label: '评价总数', value: '8,642', trend: { value: '5.3%', up: true }, icon: MessageSquareQuote, tint: 'text-blue-500 bg-blue-50' },
  { key: 'nps', label: '净推荐值 NPS', value: '72', trend: { value: '3.1%', up: true }, icon: ThumbsUp, tint: 'text-teal-500 bg-teal-50' },
  { key: 'negative', label: '待改进反馈', value: '213', trend: { value: '1.4%', up: false }, icon: Frown, tint: 'text-rose-500 bg-rose-50' },
]

export type SentimentDist = { name: string; count: number; color: string; icon: LucideIcon }
export const sentimentDist: SentimentDist[] = [
  { name: '好评', count: 7136, color: 'var(--chart-3)', icon: Smile },
  { name: '中评', count: 1293, color: 'oklch(0.72 0.13 60)', icon: Meh },
  { name: '差评', count: 213, color: 'var(--chart-4)', icon: Frown },
]

export const satisfactionTrend = [
  { label: '第1周', score: 92.1 },
  { label: '第2周', score: 93.4 },
  { label: '第3周', score: 94.2 },
  { label: '第4周', score: 93.8 },
  { label: '第5周', score: 95.6 },
  { label: '第6周', score: 96.4 },
]

export type DimensionScore = { name: string; score: number }
export const dimensionScores: DimensionScore[] = [
  { name: '讲解质量', score: 97 },
  { name: '路线合理性', score: 94 },
  { name: '便民服务', score: 92 },
  { name: '数字人体验', score: 95 },
  { name: '环境卫生', score: 96 },
  { name: '标识指引', score: 89 },
]

export type ReviewItem = {
  id: string
  visitor: string
  sentiment: '好评' | '中评' | '差评'
  content: string
  module: string
  rating: number
  time: string
}

export const sentimentTone: Record<ReviewItem['sentiment'], string> = {
  好评: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  中评: 'text-amber-600 bg-amber-50 border-amber-200',
  差评: 'text-rose-600 bg-rose-50 border-rose-200',
}

export const reviewList: ReviewItem[] = [
  { id: 'rv1', visitor: '王**', sentiment: '好评', content: '数字人灵儿讲解特别生动，灵山大佛的历史讲得很清楚，孩子听得津津有味！', module: '景点讲解', rating: 5, time: '2025-05-20 10:12' },
  { id: 'rv2', visitor: '李**', sentiment: '好评', content: '路线推荐很贴心，半天就把主要景点逛完了，不走回头路。', module: '个性化路线', rating: 5, time: '2025-05-20 09:33' },
  { id: 'rv3', visitor: '张**', sentiment: '中评', content: '整体不错，就是高峰期卫生间排队有点久，希望增加指引。', module: '便民服务', rating: 3, time: '2025-05-19 16:20' },
  { id: 'rv4', visitor: '陈**', sentiment: '好评', content: 'AI明信片太惊艳了，国风插画风格拍出来很有纪念意义。', module: 'AI明信片', rating: 5, time: '2025-05-19 14:48' },
  { id: 'rv5', visitor: '刘**', sentiment: '差评', content: '部分区域标识不够清晰，第一次来容易走错方向。', module: '标识指引', rating: 2, time: '2025-05-19 11:15' },
  { id: 'rv6', visitor: '赵**', sentiment: '好评', content: '梵宫的讲解配合音乐氛围感很强，体验很棒。', module: '景点讲解', rating: 5, time: '2025-05-18 15:40' },
  { id: 'rv7', visitor: '孙**', sentiment: '中评', content: '智能问答大部分能答上来，个别冷门问题还需完善。', module: '智能问答', rating: 4, time: '2025-05-18 10:22' },
]

/* ---------- 游客行为分析 ---------- */
export const behaviorStats = [
  { key: 'active', label: '今日活跃游客', value: '12,486', trend: { value: '6.8%', up: true }, icon: UserCheck, tint: 'text-blue-500 bg-blue-50' },
  { key: 'duration', label: '人均停留时长', value: '3.2h', trend: { value: '2.4%', up: true }, icon: Timer, tint: 'text-teal-500 bg-teal-50' },
  { key: 'plays', label: '讲解收听次数', value: '38,920', trend: { value: '7.1%', up: true }, icon: Navigation, tint: 'text-orange-500 bg-orange-50' },
  { key: 'return', label: '功能复用率', value: '64.5%', trend: { value: '1.9%', up: true }, icon: Repeat, tint: 'text-violet-500 bg-violet-50' },
]

export const hourlyTraffic = [
  { label: '08', value: 620 },
  { label: '09', value: 1480 },
  { label: '10', value: 2360 },
  { label: '11', value: 2180 },
  { label: '12', value: 1520 },
  { label: '13', value: 1680 },
  { label: '14', value: 2540 },
  { label: '15', value: 2320 },
  { label: '16', value: 1760 },
  { label: '17', value: 940 },
]

export type FunnelStep = { name: string; value: number; pct: number }
export const behaviorFunnel: FunnelStep[] = [
  { name: '进入系统', value: 12486, pct: 100 },
  { name: '浏览景点', value: 10820, pct: 87 },
  { name: '收听讲解', value: 8640, pct: 69 },
  { name: '使用路线/服务', value: 5210, pct: 42 },
  { name: '生成明信片', value: 1326, pct: 11 },
]

export type ChannelStat = { name: string; count: number; color: string }
export const entryChannels: ChannelStat[] = [
  { name: '扫码入园', count: 5820, color: 'var(--chart-1)' },
  { name: '小程序', count: 3960, color: 'var(--chart-3)' },
  { name: '现场终端', count: 1680, color: 'var(--chart-2)' },
  { name: '其他', count: 1026, color: 'oklch(0.72 0.13 60)' },
]

export type DeviceStat = { name: string; pct: number }
export const deviceDist: DeviceStat[] = [
  { name: 'iOS', pct: 52 },
  { name: 'Android', pct: 41 },
  { name: '现场大屏', pct: 7 },
]

export type FeatureUsage = { name: string; count: number; pct: number }
export const featureUsage: FeatureUsage[] = [
  { name: '景点讲解', count: 38920, pct: 100 },
  { name: '智能问答', count: 24680, pct: 63 },
  { name: '便民服务', count: 18240, pct: 47 },
  { name: '个性化路线', count: 12360, pct: 32 },
  { name: 'AI明信片', count: 6420, pct: 16 },
]

/* ---------- 数据大屏 ---------- */
export const screenKpis = [
  { key: 'visitors', label: '今日入园人数', value: '12,045', unit: '人', icon: Users },
  { key: 'guide', label: '导览调用次数', value: '8,432', unit: '次', icon: Navigation },
  { key: 'plays', label: '讲解播放次数', value: '5,621', unit: '次', icon: MonitorPlay },
  { key: 'satisfaction', label: '综合满意度', value: '4.8', unit: '/5', icon: ThumbsUp },
  { key: 'postcard', label: 'AI明信片生成', value: '2,350', unit: '张', icon: Camera },
  { key: 'served', label: '累计服务游客', value: '1,128', unit: '万', icon: UserCheck },
]

// 游客趋势分析（近7天）：入园人数 + 导览调用
export const screenWeekTrend = [
  { label: '周一', visitors: 8620, guide: 5210 },
  { label: '周二', visitors: 7980, guide: 4860 },
  { label: '周三', visitors: 9240, guide: 6120 },
  { label: '周四', visitors: 8760, guide: 5680 },
  { label: '周五', visitors: 10680, guide: 7020 },
  { label: '周六', visitors: 13860, guide: 9240 },
  { label: '周日', visitors: 12045, guide: 8432 },
]

// 功能使用占比（环形图，中心显示总调用数）
export const screenFuncUsage = [
  { name: '智能问答', value: 10180, color: 'var(--chart-1)' },
  { name: '景点讲解', value: 7080, color: 'var(--chart-3)' },
  { name: '个性化路线', value: 4660, color: 'var(--chart-2)' },
  { name: '便民服务', value: 2916, color: 'oklch(0.72 0.13 60)' },
  { name: 'AI明信片DIY', value: 2026, color: 'var(--chart-5)' },
  { name: '其他', value: 1714, color: 'oklch(0.6 0.03 260)' },
]

// 游客地域分布（省份短名需与 china.geojson 的 properties.name 对应）
export const screenRegionDist: { name: string; value: number }[] = [
  { name: '江苏', value: 3860 },
  { name: '上海', value: 2540 },
  { name: '浙江', value: 2180 },
  { name: '安徽', value: 1420 },
  { name: '广东', value: 1160 },
  { name: '山东', value: 980 },
  { name: '北京', value: 760 },
  { name: '河南', value: 640 },
  { name: '福建', value: 520 },
  { name: '湖北', value: 480 },
  { name: '四川', value: 360 },
  { name: '湖南', value: 300 },
]

export const screenHotSpots = [
  { name: '灵山大佛', value: 4820, pct: 100 },
  { name: '九龙灌浴', value: 3960, pct: 82 },
  { name: '灵山梵宫', value: 3510, pct: 73 },
  { name: '五印坛城', value: 2680, pct: 56 },
  { name: '祥符禅寺', value: 1940, pct: 40 },
]

export const screenAgeDist = [
  { name: '18岁以下', count: 1240, color: 'var(--chart-2)' },
  { name: '18-30岁', count: 4180, color: 'var(--chart-1)' },
  { name: '31-45岁', count: 3860, color: 'var(--chart-3)' },
  { name: '46-60岁', count: 2260, color: 'oklch(0.72 0.13 60)' },
  { name: '60岁以上', count: 946, color: 'var(--chart-4)' },
]

// 性别分布（环形图）
export const screenGenderDist = [
  { name: '女性', count: 6820, color: 'var(--chart-1)' },
  { name: '男性', count: 5666, color: 'var(--chart-3)' },
]

export const screenLiveEvents = [
  { id: 'e1', text: '游客王先生在「灵山大佛」收听讲解', time: '刚刚' },
  { id: 'e2', text: '数字人灵儿完成一次智能问答', time: '2秒前' },
  { id: 'e3', text: '游客李女士生成国风插画明信片', time: '5秒前' },
  { id: 'e4', text: '「祈福礼佛半日游」路线被使用', time: '11秒前' },
  { id: 'e5', text: '东侧卫生间服务引导 +1', time: '18秒前' },
  { id: 'e6', text: '游客提交一条好评（景点讲解）', time: '24秒前' },
  { id: 'e7', text: '南门游客中心咨询 +1', time: '31秒前' },
]

/* ---------- 角色权限管理 ---------- */
export const roleStats = [
  { key: 'roles', label: '角色总数', value: '6', trend: { value: '1.0%', up: true }, icon: ShieldCheck, tint: 'text-blue-500 bg-blue-50' },
  { key: 'members', label: '关联成员', value: '38', trend: { value: '4.2%', up: true }, icon: Users, tint: 'text-emerald-500 bg-emerald-50' },
  { key: 'perms', label: '权限项', value: '54', trend: { value: '2.0%', up: true }, icon: Key, tint: 'text-teal-500 bg-teal-50' },
  { key: 'custom', label: '自定义角色', value: '3', trend: { value: '1.0%', up: true }, icon: UserCog, tint: 'text-violet-500 bg-violet-50' },
]

export type PermModule = { key: string; label: string }
export const permModules: PermModule[] = [
  { key: 'knowledge', label: '知识库管理' },
  { key: 'qa', label: '智能问答' },
  { key: 'guide', label: '景点讲解' },
  { key: 'route', label: '个性化路线' },
  { key: 'service', label: '便民服务' },
  { key: 'postcard', label: 'AI明信片' },
  { key: 'avatar', label: '数字人形象' },
  { key: 'analytics', label: '数据分析' },
  { key: 'system', label: '系统管理' },
]

export type AdminRole = {
  id: string
  name: string
  desc: string
  tone: string
  members: number
  builtIn: boolean
  status: '启用' | '停用'
  perms: Record<string, 'full' | 'edit' | 'view' | 'none'>
}

export const roleTone: Record<string, string> = {
  超级管理员: 'text-rose-600 bg-rose-50',
  内容运营: 'text-blue-600 bg-blue-50',
  数据分析师: 'text-teal-600 bg-teal-50',
  客服专员: 'text-orange-600 bg-orange-50',
  讲解编辑: 'text-violet-600 bg-violet-50',
  访客只读: 'text-slate-600 bg-slate-100',
}

const allFull = Object.fromEntries(permModules.map((m) => [m.key, 'full'])) as AdminRole['perms']

export const adminRoles: AdminRole[] = [
  {
    id: 'ro1', name: '超级管理员', desc: '拥有系统全部功能与配置权限', tone: roleTone['超级管理员'], members: 3, builtIn: true, status: '启用',
    perms: allFull,
  },
  {
    id: 'ro2', name: '内容运营', desc: '负责知识库、问答与讲解内容维护', tone: roleTone['内容运营'], members: 12, builtIn: true, status: '启用',
    perms: { knowledge: 'full', qa: 'full', guide: 'edit', route: 'edit', service: 'edit', postcard: 'view', avatar: 'view', analytics: 'view', system: 'none' },
  },
  {
    id: 'ro3', name: '数据分析师', desc: '查看并导出各类运营数据报表', tone: roleTone['数据分析师'], members: 5, builtIn: true, status: '启用',
    perms: { knowledge: 'view', qa: 'view', guide: 'view', route: 'view', service: 'view', postcard: 'view', avatar: 'view', analytics: 'full', system: 'none' },
  },
  {
    id: 'ro4', name: '客服专员', desc: '处理游客反馈与常见问题答复', tone: roleTone['客服专员'], members: 8, builtIn: false, status: '启用',
    perms: { knowledge: 'view', qa: 'edit', guide: 'view', route: 'view', service: 'edit', postcard: 'none', avatar: 'none', analytics: 'view', system: 'none' },
  },
  {
    id: 'ro5', name: '讲解编辑', desc: '维护景点讲解词与数字人内容', tone: roleTone['讲解编辑'], members: 7, builtIn: false, status: '启用',
    perms: { knowledge: 'edit', qa: 'view', guide: 'full', route: 'view', service: 'none', postcard: 'view', avatar: 'edit', analytics: 'none', system: 'none' },
  },
  {
    id: 'ro6', name: '访客只读', desc: '仅可浏览后台数据，不可修改', tone: roleTone['访客只读'], members: 3, builtIn: false, status: '停用',
    perms: { knowledge: 'view', qa: 'view', guide: 'view', route: 'view', service: 'view', postcard: 'view', avatar: 'view', analytics: 'view', system: 'none' },
  },
]

export const permLevelMeta: Record<'full' | 'edit' | 'view' | 'none', { label: string; tone: string }> = {
  full: { label: '完全', tone: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  edit: { label: '编辑', tone: 'text-blue-600 bg-blue-50 border-blue-200' },
  view: { label: '查看', tone: 'text-amber-600 bg-amber-50 border-amber-200' },
  none: { label: '无', tone: 'text-muted-foreground bg-secondary border-border' },
}

/* ---------- 系统设置 ---------- */
export type SettingsSection = { key: string; label: string; icon: LucideIcon }
export const settingsSections: SettingsSection[] = [
  { key: 'basic', label: '基础信息', icon: Info },
  { key: 'ai', label: 'AI 服务', icon: Sparkles },
  { key: 'notify', label: '通知设置', icon: Bell },
  { key: 'appearance', label: '外观与语言', icon: Palette },
  { key: 'security', label: '安全策略', icon: Lock },
  { key: 'system', label: '系统与存储', icon: Server },
]

/* ---------- 日志管理 ---------- */
export const logStats = [
  { key: 'today', label: '今日日志', value: '1,284', trend: { value: '3.5%', up: true }, icon: ScrollText, tint: 'text-blue-500 bg-blue-50' },
  { key: 'login', label: '登录记录', value: '386', trend: { value: '2.1%', up: true }, icon: LogIn, tint: 'text-emerald-500 bg-emerald-50' },
  { key: 'ops', label: '操作记录', value: '842', trend: { value: '4.7%', up: true }, icon: FilePenLine, tint: 'text-teal-500 bg-teal-50' },
  { key: 'warn', label: '异常告警', value: '9', trend: { value: '1.2%', up: false }, icon: ShieldAlert, tint: 'text-rose-500 bg-rose-50' },
]

export type LogLevel = '信息' | '警告' | '错误'
export const logLevelMeta: Record<LogLevel, { tone: string; icon: LucideIcon }> = {
  信息: { tone: 'text-blue-600 bg-blue-50 border-blue-200', icon: Info },
  警告: { tone: 'text-amber-600 bg-amber-50 border-amber-200', icon: AlertTriangle },
  错误: { tone: 'text-rose-600 bg-rose-50 border-rose-200', icon: ShieldAlert },
}

export type LogType = '登录' | '操作' | '系统'
export const logTypeIcon: Record<LogType, LucideIcon> = {
  登录: LogIn,
  操作: FilePenLine,
  系统: Server,
}

export type LogEntry = {
  id: string
  time: string
  user: string
  type: LogType
  level: LogLevel
  action: string
  ip: string
}

export const logEntries: LogEntry[] = [
  { id: 'lg1', time: '2025-05-20 10:32:18', user: 'admin', type: '操作', level: '信息', action: '上传知识文档《灵境景区历史文化概述.pdf》', ip: '10.12.3.21' },
  { id: 'lg2', time: '2025-05-20 10:28:04', user: 'zhangwei', type: '登录', level: '信息', action: '登录后台管理系统', ip: '10.12.3.45' },
  { id: 'lg3', time: '2025-05-20 10:15:53', user: 'liyun', type: '操作', level: '信息', action: '编辑 FAQ 条目「景区开放时间」', ip: '10.12.3.52' },
  { id: 'lg4', time: '2025-05-20 09:58:37', user: 'system', type: '系统', level: '警告', action: '向量化任务队列积压超过阈值（18 条待处理）', ip: '-' },
  { id: 'lg5', time: '2025-05-20 09:41:12', user: 'chenlei', type: '操作', level: '信息', action: '发布个性化路线「灵山经典一日游」', ip: '10.12.3.61' },
  { id: 'lg6', time: '2025-05-20 09:22:45', user: 'unknown', type: '登录', level: '错误', action: '登录失败：密码错误（连续 3 次）', ip: '124.72.10.88' },
  { id: 'lg7', time: '2025-05-20 08:55:20', user: 'system', type: '系统', level: '信息', action: '每日数据备份完���', ip: '-' },
  { id: 'lg8', time: '2025-05-20 08:40:09', user: 'liuyang', type: '操作', level: '信息', action: '回复游客反馈工单 #20482', ip: '10.12.3.77' },
  { id: 'lg9', time: '2025-05-20 08:31:56', user: 'sunhui', type: '操作', level: '警告', action: '尝试删除受保护的知识分类「历史文化」被拦截', ip: '10.12.3.80' },
  { id: 'lg10', time: '2025-05-20 08:12:33', user: 'zhaomin', type: '登录', level: '信息', action: '登录后台管理系统', ip: '10.12.3.90' },
]
