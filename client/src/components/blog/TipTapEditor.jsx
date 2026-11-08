import { useCallback, useEffect, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import {
  AlignCenter, AlignLeft, AlignRight, Bold, Code2, Heading1, Heading2, Heading3,
  ImagePlus, Italic, Link2, List, ListOrdered, Minus, Quote, Redo2, Strikethrough,
  Table2, Underline as UnderlineIcon, Undo2
} from 'lucide-react';
import { uploadBlogImage } from '../../services/blogImages';

const CaptionImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      caption: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-caption') || '',
        renderHTML: (attributes) => attributes.caption ? { 'data-caption': attributes.caption } : {}
      }
    };
  }
});

const toolGroups = [
  [
    { label: 'Paragraph', action: (editor) => editor.chain().focus().setParagraph().run(), active: (editor) => editor.isActive('paragraph'), text: '¶' },
    { label: 'Heading 1', action: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(), active: (editor) => editor.isActive('heading', { level: 1 }), Icon: Heading1 },
    { label: 'Heading 2', action: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: (editor) => editor.isActive('heading', { level: 2 }), Icon: Heading2 },
    { label: 'Heading 3', action: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(), active: (editor) => editor.isActive('heading', { level: 3 }), Icon: Heading3 }
  ],
  [
    { label: 'Bold', action: (editor) => editor.chain().focus().toggleBold().run(), active: (editor) => editor.isActive('bold'), Icon: Bold },
    { label: 'Italic', action: (editor) => editor.chain().focus().toggleItalic().run(), active: (editor) => editor.isActive('italic'), Icon: Italic },
    { label: 'Underline', action: (editor) => editor.chain().focus().toggleUnderline().run(), active: (editor) => editor.isActive('underline'), Icon: UnderlineIcon },
    { label: 'Strikethrough', action: (editor) => editor.chain().focus().toggleStrike().run(), active: (editor) => editor.isActive('strike'), Icon: Strikethrough },
    { label: 'Bullet list', action: (editor) => editor.chain().focus().toggleBulletList().run(), active: (editor) => editor.isActive('bulletList'), Icon: List },
    { label: 'Numbered list', action: (editor) => editor.chain().focus().toggleOrderedList().run(), active: (editor) => editor.isActive('orderedList'), Icon: ListOrdered },
    { label: 'Quote', action: (editor) => editor.chain().focus().toggleBlockquote().run(), active: (editor) => editor.isActive('blockquote'), Icon: Quote }
  ],
  [
    { label: 'Align left', action: (editor) => editor.chain().focus().setTextAlign('left').run(), active: (editor) => editor.isActive('paragraph', { textAlign: 'left' }) || editor.isActive('heading', { textAlign: 'left' }), Icon: AlignLeft },
    { label: 'Align center', action: (editor) => editor.chain().focus().setTextAlign('center').run(), active: (editor) => editor.isActive('paragraph', { textAlign: 'center' }) || editor.isActive('heading', { textAlign: 'center' }), Icon: AlignCenter },
    { label: 'Align right', action: (editor) => editor.chain().focus().setTextAlign('right').run(), active: (editor) => editor.isActive('paragraph', { textAlign: 'right' }) || editor.isActive('heading', { textAlign: 'right' }), Icon: AlignRight },
    { label: 'Code block', action: (editor) => editor.chain().focus().toggleCodeBlock().run(), active: (editor) => editor.isActive('codeBlock'), Icon: Code2 },
    { label: 'Horizontal divider', action: (editor) => editor.chain().focus().setHorizontalRule().run(), active: () => false, Icon: Minus },
    { label: 'Insert table', action: (editor) => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(), active: (editor) => editor.isActive('table'), Icon: Table2 }
  ]
];

export default function TipTapEditor({ content, onChange, disabled = false }) {
  const uploadInput = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const extensions = [
    StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
    Underline,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    CaptionImage.configure({ inline: false, allowBase64: false }),
    Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: '_blank' } }),
    Placeholder.configure({ placeholder: 'Start writing your article…' }),
    Table.configure({ resizable: false }),
    TableRow,
    TableHeader,
    TableCell
  ];

  const editor = useEditor({
    extensions,
    content: content || { type: 'doc', content: [{ type: 'paragraph' }] },
    editable: !disabled,
    onUpdate: ({ editor: currentEditor }) => onChangeRef.current(currentEditor.getJSON()),
    editorProps: { attributes: { class: 'tiptap-editor min-h-[26rem] outline-none', 'aria-label': 'Blog article content' } }
  }, []);
  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [editor, disabled]);

  const insertImage = useCallback(async (file) => {
    if (!file || !editor) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setUploadError('Choose a JPG, PNG, or WebP image smaller than 5 MB.');
      return;
    }
    setUploadError('');
    setUploadProgress(0);
    setIsUploading(true);
    try {
      const uploaded = await uploadBlogImage(file, setUploadProgress);
      const caption = window.prompt('Image caption (optional):') || '';
      editor.chain().focus().setImage({ src: uploaded.url, alt: file.name.replace(/\.[^.]+$/, ''), caption }).run();
    } catch (error) {
      setUploadError(error.response?.data?.message || 'Image upload failed. The article content is unchanged.');
    } finally {
      setIsUploading(false);
    }
  }, [editor]);

  const setLink = () => {
    if (!editor) return;
    const currentHref = editor.getAttributes('link').href || '';
    const href = window.prompt('Enter a secure https:// or mailto: link', currentHref);
    if (href === null) return;
    if (!href) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    if (!/^(https:\/\/|mailto:)/i.test(href)) {
      setUploadError('Links must start with https:// or mailto:.');
      return;
    }
    setUploadError('');
    editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
  };

  if (!editor) return <div className="min-h-[28rem] animate-pulse rounded-2xl bg-secondary" />;

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex flex-wrap items-center gap-1 border-b border-border p-2" aria-label="Article formatting toolbar">
        {toolGroups.map((group, groupIndex) => (
          <div key={groupIndex} className="flex flex-wrap items-center gap-1 border-r border-border pr-2 last:border-0">
            {group.map(({ label, action, active, Icon, text }) => (
              <button
                key={label}
                type="button"
                title={label}
                aria-label={label}
                aria-pressed={active(editor)}
                disabled={disabled || isUploading}
                onClick={() => action(editor)}
                className={`grid h-9 min-w-9 place-items-center rounded-lg px-2 text-sm transition hover:bg-secondary disabled:opacity-40 ${active(editor) ? 'bg-soft-blue text-primary' : 'text-body'}`}
              >
                {Icon ? <Icon size={17} aria-hidden="true" /> : text}
              </button>
            ))}
          </div>
        ))}
        <div className="flex items-center gap-1">
          <button type="button" onClick={setLink} disabled={disabled} title="Insert link" aria-label="Insert link" className="grid h-9 w-9 place-items-center rounded-lg text-body hover:bg-secondary disabled:opacity-40"><Link2 size={17} /></button>
          <button type="button" onClick={() => uploadInput.current?.click()} disabled={disabled || isUploading} title="Upload inline image" aria-label="Upload inline image" className="grid h-9 w-9 place-items-center rounded-lg text-body hover:bg-secondary disabled:opacity-40"><ImagePlus size={17} /></button>
          <button type="button" onClick={() => editor.chain().focus().undo().run()} disabled={disabled || !editor.can().undo()} title="Undo" aria-label="Undo" className="grid h-9 w-9 place-items-center rounded-lg text-body hover:bg-secondary disabled:opacity-40"><Undo2 size={17} /></button>
          <button type="button" onClick={() => editor.chain().focus().redo().run()} disabled={disabled || !editor.can().redo()} title="Redo" aria-label="Redo" className="grid h-9 w-9 place-items-center rounded-lg text-body hover:bg-secondary disabled:opacity-40"><Redo2 size={17} /></button>
        </div>
      </div>
      {isUploading && <div className="border-b border-border px-4 py-2 text-xs text-muted" role="status">Uploading image… {uploadProgress}%</div>}
      {uploadError && <p role="alert" className="border-b border-border bg-error/5 px-4 py-2 text-sm text-error">{uploadError}</p>}
      <EditorContent editor={editor} />
      <input ref={uploadInput} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { insertImage(event.target.files?.[0]); event.target.value = ''; }} />
    </section>
  );
}
