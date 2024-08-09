-- CreateTable
CREATE TABLE "SocialMediaEngagement" (
    "id" SERIAL NOT NULL,
    "member_id" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocialMediaEngagement_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SocialMediaEngagement" ADD CONSTRAINT "SocialMediaEngagement_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
