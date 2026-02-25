-- AlterTable
ALTER TABLE "Skill" ADD COLUMN     "files" JSONB NOT NULL DEFAULT '[]';

-- CreateTable
CREATE TABLE "SkillVersion" (
    "id" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "spec" JSONB NOT NULL,
    "files" JSONB NOT NULL DEFAULT '[]',
    "editedById" TEXT NOT NULL,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SkillVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SkillVersion_skillId_version_key" ON "SkillVersion"("skillId", "version");

-- AddForeignKey
ALTER TABLE "SkillVersion" ADD CONSTRAINT "SkillVersion_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillVersion" ADD CONSTRAINT "SkillVersion_editedById_fkey" FOREIGN KEY ("editedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
