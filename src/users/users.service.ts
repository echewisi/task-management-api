import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserDocument } from './schemas/user.schema';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async create(createUserDto: CreateUserDto): Promise<UserDocument> {
    // Check if user with the same email already exists
    const existingUser = await this.usersRepository.findByEmail(createUserDto.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    // Create the user with hashed password
    return this.usersRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });
  }

  async findAll(): Promise<UserDocument[]> {
    return this.usersRepository.findAll();
  }

  async findById(id: string): Promise<UserDocument> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findByEmail(email: string): Promise<UserDocument> {
    const user = await this.usersRepository.findByEmail(email);
    if (!user) {
      throw new NotFoundException(`User with email ${email} not found`);
    }
    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserDocument> {
    // Check if user exists
    await this.findById(id);

    // If updating email, check if it's already taken
    if (updateUserDto.email) {
      const existingUser = await this.usersRepository.findByEmail(updateUserDto.email);
      if (existingUser && existingUser._id.toString() !== id) {
        throw new ConflictException('Email already in use');
      }
    }

    // If updating password, hash it
    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    return this.usersRepository.update(id, updateUserDto);
  }

  async delete(id: string): Promise<UserDocument> {
    // Check if user exists
    await this.findById(id);
    
    return this.usersRepository.delete(id);
  }

  async getUserTaskStats(id: string): Promise<{ totalTasks: number; completedTasks: number }> {
    const user = await this.findById(id);
    return {
      totalTasks: user.totalTasks,
      completedTasks: user.completedTasks,
    };
  }

  async incrementTaskCount(userId: string): Promise<void> {
    await this.findById(userId);
    return this.usersRepository.incrementTaskCount(userId);
  }

  async incrementCompletedTaskCount(userId: string): Promise<void> {
    await this.findById(userId);
    return this.usersRepository.incrementCompletedTaskCount(userId);
  }

  async decrementCompletedTaskCount(userId: string): Promise<void> {
    await this.findById(userId);
    return this.usersRepository.decrementCompletedTaskCount(userId);
  }
}