import { useCallback, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Undo,
  Redo,
  Image as ImageIcon,
  Paperclip,
} from "lucide-react";
import type { NoteAttachment } from "@/types/xcamp";

export const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024; // 2 MB inline cap

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  onAddAttachment: (att: NoteAttachment) => void;
}

export function RichTextEditor({ content, onChange, onAddAttachment }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] }, link: false }),
      Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener noreferrer" } }),
      Image,
      Placeholder.configure({ placeholder: "Write your note… drag & drop files anywhere." }),
    ],
    content: content || "",
    editorProps: {
      attributes: { class: "x-tiptap" },
      handleDrop: (_view, event) => {
        const files = Array.from(event.dataTransfer?.files ?? []);
        if (files.length) {
          event.preventDefault();
          files.forEach((f) => handleFile(f));
          return true;
        }
        return false;
      },
      handlePaste: (_view, event) => {
        const files = Array.from(event.clipboardData?.files ?? []);
        if (files.length) {
          files.forEach((f) => handleFile(f));
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  // Keep editor in sync when switching between notes.
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || "", { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, editor]);

  const handleFile = useCallback(
    async (file: File) => {
      if (file.size > MAX_ATTACHMENT_BYTES) {
        // eslint-disable-next-line no-alert
        alert(`"${file.name}" is larger than 2 MB and can't be attached inline.`);
        return;
      }
      const dataUrl = await fileToDataUrl(file);
      if (file.type.startsWith("image/")) {
        editor?.chain().focus().setImage({ src: dataUrl, alt: file.name }).run();
      }
      onAddAttachment({
        id: crypto.randomUUID(),
        name: file.name,
        mime: file.type || "application/octet-stream",
        size: file.size,
        dataUrl,
      });
    },
    [editor, onAddAttachment],
  );

  const pickFiles = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.onchange = () => {
      Array.from(input.files ?? []).forEach((f) => handleFile(f));
    };
    input.click();
  }, [handleFile]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const previous = editor.getAttributes("link").href as string | undefined;
    // eslint-disable-next-line no-alert
    const url = window.prompt("Link URL", previous ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  if (!editor) return null;

  const Btn = ({
    onClick,
    active,
    title,
    children,
  }: {
    onClick: () => void;
    active?: boolean;
    title: string;
    children: React.ReactNode;
  }) => (
    <button type="button" className="x-tt-btn" data-active={!!active} title={title} onClick={onClick}>
      {children}
    </button>
  );

  return (
    <div className="x-tt-wrap">
      <div className="x-tt-toolbar">
        <Btn title="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold size={16} />
        </Btn>
        <Btn title="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic size={16} />
        </Btn>
        <Btn title="Strikethrough" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <Strikethrough size={16} />
        </Btn>
        <span className="x-tt-sep" />
        <Btn title="Heading 1" active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
          <Heading1 size={16} />
        </Btn>
        <Btn title="Heading 2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 size={16} />
        </Btn>
        <Btn title="Heading 3" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
          <Heading3 size={16} />
        </Btn>
        <span className="x-tt-sep" />
        <Btn title="Bullet list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List size={16} />
        </Btn>
        <Btn title="Numbered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered size={16} />
        </Btn>
        <Btn title="Quote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          <Quote size={16} />
        </Btn>
        <Btn title="Code block" active={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
          <Code size={16} />
        </Btn>
        <span className="x-tt-sep" />
        <Btn title="Insert link" active={editor.isActive("link")} onClick={setLink}>
          <LinkIcon size={16} />
        </Btn>
        <Btn title="Insert image" onClick={pickFiles}>
          <ImageIcon size={16} />
        </Btn>
        <Btn title="Attach file" onClick={pickFiles}>
          <Paperclip size={16} />
        </Btn>
        <span className="x-tt-sep" />
        <Btn title="Undo" onClick={() => editor.chain().focus().undo().run()}>
          <Undo size={16} />
        </Btn>
        <Btn title="Redo" onClick={() => editor.chain().focus().redo().run()}>
          <Redo size={16} />
        </Btn>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
