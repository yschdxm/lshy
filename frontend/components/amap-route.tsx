'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'

declare global { interface Window { _AMapSecurityConfig: any; AMap: any } }

interface Props {
  spots: { name: string; spot_id: string; latitude?: number; longitude?: number }[]
  className?: string
  entrance?: string  // 'main'/'east'/'west'/'north'
}

// 入口 GPS 坐标
const ENTRANCE_GPS: Record<string, [number, number]> = {
  main: [120.095, 31.427],  // 胜境门楼（大照壁）
  east: [120.105, 31.425],  // 东门
  west: [120.090, 31.428],  // 西门
  north: [120.098, 31.432], // 北门
}

// 景点 GPS 坐标（22个）
const GPS: Record<string, [number, number]> = {
  'LS-001': [120.095, 31.427], 'LS-002': [120.0955, 31.4273], 'LS-003': [120.0958, 31.4276],
  'LS-004': [120.096, 31.428], 'LS-005': [120.0965, 31.4285], 'LS-006': [120.097, 31.429],
  'LS-007': [120.0975, 31.4288], 'LS-008': [120.098, 31.4285], 'LS-009': [120.0983, 31.428],
  'LS-010': [120.099, 31.4275], 'LS-011': [120.101, 31.428], 'LS-012': [120.100, 31.4265],
  'LS-013': [120.102, 31.426], 'LS-014': [120.103, 31.4255], 'LS-015': [120.1035, 31.425],
  'LS-016': [120.104, 31.424], 'NH-001': [120.106, 31.420], 'NH-002': [120.107, 31.419],
  'NH-003': [120.108, 31.418], 'NH-004': [120.1065, 31.4195], 'NH-005': [120.109, 31.417],
  'NH-006': [120.110, 31.416],
}

export function AmapRoute({ spots = [], className, entrance }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) return
    if (window.AMap) { initMap(); return }

    window._AMapSecurityConfig = { securityJsCode: 'fe36abfbf9ea8458ed80b6c6bec0b575' }
    const script = document.createElement('script')
    script.src = 'https://webapi.amap.com/maps?v=2.0&key=0eb343b32b4392ffd0457cdad1560280'
    script.onload = () => initMap()
    script.onerror = () => setLoaded(true)
    document.head.appendChild(script)
  }, [])

  // spots 变化时重绘地图
  useEffect(() => {
    if (window.AMap && mapRef.current) {
      const map = mapRef.current
      map.clearMap()
      drawRoute(map, spots || [], entrance)
    }
  }, [spots, entrance])

  const LINGSHAN_CENTER: [number, number] = [120.100925, 31.425920]

  function drawRoute(map: any, spotsArr: { name: string; spot_id: string }[], entrance?: string) {
    const AMap = window.AMap
    const path: [number, number][] = []

    // 先画入口
    if (entrance && ENTRANCE_GPS[entrance]) {
      const ecoord = ENTRANCE_GPS[entrance]
      path.push(ecoord)
      const eMarker = new AMap.Marker({
        position: ecoord,
        label: { content: '入口', direction: 'top', offset: [0, -8] },
        icon: new AMap.Icon({ size: [24, 24], image: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_bs.png', imageSize: [24, 24] }),
      })
      map.add(eMarker)
    }

    if (!spotsArr || !Array.isArray(spotsArr)) { map.setCenter(path[0] || LINGSHAN_CENTER); return }
    spotsArr.forEach(s => {
      // "origin" 特殊处理：当前位置
      const isOrigin = s.spot_id === 'origin'
      let coord: [number, number] | null = null
      if (isOrigin) {
        coord = LINGSHAN_CENTER
      } else {
        // 优先从 GPS 表查，否则解析 location 字符串 "lng,lat"
        const fromTable = GPS[s.spot_id]
        if (fromTable) {
          coord = fromTable
        } else if (s.spot_id && s.spot_id.includes(',')) {
          const parts = s.spot_id.split(',')
          coord = [parseFloat(parts[0]), parseFloat(parts[1])]
        }
      }
      if (coord) {
        path.push(coord)
        const marker = new AMap.Marker({
          position: coord,
          label: { content: (s.name || ''), direction: 'top', offset: [0, -8] },
          icon: isOrigin
            ? new AMap.Icon({ size: [24, 24], image: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_bs.png', imageSize: [24, 24] })
            : new AMap.Icon({ size: [20, 20], image: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_r.png', imageSize: [20, 20] }),
        })
        marker.on('click', () => {
          const info = new AMap.InfoWindow({ content: `<strong>${s.name}</strong>`, offset: [0, -20] })
          info.open(map, coord)
        })
        map.add(marker)
      }
    })
    if (path.length > 1) {
      const polyline = new AMap.Polyline({ path, strokeColor: '#0d6efd', strokeWeight: 3, strokeOpacity: 0.7, strokeStyle: 'dashed' })
      map.add(polyline)
      map.setFitView(null, false, [60, 60, 60, 60])
    }
  }

  function initMap() {
    if (!window.AMap || !containerRef.current) return
    const AMap = window.AMap
    const map = new AMap.Map(containerRef.current, {
      zoom: 16, center: [120.1009, 31.4259],
      mapStyle: 'amap://styles/light',
    })
    mapRef.current = map
    drawRoute(map, spots || [], entrance)
    setLoaded(true)
  }

  return (
    <div className={`relative ${className || ''}`}>
      <div ref={containerRef} className="h-full w-full rounded-lg" />
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-secondary/50 rounded-lg">
          <Loader2 className="size-5 animate-spin text-primary" />
        </div>
      )}
    </div>
  )
}
