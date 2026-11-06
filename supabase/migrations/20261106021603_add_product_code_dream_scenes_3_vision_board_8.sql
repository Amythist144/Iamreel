-- Additive product_code labels to match the live catalog codes used by the Vision Guide.
-- Preserves existing enum values and historical orders/products rows.
ALTER TYPE public.product_code ADD VALUE IF NOT EXISTS 'dream_scenes_3';
ALTER TYPE public.product_code ADD VALUE IF NOT EXISTS 'vision_board_8';
