import test from 'node:test';
import assert from 'node:assert/strict';
import Blog, { blogContentSchema, blogDraftSchema } from '../src/models/Blog.js';

const validContent = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Start here' }] },
    { type: 'paragraph', content: [{ type: 'text', text: 'A practical introduction to managing money wisely.' }] }
  ]
};

test('blog drafts accept optional fields and reject unknown properties', () => {
  assert.equal(blogDraftSchema.safeParse({}).success, true);
  assert.equal(blogDraftSchema.safeParse({ title: 'A valid title', content: validContent }).success, true);
  assert.equal(blogDraftSchema.safeParse({ status: 'published' }).success, false);
  assert.equal(blogDraftSchema.safeParse({ tags: ['Tax', 'tax'] }).success, false);
  assert.equal(blogDraftSchema.safeParse({ seoTitle: 'x'.repeat(71) }).success, false);
});

test('article content only accepts bounded safe TipTap nodes and link protocols', () => {
  assert.equal(blogContentSchema.safeParse(validContent).success, true);
  assert.equal(blogContentSchema.safeParse({
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text: 'bad', marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }] }] }]
  }).success, false);
  assert.equal(blogContentSchema.safeParse({
    type: 'doc',
    content: [{ type: 'unknownHtml', content: [] }]
  }).success, false);
  assert.equal(blogContentSchema.safeParse({
    type: 'doc',
    content: [{ type: 'image', attrs: { src: 'http://example.test/image.png' } }]
  }).success, false);
});

test('blog model supports review states and unique public slugs', () => {
  assert.deepEqual(Blog.schema.path('status').enumValues, ['draft', 'pending', 'published', 'rejected']);
  assert.ok(Blog.schema.indexes().some(([fields, options]) => fields.slug === 1 && options.unique));
  assert.ok(Blog.schema.path('content').instance === 'Mixed');
});
