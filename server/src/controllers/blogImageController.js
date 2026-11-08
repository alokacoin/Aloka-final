import { v2 as cloudinary } from 'cloudinary';
import { asyncHandler } from '../utils/asyncHandler.js';

const isSupportedImage = (buffer, contentType) => {
  if (contentType === 'image/jpeg') {
    return buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (contentType === 'image/png') {
    return buffer.length > 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  }
  if (contentType === 'image/webp') {
    return buffer.length > 12 && buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP';
  }
  return false;
};

const uploadToCloudinary = (buffer) => new Promise((resolve, reject) => {
  cloudinary.uploader.upload_stream(
    { folder: 'aloka/blogs', resource_type: 'image' },
    (error, result) => {
      if (error) return reject(error);
      return resolve(result);
    }
  ).end(buffer);
});

export const uploadBlogImage = asyncHandler(async (req, res) => {
  const contentType = req.get('content-type')?.split(';')[0].trim().toLowerCase();
  if (!Buffer.isBuffer(req.body) || req.body.length === 0 || req.body.length > 5 * 1024 * 1024) {
    return res.status(400).json({ success: false, message: 'Choose an image smaller than 5 MB.' });
  }
  if (!isSupportedImage(req.body, contentType)) {
    return res.status(415).json({ success: false, message: 'Only valid JPG, PNG, and WebP images are supported.' });
  }

  const configuration = {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  };
  if (Object.values(configuration).some((value) => !value || value.startsWith('your-'))) {
    return res.status(503).json({ success: false, message: 'Image uploads are not configured on this server.' });
  }
  cloudinary.config(configuration);
  const result = await uploadToCloudinary(req.body);
  if (!result?.secure_url || !result?.public_id) {
    throw new Error('Cloudinary returned an incomplete image upload result.');
  }
  return res.status(201).json({
    success: true,
    item: { url: result.secure_url, publicId: result.public_id }
  });
});
