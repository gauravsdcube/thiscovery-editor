import { useCallback, useEffect, useState } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { CheckListPlugin } from '@lexical/react/LexicalCheckListPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import AutoLinkPlugin from './plugins/AutoLinkPlugin.jsx';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListNode, ListItemNode } from '@lexical/list';
import { LinkNode, AutoLinkNode } from '@lexical/link';
import { TabNode } from 'lexical';
import { TablePlugin } from '@lexical/react/LexicalTablePlugin';
import { TableCellNode, TableNode, TableRowNode } from '@lexical/table';
import { CodeHighlightNode, CodeNode } from '@lexical/code';
import { HorizontalRuleNode } from '@lexical/react/LexicalHorizontalRuleNode';
import { HorizontalRulePlugin } from '@lexical/react/LexicalHorizontalRulePlugin';
import { TabIndentationPlugin } from '@lexical/react/LexicalTabIndentationPlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { CalloutNode } from './nodes/CalloutNode.jsx';
import { AccordionNode } from './nodes/AccordionNode.jsx';
import { SurveyNode } from './nodes/SurveyNode.jsx';
import { ButtonNode } from './nodes/ButtonNode.jsx';
import { ImageNode } from './nodes/ImageNode.jsx';
import { RawHtmlNode } from './nodes/RawHtmlNode.jsx';
import Toolbar from './Toolbar.jsx';
import HtmlImportPlugin from './plugins/HtmlImportPlugin.jsx';
import SavePlugin, { writeHtml } from './plugins/SavePlugin.jsx';
import InsertDialogs from './plugins/InsertDialogs.jsx';
import FloatingLinkEditor from './plugins/FloatingLinkEditor.jsx';
import FloatingFormatBar from './plugins/FloatingFormatBar.jsx';
import CodeHighlightPlugin from './plugins/CodeHighlightPlugin.jsx';
import { FormsContext } from './FormsContext.js';
import { EditorUiProvider } from './EditorUi.jsx';
import { editorToHtml, htmlToEditor } from './html.js';

const theme = {
  paragraph: 'te-p',
  quote: 'te-quote',
  indent: 'te-indent',
  heading: { h1: 'te-h1', h2: 'te-h2', h3: 'te-h3', h4: 'te-h4', h5: 'te-h5', h6: 'te-h6' },
  list: {
    ul: 'te-ul',
    ol: 'te-ol',
    listitem: 'te-li',
    nested: { listitem: 'te-nested-li' },
    checklist: 'te-checklist',
    listitemChecked: 'te-li-checked',
    listitemUnchecked: 'te-li-unchecked',
  },
  link: 'te-link',
  text: {
    bold: 'te-bold',
    italic: 'te-italic',
    underline: 'te-underline',
    strikethrough: 'te-strike',
    underlineStrikethrough: 'te-underline-strike',
    subscript: 'te-sub',
    superscript: 'te-super',
    code: 'te-inline-code',
    highlight: 'te-highlight',
  },
  code: 'te-code',
  codeHighlight: {
    atrule: 'te-tok te-tok--attr',
    attr: 'te-tok te-tok--attr',
    boolean: 'te-tok te-tok--property',
    builtin: 'te-tok te-tok--selector',
    cdata: 'te-tok te-tok--comment',
    char: 'te-tok te-tok--selector',
    class: 'te-tok te-tok--function',
    'class-name': 'te-tok te-tok--function',
    comment: 'te-tok te-tok--comment',
    constant: 'te-tok te-tok--property',
    deleted: 'te-tok te-tok--property',
    doctype: 'te-tok te-tok--comment',
    entity: 'te-tok te-tok--operator',
    function: 'te-tok te-tok--function',
    important: 'te-tok te-tok--variable',
    inserted: 'te-tok te-tok--selector',
    keyword: 'te-tok te-tok--attr',
    namespace: 'te-tok te-tok--variable',
    number: 'te-tok te-tok--property',
    operator: 'te-tok te-tok--operator',
    prolog: 'te-tok te-tok--comment',
    property: 'te-tok te-tok--property',
    punctuation: 'te-tok te-tok--punctuation',
    regex: 'te-tok te-tok--variable',
    selector: 'te-tok te-tok--selector',
    string: 'te-tok te-tok--selector',
    symbol: 'te-tok te-tok--property',
    tag: 'te-tok te-tok--property',
    url: 'te-tok te-tok--operator',
    variable: 'te-tok te-tok--variable',
  },
  hr: 'te-hr',
  hrSelected: 'te-hr-selected',
  table: 'te-table',
  tableScroll: 'te-table-scroll',
  tableCell: 'te-td',
  tableCellHeader: 'te-th',
  tableRow: 'te-tr',
  tableSelected: 'te-table-selected',
  tableCellSelected: 'te-td-selected',
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
      TableNode,
      TableCellNode,
      TableRowNode,
      CodeNode,
      CodeHighlightNode,
      TabNode,
      HorizontalRuleNode,
      ImageNode,
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
        <EditorUiProvider>
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
              <FloatingLinkEditor htmlMode={htmlMode} />
              <FloatingFormatBar htmlMode={htmlMode} />
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
            <InsertDialogs />
            <HistoryPlugin />
            <ListPlugin />
            <CheckListPlugin />
            <LinkPlugin />
            <AutoLinkPlugin />
            <TablePlugin hasCellMerge hasCellBackgroundColor hasHorizontalScroll />
            <HorizontalRulePlugin />
            <TabIndentationPlugin maxIndent={8} />
            <MarkdownShortcutPlugin />
            <CodeHighlightPlugin />
            <HtmlImportPlugin html={html} />
            <SavePlugin textarea={textarea} htmlMode={htmlMode} />
            <EditorHandle editorRef={editorRef} />
          </div>
        </EditorUiProvider>
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
