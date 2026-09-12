-- Normalized catalog fields intentionally remove accents in the application so
-- names such as "Macacão" and "Macacao" share the same unique identity.
ALTER TABLE "categories" DROP CONSTRAINT "categories_normalized_name_valid";
ALTER TABLE "products" DROP CONSTRAINT "products_normalized_name_valid";
ALTER TABLE "product_variants" DROP CONSTRAINT "product_variants_normalized_color_valid";
