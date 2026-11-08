import { useRef, useState } from 'react';
import { ImagePlus, LoaderCircle, Trash2, Upload } from 'lucide-react';
import { uploadBlogImage } from '../../services/blogImages';

const validateImage = (file) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) return 'Choose a JPG, PNG, or WebP image.';
  if (file.size > 5 * 1024 * 1024) return 'Image must be smaller than 5 MB.';
  return '';
};

export default function BlogCoverImageUpload({ value, onChange, disabled = false }) {
  const inputRef = useRef(null);
  const [uploadError, setUploadError] = useState('');
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const upload = async (file) => {
    if (!file) return;
    const validationError = validateImage(file);
    if (validationError) {
      setUploadError(validationError);
      return;
    }
    setUploadError('');
    setProgress(0);
    setIsUploading(true);
    try {
      const uploaded = await uploadBlogImage(file, setProgress);
      onChange({ ...uploaded, alt: value?.alt || '', caption: value?.caption || '' });
    } catch (error) {
      setUploadError(error.response?.data?.message || 'Image upload failed. Your draft is unchanged.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-heading">Cover image <span className="font-normal text-muted">(optional)</span></h2>
          <p className="mt-1 text-xs text-muted">JPG, PNG, or WebP · up to 5 MB</p>
        </div>
        {value?.url && (
          <button type="button" onClick={() => onChange(null)} disabled={disabled || isUploading} className="ghost-btn px-3 py-2 text-error">
            <Trash2 size={15} aria-hidden="true" /> Remove
          </button>
        )}
      </div>
      {value?.url ? (
        <div className="overflow-hidden rounded-2xl border border-border">
          <img src={value.url} alt={value.alt || ''} className="max-h-80 w-full bg-secondary object-cover" />
          <div className="grid gap-3 p-4">
            <label className="text-xs font-medium text-muted" htmlFor="blog-cover-alt">Image alt text</label>
            <input id="blog-cover-alt" value={value.alt || ''} maxLength={160} disabled={disabled} onChange={(event) => onChange({ ...value, alt: event.target.value })} className="form-control" placeholder="Describe the image for accessibility" />
            <label className="text-xs font-medium text-muted" htmlFor="blog-cover-caption">Caption <span className="font-normal">(optional)</span></label>
            <input id="blog-cover-caption" value={value.caption || ''} maxLength={240} disabled={disabled} onChange={(event) => onChange({ ...value, caption: event.target.value })} className="form-control" placeholder="Add a caption" />
            <button type="button" onClick={() => inputRef.current?.click()} disabled={isUploading || disabled} className="secondary-btn w-fit">
              <Upload size={15} aria-hidden="true" /> Replace image
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            upload(event.dataTransfer.files[0]);
          }}
          disabled={isUploading || disabled}
          className="flex min-h-40 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-secondary/50 p-6 text-center transition hover:border-primary"
        >
          {isUploading ? <LoaderCircle size={23} className="animate-spin text-primary" aria-hidden="true" /> : <ImagePlus size={23} className="text-primary" aria-hidden="true" />}
          <span className="mt-3 text-sm font-semibold text-heading">{isUploading ? `Uploading image ${progress}%` : 'Choose or drop a cover image'}</span>
          <span className="mt-1 text-xs text-muted">Image uploads require the server’s Cloudinary configuration.</span>
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={disabled || isUploading} onChange={(event) => { upload(event.target.files?.[0]); event.target.value = ''; }} />
      {uploadError && <p role="alert" className="text-sm text-error">{uploadError}</p>}
    </section>
  );
}
