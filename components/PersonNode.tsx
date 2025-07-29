import { Card, CardContent } from "@/components/ui/card"
import { Calendar, AlertCircle } from "lucide-react"
import { ProcessedPerson } from '../utils/familyDataProcessor'
import { formatDate } from '../utils/familyDataProcessor'
import { COLORS } from '../constants/config'
import { useCallback, useRef } from 'react'

interface PersonNodeProps {
  person: ProcessedPerson
  isSelected?: boolean
  isDragging?: boolean
  onSelect?: (person: ProcessedPerson) => void
  onDragStart?: (person: ProcessedPerson, offset: { x: number, y: number }) => void
  onDrag?: (person: ProcessedPerson, position: { x: number, y: number }) => void
  onDragEnd?: (person: ProcessedPerson) => void
}

export function PersonNode({
  person,
  isSelected = false,
  isDragging = false,
  onSelect,
  onDragStart,
  onDrag,
  onDragEnd
}: PersonNodeProps) {
  const nodeRef = useRef<HTMLDivElement>(null)

  // 性別に基づく色の取得
  const getPersonColors = useCallback(() => {
    switch (person.sex) {
      case 'male':
        return COLORS.male
      case 'female':
        return COLORS.female
      default:
        return COLORS.unknown
    }
  }, [person.sex])

  // クリック処理
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onSelect?.(person)
  }, [person, onSelect])

  // ドラッグ開始処理
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return // 左クリックのみ
    
    e.preventDefault()
    e.stopPropagation()
    
    if (nodeRef.current) {
      const rect = nodeRef.current.getBoundingClientRect()
      const offset = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      }
      onDragStart?.(person, offset)
    }
  }, [person, onDragStart])

  const colors = getPersonColors()

  return (
    <div
      ref={nodeRef}
      className={`absolute cursor-pointer transform -translate-x-1/2 -translate-y-1/2 ${
        isSelected ? COLORS.selected : ""
      } ${isDragging ? "z-50" : "z-10"}`}
      style={{ 
        left: person.x, 
        top: person.y,
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      data-person-card
      data-person-id={person.id}
    >
      <Card
        className={`w-40 ${
          person.isUncertain 
            ? `${COLORS.uncertain.background} ${COLORS.uncertain.border}` 
            : `${colors.background} ${colors.border}`
        } hover:shadow-lg transition-shadow ${isDragging ? 'shadow-xl' : ''}`}
      >
        <CardContent className="p-3">
          {/* ヘッダー: 性別アイコンと不確実性アイコン */}
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-3 h-3 rounded-full ${colors.indicator}`} />
            {person.isUncertain && (
              <AlertCircle className={`w-3 h-3 ${COLORS.uncertain.text}`} />
            )}
          </div>

          {/* 名前 */}
          <h4 className="font-medium text-sm text-gray-900 mb-1 leading-tight">
            {person.displayName}
          </h4>

          {/* 日付情報 */}
          <div className="text-xs text-gray-600 space-y-1">
            {/* 生年月日 */}
            {person.birth?.date && (
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{formatDate(person.birth.date)}</span>
              </div>
            )}

            {/* 没年月日 */}
            {person.death?.date && (
              <div className="flex items-center gap-1">
                <span className="flex-shrink-0">†</span>
                <span className="truncate">{formatDate(person.death.date)}</span>
              </div>
            )}

            {/* 出生地（スペースがある場合のみ） */}
            {person.birth?.place && !person.death?.date && (
              <div className="text-xs text-gray-500 truncate">
                {person.birth.place}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 