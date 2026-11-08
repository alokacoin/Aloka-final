import cron from 'node-cron';
import { fetchNews } from '../services/newsFetchService.js';

export const startNewsFetchJob = async () => {
  if (process.env.NEWS_FETCH_ENABLED === 'false') return null;
  const expression = process.env.NEWS_FETCH_CRON || '*/15 * * * *';
  if (!cron.validate(expression)) {
    throw new Error('NEWS_FETCH_CRON must be a valid node-cron expression.');
  }
  const timezone = process.env.NEWS_FETCH_TIMEZONE || 'Asia/Kolkata';
  return cron.schedule(expression, async () => {
    try {
      const result = await fetchNews();
      if (result?.skipped) {
        console.info(result.message);
      } else if (result && !result.busy) {
        console.log(`News fetch completed: ${result.inserted} new, ${result.duplicates} duplicate, ${result.errors?.length || 0} provider errors.`);
      }
    } catch (error) {
      console.error('Scheduled news fetch failed:', error.message);
    }
  }, { timezone });
};
