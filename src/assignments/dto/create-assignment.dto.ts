import { IsNotEmpty, IsOptional, IsBoolean, IsDate } from 'class-validator';

export class CreateAssignmentDto {
  @IsNotEmpty()
  task: string;

  @IsNotEmpty()
  assignedBy: string;

  @IsNotEmpty()
  assignedTo: string;

  @IsOptional()
  @IsBoolean()
  isAccepted?: boolean;

  @IsOptional()
  @IsDate()
  assignedAt?: Date;

  @IsOptional()
  @IsDate()
  acceptedAt?: Date;

  @IsOptional()
  @IsDate()
  updatedAt?: Date;
}
