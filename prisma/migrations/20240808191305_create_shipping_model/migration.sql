-- AlterTable
ALTER TABLE "sale_order" ADD COLUMN     "shipping_method_id" INTEGER;

-- CreateTable
CREATE TABLE "shipping_method" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "cost" DECIMAL(10,2) NOT NULL,
    "deliveryTime" VARCHAR(50) NOT NULL,

    CONSTRAINT "shipping_method_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shipping_method_name_key" ON "shipping_method"("name");

-- AddForeignKey
ALTER TABLE "sale_order" ADD CONSTRAINT "sale_order_shipping_method_id_fkey" FOREIGN KEY ("shipping_method_id") REFERENCES "shipping_method"("id") ON DELETE SET NULL ON UPDATE CASCADE;
