import test from 'node:test';
import assert from 'node:assert/strict';
import Inquiry, {
  inquiryCreateSchema,
  inquiryStatusSchema
} from '../src/models/Inquiry.js';

test('contact inquiry validation normalizes email and enforces message bounds', () => {
  const parsed = inquiryCreateSchema.parse({
    name: '  Test User  ',
    email: 'TEST@EXAMPLE.COM',
    subject: 'Help',
    message: 'Please contact me about tax planning.'
  });
  assert.equal(parsed.name, 'Test User');
  assert.equal(parsed.email, 'test@example.com');
  assert.equal(parsed.subject, 'Help');

  assert.equal(inquiryCreateSchema.safeParse({
    name: 'A',
    email: 'not-an-email',
    message: 'short'
  }).success, false);
  assert.equal(inquiryCreateSchema.safeParse({
    name: 'Test User',
    email: 'test@example.com',
    message: 'a'.repeat(5001)
  }).success, false);
});

test('inquiry status updates allow only supported workflow states', () => {
  assert.equal(inquiryStatusSchema.safeParse({ status: 'reviewed' }).success, true);
  assert.equal(inquiryStatusSchema.safeParse({ status: 'admin' }).success, false);
  assert.equal(inquiryStatusSchema.safeParse({ status: 'closed', role: 'admin' }).success, false);
});

test('inquiry model indexes the admin inbox and supports status tracking', () => {
  assert.deepEqual(Inquiry.schema.path('status').enumValues, ['new', 'reviewed', 'closed']);
  assert.ok(Inquiry.schema.indexes().some(([fields]) =>
    fields.status === 1 && fields.createdAt === -1
  ));
});
