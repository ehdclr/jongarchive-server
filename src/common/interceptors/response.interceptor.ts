import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

interface PaginatedData {
  data: unknown[];
  meta: {
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

function isPaginatedData(data: unknown): data is PaginatedData {
  return (
    data !== null &&
    typeof data === 'object' &&
    'data' in data &&
    'meta' in data &&
    Array.isArray((data as PaginatedData).data)
  );
}

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return next.handle().pipe(
      map((data) => {
        // 이미 success 필드가 있으면 그대로 반환
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }

        // 페이징 응답 처리 (data + meta 구조)
        if (isPaginatedData(data)) {
          return {
            success: true,
            payload: data.data,
            meta: data.meta,
          };
        }

        // 일반 응답
        return {
          success: true,
          payload: data,
        };
      }),
    );
  }
}
