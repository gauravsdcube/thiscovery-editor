import { useCallback, useEffect, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  REDO_COMMAND,
  UNDO_COMMAND,
  $createParagraphNode,
} from 'lexical';
import { $setBlocksType } from '@lexical/selection';
import { $createHeadingNode, $createQuoteNode, $isHeadingNode } from '@lexical/rich-text';
import { INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND } from '@lexical/list';
import { TOGGLE_LINK_COMMAND } from '@lexical/link';
import { $createCalloutNode } from './nodes/CalloutNode.jsx';
import { $createAccordionNode } from './nodes/AccordionNode.jsx';
import { $createSurveyNode } from './nodes/SurveyNode.jsx';
import { $createButtonNode } from './nodes/ButtonNode.jsx';
import { $insertNodes } from 'lexical';

export default function Toolbar({ profile, htmlMode, onToggleHtml }) {
  const [editor] = useLexicalComposerContext();
  const [block, setBlock] = useState('paragraph');
  const showBlocks = profile === 'page';

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return;
        }
        const anchor = selection.anchor.getNode();
        const element = anchor.getTopLevelElementOrThrow();
        if ($isHeadingNode(element)) {
          setBlock(element.getTag());
        } else {
          setBlock(element.getType() === 'quote' ? 'quote' : 'paragraph');
        }
      });
    });
  }, [editor]);

  const setHeading = useCallback((tag) => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        if (tag === 'paragraph') {
          $setBlocksType(selection, () => $createParagraphNode());
        } else if (tag === 'quote') {
          $setBlocksType(selection, () => $createQuoteNode());
        } else {
          $setBlocksType(selection, () => $createHeadingNode(tag));
        }
      }
    });
  }, [editor]);

  const insertLink = useCallback(() => {
    const url = window.prompt('Link URL');
    if (url === null) {
      return;
    }
    editor.dispatchCommand(TOGGLE_LINK_COMMAND, url.trim() ? { url: url.trim(), target: '_blank' } : null);
  }, [editor]);

  const insertCallout = useCallback(() => {
    editor.update(() => {
      $insertNodes([$createCalloutNode('info', '', '')]);
    });
  }, [editor]);

  const insertAccordion = useCallback(() => {
    editor.update(() => {
      $insertNodes([$createAccordionNode([{ heading: '', body: '' }])]);
    });
  }, [editor]);

  const insertSurvey = useCallback(() => {
    editor.update(() => {
      $insertNodes([$createSurveyNode('', 'Take the survey', '')]);
    });
  }, [editor]);

  const insertButton = useCallback(() => {
    editor.update(() => {
      $insertNodes([$createButtonNode('Find out more', '', 'primary', false)]);
    });
  }, [editor]);

  return (
    <div className="te-toolbar" role="toolbar">
      <button type="button" onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)} title="Undo" disabled={htmlMode}>Undo</button>
      <button type="button" onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)} title="Redo" disabled={htmlMode}>Redo</button>
      <span className="te-toolbar__sep" />
      <select value={block} onChange={(e) => setHeading(e.target.value)} aria-label="Block type" disabled={htmlMode}>
        <option value="paragraph">Paragraph</option>
        <option value="h1">Heading 1</option>
        <option value="h2">Heading 2</option>
        <option value="h3">Heading 3</option>
        <option value="quote">Quote</option>
      </select>
      <button type="button" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')} title="Bold" disabled={htmlMode}><b>B</b></button>
      <button type="button" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')} title="Italic" disabled={htmlMode}><i>I</i></button>
      <button type="button" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline')} title="Underline" disabled={htmlMode}><u>U</u></button>
      <button type="button" onClick={() => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)} title="Bullet list" disabled={htmlMode}>• List</button>
      <button type="button" onClick={() => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)} title="Numbered list" disabled={htmlMode}>1. List</button>
      <button type="button" onClick={insertLink} title="Link" disabled={htmlMode}>Link</button>
      <button type="button" onClick={insertButton} title="Insert button" disabled={htmlMode}>Button</button>
      {showBlocks && (
        <>
          <span className="te-toolbar__sep" />
          <button type="button" onClick={insertCallout} disabled={htmlMode}>Callout</button>
          <button type="button" onClick={insertAccordion} disabled={htmlMode}>Accordion</button>
          <button type="button" onClick={insertSurvey} disabled={htmlMode}>Survey</button>
        </>
      )}
      <span className="te-toolbar__sep" />
      <button
        type="button"
        className={htmlMode ? 'is-active' : ''}
        onClick={onToggleHtml}
        title="Edit HTML source"
      >
        HTML
      </button>
    </div>
  );
}
