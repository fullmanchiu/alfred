# CONVENTIONS.md - Alfred Development Conventions

Detailed development standards for Alfred project.

---

## Architecture

```
Frontend (React + TypeScript)
    ↓ REST API
Backend (Spring Boot + Kotlin) ←→ PostgreSQL
    ↓
Python Service (Task Scheduling)
```

**Components**:
- `backend/` - Spring Boot backend, layered architecture
- `frontend/` - React frontend
- `py-service/` - Python task scheduler

---

## API Configuration

| Env | URL |
|-----|-----|
| Dev | `http://localhost:8080` |
| Prod | `http://YOUR_BACKEND_SERVER:8080` |
| Swagger | `http://localhost:8080/swagger-ui.html` |

Frontend config: `frontend/src/utils/config.ts`

---

## Directory Structure

### Backend (backend/)
```
backend/
├── src/main/kotlin/com/colafan/alfred/
│   ├── controller/      # API layer
│   ├── service/         # Business logic
│   ├── repository/      # Data access
│   ├── entity/          # Data models
│   ├── dto/             # Data transfer objects
│   └── config/          # Config classes
├── src/main/resources/
│   ├── application.yml  # App config
│   └── db/migration/    # DB migrations (Flyway)
└── src/test/kotlin/com/colafan/alfred/  # Tests
```

### Frontend (frontend/)
```
frontend/
├── src/
│   ├── pages/          # Page components
│   ├── components/     # Reusable components
│   ├── services/       # API calls
│   ├── utils/          # Utility functions
│   └── types/          # TypeScript types
└── package.json        # Dependencies
```

---

## API Development

### RESTful Design
- GET: Query
- POST: Create
- PUT/PATCH: Update
- DELETE: Delete

### URL Conventions
- Base path: `/api/v1`
- Resource naming: Plural `/api/v1/accounts`, `/api/v1/categories`
- Nested resources: `/api/v1/users/{id}/accounts`

### Response Format
```json
{"success": true, "data": {...}, "message": "..."}
```

### Status Codes
- 200/201: Success
- 400: Bad request
- 401: Unauthorized
- 404: Not found
- 500: Server error

---

## Spring Boot Conventions

### Layered Architecture
```
Controller → Service → Repository → Entity
```

### JPA Entity Rules
- Chinese comments for fields
- Snake case table names (auto-mapped)
- Lazy loading for relations
- Must include `@Id` and audit fields (createdAt, updatedAt)

### Database Migrations
- Tool: Flyway
- Location: `backend/src/main/resources/db/migration/`
- Naming: `V{version}__{description}.sql`
- Example: `V1__create_users_table.sql`

---

## Testing Conventions

### Test Location
`backend/src/test/kotlin/com/colafan/alfred/`

### Test Types
- Integration: `@SpringBootTest` + `MockMvc`
- Unit: `@ExtendWith(MockKExtension::class)`

### Test Script Rules
- Location: `scripts/test_*.sh`
- Use curl commands in scripts
- No direct curl in bash tool for testing

### Running Tests
```bash
cd backend

# All tests
./gradlew test

# Single test class
./gradlew test --tests "com.colafan.alfred.AuthControllerTest"

# Single test method
./gradlew test --tests "com.colafan.alfred.AuthControllerTest.shouldReturnToken"

# View report
open build/reports/tests/test/index.html
```

---

## Test Accounts

| Username | Password | Purpose |
|----------|----------|---------|
| test003 | test003 | General testing (with default categories) |
| lance | lance123 | Personal test account |

### Authentication in Tests

**Method 1: Real login (recommended)**
```kotlin
@SpringBootTest
@AutoConfigureMockMvc
class AccountControllerTest {

    private lateinit var token: String

    @BeforeEach
    fun setup() {
        val result = mockMvc.perform(post("/api/v1/auth/login")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""{"username":"test003","password":"test003"}"""))
            .andExpect(status().isOk)
            .andReturn()

        val response = mapper.readTree(result.response.contentAsString)
        token = response.path("data").path("token").asText()
    }

    @Test
    fun testApi() {
        mockMvc.perform(get("/api/v1/accounts")
            .header("Authorization", "Bearer $token"))
            .andExpect(status().isOk)
    }
}
```

**Method 2: Spring Security test utils**
```kotlin
@Test
@WithMockUser(username = "test003")
fun testWithMockUser() {
    mockMvc.perform(get("/api/v1/accounts"))
        .andExpect(status().isOk)
}
```

---

## Naming Conventions

| Context | Convention | Example |
|---------|------------|---------|
| API fields | camelCase | `userName`, `accountBalance` |
| DB fields | snake_case | `user_name`, `account_balance` |
| Constants | UPPER_CASE | `MAX_RETRY_COUNT` |
| Classes | PascalCase | `UserService`, `AccountController` |

---

## Tech Stack Versions

### Backend
- Spring Boot: 3.5.9
- Kotlin: 1.9.25
- JWT: io.jsonwebtoken:jjwt:0.12.3
- Testing: JUnit 5, MockK, MockMvc

### Frontend
- React: 18
- Ant Design: 5.x
- React Router: 7
- Vite: 6.x

---

## Task Scheduling System

### Architecture Principles

1. **Data layer in Java**
   - All data models in Java (JPA Entity)
   - Python never accesses DB directly
   - Python operates via Java HTTP API

2. **State pushed via WebSocket**
   - Task state changes pushed to Java via WebSocket
   - Java forwards to frontend
   - DB operations via HTTP API

3. **Task execution in Python**
   - APScheduler handles scheduling
   - ThreadPoolExecutor handles concurrent execution
   - Results saved via Java API

### Related Files

**Java:**
- `backend/.../entity/ScheduledTask.kt` - Task entity
- `backend/.../entity/TaskExecution.kt` - Execution record entity
- `backend/.../service/TaskService.kt` - Task service
- `backend/.../controller/TaskController.kt` - Task API
- `backend/.../db/migration/V37__create_tasks_tables.sql` - DB migration

**Python:**
- `py-service/java_client.py` - Java API client
- `py-service/scheduler/task_scheduler.py` - Task scheduler
- `py-service/executor/task_executor.py` - Task executor
- `py-service/action_handlers.py` - Action handlers

**Frontend:**
- `frontend/src/pages/Tasks.tsx` - Task management page
- `frontend/src/components/TaskForm.tsx` - Task form
- `frontend/src/types/task.ts` - Type definitions

### Adding New Task Types

1. **Add execution logic in `executor/task_executor.py`:**
```python
def execute_your_task(params: Dict[str, Any]) -> Dict[str, Any]:
    # Implement task logic
    return {'result': 'done'}

# Register in dispatch_task
def dispatch_task(task_type: str, params: Dict[str, Any]):
    if task_type == "your_task":
        return execute_your_task(params)
    # ...
```

2. **Add option in frontend form:**
```tsx
<Select.Option value="your_task">Your Task</Select.Option>
```

---

## Common Ports

| Service | Port |
|---------|------|
| Spring Boot | 8080 |
| PostgreSQL | 5432 |
| Python Service | 8001 |
| Frontend Dev | 3000 |

---

## Security Rules

**Forbidden**:
- Hardcoded secrets
- SQL injection
- XSS vulnerabilities

**Required**:
- Input validation
- Parameterized queries
- Encrypt sensitive data
