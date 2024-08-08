-- CreateTable
CREATE TABLE "ProductDiscount" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "discountPercentage" DECIMAL(5,2) NOT NULL,
    "validFrom" DATE NOT NULL,
    "validTo" DATE NOT NULL,
    "usageLimit" INTEGER NOT NULL DEFAULT 1,
    "timesUsed" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductDiscount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsedProductDiscount" (
    "id" SERIAL NOT NULL,
    "discountId" INTEGER NOT NULL,
    "memberId" INTEGER NOT NULL,
    "usedOn" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsedProductDiscount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Coupon" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "discountPercentage" DECIMAL(5,2) NOT NULL,
    "minPurchaseAmount" DECIMAL(10,2),
    "validFrom" DATE NOT NULL,
    "validTo" DATE NOT NULL,
    "usageLimit" INTEGER NOT NULL DEFAULT 1,
    "timesUsed" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsedCoupon" (
    "id" SERIAL NOT NULL,
    "couponId" INTEGER NOT NULL,
    "memberId" INTEGER NOT NULL,
    "usedOn" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsedCoupon_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductDiscount_code_key" ON "ProductDiscount"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");

-- AddForeignKey
ALTER TABLE "ProductDiscount" ADD CONSTRAINT "ProductDiscount_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsedProductDiscount" ADD CONSTRAINT "UsedProductDiscount_discountId_fkey" FOREIGN KEY ("discountId") REFERENCES "ProductDiscount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsedProductDiscount" ADD CONSTRAINT "UsedProductDiscount_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsedCoupon" ADD CONSTRAINT "UsedCoupon_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsedCoupon" ADD CONSTRAINT "UsedCoupon_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
