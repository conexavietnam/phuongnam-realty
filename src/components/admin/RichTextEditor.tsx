import React, { useEffect, useRef, useState } from 'react';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import type { Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
  Redo2,
  RemoveFormatting,
  Underline as UnderlineIcon,
  Undo2,
} from 'lucide-react';
import { mediaService } from '@/services/mediaService';
import type { MediaItem } from '@/services/mediaService';
import { toEditorHtml } from '@/utils/richText';
import { ImagePickerModal } from './ImagePickerModal';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  category?: MediaItem['category'];
  placeholder?: string;
}

const SAFE_LINK = /^(https?:\/\/|mailto:|tel:)/i;

interface ToolbarButtonProps {
  title: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}

function ToolbarButton({ title, onClick, active = false, disabled = false, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      // Keep the editor selection while clicking toolbar buttons.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`min-w-8 h-8 px-1.5 inline-flex items-center justify-center rounded-lg text-xs font-semibold transition-colors disabled:opacity-40 ${
        active ? 'bg-navy-900 text-gold-400' : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="w-px h-5 bg-slate-200 mx-1 shrink-0" aria-hidden="true" />;
}

function promptForLink(editor: Editor): void {
  const previous = (editor.getAttributes('link').href as string | undefined) ?? '';
  const input = window.prompt('Nhập địa chỉ liên kết (http://, https://, mailto: hoặc tel:). Để trống để gỡ liên kết:', previous);
  if (input === null) return;
  const url = input.trim();
  if (url === '') {
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
    return;
  }
  if (!SAFE_LINK.test(url)) {
    window.alert('Chỉ chấp nhận liên kết bắt đầu bằng http://, https://, mailto: hoặc tel:');
    return;
  }
  editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
}

function Toolbar({ editor, onInsertImage }: { editor: Editor; onInsertImage: () => void }) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      paragraph: e.isActive('paragraph'),
      h2: e.isActive('heading', { level: 2 }),
      h3: e.isActive('heading', { level: 3 }),
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      underline: e.isActive('underline'),
      bullet: e.isActive('bulletList'),
      ordered: e.isActive('orderedList'),
      quote: e.isActive('blockquote'),
      left: e.isActive({ textAlign: 'left' }),
      center: e.isActive({ textAlign: 'center' }),
      right: e.isActive({ textAlign: 'right' }),
      link: e.isActive('link'),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });
  const chain = () => editor.chain().focus();

  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 px-2 py-1.5 bg-white border-b border-slate-200 rounded-t-xl">
      <ToolbarButton title="Đoạn văn" active={state.paragraph} onClick={() => chain().setParagraph().run()}>
        Đoạn
      </ToolbarButton>
      <ToolbarButton title="Tiêu đề lớn (H2)" active={state.h2} onClick={() => chain().toggleHeading({ level: 2 }).run()}>
        H2
      </ToolbarButton>
      <ToolbarButton title="Tiêu đề nhỏ (H3)" active={state.h3} onClick={() => chain().toggleHeading({ level: 3 }).run()}>
        H3
      </ToolbarButton>
      <Divider />
      <ToolbarButton title="In đậm" active={state.bold} onClick={() => chain().toggleBold().run()}>
        <Bold className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton title="In nghiêng" active={state.italic} onClick={() => chain().toggleItalic().run()}>
        <Italic className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton title="Gạch chân" active={state.underline} onClick={() => chain().toggleUnderline().run()}>
        <UnderlineIcon className="w-4 h-4" />
      </ToolbarButton>
      <Divider />
      <ToolbarButton title="Danh sách chấm tròn" active={state.bullet} onClick={() => chain().toggleBulletList().run()}>
        <List className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton title="Danh sách đánh số" active={state.ordered} onClick={() => chain().toggleOrderedList().run()}>
        <ListOrdered className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton title="Trích dẫn" active={state.quote} onClick={() => chain().toggleBlockquote().run()}>
        <Quote className="w-4 h-4" />
      </ToolbarButton>
      <Divider />
      <ToolbarButton title="Căn trái" active={state.left} onClick={() => chain().setTextAlign('left').run()}>
        <AlignLeft className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton title="Căn giữa" active={state.center} onClick={() => chain().setTextAlign('center').run()}>
        <AlignCenter className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton title="Căn phải" active={state.right} onClick={() => chain().setTextAlign('right').run()}>
        <AlignRight className="w-4 h-4" />
      </ToolbarButton>
      <Divider />
      <ToolbarButton title="Chèn liên kết" active={state.link} onClick={() => promptForLink(editor)}>
        <LinkIcon className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton title="Chèn ảnh (chọn nhiều ảnh cùng lúc)" onClick={onInsertImage}>
        <ImageIcon className="w-4 h-4" />
      </ToolbarButton>
      <Divider />
      <ToolbarButton title="Hoàn tác" disabled={!state.canUndo} onClick={() => chain().undo().run()}>
        <Undo2 className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton title="Làm lại" disabled={!state.canRedo} onClick={() => chain().redo().run()}>
        <Redo2 className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton title="Xóa định dạng" onClick={() => chain().unsetAllMarks().clearNodes().run()}>
        <RemoveFormatting className="w-4 h-4" />
      </ToolbarButton>
    </div>
  );
}

export default function RichTextEditor({
  value,
  onChange,
  category = 'news',
  placeholder = 'Nhập nội dung. Dùng thanh công cụ để định dạng, chèn ảnh hoặc dán ảnh trực tiếp vào đây...',
}: RichTextEditorProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const lastEmitted = useRef(value);
  const onChangeRef = useRef(onChange);
  const insertFilesRef = useRef<(files: File[]) => void>(() => undefined);
  const editorRef = useRef<Editor | null>(null);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] }, link: false, underline: false }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: false,
        HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' },
      }),
      Image,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder }),
    ],
    content: toEditorHtml(value),
    editorProps: {
      attributes: {
        class: 'rich-content min-h-[320px] px-4 py-3 text-sm focus:outline-none',
      },
      handlePaste: (_view, event) => {
        const files = Array.from(event.clipboardData?.files ?? []).filter((f) => f.type.startsWith('image/'));
        if (files.length === 0) return false;
        insertFilesRef.current(files);
        return true;
      },
      handleDrop: (_view, event) => {
        const files = Array.from(event.dataTransfer?.files ?? []).filter((f) => f.type.startsWith('image/'));
        if (files.length === 0) return false;
        event.preventDefault();
        insertFilesRef.current(files);
        return true;
      },
    },
    onCreate: ({ editor: created }) => {
      editorRef.current = created;
    },
    onUpdate: ({ editor: updated }) => {
      const html = updated.isEmpty ? '' : updated.getHTML();
      lastEmitted.current = html;
      onChangeRef.current(html);
    },
  });

  useEffect(() => {
    insertFilesRef.current = async (files: File[]) => {
      setStatus(`Đang tải 0/${files.length}`);
      const batch = await mediaService.uploadFiles(files, category, (done, total) =>
        setStatus(`Đang tải ${done}/${total}`),
      );
      editorRef.current
        ?.chain()
        .focus()
        .insertContent(batch.uploaded.map((item) => ({ type: 'image', attrs: { src: item.url, alt: '' } })))
        .run();
      setStatus(
        batch.failed.length > 0
          ? `Không tải được ${batch.failed.length} ảnh: ${batch.failed.map((f) => `${f.name} (${f.reason})`).join('; ')}`
          : null,
      );
    };
  }, [category]);

  // Sync when the parent swaps the value (e.g. a different article is opened).
  useEffect(() => {
    if (editor && value !== lastEmitted.current) {
      lastEmitted.current = value;
      editor.commands.setContent(toEditorHtml(value), { emitUpdate: false });
    }
  }, [editor, value]);

  const insertPickedImages = (urls: string[]) => {
    editor
      ?.chain()
      .focus()
      .insertContent(urls.map((src) => ({ type: 'image', attrs: { src, alt: '' } })))
      .run();
  };

  if (!editor) return null;

  return (
    <div className="rounded-xl border border-slate-300 bg-white focus-within:ring-2 focus-within:ring-gold-500/40">
      <Toolbar editor={editor} onInsertImage={() => setIsPickerOpen(true)} />
      <EditorContent editor={editor} />
      {status && (
        <p className="px-4 py-2 text-[11px] text-slate-500 border-t border-slate-100" role="status">
          {status}
        </p>
      )}
      <ImagePickerModal
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        multiple
        onSelect={insertPickedImages}
        title="Chọn ảnh để chèn vào bài viết (có thể chọn nhiều ảnh)"
        defaultCategory={category}
      />
    </div>
  );
}
