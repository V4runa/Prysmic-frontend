"use client";

import { useEffect, useMemo } from "react";
import {
  useEditor,
  EditorContent,
  useEditorState,
  type Editor,
} from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
import { motion } from "framer-motion";
import clsx from "clsx";
import {
  Bold,
  Italic,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListChecks,
  Quote,
  Link2,
  Undo2,
  Redo2,
} from "lucide-react";
import { tactile } from "../lib/motion";
import { normalizeNoteHtml } from "../lib/noteContent";

interface RichTextEditorProps {
  content: string;
  editable?: boolean;
  onChange?: (html: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}

export default function RichTextEditor({
  content,
  editable = false,
  onChange,
  placeholder = "Start writing…",
  autoFocus = false,
  className,
}: RichTextEditorProps) {
  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: {
          openOnClick: false,
          autolink: true,
          HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
        },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder }),
    ],
    [placeholder]
  );

  const editor = useEditor({
    editable,
    content: normalizeNoteHtml(content),
    extensions,
    immediatelyRender: false,
    autofocus: autoFocus ? "end" : false,
    editorProps: {
      attributes: {
        class: clsx(
          "focus:outline-none",
          editable && "min-h-[16rem] sm:min-h-[20rem]"
        ),
      },
    },
    onUpdate: ({ editor }) => onChange?.(editor.getHTML()),
  });

  useEffect(() => {
    if (editor) editor.setEditable(editable);
  }, [editable, editor]);

  // Sync external content changes (note loaded, edit cancelled) without
  // clobbering the caret while the user is typing.
  useEffect(() => {
    if (!editor) return;
    const incoming = normalizeNoteHtml(content);
    if (incoming !== editor.getHTML()) {
      editor.commands.setContent(incoming, { emitUpdate: false });
    }
  }, [content, editor]);

  if (!editor) {
    return (
      <div
        className={clsx(
          "note-prose animate-pulse rounded-lg text-slate-500",
          className
        )}
      >
        {editable ? "" : normalizeNoteHtml(content).replace(/<[^>]+>/g, " ")}
      </div>
    );
  }

  return (
    <div className={clsx("note-prose flex flex-col", className)}>
      {editable && <Toolbar editor={editor} />}
      {editable && (
        <BubbleMenu
          editor={editor}
          className="flex items-center gap-0.5 rounded-lg border border-white/10 bg-[#14171c]/95 p-1 shadow-xl backdrop-blur-md"
        >
          <BubbleButtons editor={editor} />
        </BubbleMenu>
      )}
      <EditorContent editor={editor} className={clsx(editable && "pt-3")} />
    </div>
  );
}

function setLink(editor: Editor) {
  const previous = editor.getAttributes("link").href as string | undefined;
  const url = window.prompt("Link URL", previous ?? "https://");
  if (url === null) return;
  if (url.trim() === "") {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    return;
  }
  editor
    .chain()
    .focus()
    .extendMarkRange("link")
    .setLink({ href: url.trim() })
    .run();
}

interface TBProps {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}

function TB({ onClick, active, disabled, title, children }: TBProps) {
  return (
    <motion.button
      {...tactile}
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      // Keep the editor selection intact when a control is pressed.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={clsx(
        "tap-target flex h-8 w-8 items-center justify-center rounded-md transition-colors",
        active
          ? "text-cyan-300 bg-cyan-400/10"
          : "text-slate-400 hover:text-slate-100 hover:bg-white/5",
        disabled && "cursor-not-allowed opacity-30 hover:bg-transparent"
      )}
    >
      {children}
    </motion.button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const s = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor.isActive("bold"),
      italic: editor.isActive("italic"),
      code: editor.isActive("code"),
      h1: editor.isActive("heading", { level: 1 }),
      h2: editor.isActive("heading", { level: 2 }),
      h3: editor.isActive("heading", { level: 3 }),
      bullet: editor.isActive("bulletList"),
      ordered: editor.isActive("orderedList"),
      task: editor.isActive("taskList"),
      quote: editor.isActive("blockquote"),
      link: editor.isActive("link"),
      canUndo: editor.can().undo(),
      canRedo: editor.can().redo(),
    }),
  });

  const c = () => editor.chain().focus();

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-white/5 pb-1.5">
      <TB title="Undo" disabled={!s.canUndo} onClick={() => c().undo().run()}>
        <Undo2 className="h-4 w-4" />
      </TB>
      <TB title="Redo" disabled={!s.canRedo} onClick={() => c().redo().run()}>
        <Redo2 className="h-4 w-4" />
      </TB>
      <Divider />
      <TB title="Heading 1" active={s.h1} onClick={() => c().toggleHeading({ level: 1 }).run()}>
        <Heading1 className="h-4 w-4" />
      </TB>
      <TB title="Heading 2" active={s.h2} onClick={() => c().toggleHeading({ level: 2 }).run()}>
        <Heading2 className="h-4 w-4" />
      </TB>
      <TB title="Heading 3" active={s.h3} onClick={() => c().toggleHeading({ level: 3 }).run()}>
        <Heading3 className="h-4 w-4" />
      </TB>
      <Divider />
      <TB title="Bold" active={s.bold} onClick={() => c().toggleBold().run()}>
        <Bold className="h-4 w-4" />
      </TB>
      <TB title="Italic" active={s.italic} onClick={() => c().toggleItalic().run()}>
        <Italic className="h-4 w-4" />
      </TB>
      <TB title="Inline code" active={s.code} onClick={() => c().toggleCode().run()}>
        <Code className="h-4 w-4" />
      </TB>
      <Divider />
      <TB title="Bullet list" active={s.bullet} onClick={() => c().toggleBulletList().run()}>
        <List className="h-4 w-4" />
      </TB>
      <TB title="Numbered list" active={s.ordered} onClick={() => c().toggleOrderedList().run()}>
        <ListOrdered className="h-4 w-4" />
      </TB>
      <TB title="Checklist" active={s.task} onClick={() => c().toggleTaskList().run()}>
        <ListChecks className="h-4 w-4" />
      </TB>
      <TB title="Quote" active={s.quote} onClick={() => c().toggleBlockquote().run()}>
        <Quote className="h-4 w-4" />
      </TB>
      <Divider />
      <TB title="Link" active={s.link} onClick={() => setLink(editor)}>
        <Link2 className="h-4 w-4" />
      </TB>
    </div>
  );
}

function BubbleButtons({ editor }: { editor: Editor }) {
  const s = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor.isActive("bold"),
      italic: editor.isActive("italic"),
      code: editor.isActive("code"),
      link: editor.isActive("link"),
    }),
  });
  const c = () => editor.chain().focus();
  return (
    <>
      <TB title="Bold" active={s.bold} onClick={() => c().toggleBold().run()}>
        <Bold className="h-4 w-4" />
      </TB>
      <TB title="Italic" active={s.italic} onClick={() => c().toggleItalic().run()}>
        <Italic className="h-4 w-4" />
      </TB>
      <TB title="Inline code" active={s.code} onClick={() => c().toggleCode().run()}>
        <Code className="h-4 w-4" />
      </TB>
      <TB title="Link" active={s.link} onClick={() => setLink(editor)}>
        <Link2 className="h-4 w-4" />
      </TB>
    </>
  );
}

function Divider() {
  return <span className="mx-1 h-4 w-px shrink-0 bg-white/10" />;
}
