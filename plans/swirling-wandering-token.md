# npm 公開品質レビュー - 修正プラン

## Context

`@gunubin/claude-setup` の npm 公開前レビュー。README、LICENSE、package.json の基本フィールド（license, repository, keywords, publishConfig）は対応済み。残りのコード品質問題を修正する。

---

## 修正済み（確認済）

- README.md: Install, Usage, MCP Presets, Key Bindings, Data Sources, License 記載済
- LICENSE: MIT 存在
- package.json: license, repository, keywords, publishConfig, bin, files 設定済
- tsup: shebang 付与、ESM、node18 ターゲット
- 型安全性: `any` ゼロ、`strict: true`
- パス解決: `os.homedir()` / `path.resolve()` で環境非依存
- 依存関係: 最小限（ink, meow, react）

---

## 残り修正項目（4件）

### 1. `loadPresets()` の JSON.parse エラーハンドリング

**ファイル**: `src/lib/mcp.ts` L27-39

壊れた JSON プリセットが1つあるだけで app 全体がクラッシュする。個別にスキップすべき。

```typescript
// 修正: files.map → files.flatMap + try-catch
return files.flatMap((file) => {
  try {
    const content = JSON.parse(
      fs.readFileSync(path.join(presetsDir, file), "utf-8"),
    );
    const { _meta, ...config } = content;
    return [{
      name: path.basename(file, ".json"),
      description: _meta?.description ?? "No description",
      tags: _meta?.tags ?? [],
      requiredEnvVars: _meta?.requiredEnvVars ?? [],
      config,
    }];
  } catch {
    return [];
  }
});
```

### 2. `/dev/tty` の try-catch 追加

**ファイル**: `src/cli.tsx` L41-44

CI/CD、Docker コンテナ等で `/dev/tty` が存在しない場合に例外スロー。

```typescript
if (!process.stdin.isTTY) {
  try {
    const fd = fs.openSync("/dev/tty", "r");
    stdinStream = new tty.ReadStream(fd);
  } catch {
    // /dev/tty 利用不可時は process.stdin のまま
  }
}
```

### 3. `writeMcpJson()` で非プリセットサーバーを保持

**ファイル**: `src/lib/mcp.ts` L54-66

ユーザーが手動追加した MCP サーバーが apply 時に消失するデータロスリスク。プリセット管理対象のみ上書きし、それ以外は保持する。

```typescript
export function writeMcpJson(selectedNames: string[], presets: McpPreset[]) {
  const mcpPath = path.resolve(".mcp.json");

  // 既存サーバーを読み込み
  let existing: Record<string, unknown> = {};
  try {
    const content = JSON.parse(fs.readFileSync(mcpPath, "utf-8"));
    existing = content.mcpServers ?? {};
  } catch {
    // ignore
  }

  const presetNames = new Set(presets.map((p) => p.name));
  const mcpServers: Record<string, unknown> = {};

  // 非プリセット（手動追加）サーバーを保持
  for (const [name, config] of Object.entries(existing)) {
    if (!presetNames.has(name)) {
      mcpServers[name] = config;
    }
  }

  // 選択されたプリセットを追加
  for (const name of selectedNames) {
    const preset = presets.find((p) => p.name === name);
    if (preset) {
      mcpServers[name] = preset.config;
    }
  }

  fs.writeFileSync(mcpPath, JSON.stringify({ mcpServers }, null, 2) + "\n");
}
```

### 4. `package.json` に `engines` フィールド追加

**ファイル**: `package.json`

tsup target が node18 なので明示する。

```json
"engines": {
  "node": ">=18.0.0"
}
```

---

## 修正対象ファイル

| ファイル | 修正内容 |
|---------|---------|
| `src/lib/mcp.ts` | loadPresets() try-catch、writeMcpJson() マージロジック |
| `src/cli.tsx` | /dev/tty の try-catch |
| `package.json` | engines フィールド追加 |

## 検証方法

1. `npm run typecheck` → 型チェック通過
2. `npm run build` → ビルド成功
3. `npm pack --dry-run` → パッケージ内容確認
4. `node dist/cli.js` → 正常動作
5. `node dist/cli.js --list` → 正常出力
