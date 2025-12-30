import { TelePayGate } from '../client';

describe('TelePayGate handleError branches', () => {
  let client: TelePayGate;

  beforeEach(() => {
    client = new TelePayGate({ apiKey: 'pk_test' });
  });

  test('handles response error', () => {
    const error: any = {
      response: {
        status: 400,
        data: { error: 'Bad Request', code: 'BAD_REQ', details: { foo: 'bar' } },
      },
    };

    const result = (client as any).handleError(error);

    expect(result).toEqual({
      message: 'Bad Request',
      code: 'BAD_REQ',
      status: 400,
      details: { foo: 'bar' },
    });
  });

  test('handles network error (no response)', () => {
    const error: any = { request: {}, message: 'timeout' };

    const result = (client as any).handleError(error);

    expect(result).toEqual({
      message: 'No response from server',
      code: 'NETWORK_ERROR',
      status: 0,
    });
  });

  test('handles request setup errors', () => {
    const error: any = { message: 'Something failed' };

    const result = (client as any).handleError(error);

    expect(result).toEqual({
      message: 'Something failed',
      code: 'REQUEST_ERROR',
      status: 0,
    });
  });
});
