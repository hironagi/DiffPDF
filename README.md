# PDF差分検出Webアプリ

このリポジトリは、**ローカルPCだけで使える** PDF比較ツールです。  
CodexやGitHubの画面を使わなくても、ブラウザで動作確認できます。

## 1. 起動方法（最短）

```bash
cd /workspace/DiffPDF
./start.sh
```

起動後、ブラウザで以下を開いてください。

- <http://localhost:4173>

## 2. 手動起動する場合

```bash
cd /workspace/DiffPDF
python3 -m http.server 4173
```

## 3. 使い方

1. 左の「旧PDF」、右の「新PDF」を選択
2. 「検出強度」を調整（高いほど厳密）
3. 必要なら「すべてのページを表示」をOFF
4. 「差分を検出」をクリック
5. 右側PDFに赤色で差分が重なって表示されます

## 4. 注意点

- この実装はブラウザ内でページを画像化して比較します（ピクセル差分）。
- PDF.js はCDNから読み込んでいるため、初回利用時はネットワーク接続が必要です。

## 5. conflict が出たときの解消手順

`This branch has conflicts that must be resolved` が表示された場合は、以下の手順で解消できます。

```bash
cd /workspace/DiffPDF

# どのファイルが衝突しているか確認
git status

# 競合マーカーの確認（<<<<<<<, =======, >>>>>>>）
rg "^(<<<<<<<|=======|>>>>>>>)" -n
```

競合ファイルを編集して、不要な競合マーカーを削除したら:

```bash
# 解消したファイルをステージ
git add <conflict-file>

# 解消コミットを作成
git commit -m "Resolve merge conflicts"
```

このリポジトリの現時点の状態では、`git status` は `working tree clean` で、未解消 conflict は検出されません。
