-- AlterTable
ALTER TABLE "AllergenWarning" ADD COLUMN     "escalatedAt" TIMESTAMP(3),
ADD COLUMN     "escalatedTo" TEXT DEFAULT '';

-- AlterTable
ALTER TABLE "PayrollLineItem" ADD COLUMN     "deductions" TEXT DEFAULT '{}',
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "hoursOvertime" DECIMAL(12,2) DEFAULT 0,
ADD COLUMN     "hoursRegular" DECIMAL(12,2) DEFAULT 0,
ADD COLUMN     "rateOvertime" DECIMAL(12,2) DEFAULT 0,
ADD COLUMN     "rateRegular" DECIMAL(12,2) DEFAULT 0;

-- AlterTable
ALTER TABLE "TipPool" ADD COLUMN     "allocationRule" TEXT DEFAULT 'by_hours',
ADD COLUMN     "fixedShares" TEXT DEFAULT '{}',
ADD COLUMN     "periodId" TEXT DEFAULT '';
