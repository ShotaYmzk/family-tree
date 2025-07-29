import { useCallback, useRef, useEffect, useState } from 'react'
import { Button } from "@/components/ui/button"
import { ZoomIn, ZoomOut, RotateCcw, Maximize } from "lucide-react"
import { PersonNode } from './PersonNode'
import { FamilyTreeLines } from './FamilyTreeLines'
import { ProcessedPerson } from '../utils/familyDataProcessor'
import { useLayoutCalculation } from '../hooks/useLayoutCalculation'
import { LAYOUT_CONFIG, UI_CONFIG } from '../constants/config'

interface FamilyTreeProps {
  persons: ProcessedPerson[]
  families: any[] // FamilyGroupの型をインポートする場合は適切に型付け
  selectedPerson?: ProcessedPerson | null
  onPersonSelect?: (person: ProcessedPerson) => void
  onPersonPositionUpdate?: (id: string, x: number, y: number) => void
}

export function FamilyTree({
  persons,
  families,
  selectedPerson,
  onPersonSelect,
  onPersonPositionUpdate
}: FamilyTreeProps) {
  // レイアウト計算フック
  const {
    layoutPersons,
    marriageLines,
    parentChildLines,
    siblingLines,
    updatePersonPosition,
    resetLayout,
    autoLayout,
    getBounds
  } = useLayoutCalculation(persons, families)

  // ズーム・パン状態
  const [zoom, setZoom] = useState(LAYOUT_CONFIG.defaultZoom)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)
  const [isPanning, setIsPanning] = useState(false)
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 })

  // ドラッグ状態
  const [isDragging, setIsDragging] = useState(false)
  const [draggedPerson, setDraggedPerson] = useState<ProcessedPerson | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

  const canvasRef = useRef<HTMLDivElement>(null)

  // ズーム操作
  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev * LAYOUT_CONFIG.zoomStep, LAYOUT_CONFIG.maxZoom))
  }, [])

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev / LAYOUT_CONFIG.zoomStep, LAYOUT_CONFIG.minZoom))
  }, [])

  const handleResetView = useCallback(() => {
    setZoom(LAYOUT_CONFIG.defaultZoom)
    setPanX(0)
    setPanY(0)
  }, [])

  const handleFitToView = useCallback(() => {
    if (!canvasRef.current || layoutPersons.length === 0) return

    const canvasRect = canvasRef.current.getBoundingClientRect()
    const bounds = getBounds()
    const padding = 50

    const contentWidth = bounds.maxX - bounds.minX
    const contentHeight = bounds.maxY - bounds.minY

    const availableWidth = canvasRect.width - padding * 2
    const availableHeight = canvasRect.height - padding * 2

    const scaleX = availableWidth / contentWidth
    const scaleY = availableHeight / contentHeight
    const newZoom = Math.min(scaleX, scaleY, LAYOUT_CONFIG.maxZoom)

    const centerX = (bounds.minX + bounds.maxX) / 2
    const centerY = (bounds.minY + bounds.maxY) / 2
    const viewCenterX = canvasRect.width / 2
    const viewCenterY = canvasRect.height / 2

    setZoom(newZoom)
    setPanX(viewCenterX - centerX * newZoom)
    setPanY(viewCenterY - centerY * newZoom)
  }, [layoutPersons, getBounds])

  // パン操作
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-person-card]')) return
    
    setIsPanning(true)
    setLastPanPoint({ x: e.clientX, y: e.clientY })
    e.preventDefault()
  }, [])

  const handleCanvasMouseMove = useCallback((e: MouseEvent) => {
    if (!isPanning) return

    const deltaX = e.clientX - lastPanPoint.x
    const deltaY = e.clientY - lastPanPoint.y

    setPanX(prev => prev + deltaX)
    setPanY(prev => prev + deltaY)
    setLastPanPoint({ x: e.clientX, y: e.clientY })
  }, [isPanning, lastPanPoint])

  const handleCanvasMouseUp = useCallback(() => {
    setIsPanning(false)
  }, [])

  // マウスホイールでズーム
  const handleWheel = useCallback((e: WheelEvent) => {
    if (!canvasRef.current) return
    
    e.preventDefault()
    const rect = canvasRef.current.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    const delta = e.deltaY > 0 ? 1 / LAYOUT_CONFIG.zoomStep : LAYOUT_CONFIG.zoomStep
    const newZoom = Math.max(LAYOUT_CONFIG.minZoom, Math.min(LAYOUT_CONFIG.maxZoom, zoom * delta))

    // マウス位置を中心にズーム
    const zoomPointX = (mouseX - panX) / zoom
    const zoomPointY = (mouseY - panY) / zoom

    setPanX(mouseX - zoomPointX * newZoom)
    setPanY(mouseY - zoomPointY * newZoom)
    setZoom(newZoom)
  }, [zoom, panX, panY])

  // ドラッグ操作
  const handlePersonDragStart = useCallback((person: ProcessedPerson, offset: { x: number, y: number }) => {
    setIsDragging(true)
    setDraggedPerson(person)
    setDragOffset(offset)
  }, [])

  const handlePersonDrag = useCallback((e: MouseEvent) => {
    if (!isDragging || !draggedPerson || !canvasRef.current) return
    
    e.preventDefault()
    
    const rect = canvasRef.current.getBoundingClientRect()
    const newX = (e.clientX - rect.left - panX) / zoom
    const newY = (e.clientY - rect.top - panY) / zoom
    
    updatePersonPosition(draggedPerson.id, newX, newY)
    onPersonPositionUpdate?.(draggedPerson.id, newX, newY)
  }, [isDragging, draggedPerson, dragOffset, zoom, panX, panY, updatePersonPosition, onPersonPositionUpdate])

  const handlePersonDragEnd = useCallback(() => {
    setIsDragging(false)
    setDraggedPerson(null)
    setDragOffset({ x: 0, y: 0 })
  }, [])

  // イベントリスナー
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.addEventListener('wheel', handleWheel, { passive: false })
    
    return () => {
      canvas.removeEventListener('wheel', handleWheel)
    }
  }, [handleWheel])

  useEffect(() => {
    if (isPanning) {
      document.addEventListener('mousemove', handleCanvasMouseMove)
      document.addEventListener('mouseup', handleCanvasMouseUp)
      document.body.style.cursor = 'grabbing'
      
      return () => {
        document.removeEventListener('mousemove', handleCanvasMouseMove)
        document.removeEventListener('mouseup', handleCanvasMouseUp)
        document.body.style.cursor = 'default'
      }
    }
  }, [isPanning, handleCanvasMouseMove, handleCanvasMouseUp])

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handlePersonDrag)
      document.addEventListener('mouseup', handlePersonDragEnd)
      document.body.style.cursor = 'grabbing'
      
      return () => {
        document.removeEventListener('mousemove', handlePersonDrag)
        document.removeEventListener('mouseup', handlePersonDragEnd)
        document.body.style.cursor = 'default'
      }
    }
  }, [isDragging, handlePersonDrag, handlePersonDragEnd])

  // 世代の取得
  const generations = Array.from(new Set(layoutPersons.map(p => p.generation))).sort((a, b) => a - b)

  return (
    <div className="relative w-full h-full bg-gray-100">
      {/* ズーム・パンコントロール */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        <Button 
          size="sm" 
          variant="outline" 
          className="bg-white shadow-md hover:shadow-lg"
          onClick={handleZoomIn}
          title="ズームイン"
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          className="bg-white shadow-md hover:shadow-lg"
          onClick={handleZoomOut}
          title="ズームアウト"
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          className="bg-white shadow-md hover:shadow-lg"
          onClick={handleFitToView}
          title="全体表示"
        >
          <Maximize className="w-4 h-4" />
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          className="bg-white shadow-md hover:shadow-lg"
          onClick={handleResetView}
          title="リセット"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>

      {/* ズーム倍率表示 */}
      <div className="absolute top-4 right-4 z-10">
        <div className="bg-white px-3 py-1 rounded-full shadow-sm border">
          <span className="text-sm font-medium text-gray-600">{Math.round(zoom * 100)}%</span>
        </div>
      </div>

      {/* 世代ラベル（固定位置） */}
      {generations.length > 0 && (
        <div className="absolute left-4 top-0 bottom-0 z-20 pointer-events-none">
          {generations.map((generation) => {
            const generationY = LAYOUT_CONFIG.initialY + (generation - 1) * LAYOUT_CONFIG.generationSpacing;
            const screenY = generationY * zoom + panY;
            
            return (
              <div
                key={`generation-label-${generation}`}
                className="absolute bg-white px-3 py-1 rounded-full shadow-md border pointer-events-auto"
                style={{
                  top: `${screenY - UI_CONFIG.generationLabelOffset}px`,
                  left: '0px',
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(4px)',
                  zIndex: 30
                }}
              >
                <span className="text-sm font-medium text-gray-600">第{generation}世代</span>
              </div>
            );
          })}
        </div>
      )}

      {/* 家系図キャンバス */}
      <div 
        ref={canvasRef}
        className="w-full h-full overflow-hidden cursor-grab active:cursor-grabbing"
        onMouseDown={handleCanvasMouseDown}
        style={{
          cursor: isPanning ? 'grabbing' : 'grab'
        }}
      >
        <div 
          className="relative min-w-[800px] min-h-[600px]"
          style={{
            transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
            transformOrigin: '0 0',
            transition: isPanning ? 'none' : `transform ${UI_CONFIG.transitionDuration} ease-out`
          }}
        >
          {/* 世代区切り線 */}
          <div className="absolute inset-0">
            {generations.map((generation) => {
              const generationY = LAYOUT_CONFIG.initialY + (generation - 1) * LAYOUT_CONFIG.generationSpacing;
              
              return (
                <div 
                  key={`generation-line-${generation}`}
                  className="absolute left-0 h-px bg-gray-300 opacity-50"
                  style={{ 
                    top: `${generationY}px`,
                    width: '2000px'
                  }}
                />
              );
            })}
          </div>

          {/* 関係線 */}
          <FamilyTreeLines
            marriageLines={marriageLines}
            parentChildLines={parentChildLines}
            siblingLines={[]}
          />

          {/* 人物ノード */}
          {layoutPersons.map((person) => (
            <PersonNode
              key={person.id}
              person={person}
              isSelected={selectedPerson?.id === person.id}
              isDragging={isDragging && draggedPerson?.id === person.id}
              onSelect={onPersonSelect}
              onDragStart={handlePersonDragStart}
            />
          ))}
        </div>
      </div>
    </div>
  )
} 