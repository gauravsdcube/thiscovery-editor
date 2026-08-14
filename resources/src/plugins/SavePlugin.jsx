import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { editorToHtml } from '../html.js';

export function writeHtml(editor, textarea) {
  if (!textarea || !editor) {
    return;
  }
  textarea.value = editorToHtml(editor);
}

export default function SavePlugin({ textarea, htmlMode }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (htmlMode) {
      return undefined;
    }
    return editor.registerUpdateListener(() => {
      writeHtml(editor, textarea);
    });
  }, [editor, textarea, htmlMode]);

  return null;
}
