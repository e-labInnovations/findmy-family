-- CreateTable
CREATE TABLE "LocationReport" (
    "id" TEXT NOT NULL,
    "accessoryId" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "confidence" INTEGER NOT NULL,
    "status" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "payload" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LocationReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LocationReport_accessoryId_timestamp_idx" ON "LocationReport"("accessoryId", "timestamp" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "LocationReport_accessoryId_timestamp_key" ON "LocationReport"("accessoryId", "timestamp");

-- AddForeignKey
ALTER TABLE "LocationReport" ADD CONSTRAINT "LocationReport_accessoryId_fkey" FOREIGN KEY ("accessoryId") REFERENCES "Accessory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
