import { COLORS, LAYOUT_CONFIG } from '../constants/config'

interface LayoutLine {
  x1: number
  y1: number
  x2: number
  y2: number
}

interface FamilyTreeLinesProps {
  marriageLines: LayoutLine[]
  parentChildLines: LayoutLine[]
  siblingLines: LayoutLine[]
  width?: number
  height?: number
}

export function FamilyTreeLines({
  marriageLines,
  parentChildLines,
  siblingLines,
  width = 2000,
  height = 2000
}: FamilyTreeLinesProps) {
  
  // 二重線パスの生成（結婚関係用）
  const createDoubleLinePaths = (line: LayoutLine) => {
    const cornerRadius = LAYOUT_CONFIG.cornerRadius
    const lineOffset = 2 // 二重線の間隔
    
    // 直線の場合
    if (line.y1 === line.y2) {
      return {
        path1: `M ${line.x1} ${line.y1 - lineOffset} L ${line.x2} ${line.y2 - lineOffset}`,
        path2: `M ${line.x1} ${line.y1 + lineOffset} L ${line.x2} ${line.y2 + lineOffset}`
      }
    }

    // L字型の線の場合
    const midX = (line.x1 + line.x2) / 2
    const isHorizontalFirst = Math.abs(line.x2 - line.x1) > Math.abs(line.y2 - line.y1)
    
    let path1: string
    let path2: string
    
    if (isHorizontalFirst) {
      // 水平→垂直の順で接続
      if (line.x1 < line.x2) {
        // 左から右へ
        if (line.y1 < line.y2) {
          // 上から下へ
          path1 = `M ${line.x1} ${line.y1 - lineOffset} L ${midX - cornerRadius} ${line.y1 - lineOffset} Q ${midX} ${line.y1 - lineOffset} ${midX} ${line.y1 + cornerRadius - lineOffset} L ${midX} ${line.y2 - lineOffset}`
          path2 = `M ${line.x1} ${line.y1 + lineOffset} L ${midX - cornerRadius} ${line.y1 + lineOffset} Q ${midX} ${line.y1 + lineOffset} ${midX} ${line.y1 + cornerRadius + lineOffset} L ${midX} ${line.y2 + lineOffset}`
        } else {
          // 下から上へ
          path1 = `M ${line.x1} ${line.y1 - lineOffset} L ${midX - cornerRadius} ${line.y1 - lineOffset} Q ${midX} ${line.y1 - lineOffset} ${midX} ${line.y1 - cornerRadius - lineOffset} L ${midX} ${line.y2 - lineOffset}`
          path2 = `M ${line.x1} ${line.y1 + lineOffset} L ${midX - cornerRadius} ${line.y1 + lineOffset} Q ${midX} ${line.y1 + lineOffset} ${midX} ${line.y1 - cornerRadius + lineOffset} L ${midX} ${line.y2 + lineOffset}`
        }
      } else {
        // 右から左へ
        if (line.y1 < line.y2) {
          // 上から下へ
          path1 = `M ${line.x1} ${line.y1 - lineOffset} L ${midX + cornerRadius} ${line.y1 - lineOffset} Q ${midX} ${line.y1 - lineOffset} ${midX} ${line.y1 + cornerRadius - lineOffset} L ${midX} ${line.y2 - lineOffset}`
          path2 = `M ${line.x1} ${line.y1 + lineOffset} L ${midX + cornerRadius} ${line.y1 + lineOffset} Q ${midX} ${line.y1 + lineOffset} ${midX} ${line.y1 + cornerRadius + lineOffset} L ${midX} ${line.y2 + lineOffset}`
        } else {
          // 下から上へ
          path1 = `M ${line.x1} ${line.y1 - lineOffset} L ${midX + cornerRadius} ${line.y1 - lineOffset} Q ${midX} ${line.y1 - lineOffset} ${midX} ${line.y1 - cornerRadius - lineOffset} L ${midX} ${line.y2 - lineOffset}`
          path2 = `M ${line.x1} ${line.y1 + lineOffset} L ${midX + cornerRadius} ${line.y1 + lineOffset} Q ${midX} ${line.y1 + lineOffset} ${midX} ${line.y1 - cornerRadius + lineOffset} L ${midX} ${line.y2 + lineOffset}`
        }
      }
      
      // 第二セグメント（垂直から水平）
      if (line.y2 < line.y1) {
        // 上向き
        if (midX < line.x2) {
          path1 += ` Q ${midX} ${line.y2 - lineOffset} ${midX + cornerRadius} ${line.y2 - lineOffset} L ${line.x2} ${line.y2 - lineOffset}`
          path2 += ` Q ${midX} ${line.y2 + lineOffset} ${midX + cornerRadius} ${line.y2 + lineOffset} L ${line.x2} ${line.y2 + lineOffset}`
        } else {
          path1 += ` Q ${midX} ${line.y2 - lineOffset} ${midX - cornerRadius} ${line.y2 - lineOffset} L ${line.x2} ${line.y2 - lineOffset}`
          path2 += ` Q ${midX} ${line.y2 + lineOffset} ${midX - cornerRadius} ${line.y2 + lineOffset} L ${line.x2} ${line.y2 + lineOffset}`
        }
      } else {
        // 下向き
        if (midX < line.x2) {
          path1 += ` Q ${midX} ${line.y2 - lineOffset} ${midX + cornerRadius} ${line.y2 - lineOffset} L ${line.x2} ${line.y2 - lineOffset}`
          path2 += ` Q ${midX} ${line.y2 + lineOffset} ${midX + cornerRadius} ${line.y2 + lineOffset} L ${line.x2} ${line.y2 + lineOffset}`
        } else {
          path1 += ` Q ${midX} ${line.y2 - lineOffset} ${midX - cornerRadius} ${line.y2 - lineOffset} L ${line.x2} ${line.y2 - lineOffset}`
          path2 += ` Q ${midX} ${line.y2 + lineOffset} ${midX - cornerRadius} ${line.y2 + lineOffset} L ${line.x2} ${line.y2 + lineOffset}`
        }
      }
    } else {
      // シンプルな水平線
      path1 = `M ${line.x1} ${line.y1 - lineOffset} L ${line.x2} ${line.y2 - lineOffset}`
      path2 = `M ${line.x1} ${line.y1 + lineOffset} L ${line.x2} ${line.y2 + lineOffset}`
    }
    
    return { path1, path2 }
  }

  // L字型パスの生成（親子・兄弟関係用）
  const createLShapedPath = (line: LayoutLine) => {
    const cornerRadius = LAYOUT_CONFIG.cornerRadius
    
    if (line.x1 === line.x2) {
      // 垂直線
      return `M ${line.x1} ${line.y1} L ${line.x2} ${line.y2}`
    }
    
    const midY = (line.y1 + line.y2) / 2
    
    return `M ${line.x1} ${line.y1} L ${line.x1} ${midY - cornerRadius} Q ${line.x1} ${midY} ${line.x1 + (line.x2 > line.x1 ? cornerRadius : -cornerRadius)} ${midY} L ${line.x2 - (line.x2 > line.x1 ? cornerRadius : -cornerRadius)} ${midY} Q ${line.x2} ${midY} ${line.x2} ${midY + cornerRadius} L ${line.x2} ${line.y2}`
  }

  return (
    <svg 
      className="absolute inset-0 w-full h-full pointer-events-none" 
      style={{ width, height }}
      viewBox={`0 0 ${width} ${height}`}
    >
      {/* 結婚関係線 (二重線) */}
      {marriageLines.map((line, index) => {
        const { path1, path2 } = createDoubleLinePaths(line)
        
        return (
          <g key={`marriage-line-${index}`}>
            {/* 1本目の線 */}
            <path
              d={path1}
              stroke={COLORS.marriageLine}
              strokeWidth="2"
              fill="none"
              opacity="0.8"
            />
            {/* 2本目の線 */}
            <path
              d={path2}
              stroke={COLORS.marriageLine}
              strokeWidth="2"
              fill="none"
              opacity="0.8"
            />
          </g>
        )
      })}

      {/* 親子関係線 */}
      {parentChildLines.map((line, index) => (
        <path
          key={`parent-child-${index}`}
          d={createLShapedPath(line)}
          stroke={COLORS.parentChildLine}
          strokeWidth="2"
          fill="none"
          opacity="0.7"
        />
      ))}

      {/* 兄弟姉妹関係線 - 削除済み */}
      {/* siblingLines.map((line, index) => (
        <path
          key={`sibling-${index}`}
          d={`M ${line.x1} ${line.y1} L ${line.x2} ${line.y2}`}
          stroke={COLORS.siblingLine}
          strokeWidth="2"
          fill="none"
          opacity="0.8"
        />
      )) */}
    </svg>
  )
} 