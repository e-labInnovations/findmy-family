-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MEMBER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'MEMBER',
    "name" TEXT NOT NULL,
    "title" TEXT,
    "color" TEXT NOT NULL,
    "initials" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Accessory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "privateKeyEnc" TEXT NOT NULL,
    "hashedAdvKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Accessory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessoryOwner" (
    "accessoryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AccessoryOwner_pkey" PRIMARY KEY ("accessoryId","userId")
);

-- CreateTable
CREATE TABLE "AppleAccount" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "appleId" TEXT NOT NULL,
    "dsidEnc" TEXT NOT NULL,
    "spTokenEnc" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppleAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeocodeCache" (
    "id" TEXT NOT NULL,
    "latRound" DOUBLE PRECISION NOT NULL,
    "lngRound" DOUBLE PRECISION NOT NULL,
    "place" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeocodeCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Accessory_hashedAdvKey_key" ON "Accessory"("hashedAdvKey");

-- CreateIndex
CREATE INDEX "AccessoryOwner_userId_idx" ON "AccessoryOwner"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GeocodeCache_latRound_lngRound_key" ON "GeocodeCache"("latRound", "lngRound");

-- AddForeignKey
ALTER TABLE "AccessoryOwner" ADD CONSTRAINT "AccessoryOwner_accessoryId_fkey" FOREIGN KEY ("accessoryId") REFERENCES "Accessory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessoryOwner" ADD CONSTRAINT "AccessoryOwner_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
