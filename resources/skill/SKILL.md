---
name: takt-engine
description: TAKT ピースエンジンのリファレンス。/takt コマンドから使用される。ピースYAML定義に従ったマルチエージェントオーケストレーション。
---

# TAKT Piece Engine

ピースYAMLファイルを読み込み、定義されたワークフロー（状態遷移マシン）に従って複数のAIエージェントをオーケストレーションするエンジン。

## 設計原則

- **Skill = 純粋なエンジンロジックのみ**
- ピースYAML、エージェント .md は全て **ファイル参照** で実行時に Read する
- Skill 内にピース定義・エージェント定義を一切埋め込まない
- このスキルが持つのは「YAMLの読み方」「状態遷移の回し方」「ルール評価の仕方」だけ

## ピース解決

### ピースYAMLの検索

引数の第1トークンからピースYAMLファイルを特定する。

1. ファイルパス判定: `.yaml` / `.yml` で終わる、または `/` を含む → Read で直接読む
2. ピース名検索（以下の順で Glob/Read を試行）:
   - `~/.takt/pieces/{name}.yaml` （ユーザーカスタム、優先）
   - `~/.claude/skills/takt/pieces/{name}.yaml` （Skill同梱ビルトイン）
3. 見つからない場合: 上記2ディレクトリを Glob (`*.yaml`) で列挙し、AskUserQuestion で選択させる

### エージェント .md の解決

ピースYAML内の `agent:` フィールドは、**ピースYAMLファイルのディレクトリからの相対パス**。

例: ピースが `~/.claude/skills/takt/pieces/default.yaml` にあり、`agent: ../agents/default/coder.md` の場合
→ 絶対パスは `~/.claude/skills/takt/agents/default/coder.md`

解決手順:
1. ピースYAMLのディレクトリパスを取得
2. 各 movement の `agent:` の相対パスを絶対パスに変換
3. Read tool で .md ファイルの内容を読み込む
4. 読み込んだ内容をエージェントのシステムプロンプトとして使用する

**全てのエージェント .md を事前に読み込む**（状態遷移ループ開始前に）。

## 実行フロー

### ステップ 1: ピースYAMLの読み込みと解析

1. ピース解決でYAMLファイルパスを特定し、Read で読み込む
2. YAML内容を解析して以下を抽出する（→ references/yaml-schema.md 参照）:
   - `name`: ピース名
   - `max_iterations`: 最大イテレーション数
   - `initial_movement`: 開始 movement 名
   - `movements`: 全 movement 定義の配列

### ステップ 2: エージェントの事前読み込み

全 movement（parallel のサブステップ含む）から `agent:` パスを収集し、重複を除いて Read で読み込む。

### ステップ 3: 状態遷移ループ

**詳細は references/engine.md を参照。**

```
iteration = 0
current_movement = initial_movement
previous_response = ""

LOOP:
  iteration++
  if iteration > max_iterations → 強制終了（ABORT）

  movement = movements[current_movement] を取得

  if movement が parallel:
    → 並列実行（engine.md の「Parallel Movement の実行」参照）
  else:
    → 通常実行（engine.md の「通常 Movement の実行」参照）

  agent_output を取得

  rule 評価（engine.md の「Rule 評価」参照）
    → matched_rule を決定

  next = matched_rule.next

  if next == "COMPLETE" → 成功終了、ユーザーに結果を報告
  if next == "ABORT" → 失敗終了、ユーザーにエラーを報告

  previous_response = agent_output
  current_movement = next
  → LOOP に戻る
```

### ステップ 4: 完了報告

- COMPLETE: 最後の agent 出力のサマリーをユーザーに表示
- ABORT: 失敗理由をユーザーに表示
- max_iterations 到達: 強制終了を通知

## 詳細リファレンス

| ファイル | 内容 |
|---------|------|
| `references/engine.md` | Movement 実行、プロンプト構築、Rule 評価の詳細ロジック |
| `references/yaml-schema.md` | ピースYAMLの構造定義とフィールド説明 |
