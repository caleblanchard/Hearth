/**
 * Pagination Utilities
 * 
 * Provides consistent pagination handling across API endpoints
 */

export interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: string;
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total?: number;
    totalPages?: number;
    hasMore: boolean;
    nextCursor?: string;
  };
}

export interface CursorPaginationResult<T> {
  data: T[];
  pagination: {
    cursor?: string;
    limit: number;
    hasMore: boolean;
    nextCursor?: string;
  };
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

/**
 * Parse and validate pagination parameters from request
 */
export function parsePaginationParams(
  searchParams: URLSearchParams | { [key: string]: string | string[] | undefined }
): { page: number; limit: number } {
  const page = Math.max(1, parseInt(
    (searchParams instanceof URLSearchParams 
      ? searchParams.get('page') 
      : searchParams.page) as string || String(DEFAULT_PAGE),
    10
  ));
  
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(
      (searchParams instanceof URLSearchParams 
        ? searchParams.get('limit') 
        : searchParams.limit) as string || String(DEFAULT_LIMIT),
      10
    ))
  );

  return { page, limit };
}

/**
 * Parse cursor pagination parameters
 */
export function parseCursorParams(
  searchParams: URLSearchParams | { [key: string]: string | string[] | undefined }
): { cursor?: string; limit: number } {
  const cursor = searchParams instanceof URLSearchParams
    ? searchParams.get('cursor') || undefined
    : (searchParams.cursor as string | undefined);
  
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(
      (searchParams instanceof URLSearchParams 
        ? searchParams.get('limit') 
        : searchParams.limit) as string || String(DEFAULT_LIMIT),
      10
    ))
  );

  return { cursor, limit };
}

/**
 * Calculate skip value for offset-based pagination
 */
export function getSkip(page: number, limit: number): number {
  return (page - 1) * limit;
}

/**
 * Create pagination response
 */
export function createPaginationResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total?: number
): PaginationResult<T> {
  const totalPages = total !== undefined ? Math.ceil(total / limit) : undefined;
  const hasMore = total !== undefined ? page < totalPages! : data.length === limit;

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasMore,
      nextCursor: hasMore ? String(page + 1) : undefined,
    },
  };
}

/**
 * Create cursor-based pagination response
 */
export function createCursorPaginationResponse<T>(
  data: T[],
  limit: number,
  getCursor: (item: T) => string
): CursorPaginationResult<T> {
  const hasMore = data.length > limit;
  const items = hasMore ? data.slice(0, limit) : data;
  const nextCursor = hasMore && items.length > 0 ? getCursor(items[items.length - 1]) : undefined;

  return {
    data: items,
    pagination: {
      cursor: undefined, // Current cursor would be passed in
      limit,
      hasMore,
      nextCursor,
    },
  };
}
