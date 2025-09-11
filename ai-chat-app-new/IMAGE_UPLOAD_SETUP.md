# 画像アップロード設定ガイド

## 現在の状況

本番環境での画像アップロードには、外部の画像ホスティングサービスの設定が必要です。
設定なしでも動作しますが、ブラウザ間で画像が共有されません。

## 推奨設定方法

### 方法1: ImgBB（無料・簡単）

1. **ImgBBアカウント作成**
   - https://imgbb.com/ にアクセス
   - 無料アカウントを作成

2. **APIキー取得**
   - ログイン後、[API設定](https://api.imgbb.com/) にアクセス
   - APIキーをコピー

3. **Vercelに環境変数設定**
   - Vercelダッシュボードでプロジェクトを開く
   - Settings → Environment Variables
   - 以下を追加:
     - Key: `IMGBB_API_KEY`
     - Value: 取得したAPIキー
     - Environment: Production

4. **再デプロイ**
   ```bash
   vercel --prod
   ```

### 方法2: Vercel Blob Storage（推奨・月1GB無料）

1. **Vercel Blobを有効化**
   - Vercelダッシュボードでプロジェクトを開く
   - Storage タブをクリック
   - Create Database → Blob を選択
   - 無料プランで開始

2. **自動的に環境変数が設定される**
   - `BLOB_READ_WRITE_TOKEN` が自動設定

3. **再デプロイ**
   ```bash
   vercel --prod
   ```

### 方法3: Cloudflare Images（月$5〜）

1. **Cloudflareアカウント作成**
   - https://cloudflare.com でアカウント作成
   - Cloudflare Imagesを有効化

2. **API認証情報取得**
   - Account ID をコピー
   - API Token を作成（Images:Edit権限）

3. **Vercelに環境変数設定**
   - `CLOUDFLARE_ACCOUNT_ID`
   - `CLOUDFLARE_API_TOKEN`

## トラブルシューティング

### Q: 画像が他のブラウザで表示されない
A: 外部ホスティングサービスが設定されていません。上記のいずれかの方法で設定してください。

### Q: "データURLとして保存されます"という警告が出る
A: 正常な動作です。外部サービスが設定されていない場合のフォールバック動作です。

### Q: モバイルで画像アップロードができない
A: 外部サービスを設定することで解決します。ImgBBが最も簡単です。

## 各方法の比較

| サービス | 料金 | 容量制限 | 設定難易度 | 信頼性 |
|---------|------|----------|-----------|--------|
| ImgBB | 無料 | 32MB/画像 | 簡単 | 良好 |
| Vercel Blob | 月1GB無料 | 無制限/画像 | 簡単 | 最高 |
| Cloudflare | 月$5〜 | 無制限 | 中程度 | 最高 |
| データURL（デフォルト） | 無料 | 5MB程度 | 設定不要 | ブラウザ限定 |

## 現在の動作

環境変数が設定されていない場合：
1. データURLとして画像を保存
2. 同じブラウザ内でのみ画像が表示される
3. 他のブラウザやデバイスでは画像が表示されない

環境変数設定後：
1. 外部サービスに画像をアップロード
2. 永続的なURLが生成される
3. すべてのブラウザ・デバイスで画像が表示される