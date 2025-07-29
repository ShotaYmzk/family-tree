import { NextRequest, NextResponse } from 'next/server'
import { writeFile } from 'fs/promises'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    const { data, filename } = await request.json()
    
    if (!data || !filename) {
      return NextResponse.json(
        { error: 'データとファイル名が必要です' },
        { status: 400 }
      )
    }

    // ファイル名にタイムスタンプを追加
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const fullFilename = `${filename}_${timestamp}.json`
    
    // public ディレクトリのパス
    const publicDir = path.join(process.cwd(), 'public')
    const filePath = path.join(publicDir, fullFilename)
    
    // JSONデータを文字列に変換
    const jsonString = JSON.stringify(data, null, 2)
    
    // ファイルを保存
    await writeFile(filePath, jsonString, 'utf8')
    
    console.log(`戸籍データを保存しました: ${fullFilename}`)
    
    return NextResponse.json({
      success: true,
      filename: fullFilename,
      path: `/${fullFilename}`,
      message: 'ファイルが正常に保存されました'
    })
    
  } catch (error) {
    console.error('ファイル保存エラー:', error)
    return NextResponse.json(
      { 
        error: 'ファイル保存に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 