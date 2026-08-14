import {
  MessageSquareText,
  Headphones,
  MapPin,
  HeartHandshake,
  FileText,
  Images,
  Signpost,
  Toilet,
  Clock,
  Image as ImageIcon,
  Home,
  Landmark,
  Flag,
  Timer,
  Hourglass,
  BookOpen,
  Building2,
  Users,
  Volume2,
  AlignLeft,
  Mic,
  Sparkles,
  Waves,
  Utensils,
  LogOut,
  Cross,
  Info,
  Briefcase,
  Accessibility,
  ParkingSquare,
  DoorOpen,
  Baby,
  Armchair,
  Droplet,
  ConciergeBell,
  PackageOpen,
  UserRound,
  Trash2,
  Stamp,
  Moon,
  Smile,
  BookMarked,
  type LucideIcon,
} from 'lucide-react'

export type ServiceItem = {
  title: string
  description: string
  icon: LucideIcon
  iconBg: string
  iconColor: string
  href?: string
}

export const services: ServiceItem[] = [
  {
    title: '智能问答',
    description: '随时咨询历史文化、开放时间、游玩建议',
    icon: MessageSquareText,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-500',
    href: '/qa',
  },
  {
    title: '景点讲解',
    description: '沉浸式听数字人讲解景点故事',
    icon: Headphones,
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-500',
    href: '/guide',
  },
  {
    title: '个性化路线',
    description: '根据时间和兴趣生成专属路线',
    icon: MapPin,
    iconBg: 'bg-violet-100',
    iconColor: 'text-violet-500',
    href: '/route',
  },
  {
    title: '便民服务',
    description: '查找卫生间、餐饮、出口、医务室',
    icon: HeartHandshake,
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-500',
    href: '/service',
  },
  {
    title: '游客反馈',
    description: '提交建议与评价，获取服务补救',
    icon: FileText,
    iconBg: 'bg-sky-100',
    iconColor: 'text-sky-500',
    href: '/feedback',
  },
  {
    title: 'AI明信片DIY',
    description: '生成专属景区纪念明信片',
    icon: Images,
    iconBg: 'bg-teal-100',
    iconColor: 'text-teal-500',
    href: '/postcard',
  },
]

export type Recommendation = {
  title: string
  subtitle: string
  image: string
}

export const recommendations: Recommendation[] = [
  {
    title: '古镇精华路线',
    subtitle: '人文古韵深度游',
    image: '/rec-oldtown.png',
  },
  {
    title: '亲子游推荐',
    subtitle: '寓教于乐 欢乐同行',
    image: '/rec-family.png',
  },
  {
    title: '夜游打卡点',
    subtitle: '璀璨夜景 不容错过',
    image: '/rec-night.png',
  },
]

export type Announcement = {
  title: string
  detail: string
  color: string
}

export const announcements: Announcement[] = [
  {
    title: '观景台开放中',
    detail: '08:00-18:00 正常开放',
    color: 'text-emerald-500',
  },
  {
    title: '夜游灯光秀 19:30 开始',
    detail: '精彩表演 不见不散',
    color: 'text-violet-500',
  },
  {
    title: '游客中心服务热线',
    detail: '400-123-4567',
    color: 'text-blue-500',
  },
]

export type QuickAccessItem = {
  label: string
  icon: LucideIcon
  iconColor: string
  href: string
}

export const quickAccess: QuickAccessItem[] = [
  { label: '帮我推荐路线', icon: Signpost, iconColor: 'text-blue-500', href: '/route' },
  { label: '附近卫生间', icon: Toilet, iconColor: 'text-emerald-500', href: '/service' },
  { label: '景区开放时间', icon: Clock, iconColor: 'text-orange-500', href: '/qa' },
  { label: '制作一张明信片', icon: ImageIcon, iconColor: 'text-violet-500', href: '/postcard' },
]

/* ---------- 侧边导航 ---------- */
export type NavItem = {
  key: string
  label: string
  icon: LucideIcon
  href: string
}

export const navItems: NavItem[] = [
  { key: 'home', label: '首页', icon: Home, href: '/' },
  { key: 'qa', label: '智能问答', icon: MessageSquareText, href: '/qa' },
  { key: 'guide', label: '景点讲解', icon: Landmark, href: '/guide' },
  { key: 'route', label: '个性化路线', icon: Flag, href: '/route' },
  { key: 'service', label: '便民服务', icon: HeartHandshake, href: '/service' },
  { key: 'feedback', label: '游客反馈', icon: FileText, href: '/feedback' },
  { key: 'postcard', label: '明信片DIY', icon: Images, href: '/postcard' },
]

/* ---------- 智能问答页面 ---------- */
export const quickQuestionGroups: string[][] = [
  ['景区有什么历史故事？', '灵山大佛有多高？', '九龙灌浴几点表演？', '门票多少钱？', '适合带老人游览吗？'],
  ['灵山梵宫有什么特点？', '附近有餐厅吗？', '可以带宠物吗？', '学生票有优惠吗？', '景区有行李寄存吗？'],
  ['五印坛城怎么去？', '灵山胜境开放时间？', '有什么特色美食？', '哪里拍照最好看？', '轮椅可以入园吗？'],
  ['百子戏弥勒在哪？', '拈花湾有什么玩的？', '停车场收费吗？', '有导游讲解服务吗？', '晚上有夜游项目吗？'],
  ['最近有什么活动？', '素斋在哪里吃？', '景区地图怎么获取？', '可以现场买票吗？', '游玩需要多久？'],
]

export type ChatMessage = {
  id: number
  role: 'user' | 'assistant'
  time: string
  paragraphs: string[]
}

export const chatMessages: ChatMessage[] = [
  {
    id: 1,
    role: 'user',
    time: '10:30',
    paragraphs: ['这个景区最有名的景点是什么？'],
  },
  {
    id: 2,
    role: 'assistant',
    time: '10:30',
    paragraphs: [
      '景区最有名的景点是“云栖古塔”。',
      '云栖古塔始建于唐代，距今已有1200多年的历史，是景区的标志性建筑。',
      '塔身七层八角，结构精巧，登塔远眺可将整个景区及周边山水尽收眼底。',
      '古塔见证了历史变迁，承载着丰富的文化内涵，是游客必打卡的景点。',
    ],
  },
]

export type Source = {
  title: string
  updatedAt: string
}

export const sources: Source[] = [
  { title: '景区官方介绍', updatedAt: '更新于 2024-03-01' },
  { title: '云栖古塔景点讲解词', updatedAt: '更新于 2024-04-15' },
  { title: '景区历史文化资料汇编', updatedAt: '更新于 2023-12-20' },
]

export type HistoryItem = {
  id: number
  question: string
  answer: string
  date: string
}

export const chatHistory: HistoryItem[] = [
  {
    id: 1,
    question: '这个景区最有名的景点是什么？',
    answer: '景区最有名的景点是“云栖古塔”，始建于唐代，距今已有1200多年历史。',
    date: '2024-05-20 10:30',
  },
  {
    id: 2,
    question: '景区几点开放，几点闭园？',
    answer: '景区开放时间为 08:00—18:00，观景台正常开放，建议提前规划行程。',
    date: '2024-05-20 09:12',
  },
  {
    id: 3,
    question: '带小朋友有什么推荐的游玩路线？',
    answer: '推荐“亲子游”路线：儿童乐园 → 湖畔栈道 → 古塔登高，全程约2小时。',
    date: '2024-05-19 15:47',
  },
  {
    id: 4,
    question: '附近有卫生间和母婴室吗？',
    answer: '景区入口、观景台及游客中心均设有卫生间，游客中心配备母婴室。',
    date: '2024-05-19 14:05',
  },
]

export const bottomTags: string[] = [
  '开放时间',
  '门票价格',
  '停车场位置',
  '景区地图',
  '美食推荐',
]

/* ---------- 景点讲解页面 ---------- */
export type GuideSpot = {
  key: string
  name: string
  image: string
}

export const guideSpots: GuideSpot[] = [
  { key: 'dafo', name: '灵山大佛', image: '/spot-dafo.png' },
  { key: 'jiulong', name: '九龙灌浴', image: '/spot-jiulong.png' },
  { key: 'fangong', name: '灵山梵宫', image: '/spot-fangong.png' },
  { key: 'tancheng', name: '五印坛城', image: '/spot-tancheng.png' },
  { key: 'xiangfu', name: '祥符禅寺', image: '/spot-xiangfu.png' },
  { key: 'ayuwang', name: '阿育王柱', image: '/spot-ayuwang.png' },
]

export type GuideOption = {
  key: string
  label: string
  sublabel?: string
  icon: LucideIcon
}

export const guideDurations: GuideOption[] = [
  { key: 'quick', label: '30秒\n速览', icon: Clock },
  { key: 'standard', label: '3分钟\n标准', icon: Timer },
  { key: 'deep', label: '5分钟\n深度', icon: Hourglass },
]

export const guideStyles: GuideOption[] = [
  { key: 'history', label: '历史\n文化', icon: Landmark },
  { key: 'folklore', label: '民间\n故事', icon: BookOpen },
  { key: 'architecture', label: '建筑\n特色', icon: Building2 },
  { key: 'family', label: '亲子\n讲解', icon: Users },
]

export const guideTones: GuideOption[] = [
  { key: 'guide', label: '专业\n导游', icon: Mic },
  { key: 'friend', label: '亲切\n朋友', icon: Smile },
  { key: 'elder', label: '博学\n长者', icon: BookMarked },
]

export const currentGuide = {
  name: '灵山大佛',
  image: '/spot-dafo.png',
  paragraphs: [
    '灵山大佛坐落于无锡马山秦履峰南麓，是世界著名的青铜释迦牟尼佛立像。佛高88米，加上莲花座通高达101.5米，于1997年落成开光。',
    '大佛面相慈祥、造型庄严，右手施无畏印，左手施与愿印，寓意除却痛苦、给予快乐。登上莲花座俯瞰太湖山水，可静心感受佛教文化的宁静与庄严。',
  ],
  currentTime: '01:18',
  totalTime: '03:00',
  progress: 43,
}

export const guideHighlights: GuideOption[] = [
  { key: 'height', label: '高88米青铜立像', icon: Landmark },
  { key: 'year', label: '1997年落成开光', icon: Sparkles },
  { key: 'culture', label: '太湖佛教圣地', icon: Waves },
]

export type RecommendSpot = {
  name: string
  image: string
}

export const recommendSpots: RecommendSpot[] = [
  { name: '九龙灌浴', image: '/spot-jiulong.png' },
  { name: '灵山梵宫', image: '/spot-fangong.png' },
  { name: '五印坛城', image: '/spot-tancheng.png' },
  { name: '阿育王柱', image: '/spot-ayuwang.png' },
]

export const guideSummary = {
  spot: '灵山大佛',
  style: '历史文化',
  duration: '3分钟',
  status: '播放中',
}

export const guideQuestions: string[] = [
  '这个景点有什么历史故事？',
  '附近还有哪些值得看的？',
  '适合老人参观的路线有哪些？',
]

/* ---------- 个性化路线页面 ---------- */
export type RoutePrefOption = {
  key: string
  label: string
}

export type RoutePrefRow = {
  key: string
  title: string
  options: RoutePrefOption[]
  activeKey: string
}

export const routePrefs: RoutePrefRow[] = [
  {
    key: 'time',
    title: '游览时间',
    activeKey: 'half',
    options: [
      { key: '1h', label: '1小时' },
      { key: '2h', label: '2小时' },
      { key: 'half', label: '半天' },
      { key: 'full', label: '一天' },
    ],
  },
  {
    key: 'interest',
    title: '兴趣偏好',
    activeKey: 'culture',
    options: [
      { key: 'culture', label: '历史文化' },
      { key: 'nature', label: '自然风光' },
      { key: 'family', label: '亲子游' },
      { key: 'photo', label: '拍照打卡' },
    ],
  },
  {
    key: 'company',
    title: '同行人群',
    activeKey: 'family',
    options: [
      { key: 'solo', label: '一个人' },
      { key: 'couple', label: '情侣' },
      { key: 'family', label: '家庭' },
      { key: 'elder', label: '老人' },
    ],
  },
  {
    key: 'stamina',
    title: '体力情况',
    activeKey: 'normal',
    options: [
      { key: 'easy', label: '轻松' },
      { key: 'normal', label: '普通' },
      { key: 'deep', label: '深度' },
    ],
  },
  {
    key: 'entrance',
    title: '当前入口',
    activeKey: 'main',
    options: [
      { key: 'main', label: '胜境门楼' },
      { key: 'east', label: '东门' },
      { key: 'west', label: '西门' },
      { key: 'north', label: '北门' },
    ],
  },
]

export type RouteStop = {
  index: number
  name: string
  /* map pin position in percentages */
  x: number
  y: number
}

export const routeStops: RouteStop[] = [
  { index: 1, name: '胜境门楼', x: 15, y: 85 },
  { index: 2, name: '五印坛城', x: 15, y: 56 },
  { index: 3, name: '阿育王柱', x: 33, y: 40 },
  { index: 4, name: '九龙灌浴', x: 52, y: 25 },
  { index: 5, name: '祥符禅寺', x: 72, y: 24 },
  { index: 6, name: '灵山大佛', x: 85, y: 45 },
  { index: 7, name: '灵山梵宫', x: 65, y: 65 },
  { index: 8, name: '太湖广场', x: 42, y: 82 },
]

export type RouteStat = {
  key: string
  label: string
  value: string
  icon: LucideIcon
}

export const routeStats: RouteStat[] = [
  { key: 'time', label: '预计用时', value: '半天 · 约3小时', icon: Clock },
  { key: 'distance', label: '步行距离', value: '3.2 公里', icon: Waves },
  { key: 'crowd', label: '适合人群', value: '家庭 / 历史文化爱好者', icon: Users },
  { key: 'intensity', label: '路线强度', value: '适中', icon: Signpost },
]

export const routeReason =
  '该路线串联灵山胜境经典景点，兼顾礼佛祈福与文化观光，动线顺畅、体力适中，适合半日深度感受灵山佛教文化与太湖山水风貌。'

export type RouteHighlight = {
  key: string
  name: string
  desc: string
  image: string
}

export const routeHighlights: RouteHighlight[] = [
  { key: 'dafo', name: '灵山大佛', desc: '88米青铜立像', image: '/spot-dafo.png' },
  { key: 'jiulong', name: '九龙灌浴', desc: '大型音乐动态景观', image: '/spot-jiulong.png' },
  { key: 'fangong', name: '灵山梵宫', desc: '恢弘佛教艺术殿堂', image: '/spot-fangong.png' },
  { key: 'ayuwang', name: '阿育王柱', desc: '灵山胜境地标', image: '/spot-ayuwang.png' },
]

export type RouteAlt = {
  key: string
  name: string
  subtitle: string
  image: string
}

export const routeAlternatives: RouteAlt[] = [
  { key: 'family', name: '轻松亲子路线', subtitle: '亲子互动 · 轻松游览', image: '/LS-006.jpg' },
  { key: 'worship', name: '灵山礼佛路线', subtitle: '祈福礼佛 · 心灵之旅', image: '/LS-011.jpg' },
  { key: 'essence', name: '半日精华路线', subtitle: '深度体验 · 经典打卡', image: '/LS-013.jpg' },
  { key: 'night', name: '夜游梵宫路线', subtitle: '灯光夜景 · 梵音之夜', image: '/LS-013.jpg' },
]

export const routeSummary = {
  interest: '历史文化',
  duration: '半天',
  company: '家庭',
  advice: '优先游览灵山大佛与九龙灌浴',
}

export const routeQuestions: string[] = [
  '适合老人走的路线有哪些？',
  '可以避开人流吗？',
  '第一站有什么故事？',
]

/* ---------- 便民服务页面 ---------- */
export type ServiceCategory = {
  key: string
  label: string
  icon: LucideIcon
}

export const serviceCategories: ServiceCategory[] = [
  { key: 'toilet', label: '卫生间', icon: Toilet },
  { key: 'dining', label: '餐饮', icon: Utensils },
  { key: 'exit', label: '出口', icon: LogOut },
  { key: 'medical', label: '医务室', icon: Cross },
  { key: 'center', label: '游客中心', icon: Info },
  { key: 'lost', label: '失物招领', icon: Briefcase },
  { key: 'accessible', label: '无障碍路线', icon: Accessibility },
  { key: 'parking', label: '停车点', icon: ParkingSquare },
]

export type ServiceDetail = {
  title: string
  destName: string
  walkTime: string
  distance: string
  guide: string
  tags: { key: string; label: string; icon: LucideIcon; tone: 'open' | 'normal' }[]
  hours: string
}

export const serviceDetail: ServiceDetail = {
  title: '灵山大佛观景平台服务点',
  destName: '大佛脚下服务点\n（卫生间）',
  walkTime: '步行约3分钟',
  distance: '距离约180米',
  guide: '沿登云大道前行，经过百子戏弥勒后右转即可到达。',
  tags: [
    { key: 'open', label: '开放中', icon: DoorOpen, tone: 'open' },
    { key: 'accessible', label: '无障碍设施', icon: Accessibility, tone: 'normal' },
    { key: 'baby', label: '母婴间', icon: Baby, tone: 'normal' },
    { key: 'clean', label: '清洁状态 良好', icon: Sparkles, tone: 'normal' },
  ],
  hours: '06:00-22:00',
}

export type ServiceTip = {
  key: string
  label: string
  icon: LucideIcon
}

export const serviceTips: ServiceTip[] = [
  { key: 'rest', label: '附近休息区：香樟广场休息亭（约80米）', icon: Armchair },
  { key: 'water', label: '饮水点：卫生间旁有直饮水机', icon: Droplet },
  { key: 'peak', label: '高峰时段：10:30-14:00 可能较拥挤', icon: Users },
]

export type ServiceAction = {
  key: string
  label: string
  icon: LucideIcon
}

export const serviceActions: ServiceAction[] = [
  { key: 'dining', label: '帮我找最近餐饮', icon: Utensils },
  { key: 'exit', label: '离我最近的出口在哪？', icon: LogOut },
  { key: 'accessible', label: '需要无障碍路线', icon: Accessibility },
  { key: 'center', label: '帮我联系游客中心', icon: Info },
]

export type HotService = {
  key: string
  label: string
  icon: LucideIcon
  iconBg: string
  iconColor: string
}

export const hotServices: HotService[] = [
  { key: 'center', label: '游客中心', icon: Info, iconBg: 'bg-blue-100', iconColor: 'text-blue-500' },
  { key: 'medical', label: '医务室', icon: Cross, iconBg: 'bg-orange-100', iconColor: 'text-orange-500' },
  { key: 'exit', label: '最近出口', icon: LogOut, iconBg: 'bg-emerald-100', iconColor: 'text-emerald-500' },
  { key: 'accessible', label: '无障碍路线', icon: Accessibility, iconBg: 'bg-sky-100', iconColor: 'text-sky-500' },
  { key: 'lost', label: '失物招领', icon: Briefcase, iconBg: 'bg-teal-100', iconColor: 'text-teal-500' },
]

export const serviceSummary = {
  current: '卫生间',
  location: '大佛脚下服务点',
  distance: '约180米，步行约3分钟',
  status: '开放中（06:00-22:00）',
}

export const serviceQuestions: string[] = [
  '附近还有哪些卫生间？',
  '哪家餐饮离我最近？',
  '医务室怎么走？',
]

/* ---------- 游客反馈页面 ---------- */
export type FeedbackType = {
  key: string
  label: string
  icon: LucideIcon
}

export const feedbackTypes: FeedbackType[] = [
  { key: 'service', label: '景区服务', icon: ConciergeBell },
  { key: 'facility', label: '景区设施', icon: PackageOpen },
  { key: 'experience', label: '景点体验', icon: UserRound },
  { key: 'hygiene', label: '环境卫生', icon: Trash2 },
  { key: 'other', label: '其他建议', icon: Users },
]

export const ratingLabels: Record<number, string> = {
  1: '非常不满意',
  2: '不满意',
  3: '一般',
  4: '很满意',
  5: '非常满意',
}

export const feedbackFaqs: string[] = [
  '如何购票？',
  '开放时间？',
  '停车收费标准？',
]

export const feedbackContact = {
  phone: '400-123-4567',
  hours: '8:30-17:30',
}

/* ---------- 明信片DIY页面 ---------- */
export type PostcardStyle = {
  key: string
  label: string
  icon: LucideIcon
}

export const postcardStyles: PostcardStyle[] = [
  { key: 'guofeng', label: '国风插画', icon: Landmark },
  { key: 'watercolor', label: '清新水彩', icon: Droplet },
  { key: 'vintage', label: '复古邮票', icon: Stamp },
  { key: 'night', label: '夜景梦幻', icon: Moon },
  { key: 'cartoon', label: '卡通治愈', icon: Sparkles },
]

export type PostcardRecord = {
  key: string
  title: string
  spot: string
  style: string
  time: string
  image: string
}

export const postcardRecords: PostcardRecord[] = [
  {
    key: 'r1',
    title: '来自灵山的问候',
    spot: '灵山大佛',
    style: '国风插画',
    time: '2026.05.20 10:30',
    image: '/spot-dafo.png',
  },
  {
    key: 'r2',
    title: '梵宫的光记忆',
    spot: '灵山梵宫',
    style: '清新水彩',
    time: '2026.05.19 16:45',
    image: '/spot-fangong.png',
  },
  {
    key: 'r3',
    title: '九龙灌浴印记',
    spot: '九龙灌浴',
    style: '复古邮票',
    time: '2026.05.18 09:30',
    image: '/spot-jiulong.png',
  },
]

export const postcardHotSpots: string[] = [
  '灵山大佛',
  '灵山梵宫',
  '九龙灌浴',
  '五印坛城',
  '祥符禅寺',
  '阿育王柱',
]

export const postcardHotStyles: string[] = [
  '国风插画',
  '清新水彩',
  '复古邮票',
  '夜景梦幻',
  '卡通治愈',
]

export type PrintService = {
  key: string
  title: string
  desc: string
  icon: LucideIcon
}

export const printServices: PrintService[] = [
  {
    key: 'paper',
    title: '纸质明信片',
    desc: '高品质印刷，邮寄到家',
    icon: ImageIcon,
  },
  {
    key: 'stamp',
    title: '纪念邮戳',
    desc: '专属邮戳，盖章留念',
    icon: Stamp,
  },
  {
    key: 'pickup',
    title: '文创中心领取',
    desc: '景区文创中心现场领取',
    icon: PackageOpen,
  },
]

export const defaultPostcard = {
  title: '来自灵山的问候',
  message: '心有莲花，处处清凉。',
  signature: '游客小李',
  date: '2026-05-20',
}
