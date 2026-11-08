import test from 'node:test';
import assert from 'node:assert/strict';
import News from '../src/models/News.js';
import NewsCategory from '../src/models/NewsCategory.js';
import { classifyNews } from '../src/services/newsClassification.js';
import { isPublicAddress, normalizeNews } from '../src/services/newsFetchService.js';

test('news classification maps clear finance topics conservatively', () => {
  assert.equal(classifyNews('RBI announces repo rate decision').slug, 'rbi-updates');
  assert.equal(classifyNews('GST Council reviews input tax credit changes').slug, 'gst');
  assert.equal(classifyNews('Unrelated business report').slug, 'business');
});

test('news normalization requires dated HTTPS source articles, bounds images, and follows auto-publish configuration', () => {
  const previousAutoPublish = process.env.NEWS_AUTO_PUBLISH;
  delete process.env.NEWS_AUTO_PUBLISH;
  try {
    const item = normalizeNews({
      provider: 'rss',
      providerArticleId: 'publisher-id',
      title: 'RBI announces a policy decision',
      summary: 'A short publisher-provided summary.',
      url: 'https://www.example.com/story?utm_source=feed&id=1#top',
      imageUrl: 'https://cdn.example.com/story.jpg',
      source: 'Example News',
      sourceUrl: 'https://example.com',
      feedUrl: 'https://example.com/feed.xml',
      publishedAt: '2026-11-08T08:00:00Z'
    });
    assert.ok(item);
    assert.equal(item.canonicalUrl, 'https://example.com/story?id=1');
    assert.equal(item.imageUrl, 'https://cdn.example.com/story.jpg');
    assert.equal(item.status, 'published');
    assert.equal(item.moderationStatus, 'automatic');
    assert.equal(item.categorySlug, 'rbi-updates');
    assert.ok(item.canonicalKey);
    assert.ok(item.titleSourceKey);

    process.env.NEWS_AUTO_PUBLISH = 'false';
    const reviewItem = normalizeNews({
      provider: 'rss',
      title: 'Review me',
      summary: 'A short publisher-provided summary.',
      url: 'https://www.example.com/review',
      source: 'Example News',
      sourceUrl: 'https://example.com',
      publishedAt: '2026-11-08T08:00:00Z'
    });
    assert.equal(reviewItem.status, 'pending_review');
    assert.equal(reviewItem.moderationStatus, 'pending_review');

    assert.equal(normalizeNews({
      title: 'News', summary: 'Summary', url: 'http://example.com/story',
      source: 'Example', publishedAt: '2026-11-08T08:00:00Z'
    }), null);
    assert.equal(normalizeNews({
      title: 'News', summary: 'Summary', url: 'https://example.com/story',
      source: 'Example', publishedAt: 'not-a-date'
    }), null);
  } finally {
    if (previousAutoPublish === undefined) delete process.env.NEWS_AUTO_PUBLISH;
    else process.env.NEWS_AUTO_PUBLISH = previousAutoPublish;
  }
});

test('news records separate publication visibility from moderation and prevent duplicate stories', () => {
  assert.deepEqual(News.schema.path('status').enumValues, ['pending_review', 'published', 'hidden', 'archived', 'rejected']);
  assert.deepEqual(News.schema.path('moderationStatus').enumValues, ['automatic', 'pending_review', 'approved', 'rejected']);
  assert.ok(News.schema.indexes().some(([fields, options]) => fields.canonicalKey === 1 && options.unique));
  assert.ok(News.schema.indexes().some(([fields, options]) => fields.titleSourceKey === 1 && options.unique));
  assert.ok(News.schema.indexes().some(([fields]) => fields.provider === 1 && fields.providerArticleId === 1));
  assert.ok(NewsCategory.schema.indexes().some(([fields, options]) => fields.slug === 1 && options.unique));
});

test('RSS host validation rejects private, reserved, and loopback addresses', () => {
  for (const address of ['127.0.0.1', '10.0.0.1', '169.254.1.1', '192.0.2.1', '::1', '2001:db8::1']) {
    assert.equal(isPublicAddress(address), false, `${address} must not be fetched`);
  }
  assert.equal(isPublicAddress('8.8.8.8'), true);
  assert.equal(isPublicAddress('2606:4700:4700::1111'), true);
});

test('news images accept only source or explicitly configured publisher CDN hosts', () => {
  const previousHosts = process.env.NEWS_IMAGE_HOSTS;
  process.env.NEWS_IMAGE_HOSTS = 'static.toiimg.com';
  try {
    const raw = {
      provider: 'rss',
      title: 'Market update',
      summary: 'A publisher-provided summary.',
      url: 'https://timesofindia.indiatimes.com/story',
      source: 'Times of India',
      sourceUrl: 'https://timesofindia.indiatimes.com/',
      publishedAt: '2026-11-08T08:00:00Z'
    };
    assert.equal(normalizeNews({ ...raw, imageUrl: 'https://static.toiimg.com/thumb/story.jpg' }).imageUrl, 'https://static.toiimg.com/thumb/story.jpg');
    assert.equal(normalizeNews({ ...raw, imageUrl: 'https://unapproved.example/story.jpg' }).imageUrl, '');
  } finally {
    if (previousHosts === undefined) delete process.env.NEWS_IMAGE_HOSTS;
    else process.env.NEWS_IMAGE_HOSTS = previousHosts;
  }
});
