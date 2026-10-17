# shiLo 公式サイト / BACKSTAGE

shiLoの音楽サイトとBACKSTAGE管理画面です。

## 現在の管理画面（ログインなし・デザイン確認モード）

公式サイトの最下部の「BACKSTAGE ↗」または、公開サイトURLの末尾に `/admin/` を付けて開きます。

- **現在は管理ID・パスワードの入力なしで画面が開きます。**
- HOME / LIVE / NEWS / MEMBER / GOODS / WORDS のデザインと操作を試せます。
- 追加・編集・削除・公開イメージの切り替え・写真のプレビューを試せますが、**すべてブラウザ内の仮保存のみ**です。
- 公開サイトのデータ更新、正式公開、ログイン認証、画像アップロードはこの画面からは実行できません。
- サンプルや入力内容がその端末のブラウザに残ることがあります。個人情報や秘密情報は入力しないでください。

### 本番データが勝手に書き換わらないための仕組み

`admin/admin.js` はCloudflareの管理APIを呼び出さず、ブラウザ内でサンプルデータを扱うデザインプレビューです。

**サーバー側の認証・保存APIは無効化していません。** `functions/api/[[path]].js` は引き続き認証なしの `/api/admin/content` 更新を拒否します。本番編集を再開する際は、管理画面に本番ログイン処理を復元してから運用してください。

## 現在の管理画面の項目

| メニュー | 試せること |
| --- | --- |
| HOME | 各項目の件数を確認、クイック編集 |
| LIVE | イベントの日時・会場・チケットURL |
| NEWS | お知らせの見出し・本文 |
| MEMBER | 名前・パート・紹介文・写真のプレビュー |
| GOODS | 商品名・価格・販売状況・商品写真のプレビュー |
| WORDS | キャッチコピー・ABOUTの文章 |

## 将来、本番ログインを再開する場合

本番APIには固定管理ID `1013` を維持しています。パスワードは公開リポジトリに保存せず、Cloudflareの `SHILO_ADMIN_PASSWORD` Secretとして安全な12文字以上の値を設定します。セッション署名用の `SHILO_SESSION_SECRET`（32文字以上）と `SHILO_DATA` KVも必要です。

**管理IDだけではログインできず、デザイン確認画面は本番の認証画面ではありません。** GitHub側の更新だけではCloudflareに公開されない場合があるため、公開を確認するにはCloudflareのデプロイ設定が必要です。

## 主なファイル

- `index.html`、`style.css`、`collage.css`、`goods.css`：公開サイト
- `content.js`、`goods.js`：公開データの表示
- `admin/index.html`：BACKSTAGE（ログイン画面なし）
- `admin/admin.css`：スマートフォン対応の管理画面デザイン
- `admin/admin.js`：ブラウザ内デザインプレビュー（認証・本番API通信なし）
- `functions/api/[[path]].js`、`src/worker.js`：認証が必要なサーバーAPI
- `wrangler.jsonc`：Cloudflare Workers用設定
