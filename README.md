# shiLo 公式サイト + CONTROL ROOM

白い余白とカラフルなグリッチをテーマにした shiLo の公式サイト。従来の Spotify プレイヤー・写真・キャラクター演出は維持しています。

## 管理画面でできること

- **LIVE**：出演名、日付、時間、会場、詳細、チケットURLの登録・編集・削除
- **NEWS**：日付、見出し、本文、リンクの登録・編集・削除
- **MEMBER**：名前、担当、紹介文、写真URLの登録・編集・削除
- **TEXT**：トップのキャッチコピー、ABOUTの紹介文の変更
- **LOGIN**：管理ID・パスワードの変更（現在のパスワードで本人確認）
- それぞれ「公開する」をオフにして下書き保存できます。

管理画面は `https://＜公開サイトのURL＞/admin/`。スマホから操作できます。

## 重要：Cloudflare Pages への接続が必要

今回の管理画面は **Cloudflare Pages Functions + Workers KV** で動作します。
GitHub Pages や静的配信だけでは、管理画面の保存・ログイン・サイト全員への反映は動作しません。
API が未設定でも **公開サイトは元の静的コンテンツを表示**します。

### Cloudflare Pages 本番設定（初回のみ）

1. Cloudflare の **Workers & Pages > Pages** でこの GitHub リポジトリ `waraukadoniwafukugakurukazu-afk/shiLo` と接続した Pages プロジェクトを作る（または既存の Pages プロジェクトを使う）。本番ブランチは `main`。
2. フレームワークプリセットは **None**、ビルドコマンドは **空欄**、ビルド出力ディレクトリは **`.`**（リポジトリのルート）にする。`functions/` はリポジトリのルートに置いたままにする。
3. **Storage & databases > KV** で新しい KV namespace を作る（例：`shilo-content`）。
4. Pages プロジェクトの **Settings > Bindings > Add > KV namespace** でその namespace を選び、**Variable name を正確に `SHILO_DATA`** にする。
5. Pages プロジェクトの **Settings > Variables and Secrets** で以下を **Secret（シークレット）** として登録する。
   - `SHILO_SESSION_SECRET`：推測されないランダムな32文字以上の文字列（必須・共有しない）
   - `SHILO_SETUP_KEY`：初回管理者設定のための別のランダムな24文字以上の文字列（最初だけ必要・共有しない）
6. **再デプロイ**を実行する。KV バインディングや Secrets を追加しただけでは以前のデプロイには反映されない。
7. 公開サイトの `/api/content` にアクセスし、JSON が返ることを確認する。
8. `/admin/` にアクセスし、初期設定用キー、担当者用の管理ID、12文字以上の管理パスワードを入力する。
9. 初期設定が成功したら **`SHILO_SETUP_KEY` を Cloudflare の Secrets から削除し、再デプロイ**する。以降の管理ID・パスワード変更は管理画面の「LOGIN」から行う。

**注意：管理ID・パスワード・初期設定用キーを GitHub のコード、HTML、issue、スクリーンショットに書かないでください。** 管理者認証はサーバー側で行い、パスワードはソルト付き PBKDF2 ハッシュで保存しています。ログインセッションは HttpOnly / Secure / SameSite=Strict Cookie を使います。

### 日々の更新方法

1. サイトURLの末尾に `/admin/` を入力
2. 担当者の管理ID・パスワードでログイン
3. LIVE / NEWS / MEMBER を選択し「＋ 追加する」、または既存の「編集」
4. 「サイトに公開する」をオンにし、「保存して反映する」
5. 公式サイトを再読み込みして確認する（KV の伝播状況で反映まで短い遅延が生じる場合があります）

画像のアップロード自体は今回未実装です。メンバー写真は **HTTPS の画像URL** を入力してください（画像を保存する機能は将来 R2 等で追加可能）。同時編集は更新リビジョンを確認し、古いデータへの上書きをエラーで防ぎますが、KV は強い整合性のデータベースではありません。

## 開発

公開画面のみ：`python3 -m http.server 8080`

Pages Functions を含むローカル検証（Wrangler が使用できる場合）：`npx wrangler pages dev . --kv=SHILO_DATA`。ローカル検証では別途 `SHILO_SESSION_SECRET` と `SHILO_SETUP_KEY` を安全なローカル環境変数として渡してください。

## 主要なファイル

- `index.html`, `style.css`, `play.js`：もともとの公式サイト
- `dynamic.css`, `content.js`：公開済みデータを公式サイトに表示する部分
- `admin/index.html`, `admin/admin.css`, `admin/admin.js`：スマホ対応の管理画面
- `functions/api/[[path]].js`：Cloudflare Pages のサーバー側 API と認証

## 外部リンク

- [Spotify](https://open.spotify.com/intl-ja/artist/6Cs1oVBWrpkgcyUJXxBZJs)
- [Instagram](https://www.instagram.com/shilo.46/)
