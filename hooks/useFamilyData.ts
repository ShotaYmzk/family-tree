import { useState, useEffect, useCallback } from 'react'
import { 
  loadFamilyData, 
  processFamilyData,
  ProcessedPerson,
  FamilyGroup,
  FamilyTreeData
} from '../utils/familyDataProcessor'

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
  
  // ユーティリティ
  getPersonById: (id: string) => ProcessedPerson | undefined
  getFamilyById: (id: string) => FamilyGroup | undefined
  refreshData: () => Promise<void>
}

export function useFamilyData(): UseFamilyDataReturn {
  const [rawData, setRawData] = useState<FamilyTreeData | null>(null)
  const [persons, setPersons] = useState<ProcessedPerson[]>([])
  const [families, setFamilies] = useState<FamilyGroup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // データ読み込み
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const data = await loadFamilyData()
      const processed = processFamilyData(data)
      
      setRawData(data)
      setPersons(processed.persons)
      setFamilies(processed.families)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'データの読み込みに失敗しました')
      console.error('Failed to load family data:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

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
    
    setPersons(prev => [...prev, newPerson])
  }, [])

  // 人物更新
  const updatePerson = useCallback((id: string, updates: Partial<ProcessedPerson>) => {
    setPersons(prev => prev.map(person => {
      if (person.id === id) {
        const updated = { ...person, ...updates }
        // 名前が更新された場合は表示名も更新
        if (updates.name) {
          updated.displayName = `${updated.name.surname} ${updated.name.given_name}`.trim()
        }
        return updated
      }
      return person
    }))
  }, [])

  // 人物削除
  const deletePerson = useCallback((id: string) => {
    setPersons(prev => prev.filter(person => person.id !== id))
    
    // 関連する家族関係も削除
    setFamilies(prev => prev.filter(family => 
      !family.parents.some(p => p.id === id) && 
      !family.children.some(c => c.id === id)
    ))
  }, [])

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

    setFamilies(prev => [...prev, newFamily])
  }, [persons])

  // 家族関係更新
  const updateFamily = useCallback((id: string, updates: Partial<FamilyGroup>) => {
    setFamilies(prev => prev.map(family => 
      family.id === id ? { ...family, ...updates } : family
    ))
  }, [])

  // 家族関係削除
  const deleteFamily = useCallback((id: string) => {
    setFamilies(prev => prev.filter(family => family.id !== id))
  }, [])

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
    getPersonById,
    getFamilyById,
    refreshData
  }
} 