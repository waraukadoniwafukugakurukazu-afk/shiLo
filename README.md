# shiLo 公式サイト / CONTROL ROOM

白い余白とカラフルなグリッチがテーマの shiLo 公式サイト。スマホ向け管理画面から、ライブ・ニュース・メンバー・紹介文を更新できます。

## 管理者の通常操作

1. 公式サイトの最下部「STAFF LOGIN」または URL 末尾の `/admin/` を開く。
2. 管理IDとパスワードでログインする。
3. LIVE / NEWS / MEMBER / TEXT で追加・変更・削除。公開する項目だけ公開に切り替え、保存する。
4. 管理IDや担当者が変わるときは「LOGIN」で更新する。

GitHub や Cloudflare の知識は日々の管理には不要です。

## 管理画面に「管理システムへの接続を確認できません」と表示されたら

このリポジトリには **Cloudflare Workers Static Assets 用の構成**を追加しました。
画面が表示できるのにログインが動かない場合、旧来の「静的アセットのみ」のデプロイか、Worker の KV / Secret が未設定である可能性があります。

### Workers（`*.workers.dev`）での初回設定

1. Cloudflare の **Workers & Pages** から実際に公開されている Worker（通常 `shilo`）を開く。
2. GitHub と連動してデプロイしている場合は、GitHub `main` の変更をデプロイする。Worker Builds のビルド設定がある場合、ルートディレクトリは `/`、デプロイコマンドは `npx wrangler deploy` にする。Workers Build の Worker 名は `wrangler.jsonc` の `name` と合わせる。
3. `wrangler.jsonc` は `src/worker.js`（API）とサイト本体の静的ファイルをひとつの Worker にまとめる設定。Workers の **KV `SHILO_DATA`** は最新の Wrangler で ID を省略した自動プロビジョニングに対応している。自動作成されない場合、Cloudflare の **Storage & databases > KV** で namespace を作り、Worker の **Settings > Bindings** から variable name `SHILO_DATA` で追加する。
4. 同じ Worker の **Settings > Variables and Secrets** で以下を **Secret** として追加する。値はそれぞれ別の、推測されないランダムな文字列にする。
   - `SHILO_SESSION_SECRET`：32文字以上。ログインセッションの署名用。**削除せず保持**する。
   - `SHILO_SETUP_KEY`：24文字以上。最初の管理者を登録するための一時的な秘密キー。
5. 設定内容を **Deploy** して、次の URL を確認する。
   - `https://＜サイトドメイン＞/api/content`：正常なら `{ "settings": ..., "events": ..., "members": ..., "news": ... }` が表示される。
   - `https://＜サイトドメイン＞/api/admin/session`：正常なら `{ "loggedIn": false, "setupRequired": true, "id": "" }` などが表示される。
6. `https://＜サイトドメイン＞/admin/` を開き、初期設定用キーと、管理者用に新しく決めた管理ID・パスワード（12文字以上）を登録する。
7. 登録できたら **`SHILO_SETUP_KEY` は削除して Deploy** する。以降の更新、管理IDとパスワードの変更は **サイト内だけ**で行う。

**秘密キー、管理パスワードを GitHub に保存したり、チャットに貼ったりしないでください。**
パスワードはランダムソルト付き PBKDF2 でハッシュ化し、セッションは HttpOnly, Secure, SameSite=Strict Cookie で保持します。

> 注意: GitHub だけの静的サイトでは、サーバー側の認証・複数端末への保存・全閲覧者への反映は実現できません。初回のバックエンド接続は必要です。また KV は最終的整合性のため、別端末への反映がわずかに遅れる場合があります。

### Cloudflare Pages を利用する場合

Pages Functions 用の `functions/api/[[path]].js` も残してあります。Pages の場合は KV バインディング `SHILO_DATA` と上記の2つのシークレットを Pages プロジェクトに登録してください。Workers の `wrangler.jsonc` は Pages 向けの設定ではありません。

## ファイル構成

- `index.html`, `style.css`, `play.js`：従来のサイトと Spotify
- `dynamic.css`, `content.js`：保存内容の公開表示
- `admin/index.html`, `admin/admin.css`, `admin/admin.js`：スマホ対応の管理画面
- `functions/api/[[path]].js`：認証・保存の共有 API / Pages Functions
- `src/worker.js`：Workers 用の API アダプター
- `wrangler.jsonc`：Workers Static Assets + KV バインディング
- `.assetsignore`：バックエンドのソースを公開アセットに含めない設定

メンバー画像のアップロード機能はまだありません。HTTPS の画像URLを入力する方式です。

## 参考

- [Cloudflare Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/)
- [Cloudflare Workers KV](https://developers.cloudflare.com/kv/concepts/kv-namespaces/)
- [Cloudflare Workers Secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
