import {
  type ArgumentsHost,
  BadRequestException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';

function createHost() {
  const res = {
    locals: { requestId: 'req-123' },
    headersSent: false,
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    end: jest.fn(),
  };
  const req = { method: 'POST', originalUrl: '/api/auth/signin' };
  const host = {
    switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
  } as unknown as ArgumentsHost;
  return { host, res };
}

describe('AllExceptionsFilter', () => {
  const filter = new AllExceptionsFilter();
  let errorSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => jest.restoreAllMocks());

  it('passes HTTP exceptions through and logs them as warnings', () => {
    const { host, res } = createHost();
    filter.catch(new UnauthorizedException('Invalid email or password'), host);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      statusCode: 401,
      message: 'Invalid email or password',
      error: 'Unauthorized',
      requestId: 'req-123',
    });
    expect(warnSpy).toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('keeps validation message arrays intact', () => {
    const { host, res } = createHost();
    filter.catch(new BadRequestException(['email must be an email', 'name too short']), host);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: ['email must be an email', 'name too short'],
      }),
    );
  });

  it('hides unexpected errors behind a generic 500 and logs the stack', () => {
    const { host, res } = createHost();
    const boom = new Error('connection string mongodb://secret@host leaked');
    filter.catch(boom, host);

    expect(res.status).toHaveBeenCalledWith(500);
    const body = res.json.mock.calls[0][0];
    expect(body).toEqual({
      statusCode: 500,
      message: 'Internal server error',
      error: 'Internal Server Error',
      requestId: 'req-123',
    });
    expect(JSON.stringify(body)).not.toContain('secret');
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('500'), boom.stack);
  });

  it('maps body-parser size errors to 413', () => {
    const { host, res } = createHost();
    const tooLarge = Object.assign(new Error('request entity too large'), {
      status: 413,
      expose: true,
    });
    filter.catch(tooLarge, host);

    expect(res.status).toHaveBeenCalledWith(413);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Request body too large', error: 'Payload Too Large' }),
    );
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
