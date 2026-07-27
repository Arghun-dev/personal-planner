"use client";

import { useEffect, useRef } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import "@blocknote/shadcn/style.css";
import type { NoteContent } from "@/lib/types";
import { uploadNoteImage } from "@/lib/actions";

interface Props {
  initialContent?: NoteContent;
  editable?: boolean;
  /** Fired (debounced by the caller if desired) whenever the document changes. */
  onChange: (content: NoteContent, plainText: string) => void;
}

async function handleUpload(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const result = await uploadNoteImage(formData);
  if ("error" in result) {
    throw new Error(result.error);
  }
  return result.url;
}

/**
 * Notion-like block editor for a single Knowledge Note. Client-only —
 * must be rendered through a `next/dynamic(..., { ssr: false })` wrapper
 * since BlockNote/ProseMirror needs the DOM.
 */
export function NoteEditor({ initialContent, editable = true, onChange }: Props) {
  // Only used for the very first render — BlockNote owns document state
  // after that, so this intentionally isn't reactive to prop changes.
  const initial = useRef(initialContent);

  const editor = useCreateBlockNote({
    initialContent:
      initial.current && initial.current.length > 0
        ? (initial.current as never)
        : undefined,
    uploadFile: handleUpload,
  });

  useEffect(() => {
    return editor.onChange(() => {
      const content = editor.document as unknown as NoteContent;
      const plainText = editor.blocksToMarkdownLossy(editor.document);
      onChange(content, plainText);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  return (
    <div className="knowledge-editor">
      <BlockNoteView editor={editor} editable={editable} />
    </div>
  );
}
