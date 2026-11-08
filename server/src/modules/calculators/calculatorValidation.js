import { z } from 'zod';

const slugSchema = z.string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const optionalSlug = slugSchema.optional();
const booleanSchema = z.boolean();
const stringArray = (maxItems, maxLength) =>
  z.array(z.string().trim().min(1).max(maxLength)).max(maxItems).optional();
const objectSchema = z.record(z.unknown()).optional();

export const categorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: optionalSlug,
  description: z.string().trim().max(500).optional(),
  icon: z.string().trim().min(1).max(60).optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: booleanSchema.optional()
}).strict();

const calculatorFields = {
  name: z.string().trim().min(2).max(120),
  slug: optionalSlug,
  description: z.string().trim().min(1).max(2000),
  shortDescription: z.string().trim().min(1).max(300),
  categoryId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  categorySlug: optionalSlug,
  calculatorType: z.enum([
    'tax', 'gst', 'investment', 'loan', 'banking', 'retirement', 'salary', 'business', 'general'
  ]),
  icon: z.string().trim().min(1).max(60).optional(),
  keywords: stringArray(50, 80),
  tags: stringArray(30, 50),
  inputSchema: objectSchema,
  outputSchema: objectSchema,
  formulaExplanation: z.string().trim().max(4000).optional(),
  assumptions: stringArray(30, 500),
  disclaimer: z.string().trim().max(1000).optional(),
  relatedCalculatorIds: z.array(z.string().regex(/^[a-f\d]{24}$/i)).max(30).optional(),
  relatedArticleIds: z.array(z.string().regex(/^[a-f\d]{24}$/i)).max(30).optional(),
  seoTitle: z.string().trim().max(70).optional(),
  seoDescription: z.string().trim().max(200).optional(),
  isActive: booleanSchema.optional(),
  isFeatured: booleanSchema.optional(),
  isPopular: booleanSchema.optional(),
  isImplemented: booleanSchema.optional(),
  isVerified: booleanSchema.optional(),
  sortOrder: z.number().int().min(0).optional(),
  publishedAt: z.union([z.string().datetime(), z.null()]).optional()
};

export const calculatorCreateSchema = z.object(calculatorFields).strict()
  .refine((value) => value.categoryId || value.categorySlug, {
    message: 'A valid categoryId or categorySlug is required.',
    path: ['categoryId']
  });

export const calculatorUpdateSchema = z.object(calculatorFields)
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided.'
  });

export const listQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  q: z.string().trim().max(100).optional(),
  category: z.string().trim().max(120).optional(),
  featured: z.enum(['true', 'false']).optional(),
  popular: z.enum(['true', 'false']).optional(),
  sort: z.enum(['name', 'recent', 'oldest', 'featured', 'popular', 'sortOrder']).default('sortOrder'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
}).strict();

export const slugify = (value) => value
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

export const parseBody = (schema, body) => {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const error = new Error(parsed.error.issues.map(({ message, path }) =>
      `${path.join('.') || 'body'}: ${message}`).join('; '));
    error.status = 400;
    throw error;
  }
  return parsed.data;
};
