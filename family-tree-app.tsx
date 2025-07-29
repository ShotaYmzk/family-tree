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
  
  const [familyData, setFamilyData] = useState<any>({
    family_members: [
      {
        id: "mitsueda_kenjiro",
        name: {
          surname: "光枝",
          given_name: "兼次郎",
        },
        spouse: {
          name: "八代",
        },
        children: [
          {
            name: "阿吹 軍一 (旧姓: 光枝)",
          },
        ],
      },
      {
        id: "yashiro",
        name: {
          surname: "",
          given_name: "八代",
        },
        spouse: {
          name: "光枝 兼次郎",
        },
        children: [
          {
            name: "阿吹 軍一 (旧姓: 光枝)",
          },
        ],
      },
      {
        id: "abuki_risaburo",
        name: {
          surname: "阿吹",
          given_name: "利三郎",
        },
        spouse: {
          name: "美名",
        },
        death: {
          date: "1902-06",
        },
        adoptive_children: [
          {
            name: "でき (きト)",
            type: "養女",
          },
          {
            name: "阿吹 軍一",
            type: "婿養子",
          },
        ],
      },
      {
        id: "nishina_mina",
        name: {
          surname: "仁科",
          given_name: "美名",
        },
        birth: {
          date: "1854-04-12",
        },
        father: "仁科 惣吉",
        spouse: {
          name: "阿吹 利三郎",
        },
      },
      {
        id: "abuki_gunichi_1871",
        name: {
          surname: "阿吹",
          given_name: "軍一",
        },
        birth: {
          date: "1871-07-26",
        },
        death: {
          date: "1969-01-06",
          place: "福山市野上町",
        },
        father: "光枝 兼次郎",
        mother: "八代",
        adoptive_father: "阿吹 利三郎",
        adoptive_mother: "美名",
        spouses: [
          {
            name: "でき (きト)",
            marriage_date: "1904-01-31",
          },
          {
            name: "遠藤 ハナコ",
            marriage_date: "1918-12-14",
          },
        ],
        children: [
          { name: "主一郎", mother: "でき" },
          { name: "アヤノ", mother: "でき" },
          { name: "美則", mother: "ハナコ" },
          { name: "ヨシコ", mother: "ハナコ" },
          { name: "幸三郎", mother: "ハナコ" },
          { name: "繁好", mother: "ハナコ" },
          { name: "笹江", mother: "ハナコ" },
          { name: "昭三", mother: "ハナコ" },
        ],
      },
      {
        id: "abuki_shuichiro_1907",
        name: {
          surname: "阿吹",
          given_name: "主一郎",
        },
        birth: {
          date: "1907-03-14",
          place: "岡山県浅口郡大島村",
        },
        death: {
          date: "1983-02-17",
          place: "福山市",
        },
        father: "阿吹 軍一",
        mother: "でき (きト)",
        spouse: {
          name: "小川 ハナ子",
          marriage_date: "1930-01-11",
        },
        children: [
          { name: "岩夫" },
          { name: "輝男" },
          { name: "絹枝" },
          { name: "耕二" },
          { name: "勝治" },
          { name: "征吾" },
          { name: "千枝子" },
        ],
      },
      {
        id: "abuki_teruo_1932",
        name: {
          surname: "阿吹",
          given_name: "輝男",
        },
        birth: {
          date: "1932-06-19",
          place: "広島県福山市",
        },
        death: {
          date: "2020-12-03",
          place: "広島県福山市",
        },
        father: "阿吹 主一郎",
        mother: "ハナ子 (小川)",
        spouses: [
          {
            name: "寺田 ヨシコ",
            marriage_date: "1951-08-08",
            divorce_date: "1956-06-15",
          },
          {
            name: "三井 榮子",
            marriage_date: "1957-02-25",
          },
        ],
        children: [
          { name: "ダマ子", mother: "ヨシコ" },
          { name: "千鶴子", mother: "ヨシコ" },
          { name: "正宏", mother: "榮子" },
          { name: "伸二", mother: "榮子" },
        ],
      },
      {
        id: "abuki_masahiro_1957",
        name: {
          surname: "阿吹",
          given_name: "正宏",
        },
        birth: {
          date: "1957-09-20",
          place: "福山市",
        },
        father: "阿吹 輝男",
        mother: "榮子 (三井)",
        spouse: {
          name: "小笠原 加代子",
          marriage_date: "1984-01-22",
        },
        children: [{ name: "成駿" }, { name: "加奈子" }],
      },
      {
        id: "abuki_narutoshi_1990",
        name: {
          surname: "阿吹",
          given_name: "成駿",
        },
        birth: {
          date: "1990-05-17",
          place: "広島県福山市",
        },
        father: "阿吹 正宏",
        mother: "加代子 (小笠原)",
        spouse: {
          name: "井上 麻裕美",
          marriage_date: "2015-04-05",
        },
        children: [{ name: "奏汰" }, { name: "美波" }, { name: "音波" }],
      },
    ],
  })

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

  const containerRef = useRef<HTMLDivElement>(null)

  // 提供されたJSONデータ（削除 - familyDataに移行）

  // 家系図データを処理する関数
  const processedPersons = useMemo(() => {
    const persons: ProcessedPerson[] = []
    const generationMap = new Map<string, number>()

    // 世代を計算する再帰関数
    const calculateGeneration = (personId: string, visited = new Set<string>()): number => {
      if (visited.has(personId)) return 0
      visited.add(personId)

      if (generationMap.has(personId)) {
        return generationMap.get(personId)!
      }

      const person = familyData.family_members.find((p: any) => p.id === personId)
      if (!person) return 0

      let generation = 0
      if (person.father || person.mother) {
        const fatherGen = person.father ? calculateGeneration(person.father, visited) : 0
        const motherGen = person.mother ? calculateGeneration(person.mother, visited) : 0
        generation = Math.max(fatherGen, motherGen) + 1
      }

      generationMap.set(personId, generation)
      return generation
    }

    // 各人物の世代を計算
    familyData.family_members.forEach((person: any) => {
      calculateGeneration(person.id)
    })

    // ProcessedPersonオブジェクトを作成
    familyData.family_members.forEach((person: any, index: number) => {
      const generation = generationMap.get(person.id) || 0
      const displayName = `${person.name.surname} ${person.name.given_name}`

      persons.push({
        ...person,
        displayName,
        generation,
        x: 200 + (index % 5) * 200,
        y: 100 + generation * 150,
        isUncertain: false, // 固定値に変更してHydration errorを回避
      })
    })

    return persons
  }, [familyData.family_members])

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

  const availablePersons = familyData.family_members.map((person: any) => ({
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
          <div className="absolute left-4 top-20 z-10 space-y-16">
            <div className="bg-white px-3 py-1 rounded-full shadow-sm border">
              <span className="text-sm font-medium text-gray-600">第1世代</span>
            </div>
            <div className="bg-white px-3 py-1 rounded-full shadow-sm border">
              <span className="text-sm font-medium text-gray-600">第2世代</span>
            </div>
            <div className="bg-white px-3 py-1 rounded-full shadow-sm border">
              <span className="text-sm font-medium text-gray-600">第3世代</span>
            </div>
          </div>

          {/* 家系図キャンバス */}
          <div className="w-full h-full overflow-auto p-8">
            <div className="relative min-w-[800px] min-h-[600px]">
              {/* 世代区切り線 */}
              <div className="absolute inset-0">
                <div className="absolute top-16 left-0 right-0 h-px bg-gray-300"></div>
                <div className="absolute top-32 left-0 right-0 h-px bg-gray-300"></div>
                <div className="absolute top-48 left-0 right-0 h-px bg-gray-300"></div>
              </div>

              {/* 関係線 */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                {/* 夫婦関係線 */}
                <line x1="200" y1="100" x2="350" y2="100" stroke="#6b7280" strokeWidth="2" />
                <line x1="275" y1="200" x2="425" y2="200" stroke="#6b7280" strokeWidth="2" />

                {/* 親子関係線 */}
                <line x1="275" y1="100" x2="275" y2="200" stroke="#6b7280" strokeWidth="2" />
                <line x1="350" y1="200" x2="350" y2="300" stroke="#6b7280" strokeWidth="2" />
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
                >
                  <Card
                    className={`w-40 ${person.isUncertain ? "border-dashed border-yellow-400 bg-yellow-50" : "bg-white"} hover:shadow-lg transition-shadow`}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 rounded-full bg-blue-400"></div>
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
                          {availablePersons.map(person => (
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
                          {availablePersons.map(person => (
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
                          {availablePersons.map(person => (
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
                          {availablePersons.map(person => (
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
                          {availablePersons.map(person => (
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
                          {availablePersons.filter(p => p.id !== relationshipForm.person1).map(person => (
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
                    <div>
                      <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                        氏名
                      </Label>
                      <Input id="name" value={selectedPerson.displayName} className="mt-1" />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="birth" className="text-sm font-medium text-gray-700">
                          生年月日
                        </Label>
                        <Input id="birth" value={selectedPerson.birth?.date || ""} className="mt-1" />
                      </div>
                      <div>
                        <Label htmlFor="death" className="text-sm font-medium text-gray-700">
                          没年月日
                        </Label>
                        <Input id="death" value={selectedPerson.death?.date || ""} className="mt-1" />
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-gray-700">性別</Label>
                      <div className="flex gap-3 mt-2">
                        <label className="flex items-center gap-2">
                          <input type="radio" name="gender" value="male" defaultChecked disabled className="text-blue-600" />
                          <span className="text-sm">男性</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input type="radio" name="gender" value="female" disabled className="text-pink-600" />
                          <span className="text-sm">女性</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="address" className="text-sm font-medium text-gray-700">
                        住所
                      </Label>
                      <Textarea id="address" value="" disabled placeholder="住所情報を入力..." className="mt-1" rows={3} />
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-gray-700">家族関係</Label>
                      <div className="mt-2 space-y-2">
                        {selectedPerson.father && (
                          <div className="flex items-center gap-2 text-sm">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600">父:</span>
                            <span>{availablePersons.find(p => p.id === selectedPerson.father)?.name || selectedPerson.father}</span>
                          </div>
                        )}
                        {selectedPerson.mother && (
                          <div className="flex items-center gap-2 text-sm">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600">母:</span>
                            <span>{availablePersons.find(p => p.id === selectedPerson.mother)?.name || selectedPerson.mother}</span>
                          </div>
                        )}
                        {selectedPerson.adoptive_father && (
                          <div className="flex items-center gap-2 text-sm">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600">養父:</span>
                            <span>{availablePersons.find(p => p.id === selectedPerson.adoptive_father)?.name || selectedPerson.adoptive_father}</span>
                          </div>
                        )}
                        {selectedPerson.adoptive_mother && (
                          <div className="flex items-center gap-2 text-sm">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600">養母:</span>
                            <span>{availablePersons.find(p => p.id === selectedPerson.adoptive_mother)?.name || selectedPerson.adoptive_mother}</span>
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
