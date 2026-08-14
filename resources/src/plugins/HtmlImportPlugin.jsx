import { useEffect, useRef } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { htmlToEditor } from '../html.js';

export default function HtmlImportPlugin({ html }) {
  const [editor] = useLexicalComposerContext();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) {
      return;
    }
    done.current = true;
    const source = (html || '').trim();
    if (!source) {
      return;
    }
    htmlToEditor(editor, source);
  }, [editor, html]);

  return null;
}
