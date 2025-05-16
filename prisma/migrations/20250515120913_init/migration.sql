-- CreateTable
CREATE TABLE "tickets" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "employee_id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "request_category" TEXT NOT NULL,
    "issue_type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "resolution_time" DOUBLE PRECISION NOT NULL,
    "satisfaction_rate" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "dataset_id" TEXT NOT NULL,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "datasets" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "datasets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tickets_dataset_id_idx" ON "tickets"("dataset_id");

-- CreateIndex
CREATE UNIQUE INDEX "tickets_ticket_id_dataset_id_key" ON "tickets"("ticket_id", "dataset_id");

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_dataset_id_fkey" FOREIGN KEY ("dataset_id") REFERENCES "datasets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
