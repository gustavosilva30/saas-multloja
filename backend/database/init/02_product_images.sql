-- Migration: Add support for multiple product images
-- Creates product_images table and migrates existing image_url data

-- Create table for product images
CREATE TABLE IF NOT EXISTS product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    image_url VARCHAR(500) NOT NULL,
    sort_order INTEGER DEFAULT 0,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_tenant_id ON product_images(tenant_id);

-- Migrate existing image_url from products to product_images
INSERT INTO product_images (product_id, tenant_id, image_url, sort_order, is_primary)
SELECT 
    id as product_id,
    tenant_id,
    image_url,
    0 as sort_order,
    true as is_primary
FROM products 
WHERE image_url IS NOT NULL AND image_url != '';

-- Add RLS policies for product_images
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON product_images
    FOR ALL USING (tenant_id = current_setting('app.current_tenant')::UUID);

-- Function to get primary image for a product
CREATE OR REPLACE FUNCTION get_product_primary_image(p_product_id UUID)
RETURNS VARCHAR(500) AS $$
DECLARE
    primary_image VARCHAR(500);
BEGIN
    SELECT image_url INTO primary_image
    FROM product_images
    WHERE product_id = p_product_id AND is_primary = true
    ORDER BY sort_order ASC
    LIMIT 1;
    
    -- If no primary, get first image
    IF primary_image IS NULL THEN
        SELECT image_url INTO primary_image
        FROM product_images
        WHERE product_id = p_product_id
        ORDER BY sort_order ASC
        LIMIT 1;
    END IF;
    
    RETURN primary_image;
END;
$$ LANGUAGE plpgsql;

-- Function to get all images for a product as JSON array
CREATE OR REPLACE FUNCTION get_product_images(p_product_id UUID)
RETURNS JSONB AS $$
DECLARE
    images JSONB;
BEGIN
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', id,
            'image_url', image_url,
            'sort_order', sort_order,
            'is_primary', is_primary
        ) ORDER BY sort_order ASC
    ) INTO images
    FROM product_images
    WHERE product_id = p_product_id;
    
    RETURN COALESCE(images, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;
