import { Transform } from 'class-transformer';
import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import {
  NAME_MAX_LENGTH,
  NAME_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_PATTERN,
} from '../../common/validation.constants';
import { normalizeEmail, trim } from './transforms';

export class SignUpDto {
  @Transform(normalizeEmail)
  @IsEmail({}, { message: 'Email must be a valid email address' })
  email!: string;

  @Transform(trim)
  @IsString({ message: 'Name must be a string' })
  @MinLength(NAME_MIN_LENGTH, {
    message: `Name must be at least ${NAME_MIN_LENGTH} characters`,
  })
  @MaxLength(NAME_MAX_LENGTH, {
    message: `Name must be at most ${NAME_MAX_LENGTH} characters`,
  })
  name!: string;

  @IsString({ message: 'Password must be a string' })
  @MinLength(PASSWORD_MIN_LENGTH, {
    message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
  })
  @MaxLength(PASSWORD_MAX_LENGTH, {
    message: `Password must be at most ${PASSWORD_MAX_LENGTH} characters`,
  })
  @Matches(PASSWORD_PATTERN, {
    message:
      'Password must contain at least one letter, one number and one special character',
  })
  password!: string;
}
