**Response Helpers**

**Purpose**: Small shared utilities for standardized HTTP JSON responses across the API.

**Location**: `packages/api/src/utils/response.ts`

**Exports**:
- `newRequestId()` — generate a UUID v4 request id for tracing.
- `sendSuccess(res, data = {}, status = 200, requestId?)` — send a successful JSON response.
- `sendCreated(res, data = {}, requestId?)` — shortcut for 201 created responses.
- `sendBadRequest(res, code, message, requestId?)` — shortcut for 400 errors.
- `sendError(res, code, message, status = 500, requestId?)` — generic error response.
- `respondSuccess`, `respondError` — backwards-compatible aliases used in older controllers. These aliases are deprecated; prefer `sendSuccess`/`sendError`.

**Usage examples**:

```ts
import { sendSuccess, sendError, newRequestId } from '../utils/response';

const requestId = newRequestId();

sendSuccess(res, { data: result }, 200, requestId);

sendError(res, 'SOME_ERROR', 'Detailed message', 500, requestId);
```

**Migration note**: Use `sendSuccess`/`sendError`. The older `respondSuccess`/`respondError` aliases are deprecated and will emit a runtime warning when called; update callers to the new names and include a `requestId` to facilitate tracing and log correlation.
