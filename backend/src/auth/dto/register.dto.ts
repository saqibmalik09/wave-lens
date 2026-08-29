import { IsEmail, IsString, MinLength, MaxLength, Matches, IsOptional } from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  appName!: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;

  @IsString()
  @MinLength(5)
  @MaxLength(120)
  @Matches(/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/, {
    message: 'bundleId must look like com.yourcompany.app',
  })
  bundleId!: string;
}
