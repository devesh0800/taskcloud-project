import { PrismaClient, Role, AssignmentStatus } from '@prisma/client';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error('⛔ Safety Guard: Database seeding is strictly disabled in production environments.');
    process.exit(1);
  }

  console.log('🌱 Starting EduSync Phase 2 Database Seed...');

  const SALT_ROUNDS = 10;
  const teacherPasswordHash = await bcrypt.hash('Teacher@123', SALT_ROUNDS);
  const studentPasswordHash = await bcrypt.hash('Student@123', SALT_ROUNDS);

  // 1. Seed Sample Teacher
  console.log('  Creating Sample Teacher...');
  const teacher = await prisma.user.upsert({
    where: { email: 'teacher@edusync.dev' },
    update: {},
    create: {
      fullName: 'Dr. Sarah Connor',
      email: 'teacher@edusync.dev',
      passwordHash: teacherPasswordHash,
      role: Role.TEACHER,
      teacherId: 'TCH-2026-001',
      department: 'Computer Science & Engineering',
      isActive: true,
      emailVerified: true,
    },
  });
  console.log(`  ✓ Teacher created: ${teacher.fullName} (${teacher.email})`);

  // 2. Seed Sample Student 1
  console.log('  Creating Sample Student 1...');
  const student1 = await prisma.user.upsert({
    where: { email: 'alex.rivera@edusync.dev' },
    update: {},
    create: {
      fullName: 'Alex Rivera',
      email: 'alex.rivera@edusync.dev',
      passwordHash: studentPasswordHash,
      role: Role.STUDENT,
      studentId: 'STU-2026-101',
      course: 'B.Tech Computer Science',
      semester: '6',
      section: 'A',
      isActive: true,
      emailVerified: true,
    },
  });
  console.log(`  ✓ Student 1 created: ${student1.fullName} (${student1.email})`);

  // 3. Seed Sample Student 2
  console.log('  Creating Sample Student 2...');
  const student2 = await prisma.user.upsert({
    where: { email: 'maya.patel@edusync.dev' },
    update: {},
    create: {
      fullName: 'Maya Patel',
      email: 'maya.patel@edusync.dev',
      passwordHash: studentPasswordHash,
      role: Role.STUDENT,
      studentId: 'STU-2026-102',
      course: 'B.Tech Information Technology',
      semester: '6',
      section: 'B',
      isActive: true,
      emailVerified: true,
    },
  });
  console.log(`  ✓ Student 2 created: ${student2.fullName} (${student2.email})`);

  // 4. Seed Sample Class
  console.log('  Creating Sample Class...');
  const sampleClass = await prisma.class.upsert({
    where: { classCode: 'CLOUD1' },
    update: {},
    create: {
      name: 'CS101: Distributed Cloud Architecture',
      description: 'Foundations of cloud storage, serverless relational databases, and multi-tier architectures.',
      classCode: 'CLOUD1',
      teacherId: teacher.id,
    },
  });
  console.log(`  ✓ Class created: ${sampleClass.name} (Code: ${sampleClass.classCode})`);

  // 5. Enroll Students into Class
  console.log('  Enrolling students in sample class...');
  await prisma.classMember.upsert({
    where: {
      classId_studentId: {
        classId: sampleClass.id,
        studentId: student1.id,
      },
    },
    update: {},
    create: {
      classId: sampleClass.id,
      studentId: student1.id,
    },
  });

  await prisma.classMember.upsert({
    where: {
      classId_studentId: {
        classId: sampleClass.id,
        studentId: student2.id,
      },
    },
    update: {},
    create: {
      classId: sampleClass.id,
      studentId: student2.id,
    },
  });
  console.log('  ✓ Both students enrolled in CS101');

  // 6. Seed Sample Assignments
  console.log('  Creating Sample Assignments...');
  const deadline1 = new Date();
  deadline1.setDate(deadline1.getDate() + 7);

  const deadline2 = new Date();
  deadline2.setDate(deadline2.getDate() + 14);

  const assignment1 = await prisma.assignment.create({
    data: {
      title: 'Lab 1: Cloud Storage System Design',
      description: 'Design a resilient partitioned storage engine with MIME validation and UUID protection.',
      instructions: 'Submit a technical report (PDF) detailing path traversal defenses and UUID collision mitigation.',
      totalMarks: 50,
      deadline: deadline1,
      status: AssignmentStatus.PUBLISHED,
      teacherId: teacher.id,
      classId: sampleClass.id,
    },
  });

  const assignment2 = await prisma.assignment.create({
    data: {
      title: 'Lab 2: Serverless PostgreSQL & Prisma Schema',
      description: 'Model relational schemas with foreign keys, indexes, and cascading policies in Neon PostgreSQL.',
      instructions: 'Implement database models for users, classes, assignments, and audit logs. Verify connection pooling.',
      totalMarks: 100,
      deadline: deadline2,
      status: AssignmentStatus.PUBLISHED,
      teacherId: teacher.id,
      classId: sampleClass.id,
    },
  });

  console.log(`  ✓ Assignment 1 created: ${assignment1.title}`);
  console.log(`  ✓ Assignment 2 created: ${assignment2.title}`);

  console.log('\n🎉 EduSync Phase 2 Seed Completed Successfully!');
  console.log('Development Credentials:');
  console.log('  Teacher: teacher@edusync.dev / Teacher@123');
  console.log('  Student 1: alex.rivera@edusync.dev / Student@123');
  console.log('  Student 2: maya.patel@edusync.dev / Student@123');
  console.log('  Class Code: CLOUD1');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
