import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { RolesEnum } from '../../common/enums/role.enum';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsEnum(RolesEnum)
  @IsOptional()
  role?: RolesEnum;
}
