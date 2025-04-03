import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
    Logger,
  } from '@nestjs/common';
  // import { RolesEnum } from '../enum/role.enum'; // Import your Role enum
  import { JwtAuthGuard as BaseJwtAuthGuard } from './jwt.guard';
  
  @Injectable()
  export class JwtAuthGuard extends BaseJwtAuthGuard implements CanActivate {
    private readonly logger = new Logger(JwtAuthGuard.name);
  
    async canActivate(context: ExecutionContext): Promise<boolean> {
      // First verify the JWT token using the parent guard
      await super.canActivate(context);
  
      const request = context.switchToHttp().getRequest();
      // this.logger.debug(`JWT Guard - User: ${JSON.stringify(request.user)}`);
  
      if (!request?.user) {
        // this.logger.error('JWT Guard - No user in request');
        throw new UnauthorizedException('No user in request');
      }
  
      return true;
    }
  }
  