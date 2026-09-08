import { useCallback, useEffect, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getSelection, $isRangeSelection, COMMAND_PRIORITY_CRITICAL, FORMAT_TEXT_COMMAND, SELECTION_CHANGE_COMMAND } from 'lexical';
import { $isCodeNode } from '@lexical/code';
import { $isLinkNode } from '@lexical/link';
import { $findMatchingParent, mergeRegister } from '@lexical/utils';
import { useEditorUi } from '../EditorUi.jsx';
import { $captureRange } from '../rangeSelection.js';
import { $linkPayloadFromSelection } from './InsertDialogs.jsx';
import { ToolbarButton, icons } from '../Toolbar.jsx';

export default function FloatingFormatBar({ htmlMode }) {
  const [editor] = useLexicalComposerContext();
  const { open, dialog } = useEditorUi();
  const [bar, setBar] = useState(null);
  const [isPointerDown, setIsPointerDown] = useState(false);

  const update = useCallback(() => {
    editor.getEditorState().read(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection) || selection.isCollapsed()) {
        setBar(null);
        return;
      }
      const anchor = selection.anchor.getNode();
      if ($findMatchingParent(anchor, $isCodeNode)) {
        setBar(null);
        return;
      }
      const native = window.getSelection();
      if (!native || native.rangeCount === 0 || native.isCollapsed) {
        setBar(null);
        return;
      }
      const box = native.getRangeAt(0).getBoundingClientRect();
      const scroller = editor.getRootElement() && editor.getRootElement().closest('.te-scroller');
      if (!scroller || box.width < 1) {
        setBar(null);
        return;
      }
      const host = scroller.getBoundingClientRect();
      setBar({
        top: Math.max(4, box.top - host.top + scroller.scrollTop - 40),
        left: Math.max(4, box.left - host.left + scroller.scrollLeft + box.width / 2),
        bold: selection.hasFormat('bold'),
        italic: selection.hasFormat('italic'),
        underline: selection.hasFormat('underline'),
        strike: selection.hasFormat('strikethrough'),
        code: selection.hasFormat('code'),
        link: !!$findMatchingParent(anchor, $isLinkNode),
      });
    });
  }, [editor]);

  useEffect(() => {
    const onDown = (event) => {
      if (event.target && event.target.closest && event.target.closest('.te-format-float')) {
        return;
      }
      setIsPointerDown(true);
    };
    const onUp = () => {
      setIsPointerDown(false);
      window.setTimeout(update, 20);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('selectionchange', update);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('selectionchange', update);
    };
  }, [update]);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(() => {
        update();
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          update();
          return false;
        },
        COMMAND_PRIORITY_CRITICAL
      )
    );
  }, [editor, update]);

  if (htmlMode || dialog || isPointerDown || !bar) {
    return null;
  }

  return (
    <div
      className="te-format-float"
      style={{ top: bar.top, left: bar.left }}
      onMouseDown={(event) => event.preventDefault()}
    >
      <ToolbarButton
        title="Bold"
        active={bar.bold}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')}
      >
        {icons.bold}
      </ToolbarButton>
      <ToolbarButton
        title="Italic"
        active={bar.italic}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')}
      >
        {icons.italic}
      </ToolbarButton>
      <ToolbarButton
        title="Underline"
        active={bar.underline}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline')}
      >
        {icons.underline}
      </ToolbarButton>
      <ToolbarButton
        title="Strikethrough"
        active={bar.strike}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough')}
      >
        {icons.strike}
      </ToolbarButton>
      <ToolbarButton
        title="Inline code"
        active={bar.code}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'code')}
      >
        {icons.code}
      </ToolbarButton>
      <ToolbarButton
        title="Link"
        active={bar.link}
        onClick={() => {
          editor.getEditorState().read(() => {
            $captureRange();
            open('link', $linkPayloadFromSelection());
          });
        }}
      >
        {icons.link}
      </ToolbarButton>
    </div>
  );
}
