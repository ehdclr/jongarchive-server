export const ERROR_MESSAGES = {
  UNAUTHORIZED: {
    ACCESS_TOKEN_EXPIRED: {
      type: 'access_token_expired',
      status: 401,
      message: '인증이 만료되었습니다. 재로그인 해주세요.',
    },
    REFRESH_TOKEN_EXPIRED: {
      type: 'refresh_token_expired',
      status: 401,
      message: '세션이 만료되었습니다. 다시 로그인해주세요.',
    },
    ACCESS_TOKEN_MISSING: {
      type: 'access_token_missing',
      status: 401,
      message: '인증이 필요합니다. 로그인 해주세요.',
    },
    INVALID_TOKEN: {
      type: 'invalid_token',
      status: 401,
      message: '유효하지 않은 토큰입니다.',
    },
  },
  BAD_REQUEST: {
    USER_NOT_FOUND: {
      type: 'user_not_found',
      status: 400,
      message: '사용자를 찾을 수 없습니다.',
    },
    EMAIL_EXISTS: {
      type: 'email_exists',
      status: 400,
      message: '이미 존재하는 이메일입니다.',
    },
    INVALID_CREDENTIALS: {
      type: 'invalid_credentials',
      status: 400,
      message: '이메일 또는 비밀번호가 올바르지 않습니다.',
    },
    VALIDATION_ERROR: {
      type: 'validation_error',
      status: 400,
      message: '요청 정보를 다시 확인해주세요.',
    },
  },
  SERVER_ERROR: {
    INTERNAL_SERVER_ERROR: {
      type: 'internal_server_error',
      status: 500,
      message: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    },
  },
};
