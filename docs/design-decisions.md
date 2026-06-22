# Design Decisions

Humation v1 までに確定した設計判断の要約。
詳細な経緯は各PRの説明にあり、ここは「いま何がどうなっていて、なぜか」の
1枚もの。新しくこのリポジトリに入る人はまずこれを読む。

## リポジトリ構成と開発フロー

- **このリポジトリ(endo-yusuke/humation)がOSSの正本。** runtime packages、
  asset snapshots、registry block、docs をここで管理する。
- **アセットとmanifestは生成物。** `packages/assets-humation-1` の
  manifest.json / assets/\*\* / src/embedded.ts 等は同期された snapshot として
  まとめて更新する。
- 検証の基準: asset tests、renderer tests、pack smoke で manifest の整合性と
  package consumer behavior を確認する。

## パッケージ構成(4分割 + レジストリ)

- `@humation/core` / `@humation/assets-humation-1` / `@humation/react` /
  `@humation/web-component` はすべて MIT。
  core↔assets分離はライセンスとリリースサイクルの分離が理由(必須)。
  フレームワーク分離はpeer依存の隔離(lucide型)。共有coreを持つのは
  アセット複製を避けるため(DiceBear型)。
- **アバタービルダーUIはnpmパッケージにしない。** shadcn式に
  `registry/` のソースを `npx shadcn add .../r/avatar-builder.json` で
  ユーザーのアプリへコピーする(`bun run registry:build` で再生成)。
- 磨き込まれたクリエイター体験(全身出力等)は humation.app 製品側の領分。

## 色のアーキテクチャ(最重要の変更点)

- **公開アセットはCSS変数を直接持つ**: `fill="var(--hm-hair, #000000)"`。
  フォールバック=デフォルト色なので、アセット単体を開いてもデフォルト
  配色で正しく表示される。
- **coreに色置換ロジックは存在しない**(PoC時代のMARKER_COLOR_MAPは削除)。
  レンダリング = フラグメント合成 + ルート要素に `--hm-*` 値を置くだけ。
- マーカー色規約(`#008000`=髪 等)は**作家向けの入力形式**。2段構造
  (`deriveColorBindings` → `bakeColorBindings`)で、将来のアップロード
  フローは同じベイク経路に乗る。
- `validateManifest` がSVG内の `var(--hm-*)` 参照と宣言済み色スロットの
  整合を検証する。

## 色スロットとチャンネルの意味論

- 色スロットは役割名: `hair` / `clothes` / `bottom` / `skin` / `stroke` /
  `background`。
- 肌マーカーは `#FEFEFE` のみ。リテラル `white`/`#FFFFFF` は意図的な固定白
  (白インナー)。
- **bottomは4チャンネル**: 脚=#FEFEFE→skin / 靴下・靴=リテラル黒
  (出現順0-1が靴=固定黒、2以降が靴下=固定白)/ 輪郭=#808080→stroke /
  ガーメント=#FF0000→bottom。
- **アクセサリ(item/glasses/cat)の塗りは固定**(色変更不可)、
  輪郭(#808080)だけstrokeに追従。
- appレンダラーとの**意図的乖離**は3点(固定白インナー・固定黒靴・固定白
  靴下)。ゴールデンテストは該当パスを中和して比較している。

## パーツの語彙

- 全69パーツに**スロット内一意の `name`**(作家承認済み)。名前が表示
  ラベルを兼ねる(labelフィールドは無い。title-case導出)。検索用tagsは
  将来必要になったら追加。
- エイリアスは1パーツ=1本(`${slot}-${name}`)。数値エイリアスは公開前に
  削除済み。**標準ID(`hm1-p-000023`)が不変の永続化フォーマット**
  (`toJSON()` の selections)。リネームはエイリアス追加+旧の
  deprecation(`AliasEntry.status`)で非破壊。
- catはitemスロットに統合(1スロット=1選択により排他が構造化)。
  レイヤーも統合済み(item/glasses/catのボックスは幾何学的に同一)。
  猫の名前はカテゴリサフィックス(`black-cat`)。
- アセットの主要exportは **`humation1`**、ラッパーのpropは **`assets`**
  (`<Avatar assets={humation1} />`)。`manifest` は仕様語彙のalias。

## レンダリングの公開API

- `createAvatar(manifest, { seed, selections, colors, background, crop })`
  → `.toString() / .toDataUri() / .toJSON() / .toRenderData()`。
- **seed**: スロットごとにFNV-1a(`seed:slotId`)で決定論的にパーツ選択。
  **色はデフォルトのまま**(黒髪・白服・白肌・黒ボトム)。パレット連動は
  不採用と決定済み。
- **公開cropは `avatar` のみ。** 全身(`full`)はファーストパーティ専用
  (生成時の `includeFullCrop` オプション。ソフトな制限である点は了解済み)。
- React/WCは core の `toRenderData()` の上の薄い層。**colorsはCSS変数で
  要素に乗る**ため、色変更でコンテンツの再レンダリングが起きない
  (テストでピン留め)。未指定スロットは外部CSSからテーマ可能。

## リリース時の確認

1. `bun run typecheck`
2. `bun run test`
3. `bun run release:check`
4. `bun run pack:smoke`
5. npm publish order: core → assets → react → web-component
6. package README, root README, docs, and npm metadata stay in sync

## 0.2以降に意図的に送ったもの

- tree-shakeable静的 `<Avatar>`(パーツ別import、lucide式codegen)
- 検索用 `tags`、Vue/Svelteアダプタ、skills配布、サイト(ギャラリー/
  プレイグラウンド)、素材アップロードフロー実装
- グラデーション(v1は単色のみ)

## 作らないと決めたもの

- CLI / MCP(埋め込み=import、画像=curlで足りる)
- ビルダーのnpmパッケージ化(shadcn式コピー配布が正)
