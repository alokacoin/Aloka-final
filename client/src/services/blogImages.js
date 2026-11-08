import { api } from './api';

export const uploadBlogImage = async (file, onProgress) => {
  const { data } = await api.post('/user/blog-images', file, {
    headers: { 'Content-Type': file.type },
    onUploadProgress: (event) => {
      if (event.total) onProgress?.(Math.round((event.loaded / event.total) * 100));
    }
  });
  return data.item;
};
