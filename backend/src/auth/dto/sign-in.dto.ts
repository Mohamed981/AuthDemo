import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { PASSWORD_MAX_LENGTH } from '../../common/validation.constants';
import { normalizeEmail } from './transforms';

export class SignInDto {
  @Transform(normalizeEmail)
  @IsEmail({}, { message: 'Email must be a valid email address' })
  email!: string;

  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  @MaxLength(PASSWORD_MAX_LENGTH, {
    message: `Password must be at most ${PASSWORD_MAX_LENGTH} characters`,
  })
  password!: string;
}
