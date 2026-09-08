import { useCallback, useEffect, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getSelection, $isRangeSelection } from 'lexical';
import { $isLinkNode, $toggleLink } from '@lexical/link';
import { $findMatchingParent } from '@lexical/utils';
import { useEditorUi } from '../EditorUi.jsx';
import { $linkPayloadFromSelection } from './InsertDialogs.jsx';

export default function FloatingLinkEditor({ htmlMode }) {
  const [editor] = useLexicalComposerContext();
  const { open, dialog } = useEditorUi();
  const [link, setLink] = useState(null);

  const update = useCallback(() => {
    editor.getEditorState().read(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
        setLink(null);
        return;
      }
      const node = $findMatchingParent(selection.anchor.getNode(), $isLinkNode);
      if (!$isLinkNode(node)) {
        setLink(null);
        return;
      }
      const dom = editor.getElementByKey(node.getKey());
      const scroller = editor.getRootElement() && editor.getRootElement().closest('.te-scroller');
      if (!dom || !scroller) {
        setLink({ url: node.getURL(), top: 8, left: 8 });
        return;
      }
      const linkBox = dom.getBoundingClientRect();
      const hostBox = scroller.getBoundingClientRect();
      setLink({
        url: node.getURL(),
        target: node.getTarget(),
        top: Math.max(4, linkBox.bottom - hostBox.top + scroller.scrollTop + 6),
        left: Math.max(4, linkBox.left - hostBox.left + scroller.scrollLeft),
      });
    });
  }, [editor]);

  useEffect(() => {
    return editor.registerUpdateListener(() => {
      update();
    });
  }, [editor, update]);

  if (htmlMode || dialog || !link) {
    return null;
  }

  return (
    <div className="te-link-float" style={{ top: link.top, left: link.left }}>
      <a href={link.url} target="_blank" rel="noopener noreferrer">
        {link.url}
      </a>
      <button
        type="button"
        className="te-tb te-tb--wide"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          editor.getEditorState().read(() => {
            open('link', $linkPayloadFromSelection());
          });
        }}
      >
        Edit
      </button>
      <button
        type="button"
        className="te-tb te-tb--wide"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          editor.update(() => {
            $toggleLink(null);
          });
        }}
      >
        Unlink
      </button>
    </div>
  );
}
