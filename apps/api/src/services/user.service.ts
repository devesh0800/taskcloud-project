import { prisma } from '../config/prisma';
import { Role, User } from '@prisma/client';

export interface CreateUserInput {
  email: string;
  fullName: string;
  passwordHash: string;
  role: Role;
  teacherId?: string;
  department?: string;
  studentId?: string;
  course?: string;
  semester?: string;
  section?: string;
}

export class UserService {
  static async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
  }

  static async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  static async createUser(data: CreateUserInput): Promise<User> {
    return prisma.user.create({
      data: {
        ...data,
        email: data.email.toLowerCase().trim(),
        fullName: data.fullName.trim(),
      },
    });
  }

  static async updateUser(id: string, data: Partial<User>): Promise<User> {
    return prisma.user.update({
      where: { id },
      data,
    });
  }

  static async listStudentsByClass(classId: string): Promise<User[]> {
    const memberships = await prisma.classMember.findMany({
      where: { classId },
      include: { student: true },
    });
    return memberships.map((m) => m.student);
  }
}
