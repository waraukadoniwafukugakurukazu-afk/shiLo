# shiLo 公式サイト / CONTROL ROOM

白い余白とカラフルなグリッチがテーマの shiLo 公式サイト。スマホ向け管理画面から、ライブ・ニュース・メンバー・紹介文を更新できます。

## スタッフの操作

1. 公式サイトの最下部「STAFF LOGIN」か、URL末尾の `/admin/` を開く。
2. 管理IDは **1013 固定**。パスワードを入力してログインする。
3. LIVE / NEWS / MEMBER / TEXT から情報を追加・変更・削除する。公開するものだけ公開に切り替え、保存する。
4. 作業を終えたら「ログアウト」。

サイト上で「管理アカウントを新規登録」「管理IDを変更」する機能はありません。ログインする際の ID は必ず `1013` です。

## 運用環境の初期設定（デプロイ管理担当者のみ）

このコードは Cloudflare Workers Static Assets 用の構成です。管理画面で更新した情報を全員へ反映するため、バックエンドと KV の接続が必要です。

1. Cloudflare の「Workers & Pages」で公開中の Worker を確認する。GitHub の `main` から最新コードをデプロイし、実際の Worker 名と `wrangler.jsonc` の `name` が一致しているか確認する。Workers Builds を使用する場合はデプロイコマンド `npx wrangler deploy` を設定する。
2. `SHILO_DATA` という KV バインディングを接続する。`wrangler.jsonc` の ID を省略した KV は対応 Wrangler で自動プロビジョニング可能だが、自動で作成されない場合は KV namespace を作成し Worker の Settings > Bindings から接続する。
3. **Worker の Settings > Variables and Secrets** に次の値を **Secret** として登録する。必ず別のランダムな文字列を使用する。
   - `SHILO_SESSION_SECRET`：32文字以上。セッション署名用。
   - `SHILO_ADMIN_PASSWORD`：12文字以上。管理ID `1013` のログインパスワード。**推測困難な長い値を使用する。**
4. Worker をデプロイし、`/api/content` が JSON を返すこと、`/api/admin/session` が JSON を返すことを確認する。
5. `/admin/` で管理ID `1013` と設定したパスワードを入力しログインする。

**注意**：パスワードや Secret を GitHub・README・HTML・チャットに書かないでください。Secret は Cloudflare 側で保護された値として扱います。管理IDの `1013` だけではログインできません。ログインには別途安全なパスワードが必要です。

管理パスワードを変える場合は、Worker の `SHILO_ADMIN_PASSWORD` Secret を管理者が更新して再デプロイしてください。変更前のセッションはサーバー側で無効になります。アカウント登録用の `SHILO_SETUP_KEY` は **不要**です（以前設定してあれば削除可能）。

ログインには HttpOnly / Secure / SameSite=Strict の Cookie を使い、失敗回数を KV で制限します。KV は最終的整合性のため、複数端末への反映が少し遅れる場合があります。GitHub Pages 等の静的配信だけでは管理機能は動作しません。

### Cloudflare Pages を利用する場合

共有 API は `functions/api/[[path]].js` でも使えます。Pages 環境では `SHILO_DATA` KV バインディングと上記2つの Secret を Pages のプロジェクトに設定してください。

## ファイル

- `index.html`, `style.css`, `play.js`：公式サイト（Spotify、キャラクター演出）
- `dynamic.css`, `content.js`：サイトへ公開済みデータを表示
- `admin/index.html`, `admin/admin.css`, `admin/admin.js`：管理画面（ログイン・編集）
- `functions/api/[[path]].js`：ログイン認証・データ保存用の API
- `src/worker.js`：Workers 用の API 接続
- `wrangler.jsonc`：Workers Static Assets と KV
- `.assetsignore`：バックエンドのコードや設定を公開ファイルから除外

メンバー写真は現時点では画像アップロードではなく HTTPS の画像URLを入力する方式です。
