import { NextResponse } from 'next/server';

export function createErrorResponse(
  error: string,
  status: number = 500
): NextResponse {
  return NextResponse.json({ error }, { status });
}

export function createUnauthorizedResponse(): NextResponse {
  return createErrorResponse('Unauthorized', 401);
}

export function createBadRequestResponse(error: string): NextResponse {
  return createErrorResponse(error, 400);
}

export function createNotFoundResponse(error: string = 'Not found'): NextResponse {
  return createErrorResponse(error, 404);
}

export function createInternalErrorResponse(
  error: string = 'Internal server error',
  details?: string
): NextResponse {
  return NextResponse.json(
    { error, details },
    { status: 500 }
  );
}

