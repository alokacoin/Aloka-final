import axios from 'axios';
import { implementedCalculatorSlugs } from '@aloka/shared/calculatorEngines';

export const apiBaseUrl = import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? 'https://api.aloka.co.in/api' : '/api');

export const api = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true
});

export const fetchHomeData = async () => {
  const { data } = await api.get('/overview');
  return data;
};

export const fetchBlogs = async () => {
  const { data } = await api.get('/blogs');
  return data;
};

export const fetchNews = async () => {
  const { data } = await api.get('/news');
  return data;
};

export const fetchServices = async () => {
  const { data } = await api.get('/services');
  return data;
};

export const fetchCalculatorCatalogue = async () => {
  const [catalogueResponse, categoriesResponse, recentResponse] = await Promise.all([
    api.get('/v1/calculators', { params: { limit: 100 } }),
    api.get('/v1/calculators/categories'),
    api.get('/v1/calculators/recent')
  ]);
  const recentlyAddedSlugs = new Set(recentResponse.data.items.map(({ slug }) => slug));

  return {
    calculators: catalogueResponse.data.items.map((item) => ({
      id: item.slug,
      name: item.name,
      category: item.category?.name || 'General finance',
      status: item.isImplemented && item.isVerified &&
        (item.slug === 'income-tax-calculator-old-vs-new-tax-regime' ||
          implementedCalculatorSlugs.has(item.slug)) ? 'available' : 'planned',
      keywords: [...item.keywords, ...item.tags].join(' ').toLowerCase(),
      featured: item.isFeatured,
      popular: item.isPopular,
      recentlyAdded: recentlyAddedSlugs.has(item.slug)
    })),
    categories: categoriesResponse.data.items.map(({ name, description }) => ({ name, description }))
  };
};
