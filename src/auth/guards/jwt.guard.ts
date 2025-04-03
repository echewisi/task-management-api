import {
    ExecutionContext,
    Injectable,
    UnauthorizedException,
  } from '@nestjs/common';
  import { AuthGuard as BaseAuthGuard } from '@nestjs/passport';
  
  @Injectable()
  export class JwtAuthGuard extends BaseAuthGuard('jwt') {
    canActivate(context: ExecutionContext) {
      return super.canActivate(context);
    }
  
    handleRequest(err, user, info) {
      if (err || !user) {
        console.error('❌ JWT Authentication Failed:', info); // Debug log
        throw new UnauthorizedException('Invalid or missing token');
      }
  
      console.log('✅ User After JWT Guard:', user);
      return user;
    }
  }
  