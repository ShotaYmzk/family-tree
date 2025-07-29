import { GoogleGenerativeAI } from '@google/generative-ai'
import { FamilyTreeData } from '../utils/familyDataProcessor'

const API_KEY = 'AIzaSyBk6ghVB8gwevgxU8sgcxwk9OPAz5QZuSc'

// 戸籍解析用の詳細プロンプト
const KOSEKI_ANALYSIS_PROMPT = `
1. あなたの役割 (Role)

あなたは、日本の戸籍謄本・除籍謄本の読解とデータ構造化を専門とする、高精度なAIアシスタントです。

2. ミッション (Mission)

提供された戸籍のテキストデータから、記載されている全ての情報を正確に抽出し、人物間の関係性を完全に解析します。その上で、後続のプログラムで直接的かつ安定的に利用可能な、正規化された単一のJSONファイルを一度の応答で出力してください。

3. 実行プロセス (Execution Process)

以下の3ステップに沿って、論理的に処理を進めてください。

ステップ1: 全人物の個人情報リスト (people) の生成

まず、戸籍に記載されている全ての人物（筆頭者、配偶者、子、親、同居人など）を一人も漏らさず特定し、個人情報をフラットなリストとしてpeople配列に格納します。

ユニークID (id) の採番: 各人物に、姓のローマ字_名のローマ字_生年 の形式で、他と重複しないユニークなIDを必ず付与してください。（例: abuki_gunichi_1871）

個人情報の抽出: 各人物の氏名、生年月日、死亡年月日、従前戸籍などの「個人に属する情報」のみを抽出します。

注意: この段階では、親子や夫婦といった関係性の情報は含めません。

ステップ2: 家族ユニット (families) の構築

ステップ1で生成したpeopleリストを基に、人物間の関係性を解析し、「家族ユニット」のリストとしてfamilies配列を構築します。

関係性のID化: 人物間の関連付けは、ステップ1で採番した**idのみを使用してください。氏名での関連付けは厳禁**です。

家族の定義: 「どの親たち」に「どの子供たち」が属するかを明確に定義します。一つの夫婦とその実子の組み合わせが、一つの「家族ユニット」オブジェクトとなります。

再婚・養子縁組の扱い:

再婚の場合は、新しい配偶者との組み合わせで、新しいfamilyオブジェクトを作成します。これにより、一人の人物が複数のfamilyに親として登場できます。

養子縁組はrelation_typeキーで明示します。

ステップ3: 補助情報 (generation, sex) の付与

ステップ1と2で構築した構造を基に、各人物に以下の補助情報を付与します。

世代 (generation): familiesの親子関係をたどり、家系の起点となる人物を1として、すべての子孫に世代番号を付与します。配偶者はパートナーと同じ世代番号とします。

性別 (sex): 続柄（例:「夫」「妻」「長男」「二女」）や名前から論理的に判断できる場合のみ、maleまたはfemaleを設定します。判断が困難な場合はnullとしてください。憶測で設定してはいけません。

続柄 (relation_to_family_head): 配偶者の場合は、配偶者の親との関係性を記述します。続柄（例:「夫」「妻」「長男」「二女」）を設定します。

4. 出力JSONスキーマ (Output JSON Schema)

以下のスキーマに厳密に従って、単一のJSONオブジェクトを出力してください。

{
  "people": [
    {
      "id": "string（例: suzuki_ichiro_1970）",
      "generation": "integer | null",
      "sex": "string ('male' or 'female') | null",
      "name": {
        "surname": "string",
        "given_name": "string"
      },
      "birth": {
        "original_date": "string（戸籍上の表記）",
        "date": "string（YYYY-MM-DD）| null",
        "place": "string | null"
      },
      "death": {
        "original_date": "string | null",
        "date": "string（YYYY-MM-DD）| null",
        "place": "string | null"
      },
       "relation_to_family_head": "string | null"
    }
  ],
  "families": [
    {
      "id": "string（例: f001）",
      "parents": ["string（親1のid）", "string（親2のid）"],
      "children": ["string（子1のid）", "string（子2のid）"],
      "marriage_date": {
        "original_date": "string | null",
        "date": "string（YYYY-MM-DD）| null"
      },
      "divorce_date": {
        "original_date": "string | null",
        "date": "string（YYYY-MM-DD）| null"
      },
      "relation_type": "string ('blood' or 'adoption') | null"
    }
  ]
}

5. 重要原則とルール (Guiding Principles & Rules)

ID is King: 全ての人物参照は、必ずidで行います。

単一情報源の原則: 個人情報はpeopleに、関係性はfamiliesにのみ記述し、情報を重複させません。

堅牢性: 日付の西暦変換が不可能など、フォーマットできない情報はoriginal_フィールドに原文を保持し、変換後フィールドの値はnullとします。これにより、情報の欠損を防ぎつつ、スキーマの整合性を保ちます。

完全性: 戸籍にわずかでも言及のある人物は、関係性が不明であってもpeopleリストに必ず含めてください。

ワンショット実行: 上記の全ての指示を遵守し、修正が不要な完成されたJSONを一度で出力することを目標とします。

提供された戸籍画像を解析し、上記の要件に従ってJSONデータを出力してください。
`

export interface KosekiAnalysisResult {
  success: boolean
  data?: FamilyTreeData
  error?: string
}

export class GeminiService {
  private genAI: GoogleGenerativeAI
  private model: any

  constructor() {
    this.genAI = new GoogleGenerativeAI(API_KEY)
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-pro' })
  }

  async analyzePDF(file: File): Promise<KosekiAnalysisResult> {
    try {
      // PDFファイルをBase64に変換
      const arrayBuffer = await file.arrayBuffer()
      const base64Data = Buffer.from(arrayBuffer).toString('base64')

      // Gemini APIに送信するデータを準備
      const parts = [
        {
          text: KOSEKI_ANALYSIS_PROMPT
        },
        {
          inlineData: {
            mimeType: file.type,
            data: base64Data
          }
        }
      ]

      console.log('Sending PDF to Gemini API for analysis...')
      
      const result = await this.model.generateContent(parts)
      const response = await result.response
      const text = response.text()

      console.log('Received response from Gemini:', text)

      // JSONを解析
      try {
        // レスポンスから JSON 部分のみを抽出
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
          throw new Error('JSONフォーマットが見つかりませんでした')
        }

        const jsonData = JSON.parse(jsonMatch[0]) as FamilyTreeData
        
        // データ構造の検証
        if (!jsonData.people || !Array.isArray(jsonData.people)) {
          throw new Error('people配列が見つかりません')
        }
        
        if (!jsonData.families || !Array.isArray(jsonData.families)) {
          throw new Error('families配列が見つかりません')
        }

        return {
          success: true,
          data: jsonData
        }
      } catch (parseError) {
        console.error('JSON parsing error:', parseError)
        return {
          success: false,
          error: `JSON解析エラー: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`
        }
      }

    } catch (error) {
      console.error('Gemini API error:', error)
      return {
        success: false,
        error: `API エラー: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  async saveToFile(data: FamilyTreeData, filename: string): Promise<boolean> {
    try {
      // サーバーAPIを使用してファイルを保存
      const response = await fetch('/api/save-koseki', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data,
          filename
        })
      })

      const result = await response.json()

      if (response.ok && result.success) {
        console.log(`ファイルが保存されました: ${result.filename}`)
        console.log(`パス: ${result.path}`)
        
        // バックアップとしてローカルストレージにも保存
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        localStorage.setItem(`koseki_data_${timestamp}`, JSON.stringify(data, null, 2))
        
        return true
      } else {
        console.error('ファイル保存エラー:', result.error)
        return false
      }
    } catch (error) {
      console.error('ファイル保存エラー:', error)
      
      // フォールバック: ローカルストレージのみに保存
      try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        localStorage.setItem(`koseki_data_${timestamp}`, JSON.stringify(data, null, 2))
        console.log('フォールバック: ローカルストレージに保存しました')
        return true
      } catch (fallbackError) {
        console.error('フォールバック保存も失敗:', fallbackError)
        return false
      }
    }
  }
}

export const geminiService = new GeminiService() 