import { useMemo, useCallback, useState } from 'react'
import { ProcessedPerson, FamilyGroup } from '../utils/familyDataProcessor'
import { groupByGeneration } from '../utils/familyDataProcessor'
import { LAYOUT_CONFIG } from '../constants/config'

interface LayoutLine {
  x1: number
  y1: number
  x2: number
  y2: number
}

interface ChildLine {
  fromX: number
  fromY: number
  toX: number
  toY: number
  child: ProcessedPerson
}

interface UseLayoutCalculationReturn {
  // 位置が計算された人物データ
  layoutPersons: ProcessedPerson[]
  
  // 関係線データ
  marriageLines: LayoutLine[]
  parentChildLines: LayoutLine[]
  siblingLines: LayoutLine[]
  
  // 操作
  updatePersonPosition: (id: string, x: number, y: number) => void
  resetLayout: () => void
  autoLayout: () => void
  
  // ユーティリティ
  getBounds: () => { minX: number, maxX: number, minY: number, maxY: number }
}

export function useLayoutCalculation(
  persons: ProcessedPerson[],
  families: FamilyGroup[]
): UseLayoutCalculationReturn {
  
  // 手動調整された位置を保存
  const [manualPositions, setManualPositions] = useState<Record<string, { x: number, y: number }>>({})

  // 自動レイアウト計算
  const calculateAutoLayout = useCallback((inputPersons: ProcessedPerson[], inputFamilies: FamilyGroup[]) => {
    if (inputPersons.length === 0) return []

    const layoutPersons = [...inputPersons]
    const generationGroups = groupByGeneration(layoutPersons)
    
    let currentX = LAYOUT_CONFIG.initialX
    
    // 世代順にレイアウト
    Array.from(generationGroups.keys()).sort((a, b) => a - b).forEach(generation => {
      const generationY = LAYOUT_CONFIG.initialY + (generation - 1) * LAYOUT_CONFIG.generationSpacing
      let generationX = currentX

      // この世代の家族単位を処理
      const generationFamilies = inputFamilies.filter(family => 
        family.parents.some(parent => parent.generation === generation)
      )

      // 処理済みの人物をトラック
      const processedPersonIds = new Set<string>()

      generationFamilies.forEach(family => {
        const generationParents = family.parents.filter(p => p.generation === generation)
        
        if (generationParents.length === 1) {
          // 単親家族
          const parent = generationParents[0]
          const position = manualPositions[parent.id] || { x: generationX, y: generationY }
          
          const personIndex = layoutPersons.findIndex(p => p.id === parent.id)
          if (personIndex !== -1) {
            layoutPersons[personIndex] = { ...layoutPersons[personIndex], ...position }
          }
          
          processedPersonIds.add(parent.id)
          generationX += LAYOUT_CONFIG.minFamilySpacing
          
        } else if (generationParents.length === 2) {
          // 夫婦
          const [parent1, parent2] = generationParents
          
          const position1 = manualPositions[parent1.id] || { x: generationX, y: generationY }
          const position2 = manualPositions[parent2.id] || { x: generationX + LAYOUT_CONFIG.spouseSpacing, y: generationY }
          
          const person1Index = layoutPersons.findIndex(p => p.id === parent1.id)
          const person2Index = layoutPersons.findIndex(p => p.id === parent2.id)
          
          if (person1Index !== -1) {
            layoutPersons[person1Index] = { ...layoutPersons[person1Index], ...position1 }
          }
          if (person2Index !== -1) {
            layoutPersons[person2Index] = { ...layoutPersons[person2Index], ...position2 }
          }
          
          processedPersonIds.add(parent1.id)
          processedPersonIds.add(parent2.id)
          generationX += LAYOUT_CONFIG.spouseSpacing + LAYOUT_CONFIG.minFamilySpacing
        }
      })

      // 未処理の独身者を配置
      const singlePersons = layoutPersons.filter(person => 
        person.generation === generation && !processedPersonIds.has(person.id)
      )

      singlePersons.forEach(person => {
        // 重複チェック
        let proposedX = generationX
        let collision = true
        
        while (collision) {
          collision = layoutPersons.some(existing => 
            existing.generation === generation && 
            existing.id !== person.id &&
            Math.abs(existing.x - proposedX) < LAYOUT_CONFIG.cardSpacing
          )
          if (collision) {
            proposedX += LAYOUT_CONFIG.cardSpacing
          }
        }

        const position = manualPositions[person.id] || { x: proposedX, y: generationY }
        const personIndex = layoutPersons.findIndex(p => p.id === person.id)
        if (personIndex !== -1) {
          layoutPersons[personIndex] = { ...layoutPersons[personIndex], ...position }
        }
        
        generationX = proposedX + LAYOUT_CONFIG.cardSpacing
      })
    })

    return layoutPersons
  }, [manualPositions])

  // レイアウトされた人物データ
  const layoutPersons = useMemo(() => {
    return calculateAutoLayout(persons, families)
  }, [persons, families, calculateAutoLayout])

  // 結婚関係線の計算
  const marriageLines = useMemo(() => {
    const lines: LayoutLine[] = []
    
    families.forEach(family => {
      if (family.parents.length === 2) {
        const [parent1, parent2] = family.parents
        const person1 = layoutPersons.find(p => p.id === parent1.id)
        const person2 = layoutPersons.find(p => p.id === parent2.id)
        
        if (person1 && person2) {
          lines.push({
            x1: person1.x,
            y1: person1.y,
            x2: person2.x,
            y2: person2.y
          })
        }
      }
    })
    
    return lines
  }, [layoutPersons, families])

  // 親子関係線の計算  
  const parentChildLines = useMemo(() => {
    const lines: LayoutLine[] = []
    
    families.forEach(family => {
      if (family.parents.length > 0 && family.children.length > 0) {
        // 親の中央点を計算
        const parents = family.parents
          .map(p => layoutPersons.find(lp => lp.id === p.id))
          .filter((p): p is ProcessedPerson => p !== undefined)
        
        if (parents.length === 0) return

        const parentCenterX = parents.reduce((sum, p) => sum + p.x, 0) / parents.length
        const parentCenterY = parents.reduce((sum, p) => sum + p.y, 0) / parents.length

        // 各子供への線
        family.children.forEach(child => {
          const childPerson = layoutPersons.find(p => p.id === child.id)
          if (childPerson) {
            lines.push({
              x1: parentCenterX,
              y1: parentCenterY + 20, // カードの下端から
              x2: childPerson.x,
              y2: childPerson.y - 20 // カードの上端へ
            })
          }
        })
      }
    })
    
    return lines
  }, [layoutPersons, families])

  // 兄弟姉妹関係線の計算
  const siblingLines = useMemo(() => {
    const lines: LayoutLine[] = []
    
    families.forEach(family => {
      if (family.children.length >= 2) {
        const children = family.children
          .map(c => layoutPersons.find(p => p.id === c.id))
          .filter((p): p is ProcessedPerson => p !== undefined)
          .sort((a, b) => a.x - b.x) // X座標でソート

        if (children.length >= 2) {
          const leftMostX = children[0].x
          const rightMostX = children[children.length - 1].x
          const siblingY = Math.min(...children.map(c => c.y)) - 50

          // 水平線
          lines.push({
            x1: leftMostX,
            y1: siblingY,
            x2: rightMostX,
            y2: siblingY
          })

          // 各子供への垂直線
          children.forEach(child => {
            lines.push({
              x1: child.x,
              y1: siblingY,
              x2: child.x,
              y2: child.y - 30
            })
          })
        }
      }
    })
    
    return lines
  }, [layoutPersons, families])

  // 人物位置の手動更新
  const updatePersonPosition = useCallback((id: string, x: number, y: number) => {
    setManualPositions(prev => ({
      ...prev,
      [id]: { x, y }
    }))
  }, [])

  // レイアウトリセット
  const resetLayout = useCallback(() => {
    setManualPositions({})
  }, [])

  // オートレイアウト実行
  const autoLayout = useCallback(() => {
    // 手動位置をクリアして自動レイアウトを適用
    setManualPositions({})
  }, [])

  // 境界の計算
  const getBounds = useCallback(() => {
    if (layoutPersons.length === 0) {
      return { minX: 0, maxX: 0, minY: 0, maxY: 0 }
    }

    const xs = layoutPersons.map(p => p.x)
    const ys = layoutPersons.map(p => p.y)

    return {
      minX: Math.min(...xs) - LAYOUT_CONFIG.cardWidth / 2,
      maxX: Math.max(...xs) + LAYOUT_CONFIG.cardWidth / 2,
      minY: Math.min(...ys) - LAYOUT_CONFIG.cardHeight / 2,
      maxY: Math.max(...ys) + LAYOUT_CONFIG.cardHeight / 2
    }
  }, [layoutPersons])

  return {
    layoutPersons,
    marriageLines,
    parentChildLines,
    siblingLines,
    updatePersonPosition,
    resetLayout,
    autoLayout,
    getBounds
  }
} 