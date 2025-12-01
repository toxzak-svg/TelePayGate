/**
 * Shared model helper utilities to reduce code duplication
 * in database update operations
 */

/**
 * Build dynamic SQL update fields from an object of updates
 * Converts camelCase keys to snake_case for database columns
 *
 * @param updates Object containing updates (undefined values are skipped)
 * @param options Configuration options
 * @returns Object with fields array, values array, and next param index
 */
export function buildDynamicUpdate(
  updates: Record<string, unknown>,
  options: {
    startIndex?: number;
    jsonFields?: string[];
  } = {},
): {
  fields: string[];
  values: unknown[];
  nextParamIndex: number;
} {
  const { startIndex = 1, jsonFields = [] } = options;
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIndex = startIndex;

  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined) {
      const dbKey = camelToSnakeCase(key);
      fields.push(`${dbKey} = $${paramIndex}`);

      // JSON stringify if field is in jsonFields list
      if (jsonFields.includes(key)) {
        values.push(JSON.stringify(value));
      } else {
        values.push(value);
      }
      paramIndex++;
    }
  });

  return {
    fields,
    values,
    nextParamIndex: paramIndex,
  };
}

/**
 * Convert camelCase string to snake_case
 * @param str camelCase string
 * @returns snake_case string
 */
export function camelToSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * Build WHERE clause with optional status filter
 * Common pattern in listing methods
 *
 * @param baseField Base field for the initial condition (e.g., "user_id")
 * @param status Optional status filter
 * @param statusField Field name for status (defaults to "status")
 * @returns Object with whereClause string and params array starting positions
 */
export function buildListWhereClause(
  baseField: string,
  status?: string,
  statusField: string = "status",
): {
  whereClause: string;
  hasStatusFilter: boolean;
} {
  let whereClause = `WHERE ${baseField} = $1`;
  const hasStatusFilter = status !== undefined;

  if (hasStatusFilter) {
    whereClause += ` AND ${statusField} = $2`;
  }

  return {
    whereClause,
    hasStatusFilter,
  };
}
