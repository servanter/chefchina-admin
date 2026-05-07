-- CreateTable
CREATE TABLE "user_health_profiles" (
    "userId" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "dailyCalories" INTEGER NOT NULL,
    "proteinPercent" INTEGER NOT NULL,
    "fatPercent" INTEGER NOT NULL,
    "carbsPercent" INTEGER NOT NULL,
    "sodiumLimit" INTEGER,
    "sugarLimit" INTEGER,
    "fiberMin" INTEGER,
    "restrictions" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_health_profiles_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "daily_intakes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "recipeId" TEXT NOT NULL,
    "mealType" TEXT NOT NULL,
    "servings" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "calories" DOUBLE PRECISION NOT NULL,
    "protein" DOUBLE PRECISION NOT NULL,
    "fat" DOUBLE PRECISION NOT NULL,
    "carbs" DOUBLE PRECISION NOT NULL,
    "fiber" DOUBLE PRECISION,
    "sodium" DOUBLE PRECISION,
    "sugar" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_intakes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nutrition_reports" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekStart" DATE NOT NULL,
    "weekEnd" DATE NOT NULL,
    "reportData" JSONB NOT NULL,
    "aiAdvice" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nutrition_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "daily_intakes_userId_date_idx" ON "daily_intakes"("userId", "date");

-- CreateIndex
CREATE INDEX "nutrition_reports_userId_weekStart_idx" ON "nutrition_reports"("userId", "weekStart");

-- AddForeignKey
ALTER TABLE "user_health_profiles" ADD CONSTRAINT "user_health_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_intakes" ADD CONSTRAINT "daily_intakes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_intakes" ADD CONSTRAINT "daily_intakes_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nutrition_reports" ADD CONSTRAINT "nutrition_reports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
