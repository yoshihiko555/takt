---
name: takt
description: TAKT ピースランナー。ピースYAMLワークフローに従ってマルチエージェントを実行する。
---

TAKT ピースランナーを実行する。

## 引数

$ARGUMENTS を以下のように解析する:

- 第1トークン: ピース名またはYAMLファイルパス（必須）
- 残りのトークン: タスク内容（省略時は AskUserQuestion でユーザーに入力を求める）

例:
- `/takt passthrough タスクを実行`
- `/takt default src/foo.ts のバグを修正`
- `/takt /path/to/custom.yaml 実装して`

## 実行手順

以下のファイルを **Read tool で読み込み**、記載された手順に従って実行する:

1. `~/.claude/skills/takt/SKILL.md` - エンジン概要とピース解決
2. `~/.claude/skills/takt/references/engine.md` - 実行エンジンの詳細ロジック
3. `~/.claude/skills/takt/references/yaml-schema.md` - ピースYAML構造リファレンス

**重要**: これら3ファイルを最初に全て読み込んでから、SKILL.md の「実行フロー」に従って処理を開始する。
