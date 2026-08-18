// 静态导出要求动态路由声明 generateStaticParams（route segment 配置只能在服务端组件中导出），
// 实际渲染逻辑在 ./placeholder（客户端组件）
import ConsolePlaceholder from './placeholder'

export const dynamicParams = false

export function generateStaticParams() {
  // 导航中的页面均有独立实现，此 catch-all 仅兜底未实现路径；
  // output:'export' 不允许返回空数组，生成一个占位 slug（正常导航不会到达）
  return [{ slug: ['_'] }]
}

export default function Page() {
  return <ConsolePlaceholder />
}
