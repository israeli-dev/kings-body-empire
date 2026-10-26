-- Package: catalogue flags + ordering
ALTER TABLE "Package" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Package" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Book: marketing copy + catalogue flags
ALTER TABLE "Book" ADD COLUMN "description" TEXT;
ALTER TABLE "Book" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Book" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Purchases: when the payment actually landed
ALTER TABLE "PackagePurchase" ADD COLUMN "paidAt" TIMESTAMP(3);
ALTER TABLE "BookPurchase" ADD COLUMN "paidAt" TIMESTAMP(3);

-- CallBooking: optional note from the client
ALTER TABLE "CallBooking" ADD COLUMN "notes" TEXT;

-- Logs belong to their user: delete them together
ALTER TABLE "WorkoutLog" DROP CONSTRAINT "WorkoutLog_userId_fkey";
ALTER TABLE "WorkoutLog" ADD CONSTRAINT "WorkoutLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FoodLog" DROP CONSTRAINT "FoodLog_userId_fkey";
ALTER TABLE "FoodLog" ADD CONSTRAINT "FoodLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MeasurementLog" DROP CONSTRAINT "MeasurementLog_userId_fkey";
ALTER TABLE "MeasurementLog" ADD CONSTRAINT "MeasurementLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PackagePurchase" DROP CONSTRAINT "PackagePurchase_userId_fkey";
ALTER TABLE "PackagePurchase" ADD CONSTRAINT "PackagePurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BookPurchase" DROP CONSTRAINT "BookPurchase_userId_fkey";
ALTER TABLE "BookPurchase" ADD CONSTRAINT "BookPurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CallBooking" DROP CONSTRAINT "CallBooking_userId_fkey";
ALTER TABLE "CallBooking" ADD CONSTRAINT "CallBooking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Indexes for the queries the app actually runs
CREATE INDEX "WorkoutLog_userId_loggedAt_idx" ON "WorkoutLog"("userId", "loggedAt");
CREATE INDEX "FoodLog_userId_loggedAt_idx" ON "FoodLog"("userId", "loggedAt");
CREATE INDEX "MeasurementLog_userId_loggedAt_idx" ON "MeasurementLog"("userId", "loggedAt");
CREATE INDEX "PackagePurchase_userId_idx" ON "PackagePurchase"("userId");
CREATE INDEX "PackagePurchase_status_idx" ON "PackagePurchase"("status");
CREATE INDEX "BookPurchase_userId_idx" ON "BookPurchase"("userId");
CREATE INDEX "BookPurchase_status_idx" ON "BookPurchase"("status");
CREATE INDEX "EducationContent_category_idx" ON "EducationContent"("category");
CREATE INDEX "CoachAvailability_startTime_idx" ON "CoachAvailability"("startTime");
CREATE INDEX "CallBooking_userId_idx" ON "CallBooking"("userId");
