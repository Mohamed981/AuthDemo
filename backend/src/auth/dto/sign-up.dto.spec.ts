import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SignUpDto } from './sign-up.dto';

const valid = { email: 'jane@example.com', name: 'Jane', password: 'secret12!' };

async function errorsFor(input: Record<string, unknown>): Promise<string[]> {
  const errors = await validate(plainToInstance(SignUpDto, input));
  return errors.map((e) => e.property);
}

describe('SignUpDto', () => {
  it('accepts valid input', async () => {
    expect(await errorsFor(valid)).toEqual([]);
  });

  it('normalizes email casing and whitespace', () => {
    const dto = plainToInstance(SignUpDto, { ...valid, email: '  Jane@Example.COM ' });
    expect(dto.email).toBe('jane@example.com');
  });

  it.each(['not-an-email', 'a@', '@b.com', ''])('rejects email %p', async (email) => {
    expect(await errorsFor({ ...valid, email })).toEqual(['email']);
  });

  it.each(['ab', '  ab  '])('rejects name %p shorter than 3 characters', async (name) => {
    expect(await errorsFor({ ...valid, name })).toEqual(['name']);
  });

  it.each([
    ['too short', 'ab1!'],
    ['no letter', '12345678!'],
    ['no number', 'abcdefgh!'],
    ['no special character', 'abcdefg1'],
  ])('rejects password with %s', async (_, password) => {
    expect(await errorsFor({ ...valid, password })).toEqual(['password']);
  });
});
