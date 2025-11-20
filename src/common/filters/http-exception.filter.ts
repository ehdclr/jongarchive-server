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
      const exceptionResponse = exception.getResponse() as { type: string, message: string, status: number };
      status = exception.getStatus();
      message = exceptionResponse.message;
      type = exceptionResponse.type;
    }

    // 에러 로깅
    this.logger.error(
      `${request.method} ${request.url}`,
      exception instanceof Error ? exception.stack : exception,
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