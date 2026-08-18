/** @type {import('next').NextConfig} */
const nextConfig = {
  // 静态导出：全部页面为客户端组件，无服务端动态能力，产物 out/ 由后端 FastAPI 托管
  output: 'export',
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
