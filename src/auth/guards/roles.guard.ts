import {
    Injectable,
    CanActivate,
    ExecutionContext,
    UnauthorizedException,
    Logger,
  } from '@nestjs/common';
  import { RolesEnum } from 'src/common/enums/role.enum';
  
  @Injectable()
  export class RolesGuard implements CanActivate {
    private readonly logger = new Logger(RolesGuard.name);
  
    constructor(private readonly allowedRoles: RolesEnum[]) {}
  
    async canActivate(context: ExecutionContext): Promise<boolean> {
      const request = context.switchToHttp().getRequest();
      const user = request.user;
  
      this.logger.debug(`Checking roles for user: ${JSON.stringify(user)}`);
      this.logger.debug(`Allowed roles: ${this.allowedRoles}`);
  
      if (!user?.role) {
        throw new UnauthorizedException('User role not found');
      }
  
      if (!this.allowedRoles.includes(user.role)) {
        throw new UnauthorizedException(
          'You do not have access to this resource!',
        );
      }
  
      return true;
    }
  }
  