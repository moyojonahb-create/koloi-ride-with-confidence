# Repository Guidelines

## Project Structure & Module Organization
This is a **Vite-powered React** application built with **TypeScript**, **shadcn-ui**, and **Tailwind CSS**. It serves as a Progressive Web App (PWA) with mobile support via **Capacitor**.

- **`src/`**: Main application logic.
  - **`components/`**: UI components, primarily built using shadcn-ui and Radix UI primitives.
  - **`pages/`**: Application routes and main view logic.
  - **`hooks/`**: Custom React hooks for state and side-effect management.
  - **`integrations/`**: Configuration and client setups for external services like Supabase.
  - **`lib/`**: Shared utility functions and library wrappers.
  - **`test/`**: Unit and integration tests using Vitest.
- **`supabase/`**: Backend configuration, including migrations and Edge Functions.
- **`android/`**: Native Android project files managed by Capacitor.

The application heavily relies on **Supabase Realtime** for live driver tracking and **Google Maps API** for navigation features.

## Build, Test, and Development Commands
The project requires **Node.js 20 or 22**. Node 24 is currently incompatible with the test suite.

- **`npm run dev`**: Starts the Vite development server.
- **`npm run build`**: Creates a production-ready build in the `dist/` directory.
- **`npm run lint`**: Runs ESLint across the project.
- **`npm test`**: Executes the test suite using Vitest.
- **`npm run test:watch`**: Runs tests in interactive watch mode.
- **`npm run preview`**: Previews the production build locally.

## Coding Style & Naming Conventions
- **TypeScript**: Relaxed strictness (`noImplicitAny: false`, `strictNullChecks: false`) to facilitate rapid prototyping.
- **Linting**: Enforced via ESLint using `@typescript-eslint/recommended`. Unused variables and `any` types are currently set to `warn` to avoid blocking development.
- **Path Aliases**: Use `@/` to reference the `src/` directory (e.g., `@/components/Button`).
- **Styling**: Utility-first CSS using **Tailwind CSS**. Component-specific styles should follow shadcn patterns.

## Testing Guidelines
- **Framework**: **Vitest** with **React Testing Library**.
- **Location**: Tests are primarily located in `src/test/`.
- **Constraint**: Always ensure you are running Node 20 or 22 before executing tests.

## Commit & Pull Request Guidelines
Commit messages generally follow a simplified conventional commits pattern:
- **`fix: ...`**: For bug fixes.
- **`feat: ...`**: For new features.
- More casual descriptions are common during iterative phases (e.g., "Work in progress", "Refined driver dashboard flow").
