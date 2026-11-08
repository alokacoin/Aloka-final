import { Fragment } from 'react';

const safeUrl = (value) => {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value, window.location.origin);
    return ['http:', 'https:', 'mailto:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
};

const headingId = (text, index) => `section-${text.toLowerCase()
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '') || 'heading'}-${index}`;

const getTextContent = (node) => node?.type === 'text'
  ? node.text || ''
  : (node?.content || []).map(getTextContent).join('');

const renderText = (node, key) => {
  let content = node.text || '';
  for (const mark of node.marks || []) {
    if (mark.type === 'bold') content = <strong key={`${key}-bold`}>{content}</strong>;
    if (mark.type === 'italic') content = <em key={`${key}-italic`}>{content}</em>;
    if (mark.type === 'underline') content = <u key={`${key}-underline`}>{content}</u>;
    if (mark.type === 'strike') content = <s key={`${key}-strike`}>{content}</s>;
    if (mark.type === 'code') content = <code key={`${key}-code`} className="rounded bg-secondary px-1.5 py-0.5 text-[0.9em]">{content}</code>;
    if (mark.type === 'link') {
      const href = safeUrl(mark.attrs?.href);
      if (href) {
        const external = new URL(href).origin !== window.location.origin;
        content = <a key={`${key}-link`} href={href} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer nofollow' : undefined} className="font-medium text-primary underline underline-offset-4">{content}</a>;
      }
    }
  }
  return <Fragment key={key}>{content}</Fragment>;
};

const renderNode = (node, key, headingIndex) => {
  if (!node || typeof node !== 'object') return null;
  const children = Array.isArray(node.content)
    ? node.content.map((child, index) => renderNode(child, `${key}-${index}`, headingIndex))
    : null;
  switch (node.type) {
    case 'doc':
      return <Fragment key={key}>{children}</Fragment>;
    case 'text':
      return renderText(node, key);
    case 'paragraph':
      return <p key={key} className="my-5 text-[1.0625rem] leading-[1.85] text-body sm:text-lg">{children}</p>;
    case 'heading': {
      const level = Math.min(4, Math.max(1, Number(node.attrs?.level) || 2));
      const Tag = `h${level}`;
      const size = level === 1 ? 'text-3xl' : level === 2 ? 'text-2xl' : 'text-xl';
      const id = headingId(getTextContent(node), headingIndex.current++);
      const alignment = ['left', 'center', 'right', 'justify'].includes(node.attrs?.textAlign) ? node.attrs.textAlign : undefined;
      return <Tag key={key} id={id} style={{ textAlign: alignment }} className={`scroll-mt-32 pt-5 font-bold tracking-tight text-heading ${size}`}>{children}</Tag>;
    }
    case 'bulletList':
      return <ul key={key} className="my-5 list-disc space-y-2 pl-7 text-[1.0625rem] leading-8 text-body">{children}</ul>;
    case 'orderedList':
      return <ol key={key} start={Number(node.attrs?.start) || 1} className="my-5 list-decimal space-y-2 pl-7 text-[1.0625rem] leading-8 text-body">{children}</ol>;
    case 'listItem':
      return <li key={key} className="pl-1">{children}</li>;
    case 'blockquote':
      return <blockquote key={key} className="my-7 border-l-4 border-primary pl-5 text-lg italic leading-8 text-body">{children}</blockquote>;
    case 'horizontalRule':
      return <hr key={key} className="my-8 border-border" />;
    case 'hardBreak':
      return <br key={key} />;
    case 'codeBlock':
      return <pre key={key} className="my-6 overflow-x-auto rounded-xl bg-secondary p-5 text-sm text-body"><code>{children}</code></pre>;
    case 'image': {
      const src = safeUrl(node.attrs?.src);
      if (!src || !['http:', 'https:'].includes(new URL(src).protocol)) return null;
      const alt = typeof node.attrs?.alt === 'string' ? node.attrs.alt : '';
      return (
        <figure key={key} className="my-8">
          <img src={src} alt={alt} loading="lazy" className="max-h-[42rem] w-full rounded-2xl border border-border object-contain" />
          {node.attrs?.caption && <figcaption className="mt-2 text-center text-sm text-muted">{node.attrs.caption}</figcaption>}
        </figure>
      );
    }
    case 'table':
      return <div key={key} className="my-7 overflow-x-auto rounded-xl border border-border"><table className="w-full border-collapse text-left text-sm">{children}</table></div>;
    case 'tableRow':
      return <tr key={key} className="border-b border-border last:border-0">{children}</tr>;
    case 'tableHeader':
      return <th key={key} className="bg-secondary px-4 py-3 font-semibold text-heading">{children}</th>;
    case 'tableCell':
      return <td key={key} colSpan={Math.max(1, Number(node.attrs?.colspan) || 1)} rowSpan={Math.max(1, Number(node.attrs?.rowspan) || 1)} className="min-w-28 px-4 py-3 text-body">{children}</td>;
    default:
      return null;
  }
};

export default function ArticleContent({ content }) {
  if (typeof content === 'string') {
    return (
      <div className="prose-aloka">
        {content.split(/\r?\n/).filter((line) => line.trim()).map((line, index) => (
          <p key={index} className="my-5 text-[1.0625rem] leading-[1.85] text-body sm:text-lg">{line}</p>
        ))}
      </div>
    );
  }
  if (!content || content.type !== 'doc' || !Array.isArray(content.content)) return null;
  return <div className="prose-aloka">{renderNode(content, 'article', { current: 0 })}</div>;
}
