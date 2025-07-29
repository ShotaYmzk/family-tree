// 家系図アプリケーションの設定定数
export const LAYOUT_CONFIG = {
  // レイアウト設定
  generationSpacing: 250,     // 世代間隔
  minFamilySpacing: 450,      // 家族間の最小間隔
  cardSpacing: 200,           // カード間の最小間隔
  spouseSpacing: 180,         // 配偶者間の間隔
  cardWidth: 160,             // カードの幅
  cardHeight: 120,            // カードの高さ
  cornerRadius: 8,            // 線の角の丸み

  // 初期位置
  initialX: 100,
  initialY: 80,

  // ズーム設定
  minZoom: 0.1,
  maxZoom: 3,
  zoomStep: 1.2,
  defaultZoom: 1,
} as const

export const COLORS = {
  // 性別による色分け
  male: {
    background: 'bg-blue-50',
    border: 'border-blue-200',
    indicator: 'bg-blue-500',
  },
  female: {
    background: 'bg-pink-50',
    border: 'border-pink-200', 
    indicator: 'bg-pink-500',
  },
  unknown: {
    background: 'bg-white',
    border: 'border-gray-200',
    indicator: 'bg-gray-400',
  },

  // 線の色
  marriageLine: '#dc2626',        // 結婚関係線（赤）
  parentChildLine: '#6b7280',     // 親子関係線（グレー）
  siblingLine: '#10b981',         // 兄弟姉妹関係線（緑）

  // 状態色
  uncertain: {
    background: 'bg-yellow-50',
    border: 'border-yellow-400 border-dashed',
    text: 'text-yellow-600',
  },
  selected: 'ring-2 ring-blue-500',
} as const

export const DATA_CONFIG = {
  // データファイルのパス
  dataFile: '/family-info-sep.json',
  
  // デフォルト値
  defaultGeneration: 1,
  unknownDatePlaceholder: 'XX',
} as const

export const UI_CONFIG = {
  // サイドバー設定
  leftSidebarWidth: 320,
  rightSidebarWidth: 320,
  minSidebarWidth: 200,
  maxSidebarWidth: 500,

  // アニメーション設定
  transitionDuration: '0.1s',
  hoverTransition: 'transition-shadow',

  // 世代ラベル設定
  generationLabelOffset: 15,
} as const

export const RELATIONSHIP_TYPES = {
  SPOUSE: 'spouse',
  CHILD: 'child', 
  PARENT: 'parent',
  SIBLING: 'sibling',
  ADOPTION: 'adoption',
  BLOOD: 'blood',
} as const

// 型定義
export type LayoutConfig = typeof LAYOUT_CONFIG
export type Colors = typeof COLORS
export type DataConfig = typeof DATA_CONFIG
export type UIConfig = typeof UI_CONFIG
export type RelationshipTypes = typeof RELATIONSHIP_TYPES 