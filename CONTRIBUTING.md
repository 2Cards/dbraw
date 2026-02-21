# Contributing to DBRaw

## Project Structure (Clean Architecture)

We follow a feature-driven, colocated structure to keep the codebase maintainable as it scales.

```
src/
├── app/                  # Next.js App Router (pages, layouts, API routes)
│   ├── (auth)/           # Authentication routes (future)
│   ├── editor/           # Editor page
│   └── layout.tsx        # Global layout
├── components/           # Shared UI Components (Design System)
│   ├── ui/               # Button, Modal, Input (shadcn/ui style)
│   └── ...
├── features/             # Feature Modules (Domain Logic)
│   ├── editor/           # Core Visual Editor
│   │   ├── components/   # VisualCanvas, TableNode
│   │   ├── hooks/        # useEditorState, useAutoLayout
│   │   └── utils/        # parsing, layout calculation
│   ├── generator/        # AI Generation Logic
│   │   ├── components/   # PromptInput
│   │   └── api/          # Client-side API wrappers
│   └── settings/         # User Preferences
├── hooks/                # Shared React Hooks (useMediaQuery, useDebounce)
├── lib/                  # Shared Utilities (cn, constants, types)
├── store/                # Global State (Zustand)
├── types/                # Global Type Definitions
└── workers/              # Web Workers (parsing, heavy computation)
```

## Coding Guidelines

### 1. TypeScript
- **Strict Mode:** Enabled. No `any`. Use `unknown` if necessary.
- **Interfaces:** Prefer `interface` for object shapes, `type` for unions/functions.
- **Explicit Returns:** Always type the return value of complex functions.

### 2. React Components
- **Functional Components:** Use `const Component = () => {}`.
- **Props Interface:** Define props above the component or in a separate file if reused.
- **Hooks:** Custom logic should be extracted into custom hooks.
- **Memoization:** Use `useMemo`/`useCallback` judiciously, especially for expensive computations or stable references passed to child components.

### 3. Styling (Tailwind CSS)
- **Utility-First:** Use utility classes.
- **`cn` Utility:** Use `clsx` + `tailwind-merge` for conditional classes.
- **Avoid `@apply`:** Unless creating a highly reusable primitive.

### 4. State Management
- **Local State:** `useState` for simple UI state (toggle, input).
- **Global State:** **Zustand** for shared application state (schema, user settings).
- **Server State:** SWR or React Query (future) for API data.

### 5. Linting & Formatting
- **ESLint:** Run `npm run lint` before committing.
- **Prettier:** Code is automatically formatted on commit (via husky/lint-staged - setup pending).
- **Imports:** Organized via `eslint-plugin-simple-import-sort`.

## Git Workflow
- **Branch Naming:** `type/scope-description` (e.g., `feat/editor-canvas`, `fix/parsing-bug`).
- **Commits:** Conventional Commits (`feat: add zoom controls`, `chore: update deps`).
- **PRs:** Squashed and merged.

---
*Happy coding!* 🚀
