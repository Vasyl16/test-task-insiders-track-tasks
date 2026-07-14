# Coding and Development Conventions

## Coding Standards
- Follow Clean Code and SOLID principles.
- Keep classes small and focused.
- Prefer constructor dependency injection.
- Use TypeScript strict mode.
- Prefer readability over cleverness.

## Security Rules
- Hash passwords before storing them.
- Use JWT for authentication.
- Store secrets in environment variables.
- Validate all input.
- Never expose sensitive fields in API responses.

## API Conventions
- Use consistent HTTP status codes.
- Validate request payloads.
- Return clear, standardized errors.
- Use DTOs for request and response shapes.

## Development Workflow
Before every task:
1. Read the relevant files in the .claude directory.
2. Explain the implementation plan.
3. Wait for approval if required.
4. Implement only the requested scope.
5. Explain what changed and why.
6. Suggest the next step.

Do not implement future milestones unless explicitly requested.
