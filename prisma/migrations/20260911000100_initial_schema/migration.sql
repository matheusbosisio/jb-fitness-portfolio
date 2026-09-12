-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ProductSize" AS ENUM ('NO_SIZE', 'P', 'M', 'G', 'GG');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('PIX', 'CASH', 'DEBIT_CARD', 'CREDIT_CARD');

-- CreateEnum
CREATE TYPE "SaleStatus" AS ENUM ('COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "StockEntryStatus" AS ENUM ('POSTED', 'CORRECTED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "normalized_name" VARCHAR(80) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "name" VARCHAR(140) NOT NULL,
    "normalized_name" VARCHAR(140) NOT NULL,
    "description" TEXT,
    "sale_price" DECIMAL(14,2) NOT NULL,
    "image_key" VARCHAR(500),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variants" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "color" VARCHAR(60),
    "normalized_color" VARCHAR(60) NOT NULL DEFAULT '',
    "size" "ProductSize" NOT NULL DEFAULT 'NO_SIZE',
    "stock_quantity" INTEGER NOT NULL DEFAULT 0,
    "average_unit_cost" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_entries" (
    "id" UUID NOT NULL,
    "status" "StockEntryStatus" NOT NULL DEFAULT 'POSTED',
    "occurred_at" TIMESTAMPTZ(3) NOT NULL,
    "notes" VARCHAR(500),
    "created_by_id" UUID NOT NULL,
    "replaces_entry_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_entry_items" (
    "id" UUID NOT NULL,
    "stock_entry_id" UUID NOT NULL,
    "product_variant_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_cost" DECIMAL(14,4) NOT NULL,
    "previous_quantity" INTEGER NOT NULL,
    "previous_average_cost" DECIMAL(14,4) NOT NULL,
    "resulting_quantity" INTEGER NOT NULL,
    "resulting_average_cost" DECIMAL(14,4) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_entry_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales" (
    "id" UUID NOT NULL,
    "status" "SaleStatus" NOT NULL DEFAULT 'COMPLETED',
    "payment_method" "PaymentMethod" NOT NULL,
    "sold_at" TIMESTAMPTZ(3) NOT NULL,
    "total_revenue" DECIMAL(14,2) NOT NULL,
    "total_cost" DECIMAL(14,2) NOT NULL,
    "total_gross_profit" DECIMAL(14,2) NOT NULL,
    "created_by_id" UUID NOT NULL,
    "cancelled_at" TIMESTAMPTZ(3),
    "cancelled_by_id" UUID,
    "cancellation_reason" VARCHAR(500),
    "replaces_sale_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_items" (
    "id" UUID NOT NULL,
    "sale_id" UUID NOT NULL,
    "product_variant_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_sale_price" DECIMAL(14,2) NOT NULL,
    "unit_cost_snapshot" DECIMAL(14,4) NOT NULL,
    "line_revenue" DECIMAL(14,2) NOT NULL,
    "line_cost" DECIMAL(14,2) NOT NULL,
    "line_gross_profit" DECIMAL(14,2) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sale_items_pkey" PRIMARY KEY ("id")
);

-- Business invariants not represented by Prisma Schema Language.
ALTER TABLE "users"
    ADD CONSTRAINT "users_name_not_blank" CHECK (btrim("name") <> ''),
    ADD CONSTRAINT "users_email_normalized" CHECK ("email" = lower(btrim("email")));

ALTER TABLE "categories"
    ADD CONSTRAINT "categories_name_not_blank" CHECK (btrim("name") <> ''),
    ADD CONSTRAINT "categories_normalized_name_valid" CHECK (
        "normalized_name" = lower(btrim("name"))
    );

ALTER TABLE "products"
    ADD CONSTRAINT "products_name_not_blank" CHECK (btrim("name") <> ''),
    ADD CONSTRAINT "products_normalized_name_valid" CHECK (
        "normalized_name" = lower(btrim("name"))
    ),
    ADD CONSTRAINT "products_sale_price_nonnegative" CHECK ("sale_price" >= 0);

ALTER TABLE "product_variants"
    ADD CONSTRAINT "product_variants_color_not_blank" CHECK (
        "color" IS NULL OR btrim("color") <> ''
    ),
    ADD CONSTRAINT "product_variants_normalized_color_valid" CHECK (
        "normalized_color" = lower(btrim(coalesce("color", '')))
    ),
    ADD CONSTRAINT "product_variants_stock_nonnegative" CHECK ("stock_quantity" >= 0),
    ADD CONSTRAINT "product_variants_average_cost_nonnegative" CHECK (
        "average_unit_cost" >= 0
    );

ALTER TABLE "stock_entries"
    ADD CONSTRAINT "stock_entries_cannot_replace_itself" CHECK (
        "replaces_entry_id" IS NULL OR "replaces_entry_id" <> "id"
    );

ALTER TABLE "stock_entry_items"
    ADD CONSTRAINT "stock_entry_items_quantity_positive" CHECK ("quantity" > 0),
    ADD CONSTRAINT "stock_entry_items_unit_cost_nonnegative" CHECK ("unit_cost" >= 0),
    ADD CONSTRAINT "stock_entry_items_previous_quantity_nonnegative" CHECK (
        "previous_quantity" >= 0
    ),
    ADD CONSTRAINT "stock_entry_items_resulting_quantity_nonnegative" CHECK (
        "resulting_quantity" >= 0
    ),
    ADD CONSTRAINT "stock_entry_items_previous_cost_nonnegative" CHECK (
        "previous_average_cost" >= 0
    ),
    ADD CONSTRAINT "stock_entry_items_resulting_cost_nonnegative" CHECK (
        "resulting_average_cost" >= 0
    );

ALTER TABLE "sales"
    ADD CONSTRAINT "sales_totals_valid" CHECK (
        "total_revenue" >= 0
        AND "total_cost" >= 0
        AND "total_gross_profit" = "total_revenue" - "total_cost"
    ),
    ADD CONSTRAINT "sales_cancellation_state_valid" CHECK (
        (
            "status" = 'COMPLETED'
            AND "cancelled_at" IS NULL
            AND "cancelled_by_id" IS NULL
            AND "cancellation_reason" IS NULL
        )
        OR
        (
            "status" = 'CANCELLED'
            AND "cancelled_at" IS NOT NULL
            AND "cancelled_by_id" IS NOT NULL
        )
    ),
    ADD CONSTRAINT "sales_cannot_replace_itself" CHECK (
        "replaces_sale_id" IS NULL OR "replaces_sale_id" <> "id"
    );

ALTER TABLE "sale_items"
    ADD CONSTRAINT "sale_items_quantity_positive" CHECK ("quantity" > 0),
    ADD CONSTRAINT "sale_items_values_valid" CHECK (
        "unit_sale_price" >= 0
        AND "unit_cost_snapshot" >= 0
        AND "line_revenue" = round("quantity" * "unit_sale_price", 2)
        AND "line_cost" = round("quantity" * "unit_cost_snapshot", 2)
        AND "line_gross_profit" = "line_revenue" - "line_cost"
    );

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "categories_normalized_name_key" ON "categories"("normalized_name");

-- CreateIndex
CREATE INDEX "categories_active_idx" ON "categories"("active");

-- CreateIndex
CREATE UNIQUE INDEX "products_normalized_name_key" ON "products"("normalized_name");

-- CreateIndex
CREATE INDEX "products_category_id_idx" ON "products"("category_id");

-- CreateIndex
CREATE INDEX "products_active_idx" ON "products"("active");

-- CreateIndex
CREATE INDEX "product_variants_product_id_active_idx" ON "product_variants"("product_id", "active");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_product_id_normalized_color_size_key" ON "product_variants"("product_id", "normalized_color", "size");

-- CreateIndex
CREATE UNIQUE INDEX "stock_entries_replaces_entry_id_key" ON "stock_entries"("replaces_entry_id");

-- CreateIndex
CREATE INDEX "stock_entries_occurred_at_idx" ON "stock_entries"("occurred_at");

-- CreateIndex
CREATE INDEX "stock_entries_status_occurred_at_idx" ON "stock_entries"("status", "occurred_at");

-- CreateIndex
CREATE INDEX "stock_entries_created_by_id_idx" ON "stock_entries"("created_by_id");

-- CreateIndex
CREATE INDEX "stock_entry_items_product_variant_id_idx" ON "stock_entry_items"("product_variant_id");

-- CreateIndex
CREATE UNIQUE INDEX "stock_entry_items_stock_entry_id_product_variant_id_key" ON "stock_entry_items"("stock_entry_id", "product_variant_id");

-- CreateIndex
CREATE UNIQUE INDEX "sales_replaces_sale_id_key" ON "sales"("replaces_sale_id");

-- CreateIndex
CREATE INDEX "sales_status_sold_at_idx" ON "sales"("status", "sold_at");

-- CreateIndex
CREATE INDEX "sales_payment_method_sold_at_idx" ON "sales"("payment_method", "sold_at");

-- CreateIndex
CREATE INDEX "sales_created_by_id_idx" ON "sales"("created_by_id");

-- CreateIndex
CREATE INDEX "sales_cancelled_by_id_idx" ON "sales"("cancelled_by_id");

-- CreateIndex
CREATE INDEX "sale_items_product_variant_id_idx" ON "sale_items"("product_variant_id");

-- CreateIndex
CREATE UNIQUE INDEX "sale_items_sale_id_product_variant_id_key" ON "sale_items"("sale_id", "product_variant_id");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_entries" ADD CONSTRAINT "stock_entries_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_entries" ADD CONSTRAINT "stock_entries_replaces_entry_id_fkey" FOREIGN KEY ("replaces_entry_id") REFERENCES "stock_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_entry_items" ADD CONSTRAINT "stock_entry_items_stock_entry_id_fkey" FOREIGN KEY ("stock_entry_id") REFERENCES "stock_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_entry_items" ADD CONSTRAINT "stock_entry_items_product_variant_id_fkey" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_cancelled_by_id_fkey" FOREIGN KEY ("cancelled_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_replaces_sale_id_fkey" FOREIGN KEY ("replaces_sale_id") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_product_variant_id_fkey" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
