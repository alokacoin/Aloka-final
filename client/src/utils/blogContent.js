export const getBlogContentText = (content) => {
  if (typeof content === 'string') return content;
  if (!content || typeof content !== 'object') return '';
  if (content.type === 'text') return typeof content.text === 'string' ? content.text : '';
  return Array.isArray(content.content) ? content.content.map(getBlogContentText).join(' ') : '';
};
