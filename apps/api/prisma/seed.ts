import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seeding...");

  // 1. Clean existing records to avoid conflicts
  console.log("🧹 Clearing old seed data...");
  await prisma.activityLog.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.column.deleteMany();
  await prisma.board.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.organizationMember.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany({
    where: {
      email: {
        in: ["test@test.com", "sarah.dev@test.com", "mark.pm@test.com"],
      },
    },
  });

  // 2. Create Users
  console.log("👥 Creating users...");
  const passwordHash = await bcrypt.hash("Password123!", 12);

  const mainUser = await prisma.user.create({
    data: {
      email: "test@test.com",
      name: "Vansh Jain",
      passwordHash,
      isEmailVerified: true,
    },
  });

  const sarahUser = await prisma.user.create({
    data: {
      email: "sarah.dev@test.com",
      name: "Sarah Jenkins",
      passwordHash,
      isEmailVerified: true,
    },
  });

  const markUser = await prisma.user.create({
    data: {
      email: "mark.pm@test.com",
      name: "Mark Thorne",
      passwordHash,
      isEmailVerified: true,
    },
  });

  // 3. Create Organization
  console.log("🏢 Creating organization...");
  const org = await prisma.organization.create({
    data: {
      name: "Acme Corporation",
      slug: "acme-corp",
      description: "Enterprise software development department",
    },
  });

  // Add members to organization
  await prisma.organizationMember.createMany({
    data: [
      { userId: mainUser.id, organizationId: org.id, role: "OWNER" },
      { userId: sarahUser.id, organizationId: org.id, role: "MEMBER" },
      { userId: markUser.id, organizationId: org.id, role: "ADMIN" },
    ],
  });

  // 4. Create Project
  console.log("📂 Creating project...");
  const project = await prisma.project.create({
    data: {
      name: "AI Integration Platform",
      slug: "ai-integration",
      description: "Integrating Gemini LLM model services into the core business tools",
      organizationId: org.id,
      coverColor: "#10b981",
    },
  });

  // Add members to project
  await prisma.projectMember.createMany({
    data: [
      { userId: mainUser.id, projectId: project.id, role: "MANAGER" },
      { userId: sarahUser.id, projectId: project.id, role: "CONTRIBUTOR" },
      { userId: markUser.id, projectId: project.id, role: "CONTRIBUTOR" },
    ],
  });

  // 5. Create Kanban Board
  console.log("📋 Creating board...");
  const board = await prisma.board.create({
    data: {
      name: "Sprint 1 Board",
      projectId: project.id,
    },
  });

  // 6. Create Columns
  console.log("🗂️ Creating columns...");
  const todoCol = await prisma.column.create({
    data: { name: "To Do", position: 0, boardId: board.id, color: "#94a3b8" },
  });

  const inProgressCol = await prisma.column.create({
    data: { name: "In Progress", position: 1, boardId: board.id, color: "#3b82f6" },
  });

  const reviewCol = await prisma.column.create({
    data: { name: "In Review", position: 2, boardId: board.id, color: "#eab308" },
  });

  const doneCol = await prisma.column.create({
    data: { name: "Done", position: 3, boardId: board.id, color: "#10b981" },
  });

  // 7. Create Tasks
  console.log("📝 Creating tasks...");
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);

  // Completed Task
  const task1 = await prisma.task.create({
    data: {
      title: "Set up Prisma Database Schemas",
      description: "Define the core models for Users, Orgs, Tasks, and Boards in schema.prisma.",
      status: "DONE",
      priority: "HIGH",
      position: 0,
      dueDate: yesterday,
      columnId: doneCol.id,
      creatorId: markUser.id,
      assigneeId: mainUser.id,
      labels: ["backend", "database"],
    },
  });

  // In Progress (Overdue!)
  const task2 = await prisma.task.create({
    data: {
      title: "Integrate Gemini API Service",
      description:
        "Write the backend service to hit the gemini-3.1-flash-lite endpoint. Make it support status reports.",
      status: "IN_PROGRESS",
      priority: "URGENT",
      position: 0,
      dueDate: yesterday, // Overdue!
      columnId: inProgressCol.id,
      creatorId: mainUser.id,
      assigneeId: sarahUser.id,
      labels: ["backend", "ai"],
    },
  });

  // In Review
  const task3 = await prisma.task.create({
    data: {
      title: "Design AI Reports Page",
      description:
        "Build the client page layout under /dashboard/[orgSlug]/ai-report with Markdown display and Chat Assistant drawer.",
      status: "IN_REVIEW",
      priority: "MEDIUM",
      position: 0,
      dueDate: nextWeek,
      columnId: reviewCol.id,
      creatorId: sarahUser.id,
      assigneeId: mainUser.id,
      labels: ["frontend", "ui"],
    },
  });

  // To Do
  await prisma.task.create({
    data: {
      title: "Add PDF Export Functionality",
      description:
        "Implement export actions for the generated markdown report, converting it to printable PDF format.",
      status: "TODO",
      priority: "LOW",
      position: 0,
      dueDate: nextWeek,
      columnId: todoCol.id,
      creatorId: mainUser.id,
      assigneeId: markUser.id,
      labels: ["frontend", "features"],
    },
  });

  // 8. Create Comments
  console.log("💬 Creating task comments...");
  await prisma.comment.createMany({
    data: [
      {
        content:
          "I've started working on the prompt structure. Connecting to Google Gen AI package now.",
        taskId: task2.id,
        authorId: sarahUser.id,
      },
      {
        content:
          "Make sure you use the gemini-3.1-flash-lite model, since other models have high latency or quota constraints.",
        taskId: task2.id,
        authorId: mainUser.id,
      },
      {
        content:
          "The layout is looking great! The glassmorphic cards look very premium. Waiting for backend integrations.",
        taskId: task3.id,
        authorId: mainUser.id,
      },
    ],
  });

  // 9. Create Activity Logs
  console.log("📜 Creating activity logs...");
  await prisma.activityLog.createMany({
    data: [
      {
        action: "CREATE_PROJECT",
        entityType: "PROJECT",
        entityId: project.id,
        userId: mainUser.id,
        organizationId: org.id,
        projectId: project.id,
      },
      {
        action: "CREATE_TASK",
        entityType: "TASK",
        entityId: task1.id,
        userId: markUser.id,
        organizationId: org.id,
        projectId: project.id,
        taskId: task1.id,
      },
      {
        action: "UPDATE_TASK_STATUS",
        entityType: "TASK",
        entityId: task1.id,
        userId: mainUser.id,
        organizationId: org.id,
        projectId: project.id,
        taskId: task1.id,
        metadata: { oldStatus: "TODO", newStatus: "DONE" },
      },
      {
        action: "CREATE_TASK",
        entityType: "TASK",
        entityId: task2.id,
        userId: mainUser.id,
        organizationId: org.id,
        projectId: project.id,
        taskId: task2.id,
      },
      {
        action: "ADD_COMMENT",
        entityType: "COMMENT",
        entityId: task2.id,
        userId: sarahUser.id,
        organizationId: org.id,
        projectId: project.id,
        taskId: task2.id,
      },
    ],
  });

  console.log("✨ Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Error while seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
