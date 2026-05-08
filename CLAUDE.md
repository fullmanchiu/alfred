# CLAUDE.md - Alfred Project Guide

Extends global rules in `~/.claude/CLAUDE.md`. Detailed conventions in `docs/CONVENTIONS.md`.

---

## Tech Stack

**Backend**: Spring Boot (Kotlin) + PostgreSQL + Redis

**Frontend**: React (TypeScript) + Ant Design + Vite

**Python**: Task scheduling & data fetching (port 8001)

---

## Key Constraints

**Frontend-Backend Sync**
- Backend API changes must sync to frontend
- Response format changes → Update ApiService & models
- Request param changes → Update frontend calls

**TypeScript Strict Mode (Required)**
- Must pass TypeScript compile before commit: `cd frontend && npm run build`
- Fix all type errors, no `// @ts-ignore`
- Field names must match exactly

**API Testing Rules**
- Must write test scripts: `scripts/test_*.sh`
- No direct curl in bash for testing
- No manual UI clicking for tests

**Serialization Naming**
- API fields: camelCase
- DB fields: snake_case
- Keep frontend & backend consistent

---

## Pre-commit Checklist

1. **Frontend**: `cd frontend && npm run build` must pass
2. **Backend**: `cd backend && ./gradlew compileKotlin` must pass
3. **Test**: Verify with Chrome MCP, check console for errors
4. **Standards**: Field names match, camelCase, Chinese comments English naming
5. **Security**: No test data, no secrets

**Do NOT commit if checks fail!**

---

## Quick Start

```bash
# Backend (port 8080)
cd backend && ./gradlew bootRun

# Frontend (port 3000)
cd frontend && npm run dev       # strict mode
cd frontend && npm run dev:fast  # fast mode

# Python service (port 8001)
cd py-service && source venv/bin/activate && python main.py
```

---

## Related Docs

- `docs/CONVENTIONS.md` - Detailed conventions (structure, API, testing)
- `README.md` - Project overview
- `AGENTS.md` - Agent usage
- `~/.claude/CLAUDE.md` - Global standards
