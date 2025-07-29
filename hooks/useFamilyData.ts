import { useState, useEffect, useCallback, useRef } from 'react'
import { 
  loadFamilyData, 
  processFamilyData,
  ProcessedPerson,
  FamilyGroup,
  FamilyTreeData
} from '../utils/familyDataProcessor'
import { useUndoRedo } from './useUndoRedo'

interface FamilyDataState {
  persons: ProcessedPerson[]
  families: FamilyGroup[]
}

interface UseFamilyDataReturn {
  // データ
  persons: ProcessedPerson[]
  families: FamilyGroup[]
  rawData: FamilyTreeData | null
  
  // 状態
  isLoading: boolean
  error: string | null
  
  // 操作
  addPerson: (personData: Partial<ProcessedPerson>) => void
  updatePerson: (id: string, updates: Partial<ProcessedPerson>) => void
  deletePerson: (id: string) => void
  addFamily: (familyData: {
    parentIds: string[]
    childrenIds?: string[]
    marriageDate?: string
    divorceDate?: string
    relationType: 'blood' | 'adoption'
  }) => void
  updateFamily: (id: string, updates: Partial<FamilyGroup>) => void
  deleteFamily: (id: string) => void
  
  // アンドゥ・リドゥ
  canUndo: boolean
  canRedo: boolean
  undo: () => void
  redo: () => void
  
  // ユーティリティ
  getPersonById: (id: string) => ProcessedPerson | undefined
  getFamilyById: (id: string) => FamilyGroup | undefined
  refreshData: () => Promise<void>
}

export function useFamilyData(): UseFamilyDataReturn {
  const [rawData, setRawData] = useState<FamilyTreeData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // アンドゥ・リドゥ機能
  const {
    currentState,
    canUndo,
    canRedo,
    pushState,
    undo: undoState,
    redo: redoState,
  } = useUndoRedo<FamilyDataState>({ persons: [], families: [] })

  const { persons, families } = currentState

  // データ読み込み
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const data = await loadFamilyData()
      const processed = processFamilyData(data)
      
      setRawData(data)
      pushState({ persons: processed.persons, families: processed.families }, 'データ読み込み')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'データの読み込みに失敗しました')
      console.error('Failed to load family data:', err)
    } finally {
      setIsLoading(false)
    }
  }, [pushState])

  // 初回読み込み
  useEffect(() => {
    loadData()
  }, [loadData])

  // 人物追加
  const addPerson = useCallback((personData: Partial<ProcessedPerson>) => {
    const newPerson: ProcessedPerson = {
      id: `person_${Date.now()}`,
      generation: 1,
      sex: 'male',
      name: {
        surname: '',
        given_name: ''
      },
      birth: {
        original_date: null,
        date: null,
        place: null
      },
      death: {
        original_date: null,
        date: null,
        place: null
      },
      x: 0,
      y: 0,
      displayName: '',
      isUncertain: false,
      ...personData
    }
    
    // 表示名を更新
    newPerson.displayName = `${newPerson.name.surname} ${newPerson.name.given_name}`.trim()
    
    const newPersons = [...persons, newPerson]
    pushState({ persons: newPersons, families }, `${newPerson.displayName}を追加`)
  }, [persons, families, pushState])

  // 人物更新
  const updatePerson = useCallback((id: string, updates: Partial<ProcessedPerson>) => {
    const newPersons = persons.map(person => {
      if (person.id === id) {
        const updated = { ...person, ...updates }
        // 名前が更新された場合は表示名も更新
        if (updates.name) {
          updated.displayName = `${updated.name.surname} ${updated.name.given_name}`.trim()
        }
        return updated
      }
      return person
    })
    
    const updatedPerson = newPersons.find(p => p.id === id)
    const actionName = updatedPerson ? `${updatedPerson.displayName}を更新` : '人物を更新'
    pushState({ persons: newPersons, families }, actionName)
  }, [persons, families, pushState])

  // 人物削除
  const deletePerson = useCallback((id: string) => {
    const personToDelete = persons.find(p => p.id === id)
    const newPersons = persons.filter(person => person.id !== id)
    
    // 関連する家族関係も削除
    const newFamilies = families.filter(family => 
      !family.parents.some(p => p.id === id) && 
      !family.children.some(c => c.id === id)
    )
    
    const actionName = personToDelete ? `${personToDelete.displayName}を削除` : '人物を削除'
    pushState({ persons: newPersons, families: newFamilies }, actionName)
  }, [persons, families, pushState])

  // 家族関係追加
  const addFamily = useCallback((familyData: {
    parentIds: string[]
    childrenIds?: string[]
    marriageDate?: string
    divorceDate?: string
    relationType: 'blood' | 'adoption'
  }) => {
    const parents = familyData.parentIds
      .map(id => persons.find(p => p.id === id))
      .filter((p): p is ProcessedPerson => p !== undefined)
    
    const children = (familyData.childrenIds || [])
      .map(id => persons.find(p => p.id === id))
      .filter((p): p is ProcessedPerson => p !== undefined)

    const newFamily: FamilyGroup = {
      id: `family_${Date.now()}`,
      parents,
      children,
      marriageDate: familyData.marriageDate,
      divorceDate: familyData.divorceDate,
      relationType: familyData.relationType,
      marriageLines: [],
      childrenLines: []
    }

    const newFamilies = [...families, newFamily]
    const parentNames = parents.map(p => p.displayName).join('と')
    const actionName = parents.length > 1 ? `${parentNames}の関係を追加` : `${parentNames}の家族関係を追加`
    pushState({ persons, families: newFamilies }, actionName)
  }, [persons, families, pushState])

  // 家族関係更新
  const updateFamily = useCallback((id: string, updates: Partial<FamilyGroup>) => {
    const newFamilies = families.map(family => 
      family.id === id ? { ...family, ...updates } : family
    )
    pushState({ persons, families: newFamilies }, '家族関係を更新')
  }, [persons, families, pushState])

  // 家族関係削除
  const deleteFamily = useCallback((id: string) => {
    const familyToDelete = families.find(f => f.id === id)
    const newFamilies = families.filter(family => family.id !== id)
    
    let actionName = '家族関係を削除'
    if (familyToDelete && familyToDelete.parents.length > 0) {
      const parentNames = familyToDelete.parents.map(p => p.displayName).join('と')
      actionName = `${parentNames}の関係を削除`
    }
    
    pushState({ persons, families: newFamilies }, actionName)
  }, [persons, families, pushState])

  // 人物検索
  const getPersonById = useCallback((id: string) => {
    return persons.find(person => person.id === id)
  }, [persons])

  // 家族検索
  const getFamilyById = useCallback((id: string) => {
    return families.find(family => family.id === id)
  }, [families])

  // データ再読み込み
  const refreshData = useCallback(async () => {
    await loadData()
  }, [loadData])

  // アンドゥ・リドゥ操作
  const undo = useCallback(() => {
    undoState()
  }, [undoState])

  const redo = useCallback(() => {
    redoState()
  }, [redoState])

  return {
    persons,
    families,
    rawData,
    isLoading,
    error,
    addPerson,
    updatePerson,
    deletePerson,
    addFamily,
    updateFamily,
    deleteFamily,
    canUndo,
    canRedo,
    undo,
    redo,
    getPersonById,
    getFamilyById,
    refreshData
  }
} 