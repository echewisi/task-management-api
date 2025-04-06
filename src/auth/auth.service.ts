// src/auth/auth.service.ts
import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersRepository } from 'src/users/users.repository';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { RolesEnum } from '../common/enums/role.enum';

@Injectable()
export class AuthService {
  constructor(
    private usersRepository: UsersRepository,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<any> {
    const { name, email, password, role = RolesEnum.User } = registerDto;

    // Check if user already exists
    const existingUser = await this.usersRepository.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const user = await this.usersRepository.create({
      name,
      email,
      password: hashedPassword,
      role,
    });

    // Generate JWT token
    const payload = { id: user._id, email: user.email, role: user.role };
    const token = this.jwtService.sign(payload);

    return {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      accessToken: token,
    };
  }

  async login(loginDto: LoginDto): Promise<any> {
    const { email, password } = loginDto;

    // Find user by email
    const user = await this.usersRepository.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT token
    const payload = { id: user._id, email: user.email, role: user.role };
    const token = this.jwtService.sign(payload);

    return {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      accessToken: token,
    };
  }

  async validateUser(userId: string): Promise<any> {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }
}
