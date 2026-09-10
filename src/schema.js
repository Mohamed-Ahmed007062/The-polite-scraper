import { z } from 'zod';

/**
 * Zod schema for the 8 raw fields extracted from HTML.
 */
export const RawBookSchema = z.object({
  title: z.string().min(1, 'Title cannot be empty'),
  product_url: z
    .string()
    .url('Product URL must be a valid URL')
    .startsWith('https://', 'Product URL must start with https://'),
  price_text: z.string().min(1, 'Price text cannot be empty'),
  availability_text: z.string().min(1, 'Availability text cannot be empty'),
  rating_text: z.string().min(1, 'Rating text cannot be empty'),
  description: z.string().nullable(),
  source_page: z
    .string()
    .url('Source page must be a valid URL')
    .startsWith('https://', 'Source page must start with https://'),
  fetched_at: z.string().min(1, 'fetched_at timestamp is required')
});

/**
 * Zod schema for the normalized record:
 * Retains all 8 raw fields + adds numeric price_gbp.
 */
export const NormalizedBookSchema = RawBookSchema.extend({
  price_gbp: z
    .number({ invalid_type_error: 'price_gbp must be a real number' })
    .positive('price_gbp must be greater than 0')
});

/**
 * Schema for errors tracked during the pipeline.
 */
export const ErrorRecordSchema = z.object({
  url: z.string().optional(),
  reason: z.string(),
  raw_data: z.any().optional(),
  timestamp: z.string()
});
