# Coding and Development Conventions

## Coding Standards
- Follow Clean Code principles. Keep components small and focused.
- Function components and hooks only.
- Use TypeScript strict mode.
- Prefer readability over cleverness.

## Security Rules
- Centralize token storage/access in `api/axios/token-manager.ts` — never read/write tokens directly elsewhere.
- Never log tokens or passwords.
- Clear tokens on logout and on unrecoverable refresh failure; redirect to login.

## API Conventions
- All HTTP calls go through the shared Axios instance — no ad-hoc `fetch`/`axios` in components.
- Server state lives in the query/mutation layer; client-only state lives in `store/`. Don't duplicate one into the other.

## Development Workflow
Before every task:
1. Read the relevant files in the `.claude` directory.
2. Explain the implementation plan.
3. Wait for approval if required.
4. Implement only the requested scope.
5. Verify: build, lint, and actually run the dev server to check the UI, not just type-check.
6. Explain what changed and why.
7. Suggest the next step.

Do not implement future milestones, or install/adopt a library implied by the folder structure, without confirming the choice first.
