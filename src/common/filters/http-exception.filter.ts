// src/common/filters/http-exception.filter.ts

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();


    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let type = 'internal_server_error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const errorResponse = exceptionResponse as { type: string, message: string, status: number };
        message = errorResponse.message || message;
        type = errorResponse.type || type;
      } else if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      }
    }

    const isProduction = process.env.NODE_ENV === 'production';
    this.logger.error(
      `${request.method} ${request.url} - ${status}`,
      isProduction ? undefined : (exception instanceof Error ? exception.stack : exception),
    );
    // 응답
    response.status(status).json({
      success: false,
      error: {
        type: type,
        status: status,
        message: message,
      },
      data: null,
    });
  }
}