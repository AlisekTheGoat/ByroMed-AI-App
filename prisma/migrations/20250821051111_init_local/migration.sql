-- CreateTable
CREATE TABLE "public"."Patient" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "birth_number" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "gender" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "insurance" TEXT,
    "insuranceCode" TEXT,
    "address" TEXT,
    "city" TEXT,
    "employerOrSchool" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Template" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "exports" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ExportedDocument" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "patientId" TEXT,
    "outputPath" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExportedDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AgentRun" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "patientId" TEXT,
    "inputMeta" JSONB NOT NULL,
    "resultMeta" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,

    CONSTRAINT "AgentRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AgentEvent" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "step" TEXT NOT NULL,
    "message" TEXT,
    "progress" DOUBLE PRECISION,

    CONSTRAINT "AgentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Patient_lastName_firstName_idx" ON "public"."Patient"("lastName", "firstName");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_birth_number_key" ON "public"."Patient"("birth_number");

-- CreateIndex
CREATE INDEX "ExportedDocument_templateId_idx" ON "public"."ExportedDocument"("templateId");

-- CreateIndex
CREATE INDEX "ExportedDocument_patientId_idx" ON "public"."ExportedDocument"("patientId");

-- CreateIndex
CREATE INDEX "AgentRun_startedAt_idx" ON "public"."AgentRun"("startedAt");

-- CreateIndex
CREATE INDEX "AgentRun_status_idx" ON "public"."AgentRun"("status");

-- CreateIndex
CREATE INDEX "AgentEvent_runId_idx" ON "public"."AgentEvent"("runId");

-- CreateIndex
CREATE INDEX "AgentEvent_ts_idx" ON "public"."AgentEvent"("ts");

-- AddForeignKey
ALTER TABLE "public"."ExportedDocument" ADD CONSTRAINT "ExportedDocument_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "public"."Template"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExportedDocument" ADD CONSTRAINT "ExportedDocument_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AgentEvent" ADD CONSTRAINT "AgentEvent_runId_fkey" FOREIGN KEY ("runId") REFERENCES "public"."AgentRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
