import { z } from 'zod';

const textList = (limit = 30, maxLength = 200) => z.array(z.string().trim().min(1).max(maxLength)).max(limit).default([]);
const imageSchema = z.object({
  url: z.string().url().max(2048).refine((value) => value.startsWith('https://'), 'Image URLs must use HTTPS.').or(z.literal('')).default(''),
  publicId: z.string().max(512).default(''),
  alt: z.string().trim().max(300).default('')
}).strict();
const faqSchema = z.object({
  question: z.string().trim().min(1).max(300),
  answer: z.string().trim().min(1).max(3000)
}).strict();

export const serviceWriteSchema = z.object({
  title: z.string().trim().min(3).max(160),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(180).optional().or(z.literal('')),
  shortDescription: z.string().trim().min(10).max(500),
  description: z.string().trim().min(10).max(10000),
  categoryId: z.string().regex(/^[a-f\d]{24}$/i),
  tags: textList(20, 40),
  keywords: textList(30, 50),
  coverImage: imageSchema.default({}),
  gallery: z.array(imageSchema).max(12).default([]),
  whatsIncluded: textList(30, 300),
  targetAudience: textList(20, 200),
  requiredDocuments: textList(30, 200),
  eligibility: z.string().trim().max(5000).default(''),
  processSteps: textList(20, 500),
  estimatedDeliveryTime: z.string().trim().max(120).default(''),
  pricingType: z.enum(['fixed', 'starting_from', 'quotation', 'free_consultation']).default('quotation'),
  price: z.number().min(0).nullable().default(null),
  currency: z.string().trim().length(3).default('INR'),
  pricingNotes: z.string().trim().max(1000).default(''),
  serviceFormat: z.enum(['online', 'offline', 'both']).default('both'),
  requiredQualifications: textList(20, 200),
  licenseRequirements: textList(20, 200),
  restrictedToQualifiedProfessional: z.boolean().default(false),
  professionalVerificationNotes: z.string().trim().max(1000).default(''),
  faqs: z.array(faqSchema).max(30).default([]),
  status: z.enum(['draft', 'published', 'unpublished', 'archived']).default('draft'),
  isFeatured: z.boolean().default(false),
  isPopular: z.boolean().default(false),
  displayOrder: z.number().int().min(0).max(10000).default(100),
  seoTitle: z.string().trim().max(160).default(''),
  seoDescription: z.string().trim().max(320).default('')
}).strict().superRefine((data, context) => {
  if (['fixed', 'starting_from'].includes(data.pricingType) && data.price === null) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['price'], message: 'Enter the configured price for this pricing type.' });
  }
  if (data.pricingType === 'quotation' && data.price !== null) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['price'], message: 'Price must be blank for quotation pricing.' });
  }
});

export const serviceCategorySchema = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120).optional().or(z.literal('')),
  description: z.string().trim().max(500).default(''),
  icon: z.string().trim().max(50).default('briefcase-business'),
  image: z.string().url().max(2048).refine((value) => value.startsWith('https://'), 'Category image URLs must use HTTPS.').or(z.literal('')).default(''),
  displayOrder: z.number().int().min(0).max(10000).default(100),
  isActive: z.boolean().default(true)
}).strict();

export const serviceInquiryCreateSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  phone: z.string().trim().regex(/^(?:\+?91[\s-]?)?[6-9]\d{9}$/).transform((value) => value.replace(/[\s-]/g, '')),
  serviceId: z.string().regex(/^[a-f\d]{24}$/i),
  businessType: z.enum(['individual', 'freelancer', 'startup', 'business', 'company']),
  requirement: z.string().trim().min(10).max(3000),
  preferredContactMethod: z.enum(['email', 'phone', 'whatsapp']),
  preferredDate: z.string().datetime({ offset: true }).optional().or(z.literal('')),
  message: z.string().trim().max(3000).default('')
}).strict();
