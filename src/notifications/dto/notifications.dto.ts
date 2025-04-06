
import { IsMongoId, IsNotEmpty, IsOptional, IsString, IsEnum } from 'class-validator';
import { NotificationType } from 'src/common/enums/notification-type.enum';

export class CreateNotificationDto {
  @IsNotEmpty()
  @IsMongoId()
  user: string;

  @IsNotEmpty()
  @IsString()
  message: string;

  @IsNotEmpty()
  @IsEnum(NotificationType)
  type: NotificationType;

  @IsOptional()
  @IsMongoId()
  task?: string;
}
