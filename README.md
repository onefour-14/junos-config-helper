# Junos Config Helper

**Junos Config Helper** は、Juniper Networks Junos OS のコンフィグレーションファイル（階層形式および Set 形式）の編集・閲覧を支援する Visual Studio Code 拡張機能です。

ネットワークエンジニアが日々の業務で扱うコンフィグファイルの可読性を向上させ、定義元へのジャンプ機能により解析作業を効率化します。

## 主な機能 (Features)

### 1. Syntax Highlighting (シンタックスハイライト)

Junos 特有のキーワード、IPアドレス、インターフェース名を視認しやすく色分けします。

* **階層構造**: `system`, `interfaces`, `protocols` などの主要セクションを強調。
* **パラメータ**: IPアドレス (IPv4/IPv6)、MACアドレス、インターフェース名 (`ge-0/0/0`, `irb.10` 等) を識別。
* **アクション**: `accept`, `discard`, `next term` などのポリシー動作を色分け。
* **プロトコル**: `bgp`, `ospf`, `mpls` などの技術用語をハイライト。

### 2. Go to Definition (定義へ移動)

設定箇所を使用箇所から素早く検索・ジャンプできます。 (`F12` または `右クリック -> 定義へ移動`)
階層型 (`{ ... }`) と Set型 (`set ...`) の両方に対応しています。

**対応している定義タイプ:**

* **Interfaces**: 物理IF (`ge-0/0/0`) および論理IF (`ge-0/0/0.0`)
* *Feature*: `ge-0/0/0.0` を検索すると、`ge-0/0/0` 階層内の `unit 0` ブロックへジャンプします。


* **Groups**: `apply-groups` で使用されているグループ定義
* **Policy Options**: `policy-statement`, `community`, `as-path`, `prefix-list`
* **Firewall**: `filter` 定義
* **NAT/Services**: `source-pool`, `destination-pool`
* **MPLS**: `label-switched-path`, `path`

### 3. Hover Information (ホバー表示)

設定名にマウスカーソルを合わせると、その定義内容（コンフィグブロック）をポップアップでプレビュー表示します。
巨大なコンフィグファイルを行ったり来たりすることなく、設定内容を確認できます。

### 4. Smart Editing (編集支援)

* **自動インデント**: ブレース `{` 後の改行で自動的にインデントを挿入し、`}` で戻します。
* **ブラケットマッチング**: 対応する `{ }` を強調表示します。
* **コメント**: `Ctrl + /` で `#` によるコメントアウト/解除が可能です。

## 対応ファイル拡張子

以下の拡張子を持つファイルを開くと自動的に有効になります。

* `.conf`
* `.config`
* `.set`
* `.txt` (手動で言語モードを `Junos` に変更した場合)

## インストール方法 (開発用)

1. このリポジトリをクローンします。
2. 依存パッケージをインストールします。
```bash
npm install

```


3. VS Code でフォルダを開き、`F5` キーを押してデバッグを開始します。
4. 新しいウィンドウ（Extension Development Host）が立ち上がり、拡張機能が有効になります。

## 使い方 (Usage)

1. Junosのコンフィグファイルを開きます。
2. 右下の言語モードが `Junos` になっていることを確認します。
3. **ジャンプ機能**: `apply-groups GLOBAL` などの `GLOBAL` 部分にカーソルを合わせ、`F12` を押すと `groups GLOBAL { ... }` へジャンプします。
4. **インターフェース**: `set protocols ospf area 0.0.0.0 interface ge-0/0/0.0` などの記述から、`interfaces` 階層の定義へジャンプします。

## 既知の問題 (Known Issues)

* 非常に巨大なファイル（数万行以上）の場合、初回スキャンに数ミリ秒〜数秒かかる場合があります。
* 複雑な `apply-groups` の継承ロジックまでは解釈しません（単純な文字列マッチングと階層解析のみを行います）。

## リリースノート

### 0.0.1

* Initial release
* Syntax highlighting support
* Go to Definition & Hover support for major Junos objects
* Interface unit awareness logic implemented