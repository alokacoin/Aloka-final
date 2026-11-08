import mongoose from 'mongoose';
import { z } from 'zod';

const blogSchema = new mongoose.Schema(
  {
    title: { type: String, default: '', trim: true, maxlength: 120 },
    slug: { type: String, required: true, unique: true },
    subtitle: { type: String, default: '', trim: true, maxlength: 200 },
    excerpt: { type: String, default: '', trim: true, maxlength: 500 },
    content: { type: mongoose.Schema.Types.Mixed, default: null },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['draft', 'pending', 'published', 'rejected'], default: 'draft' },
    category: { type: String, default: '', trim: true, maxlength: 60 },
    tags: [{ type: String, trim: true, maxlength: 30 }],
    coverImage: {
      url: { type: String, default: '' },
      publicId: { type: String, default: '' },
      alt: { type: String, default: '', trim: true, maxlength: 160 },
      caption: { type: String, default: '', trim: true, maxlength: 240 }
    },
    seoTitle: { type: String, default: '', trim: true, maxlength: 70 },
    seoDescription: { type: String, default: '', trim: true, maxlength: 170 },
    showAuthor: { type: Boolean, default: true },
    allowComments: { type: Boolean, default: false },
    disclaimer: { type: String, default: '', trim: true, maxlength: 1000 },
    rejectionMessage: { type: String, default: '', trim: true, maxlength: 1000 }
  },
  { timestamps: true }
);

const blogMarkSchema = z.object({
  type: z.enum(['bold', 'italic', 'underline', 'strike', 'code', 'link']),
  attrs: z.record(z.unknown()).optional()
}).strict();

const blogNodeSchema = z.lazy(() => z.object({
  type: z.enum([
    'doc', 'text', 'paragraph', 'heading', 'bulletList', 'orderedList', 'listItem',
    'blockquote', 'horizontalRule', 'hardBreak', 'codeBlock', 'image', 'table',
    'tableRow', 'tableHeader', 'tableCell'
  ]),
  text: z.string().max(20000).optional(),
  attrs: z.record(z.unknown()).optional(),
  marks: z.array(blogMarkSchema).max(10).optional(),
  content: z.array(blogNodeSchema).max(1000).optional()
}).strict());

export const blogContentSchema = z.object({
  type: z.literal('doc'),
  content: z.array(blogNodeSchema).max(1000)
}).strict().superRefine((document, context) => {
  let nodeCount = 0;
  const inspect = (node, depth) => {
    nodeCount += 1;
    if (depth > 20 || nodeCount > 1000) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'Article content is too deeply nested or too large.' });
      return;
    }
    if (node.type === 'text' && !node.text) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'Text nodes must contain text.' });
    }
    if (node.type === 'heading' && ![1, 2, 3].includes(node.attrs?.level)) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'Only heading levels 1 through 3 are allowed.' });
    }
    if (node.type === 'image') {
      const { src, alt = '', caption = '' } = node.attrs || {};
      if (typeof src !== 'string' || !/^https:\/\//i.test(src) ||
          typeof alt !== 'string' || alt.length > 160 ||
          typeof caption !== 'string' || caption.length > 240) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: 'Article images must use secure URLs and valid alt text and captions.' });
      }
    }
    for (const mark of node.marks || []) {
      if (mark.type === 'link' && (
        typeof mark.attrs?.href !== 'string' ||
        !/^(https:\/\/|mailto:)/i.test(mark.attrs.href) ||
        mark.attrs.href.length > 2048
      )) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: 'Article links must use https:// or mailto: URLs.' });
      }
    }
    for (const child of node.content || []) inspect(child, depth + 1);
  };
  for (const node of document.content) inspect(node, 1);
});

export const blogDraftSchema = z.object({
  title: z.string().trim().max(120).optional(),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100).optional(),
  subtitle: z.string().trim().max(200).optional(),
  category: z.string().trim().max(60).optional(),
  excerpt: z.string().trim().max(500).optional(),
  content: blogContentSchema.nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(30)).max(10).refine(
    (tags) => new Set(tags.map((tag) => tag.toLowerCase())).size === tags.length,
    'Tags must be unique.'
  ).optional(),
  coverImage: z.object({
    url: z.string().url().max(2048).or(z.literal('')).optional(),
    publicId: z.string().max(255).optional(),
    alt: z.string().trim().max(160).optional(),
    caption: z.string().trim().max(240).optional()
  }).strict().nullable().optional(),
  seoTitle: z.string().trim().max(70).optional(),
  seoDescription: z.string().trim().max(170).optional(),
  showAuthor: z.boolean().optional(),
  allowComments: z.boolean().optional(),
  disclaimer: z.string().trim().max(1000).optional()
}).strict();

blogSchema.index({ status: 1, category: 1, createdAt: -1 });
blogSchema.pre('validate', function validatePublishedBlog(next) {
  if (['pending', 'published'].includes(this.status) &&
      (!this.title?.trim() || !this.category?.trim() || !this.content)) {
    this.invalidate('content', 'A title, category, and article content are required for review or publication.');
  }
  next();
});

export default mongoose.models.Blog || mongoose.model('Blog', blogSchema);
