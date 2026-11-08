import test from 'node:test';
import assert from 'node:assert/strict';
import { adminBlogListQuerySchema } from '../src/controllers/adminBlogController.js';

test('admin blog list filters default to all blogs with bounded pagination', () => {
  assert.deepEqual(adminBlogListQuerySchema.parse({}), {
    page: 1,
    limit: 20,
    status: 'all',
    search: ''
  });
  assert.deepEqual(adminBlogListQuerySchema.parse({
    page: '2',
    limit: '50',
    status: 'published',
    search: ' GST '
  }), {
    page: 2,
    limit: 50,
    status: 'published',
    search: 'GST'
  });
});

test('admin blog list rejects unsupported filters and unreasonable page sizes', () => {
  assert.equal(adminBlogListQuerySchema.safeParse({ status: 'deleted' }).success, false);
  assert.equal(adminBlogListQuerySchema.safeParse({ limit: '101' }).success, false);
  assert.equal(adminBlogListQuerySchema.safeParse({ search: 'x'.repeat(121) }).success, false);
});
