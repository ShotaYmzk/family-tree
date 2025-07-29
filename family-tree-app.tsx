"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Upload,
  Save,
  Download,
  Search,
  CheckCircle,
  Clock,
  Edit3,
  Plus,
  Trash2,
  Undo,
  Redo,
} from "lucide-react"

// 新しいコンポーネントとフックをインポート
import { FamilyTree } from "./components/FamilyTree"
import { PersonEditDialog } from "./components/PersonEditDialog"
import { RelationshipEditDialog } from "./components/RelationshipEditDialog"
import { AddPersonDialog } from "./components/AddPersonDialog"
import { KosekiUploadDialog } from "./components/KosekiUploadDialog"
import { useFamilyData } from "./hooks/useFamilyData"
import { ProcessedPerson, searchPersons, FamilyTreeData, processFamilyData } from "./utils/familyDataProcessor"
import { UI_CONFIG } from "./constants/config"

interface Project {
  id: string
  name: string
  lastModified: string
  status: string
}

const mockProjects: Project[] = [
  { id: '1', name: '田中家系図', lastModified: '2024-01-15', status: 'completed' },
  { id: '2', name: '佐藤家系図', lastModified: '2024-01-10', status: 'processing' },
  { id: '3', name: '山田家系図', lastModified: '2024-01-05', status: 'draft' },
]

export default function FamilyTreeApp() {
  // 新しいフックを使用してデータ管理
  const {
    persons,
    families,
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
    refreshData
  } = useFamilyData()

  // UI状態管理
  const [selectedPerson, setSelectedPerson] = useState<ProcessedPerson | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [leftSidebarWidth, setLeftSidebarWidth] = useState(UI_CONFIG.leftSidebarWidth)
  const [rightSidebarWidth, setRightSidebarWidth] = useState(UI_CONFIG.rightSidebarWidth)
  
  // 編集ダイアログの状態
  const [isPersonEditOpen, setIsPersonEditOpen] = useState(false)
  const [isRelationshipEditOpen, setIsRelationshipEditOpen] = useState(false)
  const [isAddPersonOpen, setIsAddPersonOpen] = useState(false)
  const [isKosekiUploadOpen, setIsKosekiUploadOpen] = useState(false)

  // キーボードショートカット
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command+Z (Mac) または Ctrl+Z (Windows/Linux) でアンドゥ
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        if (canUndo) {
          undo()
        }
      }
      
      // Command+Shift+Z (Mac) または Ctrl+Y (Windows/Linux) でリドゥ
      if (((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) || 
          ((e.ctrlKey) && e.key === 'y')) {
        e.preventDefault()
        if (canRedo) {
          redo()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [canUndo, canRedo, undo, redo])

  // 人物選択ハンドラー
  const handlePersonSelect = (person: ProcessedPerson) => {
    setSelectedPerson(person)
  }

  // 人物位置更新ハンドラー
  const handlePersonPositionUpdate = (id: string, x: number, y: number) => {
    updatePerson(id, { x, y })
  }

  // 戸籍データ抽出ハンドラー
  const handleKosekiDataExtracted = (data: FamilyTreeData) => {
    // 新しいデータをアプリの状態に適用
    const processed = processFamilyData(data)
    
    // 既存のデータをクリアして新しいデータを設定
    // 注意: これは既存のデータを完全に置き換えます
    processed.persons.forEach(person => addPerson(person))
    processed.families.forEach(family => {
      addFamily({
        parentIds: family.parents.map(p => p.id),
        childrenIds: family.children.map(c => c.id),
        marriageDate: family.marriageDate,
        divorceDate: family.divorceDate,
        relationType: family.relationType
      })
    })
    
    setIsKosekiUploadOpen(false)
  }

  // 検索結果
  const searchResults = searchQuery.trim() 
    ? searchPersons(persons, searchQuery)
    : []

  // ステータス色の取得
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

  // ステータスアイコンの取得
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

  // ローディング状態
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">家系図データを読み込み中...</p>
        </div>
      </div>
    )
  }

  // エラー状態
  if (error) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">データの読み込みに失敗しました</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={refreshData}>
            再試行
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">家系図ジェネレーター</h1>
          <div className="flex items-center gap-3">
            {/* アンドゥ・リドゥボタン */}
            <div className="flex items-center gap-1 border-r border-gray-200 pr-3 mr-3">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={undo}
                disabled={!canUndo}
                title="元に戻す (Cmd+Z)"
              >
                <Undo className="w-4 h-4" />
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={redo}
                disabled={!canRedo}
                title="やり直し (Cmd+Shift+Z)"
              >
                <Redo className="w-4 h-4" />
              </Button>
            </div>
            
            <Button variant="outline" size="sm">
              <Save className="w-4 h-4 mr-2" />
              保存
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              読み込み
            </Button>
            <Button variant="outline" size="sm">
              <Upload className="w-4 h-4 mr-2" />
              書き出し
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* 左サイドバー */}
        <aside style={{ width: leftSidebarWidth }} className="bg-white border-r border-gray-200 flex flex-col">
          <div className="p-6 border-b border-gray-200">
            <div 
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
              onClick={() => setIsKosekiUploadOpen(true)}
            >
              <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-2">戸籍PDFをアップロード</p>
              <p className="text-sm text-gray-500">
                戸籍謄本PDFをAIで解析
                <br />
                クリックして開始
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
                <span className="text-sm text-green-800">家系図生成完了</span>
              </div>
            </div>
          </div>

          <div className="flex-1 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">最近のプロジェクト</h3>
            <ScrollArea className="h-full">
              <div className="space-y-3">
                {mockProjects.map((project) => (
                  <Card key={project.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{project.name}</h4>
                        <Badge className={`text-xs ${getStatusColor(project.status)}`}>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(project.status)}
                            {project.status === 'completed' ? '完了' : 
                             project.status === 'processing' ? '処理中' : '下書き'}
                          </div>
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500">最終更新: {project.lastModified}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>
        </aside>

        {/* 中央エリア - 家系図描画エリア */}
        <main className="flex-1 relative bg-gray-100">
          <FamilyTree
            persons={persons}
            families={families}
            selectedPerson={selectedPerson}
            onPersonSelect={handlePersonSelect}
            onPersonPositionUpdate={handlePersonPositionUpdate}
          />
        </main>

        {/* 右サイドバー - 情報表示・検索 */}
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
            
            {/* 検索結果 */}
            {searchQuery.trim() && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  検索結果 ({searchResults.length}件)
                </h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {searchResults.map((person) => (
                    <div
                      key={person.id}
                      className="p-2 border border-gray-200 rounded cursor-pointer hover:bg-gray-50"
                      onClick={() => setSelectedPerson(person)}
                    >
                      <div className="text-sm font-medium">{person.displayName}</div>
                      <div className="text-xs text-gray-500">第{person.generation}世代</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 人物追加ボタン */}
          <div className="px-6 py-4 border-b border-gray-200">
            <Button 
              onClick={() => setIsAddPersonOpen(true)}
              className="w-full"
              variant="outline"
            >
              <Plus className="w-4 h-4 mr-2" />
              新しい人物を追加
            </Button>
          </div>

          {/* 選択中ノードの情報表示 */}
          <div className="flex-1 p-6 overflow-hidden">
            {selectedPerson ? (
              <div className="h-full flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">人物情報</h3>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setIsPersonEditOpen(true)}
                    >
                      <Edit3 className="w-4 h-4 mr-1" />
                      編集
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setIsRelationshipEditOpen(true)}
                    >
                      関係編集
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={() => {
                        if (confirm(`${selectedPerson.displayName}を削除してもよろしいですか？`)) {
                          deletePerson(selectedPerson.id)
                          setSelectedPerson(null)
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <ScrollArea className="flex-1">
                  <div className="space-y-4 pr-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-medium text-gray-700">姓</label>
                        <div className="mt-1 p-2 bg-gray-50 border border-gray-200 rounded text-sm">
                          {selectedPerson.name.surname}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">名</label>
                        <div className="mt-1 p-2 bg-gray-50 border border-gray-200 rounded text-sm">
                          {selectedPerson.name.given_name}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-medium text-gray-700">生年月日</label>
                        <div className="mt-1 p-2 bg-gray-50 border border-gray-200 rounded text-sm">
                          {selectedPerson.birth?.date || '不明'}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">没年月日</label>
                        <div className="mt-1 p-2 bg-gray-50 border border-gray-200 rounded text-sm">
                          {selectedPerson.death?.date || '存命'}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700">世代</label>
                      <div className="mt-1 p-2 bg-gray-50 border border-gray-200 rounded text-sm">
                        第{selectedPerson.generation}世代
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700">性別</label>
                      <div className="mt-1 p-2 bg-gray-50 border border-gray-200 rounded text-sm">
                        {selectedPerson.sex === 'male' ? '男性' : selectedPerson.sex === 'female' ? '女性' : '不明'}
                      </div>
                    </div>

                    {selectedPerson.birth?.place && (
                      <div>
                        <label className="text-sm font-medium text-gray-700">出生地</label>
                        <div className="mt-1 p-2 bg-gray-50 border border-gray-200 rounded text-sm">
                          {selectedPerson.birth.place}
                        </div>
                      </div>
                    )}

                    {selectedPerson.death?.place && (
                      <div>
                        <label className="text-sm font-medium text-gray-700">没地</label>
                        <div className="mt-1 p-2 bg-gray-50 border border-gray-200 rounded text-sm">
                          {selectedPerson.death.place}
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>人物を選択してください</p>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* 編集ダイアログ */}
      <PersonEditDialog
        person={selectedPerson}
        isOpen={isPersonEditOpen}
        onClose={() => setIsPersonEditOpen(false)}
        onSave={(personId, updates) => {
          updatePerson(personId, updates)
          // 選択されている人物の情報も更新
          if (selectedPerson && selectedPerson.id === personId) {
            setSelectedPerson({ ...selectedPerson, ...updates })
          }
        }}
        availablePersons={persons}
      />

      <RelationshipEditDialog
        person={selectedPerson}
        isOpen={isRelationshipEditOpen}
        onClose={() => setIsRelationshipEditOpen(false)}
        availablePersons={persons}
        families={families}
        onAddFamily={addFamily}
        onUpdateFamily={updateFamily}
        onDeleteFamily={deleteFamily}
      />

      <AddPersonDialog
        isOpen={isAddPersonOpen}
        onClose={() => setIsAddPersonOpen(false)}
        onAdd={(personData) => {
          addPerson(personData)
        }}
      />

      <KosekiUploadDialog
        isOpen={isKosekiUploadOpen}
        onClose={() => setIsKosekiUploadOpen(false)}
        onDataExtracted={handleKosekiDataExtracted}
      />
    </div>
  )
} 