import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersRepository {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<UserDocument | any> {
    const newUser = new this.userModel(createUserDto);
    return newUser.save();
  }

  async findAll(): Promise<UserDocument[]> {
    return this.userModel.find().exec();
  }

  async findById(id: string): Promise<UserDocument | any> {
    return this.userModel.findById(id).exec();
  }

  async findByEmail(email: string): Promise<UserDocument | any> {
    return this.userModel.findOne({ email }).exec();
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserDocument | any> {
    return this.userModel
      .findByIdAndUpdate(id, updateUserDto, { new: true })
      .exec();
  }

  async delete(id: string): Promise<UserDocument | any> {
    return this.userModel.findByIdAndDelete(id).exec();
  }

  async incrementTaskCount(userId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(
      userId,
      { $inc: { totalTasks: 1 } },
      { new: true }
    ).exec();
  }

  async incrementCompletedTaskCount(userId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(
      userId,
      { $inc: { completedTasks: 1 } },
      { new: true }
    ).exec();
  }

  async decrementCompletedTaskCount(userId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(
      userId,
      { $inc: { completedTasks: -1 } },
      { new: true }
    ).exec();
  }
}