-- CreateEnum
CREATE TYPE "ConsultationSpecialty" AS ENUM ('FITNESS_COACH', 'DIETICIAN', 'NUTRITIONIST', 'CARDIOLOGIST', 'DIABETOLOGIST_ENDOCRINOLOGIST', 'NEUROLOGIST');

-- CreateEnum
CREATE TYPE "ConsultationMode" AS ENUM ('VIDEO', 'HOME_VISIT');

-- CreateEnum
CREATE TYPE "ConsultationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "ConsultationRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "specialty" "ConsultationSpecialty" NOT NULL,
    "mode" "ConsultationMode" NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT,
    "preferredAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "amountKobo" INTEGER NOT NULL DEFAULT 2000000,
    "status" "ConsultationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsultationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConsultationRequest_userId_createdAt_idx" ON "ConsultationRequest"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ConsultationRequest_status_idx" ON "ConsultationRequest"("status");

-- CreateIndex
CREATE INDEX "ConsultationRequest_preferredAt_idx" ON "ConsultationRequest"("preferredAt");

-- AddForeignKey
ALTER TABLE "ConsultationRequest" ADD CONSTRAINT "ConsultationRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
