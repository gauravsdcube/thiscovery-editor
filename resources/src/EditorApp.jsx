import { useCallback, useEffect, useState } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListNode, ListItemNode } from '@lexical/list';
import { LinkNode, AutoLinkNode } from '@lexical/link';
import { CalloutNode } from './nodes/CalloutNode.jsx';
import { AccordionNode } from './nodes/AccordionNode.jsx';
import { SurveyNode } from './nodes/SurveyNode.jsx';
import { ButtonNode } from './nodes/ButtonNode.jsx';
import { RawHtmlNode } from './nodes/RawHtmlNode.jsx';
import Toolbar from './Toolbar.jsx';
import HtmlImportPlugin from './plugins/HtmlImportPlugin.jsx';
import SavePlugin, { writeHtml } from './plugins/SavePlugin.jsx';
import { FormsContext } from './FormsContext.js';
import { editorToHtml, htmlToEditor } from './html.js';

const theme = {
  paragraph: 'te-p',
  quote: 'te-quote',
  heading: { h1: 'te-h1', h2: 'te-h2', h3: 'te-h3' },
  list: { ul: 'te-ul', ol: 'te-ol', listitem: 'te-li', nested: { listitem: 'te-li' } },
  link: 'te-link',
  text: { bold: 'te-bold', italic: 'te-italic', underline: 'te-underline' },
};

function onError(error) {
  console.error('Thiscovery Editor', error);
}

function EditorHandle({ editorRef }) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    if (editorRef) {
      editorRef.current = editor;
    }
    return () => {
      if (editorRef && editorRef.current === editor) {
        editorRef.current = null;
      }
    };
  }, [editor, editorRef]);
  return null;
}

export default function EditorApp({ textarea, height, profile, html, forms, editorRef, saveRef }) {
  const [htmlMode, setHtmlMode] = useState(false);
  const [source, setSource] = useState(html || '');

  const initialConfig = {
    namespace: 'ThiscoveryEditor',
    theme,
    onError,
    nodes: [
      HeadingNode,
      QuoteNode,
      ListNode,
      ListItemNode,
      LinkNode,
      AutoLinkNode,
      CalloutNode,
      AccordionNode,
      SurveyNode,
      ButtonNode,
      RawHtmlNode,
    ],
  };

  const onSourceChange = (value) => {
    setSource(value);
    textarea.value = value;
  };

  return (
    <FormsContext.Provider value={forms || {}}>
      <LexicalComposer initialConfig={initialConfig}>
        <div className={'te-shell' + (htmlMode ? ' is-html' : '')} style={{ minHeight: height }}>
          <HtmlToolbar
            profile={profile}
            textarea={textarea}
            htmlMode={htmlMode}
            setHtmlMode={setHtmlMode}
            source={source}
            setSource={setSource}
            saveRef={saveRef}
          />
          <div className="te-scroller" hidden={htmlMode}>
            <RichTextPlugin
              contentEditable={
                <ContentEditable className="te-content" style={{ minHeight: Math.max(120, height - 48) }} />
              }
              placeholder={<div className="te-placeholder">{textarea.getAttribute('placeholder') || ''}</div>}
              ErrorBoundary={LexicalErrorBoundary}
            />
          </div>
          {htmlMode && (
            <textarea
              className="te-html-source"
              value={source}
              onChange={(e) => onSourceChange(e.target.value)}
              spellCheck={false}
              aria-label="HTML source"
              style={{ minHeight: Math.max(160, height - 48) }}
            />
          )}
          <HistoryPlugin />
          <ListPlugin />
          <LinkPlugin />
          <HtmlImportPlugin html={html} />
          <SavePlugin textarea={textarea} htmlMode={htmlMode} />
          <EditorHandle editorRef={editorRef} />
        </div>
      </LexicalComposer>
    </FormsContext.Provider>
  );
}

function HtmlToolbar({ profile, textarea, htmlMode, setHtmlMode, source, setSource, saveRef }) {
  const [editor] = useLexicalComposerContext();

  const persist = useCallback(() => {
    if (htmlMode) {
      textarea.value = source;
      return;
    }
    writeHtml(editor, textarea);
  }, [editor, textarea, htmlMode, source]);

  useEffect(() => {
    if (saveRef) {
      saveRef.current = persist;
    }
    return () => {
      if (saveRef && saveRef.current === persist) {
        saveRef.current = null;
      }
    };
  }, [saveRef, persist]);

  const toggleHtml = useCallback(() => {
    if (htmlMode) {
      htmlToEditor(editor, source);
      textarea.value = source;
      setHtmlMode(false);
      return;
    }
    const next = editorToHtml(editor);
    setSource(next);
    textarea.value = next;
    setHtmlMode(true);
  }, [editor, htmlMode, source, textarea, setHtmlMode, setSource]);

  return <Toolbar profile={profile} htmlMode={htmlMode} onToggleHtml={toggleHtml} />;
}

export { writeHtml };
