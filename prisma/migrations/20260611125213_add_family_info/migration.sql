-- CreateTable
CREATE TABLE "FamilyInfo" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "name" TEXT NOT NULL DEFAULT 'My Family',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FamilyInfo_pkey" PRIMARY KEY ("id")
);
