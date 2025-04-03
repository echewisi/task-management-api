import { RolesGuard } from './roles.guard';
import { RolesEnum } from 'src/common/enums/role.enum';

/**
 * Factory function to create a parameterized AuthGuard instance
 * @param roles Allowed roles for the route
 * @returns AuthGuard instance
 */
export function AuthGuardFactory(roles: RolesEnum[]) {
  return new RolesGuard(roles);
}
