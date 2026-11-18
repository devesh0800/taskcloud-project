import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcrypt';
import { PrismaClient, Role } from '@prisma/client';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

async function cleanDatabaseAndStorage() {
  console.log('🧹 Starting EduSync Complete Data Wipe & Reset...\n');

  try {
    // 1. Delete all transactional, evaluation, and submission data
    console.log('1. Deleting grades & evaluations...');
    const deletedGrades = await prisma.grade.deleteMany();
    console.log(`   Deleted ${deletedGrades.count} grade records.`);

    console.log('2. Deleting submission files and attempts...');
    const deletedSubFiles = await prisma.submissionFile.deleteMany();
    const deletedAttempts = await prisma.submissionAttempt.deleteMany();
    console.log(`   Deleted ${deletedSubFiles.count} submission files, ${deletedAttempts.count} attempts.`);

    console.log('3. Deleting submissions...');
    const deletedSubmissions = await prisma.submission.deleteMany();
    console.log(`   Deleted ${deletedSubmissions.count} submissions.`);

    console.log('4. Deleting assignment attachments...');
    const deletedAtts = await prisma.assignmentAttachment.deleteMany();
    console.log(`   Deleted ${deletedAtts.count} assignment attachments.`);

    console.log('5. Deleting assignments...');
    const deletedAssignments = await prisma.assignment.deleteMany();
    console.log(`   Deleted ${deletedAssignments.count} assignments.`);

    console.log('6. Deleting class memberships...');
    const deletedMembers = await prisma.classMember.deleteMany();
    console.log(`   Deleted ${deletedMembers.count} class memberships.`);

    console.log('7. Deleting classes...');
    const deletedClasses = await prisma.class.deleteMany();
    console.log(`   Deleted ${deletedClasses.count} classes.`);

    console.log('8. Deleting notifications and activity logs...');
    const deletedNotifs = await prisma.notification.deleteMany();
    const deletedLogs = await prisma.activityLog.deleteMany();
    console.log(`   Deleted ${deletedNotifs.count} notifications, ${deletedLogs.count} activity logs.`);

    console.log('9. Deleting auth tokens (refresh, reset, email verification)...');
    await prisma.refreshToken.deleteMany();
    await prisma.passwordResetToken.deleteMany();
    await prisma.emailVerificationToken.deleteMany();
    console.log('   All active session and verification tokens purged.');

    console.log('10. Deleting all demo teacher and student accounts...');
    const deletedUsers = await prisma.user.deleteMany();
    console.log(`   Deleted ${deletedUsers.count} user accounts.`);

    // 11. Create one clean master Admin account
    console.log('\n11. Creating default System Admin account...');
    const adminPassword = 'AdminPassword123!';
    const passwordHash = await bcrypt.hash(adminPassword, 12);

    const admin = await prisma.user.create({
      data: {
        fullName: 'EduSync System Administrator',
        email: 'admin@edusync.dev',
        passwordHash,
        role: Role.ADMIN,
        isActive: true,
        emailVerified: true,
      },
    });
    console.log(`   ✓ Master Admin created: ${admin.email} (Password: ${adminPassword})`);

    // 12. Clean local filesystem storage
    console.log('\n12. Purging uploaded files from local storage...');
    const uploadDirs = [
      path.resolve(__dirname, '../uploads/assignments'),
      path.resolve(__dirname, '../uploads/submissions'),
      path.resolve(__dirname, '../uploads/profiles'),
      path.resolve(__dirname, '../uploads/resources'),
    ];

    let removedFileCount = 0;
    for (const dir of uploadDirs) {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          if (file !== '.gitkeep') {
            fs.unlinkSync(path.join(dir, file));
            removedFileCount++;
          }
        }
      }
    }
    console.log(`   ✓ Removed ${removedFileCount} local uploaded files (kept .gitkeep directory structures).`);

    console.log('\n======================================================');
    console.log('✨ EduSync Database & Local Storage completely reset!');
    console.log('✨ All demo classes, assignments, and credentials wiped.');
    console.log('✨ You can now register fresh Teacher & Student accounts!');
    console.log('======================================================\n');
  } catch (error) {
    console.error('❌ Error during data wipe:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

cleanDatabaseAndStorage();
