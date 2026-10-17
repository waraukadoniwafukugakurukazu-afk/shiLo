# shiLo 公式サイト / BACKSTAGE

shiLo の音楽サイトと管理用 BACKSTAGE。

## 管理画面の本番ログイン

- 管理URL：サイトの末尾に `/admin/`
- 管理ID：**1013（固定）**
- 管理パスワード：**Cloudflare Workers の Secret `SHILO_ADMIN_PASSWORD`** に管理担当者が設定する（ソースコードに記載しない）
- ログイン後に LIVE・NEWS・MEMBER・GOODS・WORDS を編集できます。
- 公開スイッチをオンにして保存した項目は公式サイトの表示データになります。下書きは公開されません。
- ログアウトはサーバー側で発行した HttpOnly / Secure / SameSite=Strict Cookie を削除します。
- 管理画面へのアクセス制限はサーバーの認証APIで行われます。HTML/CSSの閲覧だけでは編集データを取得・更新できません。

**重要**：GitHub へのコード反映だけでは本番ログインは完了しません。Cloudflareの設定が必要です。ログイン画面で「サーバー設定が未完了」と表示される場合は下記の初期設定をしてください。

### Cloudflare Workers 初回設定

1. Cloudflare にログインし、**Workers & Pages** からサイトを配信している Worker を開きます（通常 `shilo`）。
2. GitHubの `main` の最新コードをデプロイします。Workerが `wrangler.jsonc` の設定でビルドされ、APIを `src/worker.js` から動作させる必要があります。Workers Buildsのデプロイコマンドは `npx wrangler deploy` を利用できます。
3. Workerの **Settings → Bindings** で KV namespace を `SHILO_DATA` として接続します。 `wrangler.jsonc` はKVの自動作成も想定していますが、作成されない場合はCloudflareからKVを作成してBindingを設定してください。
4. **Settings → Variables and Secrets** で次の2つを **Secret** として登録します。
   - `SHILO_ADMIN_PASSWORD`：推測困難な12文字以上のログイン用パスワード。1013と同じ・短い数字・他サービスで使うパスワードは避けてください。
   - `SHILO_SESSION_SECRET`：別の推測困難な32文字以上のランダムな署名キー。
5. 保存してデプロイを更新します。
6. `https://＜公開ドメイン＞/api/admin/session` にアクセスし、JSONで `loggedIn` と `id` が返ることを確認してください。未ログイン時は `loggedIn: false` です。
7. `https://＜公開ドメイン＞/admin/` から ID **1013** と設定したパスワードでログインしてください。

**パスワードやSecretの値はGitHub、HTML、README、チャットに書かないでください。** IDだけでは認証できません。パスワードを変更する場合は `SHILO_ADMIN_PASSWORD` を更新・デプロイし直します。変更後は古いセッションが無効になります。

### 本番操作

- HOME：登録件数の確認とクイック編集
- LIVE：公演名・日付・会場・チケットURL
- NEWS：お知らせの見出し・本文
- MEMBER：名前・担当・紹介文・写真URL
- GOODS：グッズ名・価格・販売状況・写真URL・購入リンク
- WORDS：キャッチコピー・ABOUTの紹介文

追加・編集・削除した情報は Cloudflare KV に保存されます。 **GOODSも公開サイトのGOODS欄へ表示されます**。まだ登録がなければ COMING SOON が表示されます。

写真は現時点では**HTTPSの画像URL登録方式**です。スマホから画像ファイルをアップロードする機能は未実装です。以前のデザイン確認モードで端末に仮保存したデータは、本番側へ自動移行されません。

### 注意事項

- Cloudflare KV は最終的整合性のデータストアなので、保存内容が他の端末に反映されるまで遅れる場合があります。複数の管理者による同時編集が必要になったらD1などの強い整合性を持つ保存先へ移行することを推奨します。
- セッションは24時間有効です。共有端末ではログアウトしてください。
- バックエンドが停止しているときは公開サイトの静的な要素を維持し、保存・ログインはできません。

## 主なファイル

- `index.html`：公開サイト
- `content.js`：LIVE/NEWS/MEMBER/WORDSの公開表示
- `goods.js`：公開済みGOODSの表示
- `admin/index.html`：BACKSTAGE 管理画面
- `admin/admin.css`：管理画面のデザインとモバイルレイアウト
- `admin/admin.js`：本番ログイン・管理データの編集・保存
- `functions/api/[[path]].js`：本番認証とデータAPI
- `src/worker.js`：Cloudflare Workersエントリーポイント
- `wrangler.jsonc`：Cloudflare Workers設定

**管理IDについて（2026-10）**：IDは以前の `1013` に戻しました。本番パスワードは短い数字4桁では推測されやすいため、現在のAPIでは12文字以上を必要とします。パスワードはソースコードに入れず、運営者がCloudflareの `SHILO_ADMIN_PASSWORD` Secretに設定してください。
