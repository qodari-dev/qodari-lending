'use client';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import TextAlign from '@tiptap/extension-text-align';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  CodeXml,
  Eye,
  Heading1,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Undo2,
  Redo2,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { HTML_PREVIEW_CLASSES } from './html-preview-styles';

type BillingHtmlEditorProps = {
  value: string;
  onChange(value: string): void;
  variables: readonly string[];
  invalid?: boolean;
};

type EditorMode = 'VISUAL' | 'HTML';

const EMPTY_HTML = '<p></p>';

function normalizeHtml(value: string) {
  return value.trim() ? value : EMPTY_HTML;
}

function variableToken(variable: string) {
  return `{{${variable}}}`;
}

export function BillingHtmlEditor({ value, onChange, variables, invalid }: BillingHtmlEditorProps) {
  const [mode, setMode] = useState<EditorMode>('VISUAL');
  const htmlTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const normalizedValue = normalizeHtml(value);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content: normalizedValue,
    editorProps: {
      attributes: {
        class: `min-h-[300px] rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none ${HTML_PREVIEW_CLASSES}`,
      },
    },
    onUpdate: ({ editor: instance }) => {
      onChange(instance.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (current === normalizedValue) return;
    editor.commands.setContent(normalizedValue, { emitUpdate: false });
  }, [editor, normalizedValue]);

  const insertToken = useCallback(
    (token: string) => {
      if (mode === 'VISUAL' && editor) {
        editor.chain().focus().insertContent(token).run();
        return;
      }

      const textarea = htmlTextareaRef.current;
      const current = value ?? '';
      if (!textarea) {
        onChange(`${current}${token}`);
        return;
      }

      const start = textarea.selectionStart ?? current.length;
      const end = textarea.selectionEnd ?? current.length;
      const next = current.slice(0, start) + token + current.slice(end);
      onChange(next);

      requestAnimationFrame(() => {
        textarea.focus();
        const position = start + token.length;
        textarea.setSelectionRange(position, position);
      });
    },
    [editor, mode, onChange, value]
  );

  const toolbarDisabled = !editor || mode !== 'VISUAL';

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        <Button
          type="button"
          size="sm"
          variant={mode === 'VISUAL' ? 'default' : 'outline'}
          className="h-8"
          onClick={() => setMode('VISUAL')}
        >
          <Eye className="mr-1 h-3.5 w-3.5" />
          Visual
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === 'HTML' ? 'default' : 'outline'}
          className="h-8"
          onClick={() => setMode('HTML')}
        >
          <CodeXml className="mr-1 h-3.5 w-3.5" />
          HTML
        </Button>
        <div className="bg-border mx-1 h-8 w-px" />
        <Button
          type="button"
          size="icon"
          variant="outline"
          className={cn('h-8 w-8', editor?.isActive('bold') && 'bg-accent')}
          onClick={() => editor?.chain().focus().toggleBold().run()}
          disabled={toolbarDisabled}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className={cn('h-8 w-8', editor?.isActive('italic') && 'bg-accent')}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          disabled={toolbarDisabled}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className={cn(
            'h-8 w-8',
            editor?.isActive('heading', { level: 1 }) && 'bg-accent'
          )}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
          disabled={toolbarDisabled}
        >
          <Heading1 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className={cn(
            'h-8 w-8',
            editor?.isActive('heading', { level: 2 }) && 'bg-accent'
          )}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          disabled={toolbarDisabled}
        >
          <Heading2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className={cn('h-8 w-8', editor?.isActive({ textAlign: 'left' }) && 'bg-accent')}
          onClick={() => editor?.chain().focus().setTextAlign('left').run()}
          disabled={toolbarDisabled}
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className={cn('h-8 w-8', editor?.isActive({ textAlign: 'center' }) && 'bg-accent')}
          onClick={() => editor?.chain().focus().setTextAlign('center').run()}
          disabled={toolbarDisabled}
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className={cn('h-8 w-8', editor?.isActive({ textAlign: 'right' }) && 'bg-accent')}
          onClick={() => editor?.chain().focus().setTextAlign('right').run()}
          disabled={toolbarDisabled}
        >
          <AlignRight className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className={cn('h-8 w-8', editor?.isActive('bulletList') && 'bg-accent')}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          disabled={toolbarDisabled}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className={cn('h-8 w-8', editor?.isActive('orderedList') && 'bg-accent')}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          disabled={toolbarDisabled}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-8 w-8"
          onClick={() => editor?.chain().focus().undo().run()}
          disabled={toolbarDisabled || !editor?.can().chain().focus().undo().run()}
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-8 w-8"
          onClick={() => editor?.chain().focus().redo().run()}
          disabled={toolbarDisabled || !editor?.can().chain().focus().redo().run()}
        >
          <Redo2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-wrap gap-1">
        {variables.map((variable) => (
          <Button
            key={`editor-variable-${variable}`}
            type="button"
            variant="outline"
            size="sm"
            className="h-7 font-mono text-xs"
            onClick={() => insertToken(variableToken(variable))}
          >
            {variableToken(variable)}
          </Button>
        ))}
      </div>

      {mode === 'VISUAL' ? (
        <div
          className={cn(
            'rounded-md',
            invalid && 'ring-destructive ring-1 ring-offset-1 ring-offset-background'
          )}
        >
          <EditorContent editor={editor} />
        </div>
      ) : (
        <Textarea
          ref={htmlTextareaRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={12}
          aria-invalid={invalid}
          className="font-mono text-xs"
        />
      )}
    </div>
  );
}
