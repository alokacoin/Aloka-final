import { createHash } from 'node:crypto';
import { isIP } from 'node:net';
import { lookup } from 'node:dns/promises';
import https from 'node:https';
import Parser from 'rss-parser';
import News from '../models/News.js';
import NewsSource from '../models/NewsSource.js';
import { NewsFetchLog, NewsFetchLock } from '../models/NewsFetchLog.js';
import { ensureNewsCategories } from './newsCategories.js';
import { classifyNews } from './newsClassification.js';

const parser = new Parser({
  timeout: 8000,
  customFields: { item: ['media:content', 'media:thumbnail'] }
});
const maxFeedBytes = 2 * 1024 * 1024;
const allowedTrackingParameters = /^(utm_.+|fbclid|gclid|mc_cid|mc_eid)$/i;
const fetchTimeoutMs = () => {
  const configured = Number(process.env.NEWS_FETCH_TIMEOUT_MS) || 15000;
  return Math.min(60000, Math.max(1000, configured));
};

const hash = (value) => createHash('sha256').update(value).digest('hex');

const externalUrl = (value) => {
  if (typeof value !== 'string' || value.length > 2048) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    if (url.hostname === 'localhost' || url.hostname.endsWith('.localhost') || url.hostname.endsWith('.local')) return null;
    if (isIP(url.hostname.replace(/^\[|\]$/g, ''))) return null;
    return url;
  } catch {
    return null;
  }
};

const canonicalize = (value) => {
  const url = externalUrl(value);
  if (!url) return null;
  url.hash = '';
  for (const key of [...url.searchParams.keys()]) {
    if (allowedTrackingParameters.test(key)) url.searchParams.delete(key);
  }
  url.hostname = url.hostname.toLowerCase().replace(/^www\./, '');
  url.pathname = url.pathname.replace(/\/+$/, '') || '/';
  url.searchParams.sort();
  return url.toString();
};

const cleanText = (value, limit) => (typeof value === 'string'
  ? value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, limit)
  : '');

const sourceHostname = (value) => {
  const url = externalUrl(value);
  return url?.hostname.toLowerCase().replace(/^www\./, '') || '';
};

export const isPublicAddress = (address) => {
  const version = isIP(address);
  if (version === 4) {
    const [a, b] = address.split('.').map(Number);
    return a !== 0 && a !== 10 && a !== 127 && a < 224 &&
      !(a === 100 && b >= 64 && b <= 127) &&
      !(a === 169 && b === 254) &&
      !(a === 172 && b >= 16 && b <= 31) &&
      !(a === 192 && b === 168) &&
      !(a === 192 && b === 0) &&
      !(a === 198 && (b === 18 || b === 19 || b === 51)) &&
      !(a === 203 && b === 0);
  }
  if (version === 6) {
    const normalized = address.toLowerCase();
    return /^2[0-9a-f]{3}:/.test(normalized) &&
      !normalized.startsWith('2001:db8:') &&
      !normalized.startsWith('2001:0:') &&
      !normalized.startsWith('2002:');
  }
  return false;
};

const requestRss = async (url) => {
  const addresses = await lookup(url.hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) {
    throw new Error('RSS feed host must resolve only to public IP addresses.');
  }
  const address = addresses[0];
  return new Promise((resolve, reject) => {
    let settled = false;
    let timeout;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      callback(value);
    };
    const request = https.request(url, {
      method: 'GET',
      headers: { accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml' },
      lookup: (_hostname, _options, callback) => callback(null, address.address, address.family)
    }, (response) => {
      if (response.statusCode < 200 || response.statusCode >= 300) {
        response.resume();
        const error = new Error(`RSS feed returned HTTP ${response.statusCode}.`);
        error.status = response.statusCode;
        finish(reject, error);
        return;
      }
      const length = Number(response.headers['content-length']);
      if (Number.isFinite(length) && length > maxFeedBytes) {
        response.destroy();
        finish(reject, new Error('RSS feed exceeded the 2 MB response limit.'));
        return;
      }
      const chunks = [];
      let total = 0;
      response.on('data', (chunk) => {
        total += chunk.length;
        if (total > maxFeedBytes) {
          response.destroy(new Error('RSS feed exceeded the 2 MB response limit.'));
          return;
        }
        chunks.push(chunk);
      });
      response.on('error', (error) => finish(reject, error));
      response.on('end', () => finish(resolve, Buffer.concat(chunks).toString('utf8')));
    });
    const timeoutMs = fetchTimeoutMs();
    timeout = setTimeout(() => {
      request.destroy(new Error('RSS feed request timed out.'));
    }, timeoutMs);
    request.setTimeout(timeoutMs, () => request.destroy(new Error('RSS feed request timed out.')));
    request.on('error', (error) => finish(reject, error));
    request.end();
  });
};

const allowedImageHosts = () => (process.env.NEWS_IMAGE_HOSTS || '')
  .split(',')
  .map((host) => host.trim().toLowerCase().replace(/^www\./, ''))
  .filter(Boolean);

const isAllowedImage = (imageUrl, sourceUrl, feedUrl) => {
  const image = externalUrl(imageUrl);
  if (!image) return '';
  const host = image.hostname.toLowerCase().replace(/^www\./, '');
  const allowedHosts = [
    sourceHostname(sourceUrl),
    sourceHostname(feedUrl),
    ...allowedImageHosts()
  ].filter(Boolean);
  return allowedHosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`))
    ? image.toString()
    : '';
};

export const normalizeNews = (raw) => {
  const title = cleanText(raw.title, 300);
  const summary = cleanText(raw.summary, 2000);
  const canonicalUrl = canonicalize(raw.url);
  const source = cleanText(raw.source, 160);
  const publishedAt = raw.publishedAt ? new Date(raw.publishedAt) : null;
  if (!title || !summary || !source || !canonicalUrl || !publishedAt || Number.isNaN(publishedAt.getTime())) return null;
  const category = classifyNews(title, summary, source);
  const canonicalKey = hash(canonicalUrl);
  const titleSourceKey = hash(`${title.toLowerCase().replace(/\s+/g, ' ').trim()}|${source.toLowerCase()}|${publishedAt.toISOString().slice(0, 13)}`);
  const providerArticleId = cleanText(raw.providerArticleId, 512) || canonicalKey;
  const slug = `${title.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 100) || 'news'}-${canonicalKey.slice(0, 12)}`;
  const autoPublish = process.env.NEWS_AUTO_PUBLISH !== 'false';
  return {
    provider: raw.provider,
    providerArticleId,
    title,
    slug,
    description: summary,
    summary,
    canonicalUrl,
    originalUrl: canonicalUrl,
    canonicalKey,
    titleSourceKey,
    imageUrl: isAllowedImage(raw.imageUrl, raw.sourceUrl, raw.feedUrl),
    imageAlt: title,
    imageSource: raw.imageUrl || '',
    source,
    sourceName: source,
    sourceUrl: canonicalize(raw.sourceUrl) || '',
    sourceDomain: sourceHostname(raw.sourceUrl) || sourceHostname(canonicalUrl),
    author: cleanText(raw.author, 160),
    language: cleanText(raw.language, 12).toLowerCase() || 'en',
    country: cleanText(raw.country, 4).toUpperCase() || 'IN',
    category: category.name,
    categorySlug: category.slug,
    categories: [category.slug],
    publishedAt,
    fetchedAt: new Date(),
    lastSeenAt: new Date(),
    status: autoPublish ? 'published' : 'pending_review',
    moderationStatus: autoPublish ? 'automatic' : 'pending_review',
    isApproved: autoPublish
  };
};

const readFeed = async (feedUrl, sourceConfig = {}) => {
  const url = externalUrl(feedUrl);
  if (!url) throw new Error('Configured RSS feed URLs must be valid HTTPS URLs.');
  const feed = await parser.parseString(await requestRss(url));
  const batchSize = Math.min(100, Math.max(1, Number(process.env.NEWS_FETCH_BATCH_SIZE) || 50));
  return (feed.items || []).slice(0, batchSize).map((item) => {
    const media = item['media:content']?.$?.url || item['media:thumbnail']?.$?.url;
    const canonical = canonicalize(item.link);
    let domain = '';
    try { domain = canonical ? new URL(canonical).origin : ''; } catch { domain = ''; }
    return {
      provider: 'rss',
      providerArticleId: item.guid || item.id || item.link,
      title: item.title,
      summary: item.contentSnippet || item.summary || item.description,
      url: item.link,
      imageUrl: item.enclosure?.url || media,
      source: sourceConfig.name || feed.title || url.hostname,
      sourceUrl: sourceConfig.websiteUrl || feed.link || domain || url.origin,
      feedUrl,
      author: item.creator || item.author,
      language: sourceConfig.language || feed.language,
      country: sourceConfig.country || 'IN',
      publishedAt: item.isoDate || item.pubDate
    };
  });
};

const readGNews = async () => {
  const apiKey = process.env.GNEWS_API_KEY;
  if (!apiKey) return [];
  const url = new URL('https://gnews.io/api/v4/search');
  url.searchParams.set('q', process.env.NEWS_GNEWS_QUERY || 'finance OR tax OR GST OR markets OR banking OR economy');
  url.searchParams.set('lang', process.env.NEWS_GNEWS_LANGUAGE || 'en');
  url.searchParams.set('country', process.env.NEWS_GNEWS_COUNTRY || 'in');
  url.searchParams.set('max', String(Math.min(10, Math.max(1, Number(process.env.NEWS_GNEWS_MAX_RESULTS) || 10))));
  url.searchParams.set('apikey', apiKey);
  const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(fetchTimeoutMs()) });
  if (!response.ok) {
    const error = new Error(`GNews provider returned HTTP ${response.status}.`);
    error.status = response.status;
    throw error;
  }
  const data = await response.json();
  return (Array.isArray(data.articles) ? data.articles : []).map((article) => ({
    provider: 'gnews',
    providerArticleId: article.url,
    title: article.title,
    summary: article.description,
    url: article.url,
    imageUrl: article.image,
    source: article.source?.name,
    sourceUrl: article.source?.url,
    author: article.author,
    language: process.env.NEWS_GNEWS_LANGUAGE || 'en',
    country: process.env.NEWS_GNEWS_COUNTRY || 'in',
    publishedAt: article.publishedAt
  }));
};

const readNewsApi = async () => {
  const apiKey = process.env.NEWSAPI_API_KEY;
  if (!apiKey) return [];
  const url = new URL('https://newsapi.org/v2/everything');
  url.searchParams.set('q', process.env.NEWSAPI_QUERY || 'finance OR tax OR GST OR markets OR banking OR economy');
  url.searchParams.set('language', process.env.NEWSAPI_LANGUAGE || 'en');
  url.searchParams.set('sortBy', 'publishedAt');
  url.searchParams.set('pageSize', String(Math.min(100, Math.max(1, Number(process.env.NEWSAPI_MAX_RESULTS) || 30))));
  const response = await fetch(url, {
    redirect: 'manual',
    signal: AbortSignal.timeout(fetchTimeoutMs()),
    headers: { 'X-Api-Key': apiKey }
  });
  if (!response.ok) {
    const error = new Error(`NewsAPI provider returned HTTP ${response.status}.`);
    error.status = response.status;
    throw error;
  }
  const data = await response.json();
  return (Array.isArray(data.articles) ? data.articles : []).map((article) => ({
    provider: 'newsapi',
    providerArticleId: article.url,
    title: article.title,
    summary: article.description,
    url: article.url,
    imageUrl: article.urlToImage,
    source: article.source?.name,
    sourceUrl: article.url ? new URL(article.url).origin : '',
    author: article.author,
    language: process.env.NEWSAPI_LANGUAGE || 'en',
    country: process.env.NEWSAPI_COUNTRY || 'IN',
    publishedAt: article.publishedAt
  }));
};

const configuredFeeds = () => (process.env.NEWS_RSS_FEEDS || '')
  .split(';')
  .map((feed) => feed.trim())
  .filter(Boolean);

export const isNewsFetchConfigured = () => Boolean(process.env.GNEWS_API_KEY || process.env.NEWSAPI_API_KEY || configuredFeeds().length);

export const hasConfiguredNewsSources = async () => Boolean(
  isNewsFetchConfigured() || await NewsSource.exists({ isActive: true, provider: 'rss' })
);

const updateDuplicate = async (item) => {
  const existing = await News.findOne({
    $or: [
      { canonicalKey: item.canonicalKey },
      { provider: item.provider, providerArticleId: item.providerArticleId },
      { titleSourceKey: item.titleSourceKey }
    ]
  });
  if (!existing) return false;
  const edited = new Set(existing.adminEditedFields || []);
  const editableMetadata = [
    'title', 'description', 'summary', 'imageUrl', 'imageAlt', 'imageSource',
    'source', 'sourceName', 'sourceUrl', 'sourceDomain', 'author', 'language',
    'country', 'category', 'categorySlug'
  ];
  for (const field of editableMetadata) {
    if (edited.has(field)) continue;
    if (field.startsWith('image') && existing[field] && !item[field]) continue;
    if (item[field] !== undefined && item[field] !== '') existing[field] = item[field];
  }
  if (item.publishedAt && (!existing.publishedAt || item.publishedAt < existing.publishedAt)) {
    existing.publishedAt = item.publishedAt;
  }
  if (item.providerArticleId && !(existing.alternateProviderIds || []).some(
    (entry) => entry.provider === item.provider && entry.providerArticleId === item.providerArticleId
  ) && (existing.provider !== item.provider || existing.providerArticleId !== item.providerArticleId)) {
    existing.alternateProviderIds.push({ provider: item.provider, providerArticleId: item.providerArticleId });
  }
  existing.lastSeenAt = new Date();
  existing.fetchedAt = new Date();
  existing.lastUpdatedAt = new Date();
  await existing.save();
  return true;
};

const saveItems = async (rawItems) => {
  let inserted = 0;
  let updated = 0;
  let duplicates = 0;
  for (const raw of rawItems) {
    const item = normalizeNews(raw);
    if (!item) continue;
    try {
      await News.create(item);
      inserted += 1;
    } catch (error) {
      if (error.code !== 11000) throw error;
      if (await updateDuplicate(item)) updated += 1;
      else duplicates += 1;
    }
  }
  return { inserted, updated, duplicates };
};

const fetchWithRetry = async (fetcher) => {
  const configuredRetries = Number.parseInt(process.env.NEWS_FETCH_MAX_RETRIES || '2', 10);
  const retries = Number.isInteger(configuredRetries) ? Math.min(3, Math.max(0, configuredRetries)) : 2;
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await fetcher();
    } catch (error) {
      const retryable = !error.status || error.status === 429 || error.status >= 500;
      if (!retryable || attempt >= retries) throw error;
      await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
    }
  }
};

export const fetchNews = async ({ throwOnError = false } = {}) => {
  if (configuredFeeds().length > 20) {
    const error = new Error('Configure no more than 20 RSS feeds to keep each fetch bounded.');
    error.status = 400;
    throw error;
  }
  await ensureNewsCategories();
  const sourceConfigs = await NewsSource.find({ isActive: true, provider: 'rss' }).lean();
  if (!isNewsFetchConfigured() && !sourceConfigs.length) {
    if (throwOnError) {
      const error = new Error('Configure GNEWS_API_KEY, NEWSAPI_API_KEY, an RSS source, or approved HTTPS URLs in NEWS_RSS_FEEDS before fetching news.');
      error.status = 503;
      throw error;
    }
    return { busy: false, skipped: true, message: 'No news providers are configured.' };
  }
  if (sourceConfigs.length + configuredFeeds().length > 20) {
    const error = new Error('Configure no more than 20 RSS feeds to keep each fetch bounded.');
    error.status = 400;
    throw error;
  }
  const runId = new NewsFetchLog()._id;
  const startedAt = new Date();
  const lockFilter = {
    _id: 'news-fetch',
    $or: [{ leaseExpiresAt: { $lte: startedAt } }, { leaseExpiresAt: { $exists: false } }]
  };
  try {
    await NewsFetchLock.findOneAndUpdate(
      lockFilter,
      { $set: { runId, leaseExpiresAt: new Date(startedAt.getTime() + 20 * 60 * 1000) } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  } catch (error) {
    if (error.code === 11000) {
      return { busy: true, message: 'A news fetch is already running.' };
    }
    throw error;
  }

  const log = await NewsFetchLog.create({ _id: runId, startedAt, status: 'running' });
  const errors = [];
  let fetched = 0;
  let inserted = 0;
  let updated = 0;
  let duplicates = 0;
  try {
    const providers = [
      ...configuredFeeds().map((feedUrl) => ({ name: 'rss', source: null, fetch: () => readFeed(feedUrl) })),
      ...sourceConfigs.map((source) => ({ name: `rss:${source.name}`, source, fetch: () => readFeed(source.feedUrl, source) })),
      ...(process.env.GNEWS_API_KEY ? [{ name: 'gnews', source: null, fetch: readGNews }] : []),
      ...(process.env.NEWSAPI_API_KEY ? [{ name: 'newsapi', source: null, fetch: readNewsApi }] : [])
    ];
    await NewsFetchLog.updateOne({ _id: log._id }, { $set: { provider: providers.map(({ name }) => name).join(', ').slice(0, 200) } });
    for (const provider of providers) {
      try {
        const articles = await fetchWithRetry(provider.fetch);
        const saved = await saveItems(articles);
        fetched += articles.length;
        inserted += saved.inserted;
        updated += saved.updated;
        duplicates += saved.duplicates;
        if (provider.source) {
          await NewsSource.updateOne({ _id: provider.source._id }, { $set: { status: 'healthy', lastFetchedAt: new Date() } });
        }
      } catch (error) {
        const safeMessage = `${provider.name}: ${error.message.replace(/https?:\/\/\S+/gi, '[URL]').slice(0, 250)}`;
        errors.push(safeMessage);
        console.error('News provider fetch failed:', safeMessage);
        if (provider.source) {
          await NewsSource.updateOne({ _id: provider.source._id }, { $set: { status: 'degraded', lastFetchedAt: new Date() } });
        }
      }
    }
    const status = errors.length ? (inserted || updated || duplicates ? 'partial' : 'failed') : 'completed';
    await NewsFetchLog.updateOne({ _id: log._id }, { $set: {
      completedAt: new Date(),
      executionDuration: Date.now() - startedAt.getTime(),
      status,
      fetched,
      inserted,
      updated,
      duplicates,
      failed: errors.length,
      errorMessages: errors
    } });
    if (throwOnError && status === 'failed') {
      const error = new Error('All configured news providers failed. Check the latest news fetch log for details.');
      error.status = 502;
      throw error;
    }
    return { busy: false, fetched, inserted, updated, duplicates, errors };
  } finally {
    await NewsFetchLock.deleteOne({ _id: 'news-fetch', runId });
  }
};

export const getRecentNewsFetchLogs = () => NewsFetchLog.find()
  .sort({ startedAt: -1 })
  .limit(20)
  .select('provider startedAt completedAt status fetched inserted updated duplicates failed errorMessages executionDuration')
  .lean();
