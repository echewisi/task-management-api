import mongoose from 'mongoose';
import { RolesEnum } from '../enums/role.enum';

export interface UserPayload {
  id: string;
  email: string;
  role: RolesEnum;
  name: string;
}
