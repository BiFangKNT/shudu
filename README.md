# Sudoku Web

一个基于 TypeScript + React + Vite 的数独游戏，支持：

- 随机生成题目（本地算法）
- 难度选择（简单 / 中等 / 困难 / 专家）
- 唯一解校验
- 笔记模式、撤销重做、提示、重开、新局
- 键盘快捷键与移动端触控

## 开发

```bash
pnpm install
pnpm dev
```

## 测试

```bash
pnpm test
pnpm test:e2e
```

## 构建

```bash
pnpm build
pnpm preview
```

## Docker 部署

默认对外端口为 `5173`。

```bash
docker compose up -d --build
```

访问地址：

```bash
http://localhost:5173
```

停止服务：

```bash
docker compose down
```
