import { DATA_CONFIG } from '../constants/config'

// family-info-sep.jsonのデータ構造に対応する型定義
export interface PersonData {
  id: string
  generation: number | null
  sex: 'male' | 'female'
  name: {
    surname: string
    given_name: string
  }
  birth: {
    original_date: string | null
    date: string | null
    place: string | null
  }
  death: {
    original_date: string | null
    date: string | null
    place: string | null
  }
}

export interface FamilyData {
  id: string
  parents: string[]
  children: string[]
  marriage_date: {
    original_date: string | null
    date: string | null
  }
  divorce_date: {
    original_date: string | null
    date: string | null
  }
  relation_type: 'blood' | 'adoption'
}

export interface FamilyTreeData {
  people: PersonData[]
  families: FamilyData[]
}

// 処理された人物データの型
export interface ProcessedPerson extends PersonData {
  x: number
  y: number
  generation: number  // nullを許可しない（処理時に必ずnumberが設定される）
  displayName: string
  isUncertain: boolean  // 処理時に必ずbooleanが設定される
}

// 家族グループの型
export interface FamilyGroup {
  id: string
  parents: ProcessedPerson[]
  children: ProcessedPerson[]
  marriageDate?: string
  divorceDate?: string
  relationType: 'blood' | 'adoption'
  marriageLines: Array<{x1: number, y1: number, x2: number, y2: number}>
  childrenLines: Array<{
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    child: ProcessedPerson
  }>
}

/**
 * JSONファイルから家系図データを読み込む
 */
export async function loadFamilyData(): Promise<FamilyTreeData> {
  try {
    const response = await fetch(DATA_CONFIG.dataFile)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    console.error('Failed to load family data:', error)
    throw error
  }
}

/**
 * 生データを処理可能な形式に変換
 */
export function processFamilyData(data: FamilyTreeData): {
  persons: ProcessedPerson[]
  families: FamilyGroup[]
} {
  if (!data.people || !Array.isArray(data.people)) {
    return { persons: [], families: [] }
  }

  // 人物データを処理
  const processedPersons = data.people.map(person => ({
    ...person,
    x: 0, // 初期位置、後でレイアウト計算で更新
    y: 0,
    generation: person.generation || DATA_CONFIG.defaultGeneration,
    displayName: `${person.name.surname} ${person.name.given_name}`.trim(),
    isUncertain: false
  }))

  // 家族関係を処理
  const processedFamilies: FamilyGroup[] = []
  
  if (data.families && Array.isArray(data.families)) {
    data.families.forEach(family => {
      const parents = family.parents
        .map(parentId => processedPersons.find(p => p.id === parentId))
        .filter((p): p is ProcessedPerson => p !== undefined)
      
      const children = family.children
        .map(childId => processedPersons.find(p => p.id === childId))
        .filter((p): p is ProcessedPerson => p !== undefined)

      if (parents.length > 0) {
        processedFamilies.push({
          id: family.id,
          parents,
          children,
          marriageDate: family.marriage_date?.date || undefined,
          divorceDate: family.divorce_date?.date || undefined,
          relationType: family.relation_type,
          marriageLines: [], // レイアウト計算で設定
          childrenLines: []  // レイアウト計算で設定
        })
      }
    })
  }

  return { persons: processedPersons, families: processedFamilies }
}

/**
 * 世代ごとに人物をグループ化
 */
export function groupByGeneration(persons: ProcessedPerson[]): Map<number, ProcessedPerson[]> {
  const generationGroups = new Map<number, ProcessedPerson[]>()
  
  persons.forEach(person => {
    const generation = person.generation
    if (!generationGroups.has(generation)) {
      generationGroups.set(generation, [])
    }
    generationGroups.get(generation)!.push(person)
  })

  return generationGroups
}

/**
 * 結婚関係を特定
 */
export function findMarriageConnections(families: FamilyGroup[]): Array<{
  person1: ProcessedPerson
  person2: ProcessedPerson
  marriageDate?: string
  divorceDate?: string
  relationType: 'blood' | 'adoption'
}> {
  return families
    .filter(family => family.parents.length === 2)
    .map(family => ({
      person1: family.parents[0],
      person2: family.parents[1],
      marriageDate: family.marriageDate,
      divorceDate: family.divorceDate,
      relationType: family.relationType
    }))
}

/**
 * 親子関係を特定
 */
export function findParentChildConnections(families: FamilyGroup[]): Array<{
  parent: ProcessedPerson
  child: ProcessedPerson
  relationType: 'blood' | 'adoption'
}> {
  const connections: Array<{
    parent: ProcessedPerson
    child: ProcessedPerson
    relationType: 'blood' | 'adoption'
  }> = []

  families.forEach(family => {
    family.parents.forEach(parent => {
      family.children.forEach(child => {
        connections.push({
          parent,
          child,
          relationType: family.relationType
        })
      })
    })
  })

  return connections
}

/**
 * 兄弟姉妹関係を特定  
 */
export function findSiblingConnections(families: FamilyGroup[]): ProcessedPerson[][] {
  const siblingGroups: ProcessedPerson[][] = []

  families.forEach(family => {
    if (family.children.length >= 2) {
      // 生年月日でソート
      const sortedChildren = family.children.sort((a, b) => {
        if (a.birth.date && b.birth.date) {
          return a.birth.date.localeCompare(b.birth.date)
        }
        return 0
      })
      siblingGroups.push(sortedChildren)
    }
  })

  return siblingGroups
}

/**
 * 人物を検索
 */
export function searchPersons(persons: ProcessedPerson[], query: string): ProcessedPerson[] {
  const lowerQuery = query.toLowerCase()
  return persons.filter(person => 
    person.displayName.toLowerCase().includes(lowerQuery) ||
    person.name.surname.toLowerCase().includes(lowerQuery) ||
    person.name.given_name.toLowerCase().includes(lowerQuery) ||
    person.id.toLowerCase().includes(lowerQuery)
  )
}

/**
 * 世代の範囲を取得
 */
export function getGenerationRange(persons: ProcessedPerson[]): { min: number, max: number } {
  if (persons.length === 0) {
    return { min: 1, max: 1 }
  }

  const generations = persons.map(p => p.generation)
  return {
    min: Math.min(...generations),
    max: Math.max(...generations)
  }
}

/**
 * 日付文字列を表示用にフォーマット
 */
export function formatDate(date: string | null): string {
  if (!date) return ''
  
  // YYYY-MM-DD形式の場合
  if (date.includes('-')) {
    const parts = date.split('-')
    if (parts.length === 3) {
      const [year, month, day] = parts
      if (month === 'XX' || day === 'XX') {
        return parts.filter(p => p !== 'XX').join('-')
      }
    }
  }
  
  return date
} 