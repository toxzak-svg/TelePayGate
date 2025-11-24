**Response Helpers**

**Purpose**: Small shared utilities for standardized HTTP JSON responses across the API.

**Location**: `packages/api/src/utils/response.ts`

**Exports**:
- `newRequestId()` — generate a UUID v4 request id for tracing.
- `sendSuccess(res, data = {}, status = 200, requestId?)` — send a successful JSON response.
- `sendCreated(res, data = {}, requestId?)` — shortcut for 201 created responses.
- `sendBadRequest(res, code, message, requestId?)` — shortcut for 400 errors.
- `sendError(res, code, message, status = 500, requestId?)` — generic error response.
- `respondSuccess`, `respondError` — backwards-compatible aliases used in older controllers.

**Usage examples**:

```ts
import { respondSuccess, respondError, newRequestId } from '../utils/response';

const requestId = newRequestId();

respondSuccess(res, { data: result }, 200, requestId);

respondError(res, 'SOME_ERROR', 'Detailed message', 500, requestId);
```

**Migration note**: Use `sendSuccess`/`sendError` (or the backward-compatible `respondSuccess`/`respondError`) and include a `requestId` to facilitate tracing and log correlation.
