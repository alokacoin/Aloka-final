import test from 'node:test';
import assert from 'node:assert/strict';
import Service from '../src/models/Service.js';
import ServiceCategory from '../src/models/ServiceCategory.js';
import ServiceInquiry from '../src/models/ServiceInquiry.js';
import { serviceInquiryCreateSchema, serviceWriteSchema } from '../src/services/serviceValidation.js';

const serviceDraft = {
  title: 'GST return filing',
  shortDescription: 'GST return preparation and filing support.',
  description: 'Our team prepares and files the configured GST returns for your business.',
  categoryId: '507f1f77bcf86cd799439011',
  pricingType: 'quotation'
};

test('service writes require a category and validate configured prices', () => {
  const parsed = serviceWriteSchema.safeParse(serviceDraft);
  assert.equal(parsed.success, true);
  assert.equal(parsed.data.coverImage.url, '');
  assert.deepEqual(parsed.data.faqs, []);
  assert.equal(serviceWriteSchema.safeParse({ ...serviceDraft, pricingType: 'fixed', price: null }).success, false);
  assert.equal(serviceWriteSchema.safeParse({ ...serviceDraft, unrecognizedField: true }).success, false);
});

test('service inquiry validation requires a valid Indian mobile and known business type', () => {
  const valid = serviceInquiryCreateSchema.safeParse({
    fullName: 'Asha Rao',
    email: 'asha@example.com',
    phone: '+91 9876543210',
    serviceId: '507f1f77bcf86cd799439011',
    businessType: 'startup',
    requirement: 'We need help filing GST returns for our startup.',
    preferredContactMethod: 'email',
    message: ''
  });
  assert.equal(valid.success, true);
  assert.equal(valid.data.phone, '+919876543210');
  assert.equal(serviceInquiryCreateSchema.safeParse({
    ...valid.data,
    phone: '1234567890'
  }).success, false);
});

test('service and inquiry schemas preserve status and historical request fields', async () => {
  assert.deepEqual(Service.schema.path('status').enumValues, ['draft', 'published', 'unpublished', 'archived']);
  assert.deepEqual(ServiceInquiry.schema.path('status').enumValues, ['PENDING', 'UNDER_REVIEW', 'CONTACTED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED', 'CANCELLED']);
  assert.ok(ServiceCategory.schema.indexes().some(([fields, options]) => fields.slug === 1 && options.unique));
  const item = new Service({ title: 'Bookkeeping', description: 'Monthly bookkeeping support.' });
  await item.validate();
  assert.equal(item.name, 'Bookkeeping');
  assert.equal(item.shortDescription, 'Monthly bookkeeping support.');
});
