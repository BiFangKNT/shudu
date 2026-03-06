# Repository Guidelines

## Project Structure & Module Organization
本仓库是基于 `TypeScript + React + Vite` 的数独应用。
- `src/`：主代码目录。`components/` 放页面与复用组件，`components/ui/` 放基础 UI 组件，`store/` 放 Zustand 状态管理，`lib/sudoku/` 放数独算法与类型定义。
- `src/test/setup.ts`：Vitest 测试初始化。
- `e2e/`：Playwright 端到端测试（如 `sudoku.spec.ts`）。
- `public/`：静态资源；`dist/`：构建产物（勿手改）。

## Build, Test, and Development Commands
统一使用 `pnpm`：
```bash
pnpm install        # 安装依赖
pnpm dev            # 本地开发（Vite）
pnpm build          # TypeScript 构建 + Vite 打包
pnpm preview        # 本地预览生产包
pnpm lint           # ESLint 检查
pnpm test           # 运行 Vitest 单元测试
pnpm test:coverage  # 生成覆盖率报告
pnpm test:e2e       # 运行 Playwright E2E
```

## Coding Style & Naming Conventions
- 语言与框架：TypeScript 严格模式、React 函数组件。
- 缩进 2 空格，使用双引号，默认不写分号（保持与现有代码一致）。
- 路径别名使用 `@/`（见 `tsconfig.app.json`）。
- 组件文件使用 `kebab-case`（如 `sudoku-board.tsx`），组件导出名用 `PascalCase`，变量/函数用 `camelCase`。
- 提交前至少执行 `pnpm lint` 与相关测试。

## Testing Guidelines
- 单元测试框架：Vitest + Testing Library；测试文件命名 `*.test.ts`，尽量与被测模块同目录放置。
- E2E 测试框架：Playwright；文件命名 `*.spec.ts`，放在 `e2e/`。
- 修改 `lib/sudoku/*` 算法或 `store/*` 状态逻辑时，必须补充或更新对应测试用例。

## Commit & Pull Request Guidelines
- 提交信息遵循现有风格：`type: 简短描述`，例如 `feat: 优化响应式布局`、`style: 统一 Tailwind 工具类`。
- 推荐 `type`：`feat`、`fix`、`refactor`、`test`、`docs`、`chore`、`style`。
- PR 需包含：变更摘要、测试结果（执行过的命令）、关联 issue；涉及 UI 的变更请附截图或录屏。

## Development Workflow Tips
- 建议从 `main` 拉新分支：`feat/<topic>`、`fix/<topic>`，避免在主分支直接开发。
- 推送前最小检查清单：`pnpm lint && pnpm test`；涉及交互流程再执行 `pnpm test:e2e`。
- 若改动包含状态结构、算法行为或文案，PR 描述中写清“变更前/变更后”与潜在回归点，便于 reviewer 快速验证。

## Architecture Notes
- 主要数据流为：`lib/sudoku/*` 负责题目生成与求解，`store/game-store.ts` 负责状态与动作，`components/*` 负责渲染与交互。
- 新功能优先沿用该分层，避免在组件中直接实现复杂算法或把 UI 细节写入算法层。

## Security & Configuration Tips
- 不要提交密钥、令牌或任何敏感配置；本项目当前无 `.env` 提交需求。
- 本地持久化依赖 `localStorage`（键如 `sudoku.v1`）；变更持久化结构时请考虑向后兼容。
