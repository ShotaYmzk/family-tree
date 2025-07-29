"use client"

import { useState, useCallback, useRef, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Upload,
  Save,
  Download,
  Search,
  Plus,
  Trash2,
  Move,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  User,
  Users,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  Eye,
  Edit3,
} from "lucide-react"

interface FamilyMember {
  id: string
  name: {
    surname: string
    given_name: string
  }
  sex?: string
  birth?: {
    date: string
    place?: string
  }
  death?: {
    date: string
    place?: string
  }
  father?: string
  mother?: string
  adoptive_father?: string
  adoptive_mother?: string
  spouse?: {
    name: string
    marriage_date?: string
  }
  spouses?: Array<{
    name: string
    marriage_date?: string
    divorce_date?: string
  }>
  children?: Array<{
    name: string
    mother?: string
  }>
  adoptive_children?: Array<{
    name: string
    type?: string
  }>
  x?: number
  y?: number
  generation?: number
}

interface ProcessedPerson extends FamilyMember {
  x: number
  y: number
  generation: number
  displayName: string
  isUncertain?: boolean
}

interface AvailablePerson {
  id: string
  name: string
}

interface Person {
  id: string
  name: string
  birthDate: string
  deathDate: string
  gender: string
  generation: number
  x: number
  y: number
  isUncertain?: boolean
}

interface Project {
  id: string
  name: string
  lastModified: string
  status: string
}

export default function FamilyTreeApp() {
  const [selectedPerson, setSelectedPerson] = useState<ProcessedPerson | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [processingStatus, setProcessingStatus] = useState("家系図生成完了")
  const [leftSidebarWidth, setLeftSidebarWidth] = useState(320)
  const [rightSidebarWidth, setRightSidebarWidth] = useState(320)
  const [isResizing, setIsResizing] = useState<"left" | "right" | null>(null)

  // 編集機能用のstate
  const [isAddPersonDialogOpen, setIsAddPersonDialogOpen] = useState(false)
  const [isAddRelationshipDialogOpen, setIsAddRelationshipDialogOpen] = useState(false)
  const [familyData, setFamilyData] = useState<any>({ family_members: [] })
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const containerRef = useRef<HTMLDivElement>(null)
  
  // ドラッグ&ドロップ用のstate
  const [isDragging, setIsDragging] = useState(false)
  const [draggedPerson, setDraggedPerson] = useState<ProcessedPerson | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [personPositions, setPersonPositions] = useState<Record<string, { x: number, y: number }>>({})

  // 新しい人物追加フォーム用のstate
  const [newPersonForm, setNewPersonForm] = useState({
    surname: "",
    givenName: "",
    birthDate: "",
    deathDate: "",
    birthPlace: "",
    deathPlace: "",
    gender: "male",
    father: "none",
    mother: "none",
    adoptiveFather: "none",
    adoptiveMother: "none",
  })

  // 関係追加フォーム用のstate
  const [relationshipForm, setRelationshipForm] = useState({
    person1: "",
    person2: "",
    relationshipType: "spouse", // spouse, child, parent, sibling
    marriageDate: "",
    divorceDate: "",
  })

  // Load family data from JSON file
  useEffect(() => {
    const loadFamilyData = async () => {
      try {
        const response = await fetch('/family-info.json')
        const data = await response.json()
        setFamilyData(data)
      } catch (error) {
        console.error('Failed to load family data:', error)
      }
    }
    loadFamilyData()
  }, [])

  // 家系図データを処理する関数（改良されたレイアウト）
  const processedPersons = useMemo(() => {
    if (!familyData.family_members || familyData.family_members.length === 0) {
      return []
    }

    const persons: ProcessedPerson[] = []
    
    // 世代ごとに人物を分類
    const generationGroups = new Map<number, any[]>()
    familyData.family_members.forEach((person: any) => {
      const generation = person.generation || 1
      if (!generationGroups.has(generation)) {
        generationGroups.set(generation, [])
      }
      generationGroups.get(generation)!.push(person)
    })

    // 家族グループを特定（結婚関係を基に）
    const familyUnits = new Map<string, {husband: any, wives: any[], children: any[]}>()
    
    // 男性を中心とした家族単位を作成
    familyData.family_members.forEach((person: any) => {
      if (person.sex === 'male' && (person.spouse || (person.spouses && person.spouses.length > 0))) {
        const wives: any[] = []
        
        // 配偶者を探す
        if (person.spouse?.name) {
          const wife = familyData.family_members.find((p: any) => 
            `${p.name.surname} ${p.name.given_name}`.trim() === person.spouse.name.trim()
          )
          if (wife) wives.push(wife)
        }
        
        if (person.spouses && person.spouses.length > 0) {
          person.spouses.forEach((spouse: any) => {
            const wife = familyData.family_members.find((p: any) => 
              `${p.name.surname} ${p.name.given_name}`.trim() === spouse.name.trim()
            )
            if (wife && !wives.find(w => w.id === wife.id)) {
              wives.push(wife)
            }
          })
        }

        // 子供を探す
        const children: any[] = []
        if (person.children && person.children.length > 0) {
          person.children.forEach((childInfo: any) => {
            const child = familyData.family_members.find((p: any) => 
              `${p.name.surname} ${p.name.given_name}`.trim() === childInfo.name.trim()
            )
            if (child) {
              children.push({...child, motherName: childInfo.mother})
            }
          })
        }

        if (wives.length > 0) {
          familyUnits.set(person.id, {
            husband: person,
            wives,
            children
          })
        }
      }
    })

    // 既に家族単位に含まれている人物をトラック
    const assignedPersons = new Set<string>()

    let currentX = 100
    const generationSpacing = 250    // 世代間隔を増加
    const minFamilySpacing = 450     // 家族間の最小間隔をさらに増加
    const cardSpacing = 200          // カード間の最小間隔を増加
    const spouseSpacing = 180        // 配偶者間の間隔をさらに増加
    const cardWidth = 160            // カードの幅（重複チェック用）

    // 世代順にレイアウト
    Array.from(generationGroups.keys()).sort((a, b) => a - b).forEach(generation => {
      const generationY = 80 + (generation - 1) * generationSpacing
      let generationX = currentX

      // この世代の家族単位を処理
      const generationFamilies = Array.from(familyUnits.values()).filter(
        family => family.husband.generation === generation
      )

      generationFamilies.forEach(family => {
        const husband = family.husband
        const wives = family.wives

        if (wives.length === 1) {
          // 一夫一妻：夫婦を並べて配置
          const wife = wives[0]
          
          const wifePosition = personPositions[wife.id] || { x: generationX, y: generationY }
          const husbandPosition = personPositions[husband.id] || { x: generationX + spouseSpacing, y: generationY }
          
          persons.push({
            ...wife,
            displayName: `${wife.name.surname} ${wife.name.given_name}`.trim(),
            generation,
            x: wifePosition.x,
            y: wifePosition.y,
            isUncertain: false,
          })
          
          persons.push({
            ...husband,
            displayName: `${husband.name.surname} ${husband.name.given_name}`.trim(),
            generation,
            x: husbandPosition.x,
            y: husbandPosition.y,
            isUncertain: false,
          })

          assignedPersons.add(wife.id)
          assignedPersons.add(husband.id)
          generationX += minFamilySpacing

        } else if (wives.length > 1) {
          // 一夫多妻：女性=男性=女性の配置
          const totalSpan = (wives.length + 1) * spouseSpacing
          const startX = generationX

          // 夫を中央に配置
          const husbandX = startX + Math.floor(wives.length / 2) * spouseSpacing
          const husbandPosition = personPositions[husband.id] || { x: husbandX, y: generationY }
          
          persons.push({
            ...husband,
            displayName: `${husband.name.surname} ${husband.name.given_name}`.trim(),
            generation,
            x: husbandPosition.x,
            y: husbandPosition.y,
            isUncertain: false,
          })
          assignedPersons.add(husband.id)

          // 妻たちを夫の左右に配置
          wives.forEach((wife, index) => {
            let wifeX: number
            if (index < Math.floor(wives.length / 2)) {
              // 夫の左側
              wifeX = startX + index * spouseSpacing
            } else {
              // 夫の右側（夫の位置をスキップ）
              wifeX = startX + (index + 1) * spouseSpacing
            }
            
            const wifePosition = personPositions[wife.id] || { x: wifeX, y: generationY }
            
            persons.push({
              ...wife,
              displayName: `${wife.name.surname} ${wife.name.given_name}`.trim(),
              generation,
              x: wifePosition.x,
              y: wifePosition.y,
              isUncertain: false,
            })
            assignedPersons.add(wife.id)
          })

          generationX += totalSpan + minFamilySpacing
        }
      })

      // 家族単位に含まれない独身者を配置
      const singlePersons = generationGroups.get(generation)!.filter(
        (person: any) => !assignedPersons.has(person.id)
      )

      // 独身者の配置では重複をより厳密にチェック
      singlePersons.forEach((person: any) => {
        // 既存の人物と重ならないようにX位置を調整
        let proposedX = generationX
        let collision = true
        
        while (collision) {
          collision = persons.some(existing => 
            existing.generation === generation && 
            Math.abs(existing.x - proposedX) < (cardSpacing + cardWidth)
          )
          if (collision) {
            proposedX += cardSpacing
          }
        }

        const position = personPositions[person.id] || { x: proposedX, y: generationY }

        persons.push({
          ...person,
          displayName: `${person.name.surname} ${person.name.given_name}`.trim(),
          generation,
          x: position.x,
          y: position.y,
          isUncertain: false,
        })
        generationX = proposedX + cardSpacing
        assignedPersons.add(person.id)
      })
    })

    return persons
  }, [familyData.family_members, personPositions])

  // 結婚・家族グループを作成する関数
  const createFamilyGroups = useMemo(() => {
    const familyGroups: Array<{
      husband: ProcessedPerson
      wives: ProcessedPerson[]
      marriageLines: Array<{x1: number, y1: number, x2: number, y2: number}>
      childrenLines: Array<{
        fromX: number,
        fromY: number,
        toX: number,
        toY: number,
        child: ProcessedPerson
      }>
    }> = []

    // すべての配偶者関係を双方向で検出
    const marriageConnections = new Set<string>()
    const addedConnections = new Set<string>()

    // 各人物の配偶者関係をチェック
    processedPersons.forEach(person => {
      // spouse フィールドがある場合
      if (person.spouse?.name) {
        const spouse = processedPersons.find(p => 
          `${p.name.surname} ${p.name.given_name}`.trim() === person.spouse!.name.trim()
        )
        if (spouse) {
          const connectionKey = [person.id, spouse.id].sort().join('-')
          marriageConnections.add(connectionKey)
        }
      }

      // spouses 配列がある場合
      if (person.spouses && person.spouses.length > 0) {
        person.spouses.forEach((spouseInfo: any) => {
          const spouse = processedPersons.find(p => 
            `${p.name.surname} ${p.name.given_name}`.trim() === spouseInfo.name.trim()
          )
          if (spouse) {
            const connectionKey = [person.id, spouse.id].sort().join('-')
            marriageConnections.add(connectionKey)
          }
        })
      }
    })

    // 男性を中心とした家族グループを作成（従来の構造を維持）
    processedPersons.forEach(person => {
      if (person.sex === 'male' && (person.spouse || (person.spouses && person.spouses.length > 0))) {
        const wives: ProcessedPerson[] = []
        
        // spouse フィールドがある場合
        if (person.spouse?.name) {
          const wife = processedPersons.find(p => 
            `${p.name.surname} ${p.name.given_name}`.trim() === person.spouse!.name.trim()
          )
          if (wife) wives.push(wife)
        }

        // spouses 配列がある場合
        if (person.spouses && person.spouses.length > 0) {
          person.spouses.forEach((spouse: any) => {
            const wife = processedPersons.find(p => 
              `${p.name.surname} ${p.name.given_name}`.trim() === spouse.name.trim()
            )
            if (wife && !wives.find(w => w.id === wife.id)) {
              wives.push(wife)
            }
          })
        }

        if (wives.length > 0) {
          // 結婚線の計算（二重線）
          const marriageLines: Array<{x1: number, y1: number, x2: number, y2: number}> = []
          
          wives.forEach(wife => {
            const connectionKey = [person.id, wife.id].sort().join('-')
            if (!addedConnections.has(connectionKey)) {
              marriageLines.push({
                x1: person.x,
                y1: person.y,
                x2: wife.x,
                y2: wife.y
              })
              addedConnections.add(connectionKey)
            }
          })

          // 子供への線の計算
          const childrenLines: Array<{fromX: number, fromY: number, toX: number, toY: number, child: ProcessedPerson, mother?: string}> = []
          
          if (person.children && person.children.length > 0) {
            person.children.forEach((childInfo: any) => {
              const child = processedPersons.find(p => 
                `${p.name.surname} ${p.name.given_name}`.trim() === childInfo.name.trim()
              )
              if (child) {
                // どの妻の子供かを判定
                let motherWife: ProcessedPerson | undefined
                if (childInfo.mother) {
                  motherWife = wives.find(wife => 
                    `${wife.name.surname} ${wife.name.given_name}`.includes(childInfo.mother) ||
                    childInfo.mother.includes(`${wife.name.surname} ${wife.name.given_name}`) ||
                    wife.name.given_name === childInfo.mother
                  )
                }

                // 結婚線の中点から子供へ
                let marriageLineCenterX: number
                let marriageLineCenterY: number
                
                if (wives.length === 1) {
                  // 一夫一妻の場合：夫と妻の中点
                  marriageLineCenterX = (person.x + wives[0].x) / 2
                  marriageLineCenterY = (person.y + wives[0].y) / 2
                } else if (motherWife) {
                  // 複数の妻がいる場合：特定の母親との中点
                  marriageLineCenterX = (person.x + motherWife.x) / 2
                  marriageLineCenterY = (person.y + motherWife.y) / 2
                } else {
                  // 母親が特定できない場合：夫の位置から
                  marriageLineCenterX = person.x
                  marriageLineCenterY = person.y
                }

                childrenLines.push({
                  fromX: marriageLineCenterX,
                  fromY: marriageLineCenterY + 20, // 結婚線の少し下から
                  toX: child.x,
                  toY: child.y - 40, // 子供カードの上部に接続
                  child,
                  mother: childInfo.mother
                })
              }
            })
          }

          familyGroups.push({
            husband: person,
            wives,
            marriageLines,
            childrenLines
          })
        }
      }
    })

    // 男性中心でない結婚関係を追加（女性同士や、データで男性として処理されていない場合）
    marriageConnections.forEach(connectionKey => {
      if (!addedConnections.has(connectionKey)) {
        const [id1, id2] = connectionKey.split('-')
        const person1 = processedPersons.find(p => p.id === id1)
        const person2 = processedPersons.find(p => p.id === id2)
        
        if (person1 && person2) {
          // 簡易的な家族グループとして追加
          familyGroups.push({
            husband: person1, // 便宜上husband扱い
            wives: [person2],
            marriageLines: [{
              x1: person1.x,
              y1: person1.y,
              x2: person2.x,
              y2: person2.y
            }],
            childrenLines: []
          })
          addedConnections.add(connectionKey)
        }
      }
    })

    return familyGroups
  }, [processedPersons])

  // 旧来の結婚関係を探す関数（下位互換性のため保持）
  const findMarriageConnections = useMemo(() => {
    return createFamilyGroups.flatMap(group => 
      group.marriageLines.map(line => ({
        person1: group.husband,
        person2: group.wives[0], // 簡略化
        isMarried: true
      }))
    )
  }, [createFamilyGroups])

  // 親子関係を探す関数
  const findParentChildConnections = useMemo(() => {
    const connections: Array<{parent: ProcessedPerson, child: ProcessedPerson}> = []
    
    processedPersons.forEach(person => {
      // father関係
      if (person.father) {
        const parent = processedPersons.find(p => p.id === person.father)
        if (parent) {
          connections.push({parent, child: person})
        }
      }

      // mother関係  
      if (person.mother) {
        const parent = processedPersons.find(p => p.id === person.mother)
        if (parent) {
          connections.push({parent, child: person})
        }
      }

      // adoptive_father関係
      if (person.adoptive_father) {
        const parent = processedPersons.find(p => p.id === person.adoptive_father)
        if (parent) {
          connections.push({parent, child: person})
        }
      }

      // adoptive_mother関係
      if (person.adoptive_mother) {
        const parent = processedPersons.find(p => p.id === person.adoptive_mother)
        if (parent) {
          connections.push({parent, child: person})
        }
      }
    })

    return connections
  }, [processedPersons])

  // リサイズ機能
  const handleMouseDown = useCallback((side: "left" | "right") => {
    setIsResizing(side)
  }, [])

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing || !containerRef.current) return

      const containerRect = containerRef.current.getBoundingClientRect()
      const containerWidth = containerRect.width

      if (isResizing === "left") {
        const newWidth = Math.max(200, Math.min(500, e.clientX - containerRect.left))
        setLeftSidebarWidth(newWidth)
      } else if (isResizing === "right") {
        const newWidth = Math.max(200, Math.min(500, containerRect.right - e.clientX))
        setRightSidebarWidth(newWidth)
      }
    },
    [isResizing],
  )

  const handleMouseUp = useCallback(() => {
    setIsResizing(null)
  }, [])

  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
      return () => {
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
      }
    }
  }, [isResizing, handleMouseMove, handleMouseUp])

  // ドラッグ&ドロップのハンドラー関数
  const handleCardMouseDown = useCallback((e: React.MouseEvent, person: ProcessedPerson) => {
    if (e.button !== 0) return // 左クリックのみ
    
    e.preventDefault()
    setIsDragging(true)
    setDraggedPerson(person)
    
    const rect = e.currentTarget.getBoundingClientRect()
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    })
  }, [])

  const handleCardMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !draggedPerson) return
    
    e.preventDefault()
    
    // スクロールコンテナからの相対位置を計算
    const scrollContainer = document.querySelector('.w-full.h-full.overflow-auto.p-8')
    if (!scrollContainer) return
    
    const containerRect = scrollContainer.getBoundingClientRect()
    const newX = e.clientX - containerRect.left - dragOffset.x + scrollContainer.scrollLeft
    const newY = e.clientY - containerRect.top - dragOffset.y + scrollContainer.scrollTop
    
    setPersonPositions(prev => ({
      ...prev,
      [draggedPerson.id]: { x: newX, y: newY }
    }))
  }, [isDragging, draggedPerson, dragOffset])

  const handleCardMouseUp = useCallback(() => {
    setIsDragging(false)
    setDraggedPerson(null)
    setDragOffset({ x: 0, y: 0 })
  }, [])

  // マウスイベントのグローバルリスナー
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleCardMouseMove)
      document.addEventListener('mouseup', handleCardMouseUp)
      document.body.style.cursor = 'grabbing'
      
      return () => {
        document.removeEventListener('mousemove', handleCardMouseMove)
        document.removeEventListener('mouseup', handleCardMouseUp)
        document.body.style.cursor = 'default'
      }
    }
  }, [isDragging, handleCardMouseMove, handleCardMouseUp])

  // 編集機能のハンドラー関数群
  const handleAddPerson = () => {
    const newId = `new_person_${Date.now()}`
    const newPerson = {
      id: newId,
      name: {
        surname: newPersonForm.surname,
        given_name: newPersonForm.givenName,
      },
      birth: newPersonForm.birthDate ? {
        date: newPersonForm.birthDate,
        place: newPersonForm.birthPlace || undefined,
      } : undefined,
      death: newPersonForm.deathDate ? {
        date: newPersonForm.deathDate,
        place: newPersonForm.deathPlace || undefined,
      } : undefined,
      father: newPersonForm.father === "none" ? undefined : newPersonForm.father,
      mother: newPersonForm.mother === "none" ? undefined : newPersonForm.mother,
      adoptive_father: newPersonForm.adoptiveFather === "none" ? undefined : newPersonForm.adoptiveFather,
      adoptive_mother: newPersonForm.adoptiveMother === "none" ? undefined : newPersonForm.adoptiveMother,
    }

    setFamilyData((prev: any) => ({
      ...prev,
      family_members: [...prev.family_members, newPerson]
    }))

    // フォームリセット
    setNewPersonForm({
      surname: "",
      givenName: "",
      birthDate: "",
      deathDate: "",
      birthPlace: "",
      deathPlace: "",
      gender: "male",
      father: "none",
      mother: "none",
      adoptiveFather: "none",
      adoptiveMother: "none",
    })

    setIsAddPersonDialogOpen(false)
  }

  const handleDeletePerson = () => {
    if (!selectedPerson) return

    const confirmed = window.confirm(
      `${selectedPerson.displayName}を削除してもよろしいですか？この操作は元に戻せません。`
    )

    if (confirmed) {
      setFamilyData((prev: any) => ({
        ...prev,
        family_members: prev.family_members.filter((person: any) => person.id !== selectedPerson.id)
      }))
      setSelectedPerson(null)
    }
  }

  const handleAutoLayout = () => {
    // 自動レイアウト: 世代別に整列
    const generations = new Map<number, ProcessedPerson[]>()
    
    processedPersons.forEach(person => {
      const gen = person.generation
      if (!generations.has(gen)) {
        generations.set(gen, [])
      }
      generations.get(gen)!.push(person)
    })

    // 各世代内での配置を調整
    generations.forEach((people, gen) => {
      people.forEach((person, index) => {
        const spacing = 180
        const startX = 100 + (spacing * index)
        const y = 100 + (gen * 150)
        
        // 実際の座標更新（表示のみの場合はここでstateを更新）
        person.x = startX
        person.y = y
      })
    })

    // 強制的に再レンダリング
    setFamilyData((prev: any) => ({ ...prev }))
  }

  const availablePersons: AvailablePerson[] = familyData.family_members.map((person: any) => ({
    id: person.id,
    name: `${person.name.surname} ${person.name.given_name}`,
  }))

  const handleAddRelationship = () => {
    if (!relationshipForm.person1 || !relationshipForm.person2) return

    const person1 = familyData.family_members.find((p: any) => p.id === relationshipForm.person1)
    const person2 = familyData.family_members.find((p: any) => p.id === relationshipForm.person2)
    
    if (!person1 || !person2) return

    const updatedFamilyMembers = [...familyData.family_members] as any[]

    switch (relationshipForm.relationshipType) {
      case "spouse":
        // 配偶者関係を追加
        const spouseInfo = {
          name: `${person2.name.surname} ${person2.name.given_name}`,
          marriage_date: relationshipForm.marriageDate || "",
          divorce_date: relationshipForm.divorceDate || undefined,
        }

        // person1にperson2を配偶者として追加
        const person1Index = updatedFamilyMembers.findIndex((p: any) => p.id === person1.id)
        if (person1Index !== -1) {
          if (!updatedFamilyMembers[person1Index].spouses) {
            updatedFamilyMembers[person1Index].spouses = []
          }
          updatedFamilyMembers[person1Index].spouses.push(spouseInfo)
        }

        // person2にperson1を配偶者として追加
        const person2Index = updatedFamilyMembers.findIndex((p: any) => p.id === person2.id)
        if (person2Index !== -1) {
          if (!updatedFamilyMembers[person2Index].spouses) {
            updatedFamilyMembers[person2Index].spouses = []
          }
          updatedFamilyMembers[person2Index].spouses.push({
            name: `${person1.name.surname} ${person1.name.given_name}`,
            marriage_date: relationshipForm.marriageDate || "",
            divorce_date: relationshipForm.divorceDate || undefined,
          })
        }
        break

      case "child":
        // person1がperson2の子になる
        const childIndex = updatedFamilyMembers.findIndex((p: any) => p.id === person1.id)
        if (childIndex !== -1) {
          updatedFamilyMembers[childIndex].father = person2.id
        }

        // person2にperson1を子として追加
        const parentIndex = updatedFamilyMembers.findIndex((p: any) => p.id === person2.id)
        if (parentIndex !== -1) {
          if (!updatedFamilyMembers[parentIndex].children) {
            updatedFamilyMembers[parentIndex].children = []
          }
          updatedFamilyMembers[parentIndex].children.push({
            name: `${person1.name.surname} ${person1.name.given_name}`,
            mother: "",
          })
        }
        break

      case "parent":
        // person1がperson2の親になる
        const parentIndex2 = updatedFamilyMembers.findIndex((p: any) => p.id === person2.id)
        if (parentIndex2 !== -1) {
          updatedFamilyMembers[parentIndex2].father = person1.id
        }

        // person1にperson2を子として追加
        const childIndex2 = updatedFamilyMembers.findIndex((p: any) => p.id === person1.id)
        if (childIndex2 !== -1) {
          if (!updatedFamilyMembers[childIndex2].children) {
            updatedFamilyMembers[childIndex2].children = []
          }
          updatedFamilyMembers[childIndex2].children.push({
            name: `${person2.name.surname} ${person2.name.given_name}`,
            mother: "",
          })
        }
        break
    }

    setFamilyData({
      ...familyData,
      family_members: updatedFamilyMembers
    })

    // フォームリセット
    setRelationshipForm({
      person1: "",
      person2: "",
      relationshipType: "spouse",
      marriageDate: "",
      divorceDate: "",
    })

    setIsAddRelationshipDialogOpen(false)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800"
      case "processing":
        return "bg-yellow-100 text-yellow-800"
      case "draft":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4" />
      case "processing":
        return <Clock className="w-4 h-4" />
      case "draft":
        return <Edit3 className="w-4 h-4" />
      default:
        return <Edit3 className="w-4 h-4" />
    }
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">家系図ジェネレーター</h1>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm">
              <Save className="w-4 h-4 mr-2" />
              保存
            </Button>
            <Button variant="outline" size="sm">
              <Upload className="w-4 h-4 mr-2" />
              読み込み
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              エクスポート
            </Button>
          </div>
        </div>
      </header>

      <div ref={containerRef} className="flex-1 flex overflow-hidden">
        {/* 左サイドバー */}
        <aside style={{ width: leftSidebarWidth }} className="bg-white border-r border-gray-200 flex flex-col">
          <div className="p-6 border-b border-gray-200">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer">
              <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-2">戸籍PDFをアップロード</p>
              <p className="text-sm text-gray-500">
                ファイルをドラッグ＆ドロップ
                <br />
                またはクリックして選択
              </p>
            </div>
          </div>

          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-gray-900">ステータス</span>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-800">{processingStatus}</span>
              </div>
            </div>
          </div>

          <div className="flex-1 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">最近のプロジェクト</h3>
            <ScrollArea className="h-full">
              <div className="space-y-3">
                {/* mockProjects.map((project) => ( */}
                  <Card key="project-1" className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-gray-900">田中家系図</h4>
                        <Badge className={`text-xs ${getStatusColor("completed")}`}>
                          <div className="flex items-center gap-1">
                            {getStatusIcon("completed")}
                            完了
                          </div>
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500">最終更新: 2024-01-15</p>
                    </CardContent>
                  </Card>
                  <Card key="project-2" className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-gray-900">佐藤家系図</h4>
                        <Badge className={`text-xs ${getStatusColor("processing")}`}>
                          <div className="flex items-center gap-1">
                            {getStatusIcon("processing")}
                            処理中
                          </div>
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500">最終更新: 2024-01-10</p>
                    </CardContent>
                  </Card>
                  <Card key="project-3" className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-gray-900">山田家系図</h4>
                        <Badge className={`text-xs ${getStatusColor("draft")}`}>
                          <div className="flex items-center gap-1">
                            {getStatusIcon("draft")}
                            下書き
                          </div>
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500">最終更新: 2024-01-05</p>
                    </CardContent>
                  </Card>
                {/* ))} */}
              </div>
            </ScrollArea>
          </div>
        </aside>

        {/* 左リサイズハンドル */}
        <div
          className="w-1 bg-gray-200 hover:bg-blue-400 cursor-col-resize transition-colors"
          onMouseDown={() => handleMouseDown("left")}
        />

        {/* 中央エリア - 家系図描画エリア */}
        <main className="flex-1 relative bg-gray-100">
          {/* ズーム・パンコントロール */}
          <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
            <Button size="sm" variant="outline" className="bg-white">
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" className="bg-white">
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" className="bg-white">
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>

          {/* 世代ラベル */}
          <div className="absolute left-4 top-20 z-10">
            {Array.from(new Set(processedPersons.map(p => p.generation))).sort().map((generation, index) => (
              <div 
                key={generation}
                className="bg-white px-3 py-1 rounded-full shadow-sm border mb-4"
                style={{ 
                  position: 'absolute',
                  top: `${60 + (generation - 1) * 180}px`
                }}
              >
                <span className="text-sm font-medium text-gray-600">第{generation}世代</span>
              </div>
            ))}
          </div>

          {/* 家系図キャンバス */}
          <div className="w-full h-full overflow-auto p-8">
            <div className="relative min-w-[800px] min-h-[600px]">
              {/* 世代区切り線 */}
              <div className="absolute inset-0">
                {Array.from(new Set(processedPersons.map(p => p.generation))).sort().map((generation) => (
                  <div 
                    key={`line-${generation}`}
                    className="absolute left-0 right-0 h-px bg-gray-300 opacity-50"
                    style={{ 
                      top: `${60 + (generation - 1) * 180}px`
                    }}
                  ></div>
                ))}
              </div>

              {/* 関係線 */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                {/* 結婚関係線 (二重線) */}
                {createFamilyGroups.map((family, familyIndex) => (
                  <g key={`family-${familyIndex}`}>
                    {family.marriageLines.map((line, lineIndex) => {
                      // 縦横の線で接続（L字型）
                      const midX = (line.x1 + line.x2) / 2
                      const cornerRadius = 8
                      
                      // 横線が上か下かを判定
                      const isHorizontalFirst = Math.abs(line.x2 - line.x1) > Math.abs(line.y2 - line.y1)
                      
                      let path1: string
                      let path2: string
                      
                      if (isHorizontalFirst) {
                        // 水平→垂直の順で接続
                        if (line.x1 < line.x2) {
                          // 左から右へ
                          if (line.y1 < line.y2) {
                            // 上から下へ
                            path1 = `M ${line.x1} ${line.y1 - 2} L ${midX - cornerRadius} ${line.y1 - 2} Q ${midX} ${line.y1 - 2} ${midX} ${line.y1 + cornerRadius - 2} L ${midX} ${line.y2 - 2}`
                            path2 = `M ${line.x1} ${line.y1 + 2} L ${midX - cornerRadius} ${line.y1 + 2} Q ${midX} ${line.y1 + 2} ${midX} ${line.y1 + cornerRadius + 2} L ${midX} ${line.y2 + 2}`
                          } else {
                            // 下から上へ
                            path1 = `M ${line.x1} ${line.y1 - 2} L ${midX - cornerRadius} ${line.y1 - 2} Q ${midX} ${line.y1 - 2} ${midX} ${line.y1 - cornerRadius - 2} L ${midX} ${line.y2 - 2}`
                            path2 = `M ${line.x1} ${line.y1 + 2} L ${midX - cornerRadius} ${line.y1 + 2} Q ${midX} ${line.y1 + 2} ${midX} ${line.y1 - cornerRadius + 2} L ${midX} ${line.y2 + 2}`
                          }
                        } else {
                          // 右から左へ
                          if (line.y1 < line.y2) {
                            // 上から下へ
                            path1 = `M ${line.x1} ${line.y1 - 2} L ${midX + cornerRadius} ${line.y1 - 2} Q ${midX} ${line.y1 - 2} ${midX} ${line.y1 + cornerRadius - 2} L ${midX} ${line.y2 - 2}`
                            path2 = `M ${line.x1} ${line.y1 + 2} L ${midX + cornerRadius} ${line.y1 + 2} Q ${midX} ${line.y1 + 2} ${midX} ${line.y1 + cornerRadius + 2} L ${midX} ${line.y2 + 2}`
                          } else {
                            // 下から上へ
                            path1 = `M ${line.x1} ${line.y1 - 2} L ${midX + cornerRadius} ${line.y1 - 2} Q ${midX} ${line.y1 - 2} ${midX} ${line.y1 - cornerRadius - 2} L ${midX} ${line.y2 - 2}`
                            path2 = `M ${line.x1} ${line.y1 + 2} L ${midX + cornerRadius} ${line.y1 + 2} Q ${midX} ${line.y1 + 2} ${midX} ${line.y1 - cornerRadius + 2} L ${midX} ${line.y2 + 2}`
                          }
                        }
                        
                        // 第二セグメント（垂直から水平）
                        if (line.y2 < line.y1) {
                          // 上向き
                          if (midX < line.x2) {
                            path1 += ` Q ${midX} ${line.y2 - 2} ${midX + cornerRadius} ${line.y2 - 2} L ${line.x2} ${line.y2 - 2}`
                            path2 += ` Q ${midX} ${line.y2 + 2} ${midX + cornerRadius} ${line.y2 + 2} L ${line.x2} ${line.y2 + 2}`
                          } else {
                            path1 += ` Q ${midX} ${line.y2 - 2} ${midX - cornerRadius} ${line.y2 - 2} L ${line.x2} ${line.y2 - 2}`
                            path2 += ` Q ${midX} ${line.y2 + 2} ${midX - cornerRadius} ${line.y2 + 2} L ${line.x2} ${line.y2 + 2}`
                          }
                        } else {
                          // 下向き
                          if (midX < line.x2) {
                            path1 += ` Q ${midX} ${line.y2 - 2} ${midX + cornerRadius} ${line.y2 - 2} L ${line.x2} ${line.y2 - 2}`
                            path2 += ` Q ${midX} ${line.y2 + 2} ${midX + cornerRadius} ${line.y2 + 2} L ${line.x2} ${line.y2 + 2}`
                          } else {
                            path1 += ` Q ${midX} ${line.y2 - 2} ${midX - cornerRadius} ${line.y2 - 2} L ${line.x2} ${line.y2 - 2}`
                            path2 += ` Q ${midX} ${line.y2 + 2} ${midX - cornerRadius} ${line.y2 + 2} L ${line.x2} ${line.y2 + 2}`
                          }
                        }
                      } else {
                        // シンプルな水平線（同じY位置の場合）
                        path1 = `M ${line.x1} ${line.y1 - 2} L ${line.x2} ${line.y2 - 2}`
                        path2 = `M ${line.x1} ${line.y1 + 2} L ${line.x2} ${line.y2 + 2}`
                      }
                      
                      return (
                        <g key={`marriage-line-${lineIndex}`}>
                          {/* 1本目の線 */}
                          <path
                            d={path1}
                            stroke="#dc2626"
                            strokeWidth="2"
                            fill="none"
                            opacity="0.8"
                          />
                          {/* 2本目の線 */}
                          <path
                            d={path2}
                            stroke="#dc2626"
                            strokeWidth="2"
                            fill="none"
                            opacity="0.8"
                          />
                        </g>
                      )
                    })}
                    
                    {/* 子供への線 */}
                    {(() => {
                      // 同じ起点を持つ子供たちをグループ化
                      const childGroups = new Map<string, typeof family.childrenLines>()
                      family.childrenLines.forEach(childLine => {
                        const key = `${childLine.fromX}-${childLine.fromY}`
                        if (!childGroups.has(key)) {
                          childGroups.set(key, [])
                        }
                        childGroups.get(key)!.push(childLine)
                      })

                      return Array.from(childGroups.entries()).map(([key, children], groupIndex) => {
                        const cornerRadius = 8
                        
                        if (children.length === 1) {
                          // 子供が1人の場合：L字型の接続
                          const child = children[0]
                          const midY = child.fromY + 30
                          
                          const pathToChild = child.fromX === child.toX 
                            ? `M ${child.fromX} ${child.fromY} L ${child.toX} ${child.toY}` // 直線
                            : `M ${child.fromX} ${child.fromY} L ${child.fromX} ${midY - cornerRadius} Q ${child.fromX} ${midY} ${child.fromX + (child.toX > child.fromX ? cornerRadius : -cornerRadius)} ${midY} L ${child.toX - (child.toX > child.fromX ? cornerRadius : -cornerRadius)} ${midY} Q ${child.toX} ${midY} ${child.toX} ${midY + cornerRadius} L ${child.toX} ${child.toY}`
                          
                          return (
                            <g key={`child-group-${groupIndex}`}>
                              <path
                                d={pathToChild}
                                stroke="#6b7280"
                                strokeWidth="2"
                                fill="none"
                                opacity="0.7"
                              />
                            </g>
                          )
                        } else {
                          // 複数の子供がいる場合：T字型の分岐
                          const firstChild = children[0]
                          const childXPositions = children.map(c => c.toX).sort((a, b) => a - b)
                          const leftMostX = Math.min(...childXPositions)
                          const rightMostX = Math.max(...childXPositions)
                          const midY = firstChild.fromY + 30
                          
                          return (
                            <g key={`child-group-${groupIndex}`}>
                              {/* 共通垂直線 */}
                              <path
                                d={`M ${firstChild.fromX} ${firstChild.fromY} L ${firstChild.fromX} ${midY - cornerRadius} Q ${firstChild.fromX} ${midY} ${firstChild.fromX + (leftMostX < firstChild.fromX ? -cornerRadius : cornerRadius)} ${midY}`}
                                stroke="#6b7280"
                                strokeWidth="2"
                                fill="none"
                                opacity="0.7"
                              />
                              {/* 水平分岐線 */}
                              <path
                                d={`M ${leftMostX + cornerRadius < firstChild.fromX ? leftMostX : firstChild.fromX - cornerRadius} ${midY} L ${rightMostX - cornerRadius > firstChild.fromX ? rightMostX : firstChild.fromX + cornerRadius} ${midY}`}
                                stroke="#6b7280"
                                strokeWidth="2"
                                fill="none"
                                opacity="0.7"
                              />
                              {/* 各子供への個別の線 */}
                              {children.map((child, childIndex) => (
                                <path
                                  key={`child-individual-${childIndex}`}
                                  d={`M ${child.toX} ${midY} Q ${child.toX} ${midY + cornerRadius} ${child.toX} ${midY + cornerRadius} L ${child.toX} ${child.toY}`}
                                  stroke="#6b7280"
                                  strokeWidth="2"
                                  fill="none"
                                  opacity="0.7"
                                />
                              ))}
                            </g>
                          )
                        }
                      })
                    })()}
                  </g>
                ))}

                {/* 旧来の親子関係線 (結婚関係に含まれない親子関係用) */}
                {findParentChildConnections.filter(connection => {
                  // 既に家族グループで処理された子供は除外
                  return !createFamilyGroups.some(family => 
                    family.childrenLines.some(childLine => childLine.child.id === connection.child.id)
                  )
                }).map((connection, index) => {
                  const cornerRadius = 8
                  const midY = (connection.parent.y + connection.child.y) / 2
                  
                  const pathToChild = connection.parent.x === connection.child.x 
                    ? `M ${connection.parent.x} ${connection.parent.y + 20} L ${connection.child.x} ${connection.child.y - 20}` // 直線
                    : `M ${connection.parent.x} ${connection.parent.y + 20} L ${connection.parent.x} ${midY - cornerRadius} Q ${connection.parent.x} ${midY} ${connection.parent.x + (connection.child.x > connection.parent.x ? cornerRadius : -cornerRadius)} ${midY} L ${connection.child.x - (connection.child.x > connection.parent.x ? cornerRadius : -cornerRadius)} ${midY} Q ${connection.child.x} ${midY} ${connection.child.x} ${midY + cornerRadius} L ${connection.child.x} ${connection.child.y - 20}`
                  
                  return (
                    <path
                      key={`parent-child-${index}`}
                      d={pathToChild}
                      stroke="#6b7280"
                      strokeWidth="2"
                      fill="none"
                      opacity="0.7"
                    />
                  )
                })}
              </svg>

              {/* 人物ノード */}
              {processedPersons.map((person) => (
                <div
                  key={person.id}
                  className={`absolute cursor-pointer transform -translate-x-1/2 -translate-y-1/2 ${
                    selectedPerson?.id === person.id ? "ring-2 ring-blue-500" : ""
                  }`}
                  style={{ left: person.x, top: person.y }}
                  onClick={() => setSelectedPerson(person)}
                  onMouseDown={(e) => handleCardMouseDown(e, person)}
                >
                  <Card
                    className={`w-40 ${person.isUncertain ? "border-dashed border-yellow-400 bg-yellow-50" : 
                      person.sex === "male" ? "bg-blue-50 border-blue-200" : 
                      person.sex === "female" ? "bg-pink-50 border-pink-200" : "bg-white"} hover:shadow-lg transition-shadow`}
                  >
                                          <CardContent className="p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`w-3 h-3 rounded-full ${
                            person.sex === "male" ? "bg-blue-500" : 
                            person.sex === "female" ? "bg-pink-500" : "bg-gray-400"
                          }`}></div>
                          {person.isUncertain && <AlertCircle className="w-3 h-3 text-yellow-600" />}
                        </div>
                      <h4 className="font-medium text-sm text-gray-900 mb-1">{person.displayName}</h4>
                      <div className="text-xs text-gray-600 space-y-1">
                        {person.birth?.date && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>{person.birth.date}</span>
                          </div>
                        )}
                        {person.death?.date && (
                          <div className="flex items-center gap-1">
                            <span>†</span>
                            <span>{person.death.date}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </main>

        {/* 右リサイズハンドル */}
        <div
          className="w-1 bg-gray-200 hover:bg-blue-400 cursor-col-resize transition-colors"
          onMouseDown={() => handleMouseDown("right")}
        />

        {/* 右サイドバー - 編集ツール・情報表示 */}
        <aside style={{ width: rightSidebarWidth }} className="bg-white border-l border-gray-200 flex flex-col">
          {/* 検索機能 */}
          <div className="p-6 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="人物を検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* 編集ツールキット */}
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">編集ツール</h3>
            <div className="grid grid-cols-2 gap-3">
              <Dialog open={isAddPersonDialogOpen} onOpenChange={setIsAddPersonDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex flex-col items-center gap-1 h-auto py-3 bg-transparent"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-xs">人物追加</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>新しい人物を追加</DialogTitle>
                  </DialogHeader>
                  <div className="grid grid-cols-2 gap-4 py-4">
                    <div>
                      <Label htmlFor="surname">姓</Label>
                      <Input
                        id="surname"
                        value={newPersonForm.surname}
                        onChange={(e) => setNewPersonForm(prev => ({ ...prev, surname: e.target.value }))}
                        placeholder="田中"
                      />
                    </div>
                    <div>
                      <Label htmlFor="givenName">名</Label>
                      <Input
                        id="givenName"
                        value={newPersonForm.givenName}
                        onChange={(e) => setNewPersonForm(prev => ({ ...prev, givenName: e.target.value }))}
                        placeholder="太郎"
                      />
                    </div>
                    <div>
                      <Label htmlFor="birthDate">生年月日</Label>
                      <Input
                        id="birthDate"
                        type="date"
                        value={newPersonForm.birthDate}
                        onChange={(e) => setNewPersonForm(prev => ({ ...prev, birthDate: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="birthPlace">生年月日場所</Label>
                      <Input
                        id="birthPlace"
                        value={newPersonForm.birthPlace}
                        onChange={(e) => setNewPersonForm(prev => ({ ...prev, birthPlace: e.target.value }))}
                        placeholder="東京都"
                      />
                    </div>
                    <div>
                      <Label htmlFor="deathDate">没年月日</Label>
                      <Input
                        id="deathDate"
                        type="date"
                        value={newPersonForm.deathDate}
                        onChange={(e) => setNewPersonForm(prev => ({ ...prev, deathDate: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="deathPlace">没年月日場所</Label>
                      <Input
                        id="deathPlace"
                        value={newPersonForm.deathPlace}
                        onChange={(e) => setNewPersonForm(prev => ({ ...prev, deathPlace: e.target.value }))}
                        placeholder="東京都"
                      />
                    </div>
                    <div>
                      <Label htmlFor="father">父</Label>
                      <Select value={newPersonForm.father} onValueChange={(value) => setNewPersonForm(prev => ({ ...prev, father: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="父を選択" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">なし</SelectItem>
                          {availablePersons.map((person: AvailablePerson) => (
                            <SelectItem key={person.id} value={person.id}>{person.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="mother">母</Label>
                      <Select value={newPersonForm.mother} onValueChange={(value) => setNewPersonForm(prev => ({ ...prev, mother: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="母を選択" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">なし</SelectItem>
                          {availablePersons.map((person: AvailablePerson) => (
                            <SelectItem key={person.id} value={person.id}>{person.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="adoptiveFather">養父</Label>
                      <Select value={newPersonForm.adoptiveFather} onValueChange={(value) => setNewPersonForm(prev => ({ ...prev, adoptiveFather: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="養父を選択" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">なし</SelectItem>
                          {availablePersons.map((person: AvailablePerson) => (
                            <SelectItem key={person.id} value={person.id}>{person.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="adoptiveMother">養母</Label>
                      <Select value={newPersonForm.adoptiveMother} onValueChange={(value) => setNewPersonForm(prev => ({ ...prev, adoptiveMother: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="養母を選択" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">なし</SelectItem>
                          {availablePersons.map((person: AvailablePerson) => (
                            <SelectItem key={person.id} value={person.id}>{person.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsAddPersonDialogOpen(false)}>
                      キャンセル
                    </Button>
                    <Button onClick={handleAddPerson}>追加</Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={isAddRelationshipDialogOpen} onOpenChange={setIsAddRelationshipDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex flex-col items-center gap-1 h-auto py-3 bg-transparent"
                  >
                    <Users className="w-4 h-4" />
                    <span className="text-xs">関係追加</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>関係を追加</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label>人物1</Label>
                      <Select value={relationshipForm.person1} onValueChange={(value) => setRelationshipForm(prev => ({ ...prev, person1: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="人物を選択" />
                        </SelectTrigger>
                        <SelectContent>
                          {availablePersons.map((person: AvailablePerson) => (
                            <SelectItem key={person.id} value={person.id}>{person.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>関係の種類</Label>
                      <Select value={relationshipForm.relationshipType} onValueChange={(value) => setRelationshipForm(prev => ({ ...prev, relationshipType: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="spouse">配偶者</SelectItem>
                          <SelectItem value="child">子</SelectItem>
                          <SelectItem value="parent">親</SelectItem>
                          <SelectItem value="sibling">兄弟姉妹</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>人物2</Label>
                      <Select value={relationshipForm.person2} onValueChange={(value) => setRelationshipForm(prev => ({ ...prev, person2: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="人物を選択" />
                        </SelectTrigger>
                        <SelectContent>
                          {availablePersons.filter((p: AvailablePerson) => p.id !== relationshipForm.person1).map((person: AvailablePerson) => (
                            <SelectItem key={person.id} value={person.id}>{person.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {relationshipForm.relationshipType === "spouse" && (
                      <>
                        <div>
                          <Label htmlFor="marriageDate">結婚日</Label>
                          <Input
                            id="marriageDate"
                            type="date"
                            value={relationshipForm.marriageDate}
                            onChange={(e) => setRelationshipForm(prev => ({ ...prev, marriageDate: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="divorceDate">離婚日</Label>
                          <Input
                            id="divorceDate"
                            type="date"
                            value={relationshipForm.divorceDate}
                            onChange={(e) => setRelationshipForm(prev => ({ ...prev, divorceDate: e.target.value }))}
                          />
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsAddRelationshipDialogOpen(false)}>
                      キャンセル
                    </Button>
                    <Button onClick={handleAddRelationship}>追加</Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Button
                variant="outline"
                size="sm"
                className="flex flex-col items-center gap-1 h-auto py-3 bg-transparent"
                onClick={handleDeletePerson}
                disabled={!selectedPerson}
              >
                <Trash2 className="w-4 h-4" />
                <span className="text-xs">削除</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="flex flex-col items-center gap-1 h-auto py-3 bg-transparent"
                onClick={handleAutoLayout}
              >
                <Move className="w-4 h-4" />
                <span className="text-xs">レイアウト</span>
              </Button>
            </div>
          </div>

          {/* 選択中ノードの情報表示 */}
          <div className="flex-1 p-6 overflow-hidden">
            {selectedPerson ? (
              <div className="h-full flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">人物情報</h3>
                  <Button variant="outline" size="sm">
                    <Eye className="w-4 h-4 mr-2" />
                    元データ
                  </Button>
                </div>

                <ScrollArea className="flex-1">
                  <div className="space-y-4 pr-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="surname" className="text-sm font-medium text-gray-700">
                          姓
                        </Label>
                        <Input 
                          id="surname" 
                          value={selectedPerson.name.surname} 
                          onChange={(e) => {
                            const updatedFamilyMembers = familyData.family_members.map((person: any) => 
                              person.id === selectedPerson.id 
                                ? { ...person, name: { ...person.name, surname: e.target.value } }
                                : person
                            )
                            setFamilyData({ ...familyData, family_members: updatedFamilyMembers })
                            setSelectedPerson({ 
                              ...selectedPerson, 
                              name: { ...selectedPerson.name, surname: e.target.value },
                              displayName: `${e.target.value} ${selectedPerson.name.given_name}`.trim()
                            })
                          }}
                          className="mt-1" 
                        />
                      </div>
                      <div>
                        <Label htmlFor="givenName" className="text-sm font-medium text-gray-700">
                          名
                        </Label>
                        <Input 
                          id="givenName" 
                          value={selectedPerson.name.given_name} 
                          onChange={(e) => {
                            const updatedFamilyMembers = familyData.family_members.map((person: any) => 
                              person.id === selectedPerson.id 
                                ? { ...person, name: { ...person.name, given_name: e.target.value } }
                                : person
                            )
                            setFamilyData({ ...familyData, family_members: updatedFamilyMembers })
                            setSelectedPerson({ 
                              ...selectedPerson, 
                              name: { ...selectedPerson.name, given_name: e.target.value },
                              displayName: `${selectedPerson.name.surname} ${e.target.value}`.trim()
                            })
                          }}
                          className="mt-1" 
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="birth" className="text-sm font-medium text-gray-700">
                          生年月日
                        </Label>
                        <Input 
                          id="birth" 
                          type="date"
                          value={selectedPerson.birth?.date || ""} 
                          onChange={(e) => {
                            const updatedFamilyMembers = familyData.family_members.map((person: any) => 
                              person.id === selectedPerson.id 
                                ? { ...person, birth: { ...person.birth, date: e.target.value } }
                                : person
                            )
                            setFamilyData({ ...familyData, family_members: updatedFamilyMembers })
                            setSelectedPerson({ 
                              ...selectedPerson, 
                              birth: { ...selectedPerson.birth, date: e.target.value }
                            })
                          }}
                          className="mt-1" 
                        />
                      </div>
                      <div>
                        <Label htmlFor="death" className="text-sm font-medium text-gray-700">
                          没年月日
                        </Label>
                        <Input 
                          id="death" 
                          type="date"
                          value={selectedPerson.death?.date || ""} 
                          onChange={(e) => {
                            const updatedFamilyMembers = familyData.family_members.map((person: any) => 
                              person.id === selectedPerson.id 
                                ? { ...person, death: { ...person.death, date: e.target.value } }
                                : person
                            )
                            setFamilyData({ ...familyData, family_members: updatedFamilyMembers })
                            setSelectedPerson({ 
                              ...selectedPerson, 
                              death: { ...selectedPerson.death, date: e.target.value }
                            })
                          }}
                          className="mt-1" 
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="generation" className="text-sm font-medium text-gray-700">
                        世代
                      </Label>
                      <Input 
                        id="generation" 
                        type="number"
                        min="1"
                        max="10"
                        value={selectedPerson.generation || 1} 
                        onChange={(e) => {
                          const newGeneration = parseInt(e.target.value)
                          if (newGeneration >= 1 && newGeneration <= 10) {
                            const updatedFamilyMembers = familyData.family_members.map((person: any) => 
                              person.id === selectedPerson.id 
                                ? { ...person, generation: newGeneration }
                                : person
                            )
                            setFamilyData({ ...familyData, family_members: updatedFamilyMembers })
                            setSelectedPerson({ ...selectedPerson, generation: newGeneration })
                          }
                        }}
                        className="mt-1" 
                      />
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-gray-700">性別</Label>
                      <div className="flex gap-3 mt-2">
                        <label className="flex items-center gap-2">
                          <input 
                            type="radio" 
                            name={`gender-${selectedPerson.id}`}
                            value="male" 
                            checked={selectedPerson.sex === "male"}
                            onChange={(e) => {
                              if (e.target.checked) {
                                const updatedFamilyMembers = familyData.family_members.map((person: any) => 
                                  person.id === selectedPerson.id 
                                    ? { ...person, sex: "male" }
                                    : person
                                )
                                setFamilyData({ ...familyData, family_members: updatedFamilyMembers })
                                setSelectedPerson({ ...selectedPerson, sex: "male" })
                              }
                            }}
                            className="text-blue-600" 
                          />
                          <span className="text-sm">男性</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input 
                            type="radio" 
                            name={`gender-${selectedPerson.id}`}
                            value="female" 
                            checked={selectedPerson.sex === "female"}
                            onChange={(e) => {
                              if (e.target.checked) {
                                const updatedFamilyMembers = familyData.family_members.map((person: any) => 
                                  person.id === selectedPerson.id 
                                    ? { ...person, sex: "female" }
                                    : person
                                )
                                setFamilyData({ ...familyData, family_members: updatedFamilyMembers })
                                setSelectedPerson({ ...selectedPerson, sex: "female" })
                              }
                            }}
                            className="text-pink-600" 
                          />
                          <span className="text-sm">女性</span>
                        </label>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="birthPlace" className="text-sm font-medium text-gray-700">
                          出生地
                        </Label>
                        <Input 
                          id="birthPlace" 
                          value={selectedPerson.birth?.place || ""} 
                          onChange={(e) => {
                            const updatedFamilyMembers = familyData.family_members.map((person: any) => 
                              person.id === selectedPerson.id 
                                ? { ...person, birth: { date: person.birth?.date || "", place: e.target.value } }
                                : person
                            )
                            setFamilyData({ ...familyData, family_members: updatedFamilyMembers })
                            setSelectedPerson({ 
                              ...selectedPerson, 
                              birth: { date: selectedPerson.birth?.date || "", place: e.target.value }
                            })
                          }}
                          placeholder="出生地を入力..." 
                          className="mt-1" 
                        />
                      </div>
                      <div>
                        <Label htmlFor="deathPlace" className="text-sm font-medium text-gray-700">
                          没地
                        </Label>
                        <Input 
                          id="deathPlace" 
                          value={selectedPerson.death?.place || ""} 
                          onChange={(e) => {
                            const updatedFamilyMembers = familyData.family_members.map((person: any) => 
                              person.id === selectedPerson.id 
                                ? { ...person, death: { date: person.death?.date || "", place: e.target.value } }
                                : person
                            )
                            setFamilyData({ ...familyData, family_members: updatedFamilyMembers })
                            setSelectedPerson({ 
                              ...selectedPerson, 
                              death: { date: selectedPerson.death?.date || "", place: e.target.value }
                            })
                          }}
                          placeholder="没地を入力..." 
                          className="mt-1" 
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-gray-700">家族関係</Label>
                      <div className="mt-2 space-y-2">
                        {selectedPerson.father && (
                          <div className="flex items-center gap-2 text-sm">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600">父:</span>
                            <span>{availablePersons.find((p: AvailablePerson) => p.id === selectedPerson.father)?.name || selectedPerson.father}</span>
                          </div>
                        )}
                        {selectedPerson.mother && (
                          <div className="flex items-center gap-2 text-sm">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600">母:</span>
                            <span>{availablePersons.find((p: AvailablePerson) => p.id === selectedPerson.mother)?.name || selectedPerson.mother}</span>
                          </div>
                        )}
                        {selectedPerson.adoptive_father && (
                          <div className="flex items-center gap-2 text-sm">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600">養父:</span>
                            <span>{availablePersons.find((p: AvailablePerson) => p.id === selectedPerson.adoptive_father)?.name || selectedPerson.adoptive_father}</span>
                          </div>
                        )}
                        {selectedPerson.adoptive_mother && (
                          <div className="flex items-center gap-2 text-sm">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600">養母:</span>
                            <span>{availablePersons.find((p: AvailablePerson) => p.id === selectedPerson.adoptive_mother)?.name || selectedPerson.adoptive_mother}</span>
                          </div>
                        )}
                        {selectedPerson.spouses && selectedPerson.spouses.length > 0 && (
                          selectedPerson.spouses.map((spouse, index) => (
                            <div key={index} className="flex items-center gap-2 text-sm">
                              <Users className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-600">配偶者:</span>
                              <span>{spouse.name}</span>
                              {spouse.marriage_date && (
                                <span className="text-xs text-gray-500">
                                  ({spouse.marriage_date}
                                  {spouse.divorce_date && ` - ${spouse.divorce_date}`})
                                </span>
                              )}
                            </div>
                          ))
                        )}
                        {selectedPerson.children && selectedPerson.children.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 text-sm mb-1">
                              <Users className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-600">子供:</span>
                            </div>
                            <div className="ml-6 space-y-1">
                              {selectedPerson.children.map((child, index) => (
                                <div key={index} className="text-sm">
                                  <span>{child.name}</span>
                                  {child.mother && (
                                    <span className="text-xs text-gray-500 ml-2">
                                      (母: {child.mother})
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {selectedPerson.isUncertain && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle className="w-4 h-4 text-yellow-600" />
                          <span className="text-sm font-medium text-yellow-800">不確実な情報</span>
                        </div>
                        <p className="text-xs text-yellow-700">
                          この人物の情報は戸籍の読み取り精度が低いか、AIが不確実と判断しています。
                          元データを確認して手動で修正してください。
                        </p>
                      </div>
                    )}

                    <div className="pt-4">
                      <Button className="w-full">変更を保存</Button>
                    </div>
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <User className="w-12 h-12 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-500 mb-2">人物を選択してください</h3>
                <p className="text-sm text-gray-400">
                  家系図上の人物ノードをクリックすると
                  <br />
                  詳細情報が表示されます
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
