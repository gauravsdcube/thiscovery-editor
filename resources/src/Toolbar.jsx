import { useCallback, useEffect, useRef, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isRootOrShadowRoot,
  $isTextNode,
  $createParagraphNode,
  $insertNodes,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  COMMAND_PRIORITY_CRITICAL,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  INDENT_CONTENT_COMMAND,
  OUTDENT_CONTENT_COMMAND,
  REDO_COMMAND,
  SELECTION_CHANGE_COMMAND,
  UNDO_COMMAND,
} from 'lexical';
import {
  $getSelectionStyleValueForProperty,
  $patchStyleText,
  $setBlocksType,
} from '@lexical/selection';
import { $createHeadingNode, $createQuoteNode, $isHeadingNode } from '@lexical/rich-text';
import { $createCodeNode, $isCodeNode, normalizeCodeLang } from '@lexical/code';
import { INSERT_HORIZONTAL_RULE_COMMAND } from '@lexical/react/LexicalHorizontalRuleNode';
import {
  $isListNode,
  INSERT_CHECK_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  ListNode,
  REMOVE_LIST_COMMAND,
} from '@lexical/list';
import { $isLinkNode } from '@lexical/link';
import {
  $deleteTableColumnAtSelection,
  $deleteTableRowAtSelection,
  $getTableCellNodeFromLexicalNode,
  $getTableNodeFromLexicalNodeOrThrow,
  $insertTableColumnAtSelection,
  $insertTableRowAtSelection,
  $isTableCellNode,
  $isTableNode,
  $isTableRowNode,
  $isTableSelection,
  $mergeCells,
  $unmergeCell,
  TableCellHeaderStates,
} from '@lexical/table';
import { $findMatchingParent, $getNearestNodeOfType, mergeRegister } from '@lexical/utils';
import { $createCalloutNode } from './nodes/CalloutNode.jsx';
import { $createAccordionNode } from './nodes/AccordionNode.jsx';
import { $createSurveyNode } from './nodes/SurveyNode.jsx';
import { $createButtonNode } from './nodes/ButtonNode.jsx';
import { useEditorUi } from './EditorUi.jsx';
import { $captureRange, $restoreRange } from './rangeSelection.js';
import { $imagePayloadFromSelection, $linkPayloadFromSelection } from './plugins/InsertDialogs.jsx';

const FONT_SIZES = ['12px', '14px', '16px', '18px', '20px', '24px', '32px'];
const FONT_FAMILIES = [
  { value: '', label: 'Font' },
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: '"Times New Roman", Times, serif', label: 'Times' },
  { value: 'Verdana, sans-serif', label: 'Verdana' },
  { value: '"Courier New", Courier, monospace', label: 'Courier' },
];

const TEXT_COLOURS = [
  { value: null, label: 'Default' },
  { value: '#212b32', label: 'Dark' },
  { value: '#4c6272', label: 'Grey' },
  { value: '#005eb8', label: 'Blue' },
  { value: '#007f3b', label: 'Green' },
  { value: '#d5281b', label: 'Red' },
  { value: '#8031a7', label: 'Purple' },
  { value: '#ffffff', label: 'White' },
];

const HIGHLIGHT_COLOURS = [
  { value: null, label: 'None' },
  { value: '#fff2a8', label: 'Yellow' },
  { value: '#cce5d8', label: 'Green' },
  { value: '#f7d4d4', label: 'Red' },
  { value: '#d6e8f7', label: 'Blue' },
  { value: '#f3e6f8', label: 'Purple' },
  { value: '#f0f4f5', label: 'Grey' },
];

function Icon({ children }) {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

export const icons = {
  undo: (
    <Icon>
      <path fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" d="M3.5 7.5H11a3 3 0 1 1 0 6H9" />
      <path fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M6 4.5 3.5 7.5 6 10.5" />
    </Icon>
  ),
  redo: (
    <Icon>
      <path fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" d="M12.5 7.5H5a3 3 0 1 0 0 6h2" />
      <path fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M10 4.5 12.5 7.5 10 10.5" />
    </Icon>
  ),
  bold: (
    <Icon>
      <path fill="currentColor" d="M4.5 2.5h5.1c1.7 0 3.1 1.2 3.1 2.9 0 1-.5 1.9-1.3 2.4 1.1.5 1.8 1.5 1.8 2.7 0 1.9-1.5 3-3.4 3H4.5V2.5Zm2.2 4.6h2.6c.7 0 1.2-.5 1.2-1.2S9.9 4.7 9.2 4.7H6.7v2.4Zm0 4.7h2.9c.8 0 1.4-.5 1.4-1.3s-.6-1.3-1.4-1.3H6.7v2.6Z" />
    </Icon>
  ),
  italic: (
    <Icon>
      <path fill="currentColor" d="M7 2.5h5.2v1.6H10.4l-2.6 8h1.8v1.6H4.4v-1.6h1.8l2.6-8H7V2.5Z" />
    </Icon>
  ),
  underline: (
    <Icon>
      <path fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" d="M4 13.5h8M5.5 2.5v6a2.5 2.5 0 0 0 5 0v-6" />
    </Icon>
  ),
  strike: (
    <Icon>
      <path fill="currentColor" d="M3 7.25h10v1.5H3z" />
      <path fill="none" stroke="currentColor" strokeWidth="1.5" d="M4.5 5c.4-1.4 1.7-2.2 3.5-2.2 2.1 0 3.4 1 3.4 2.5 0 .7-.3 1.3-.8 1.7M5.4 9.2c-.2.5-.3 1-.3 1.4 0 1.7 1.5 2.9 3.9 2.9 2.2 0 3.7-1 4.1-2.6" />
    </Icon>
  ),
  code: (
    <Icon>
      <path fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="m5 5-3 3 3 3M11 5l3 3-3 3M9 3.5 7 12.5" />
    </Icon>
  ),
  sub: (
    <Icon>
      <text x="2" y="11" fontSize="9" fontWeight="700" fill="currentColor">X</text>
      <text x="9.5" y="13.5" fontSize="6" fill="currentColor">2</text>
    </Icon>
  ),
  super: (
    <Icon>
      <text x="2" y="13" fontSize="9" fontWeight="700" fill="currentColor">X</text>
      <text x="9.5" y="7" fontSize="6" fill="currentColor">2</text>
    </Icon>
  ),
  alignLeft: (
    <Icon>
      <path fill="currentColor" d="M2 3h12v1.4H2zm0 3h8v1.4H2zm0 3h12v1.4H2zm0 3h8v1.4H2z" />
    </Icon>
  ),
  alignCenter: (
    <Icon>
      <path fill="currentColor" d="M2 3h12v1.4H2zm2 3h8v1.4H4zm-2 3h12v1.4H2zm2 3h8v1.4H4z" />
    </Icon>
  ),
  alignRight: (
    <Icon>
      <path fill="currentColor" d="M2 3h12v1.4H2zm4 3h8v1.4H6zM2 9h12v1.4H2zm4 3h8v1.4H6z" />
    </Icon>
  ),
  alignJustify: (
    <Icon>
      <path fill="currentColor" d="M2 3h12v1.4H2zm0 3h12v1.4H2zm0 3h12v1.4H2zm0 3h12v1.4H2z" />
    </Icon>
  ),
  indent: (
    <Icon>
      <path fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M2.5 4h11M8 8h5.5M2.5 12h11M2.5 6.5 5.5 8l-3 1.5" />
    </Icon>
  ),
  outdent: (
    <Icon>
      <path fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M2.5 4h11M2.5 8H8M2.5 12h11M8 6.5 5 8l3 1.5" />
    </Icon>
  ),
  bullet: (
    <Icon>
      <circle cx="3.5" cy="4" r="1.1" fill="currentColor" />
      <circle cx="3.5" cy="8" r="1.1" fill="currentColor" />
      <circle cx="3.5" cy="12" r="1.1" fill="currentColor" />
      <path fill="currentColor" d="M6 3.3h8v1.4H6zm0 4h8v1.4H6zm0 4h8v1.4H6z" />
    </Icon>
  ),
  number: (
    <Icon>
      <text x="1" y="5.2" fontSize="5" fontWeight="700" fill="currentColor">1</text>
      <text x="1" y="9.2" fontSize="5" fontWeight="700" fill="currentColor">2</text>
      <text x="1" y="13.2" fontSize="5" fontWeight="700" fill="currentColor">3</text>
      <path fill="currentColor" d="M6 3.3h8v1.4H6zm0 4h8v1.4H6zm0 4h8v1.4H6z" />
    </Icon>
  ),
  check: (
    <Icon>
      <rect x="2" y="3" width="4" height="4" rx=".6" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <path fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" d="m2.7 5 1.1 1.1 2-2.1" />
      <path fill="currentColor" d="M8 3.3h6v1.4H8z" />
      <rect x="2" y="9.5" width="4" height="4" rx=".6" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <path fill="currentColor" d="M8 10.3h6v1.4H8z" />
    </Icon>
  ),
  link: (
    <Icon>
      <path fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" d="M6.7 8.8a2.6 2.6 0 0 0 3.7 0l1.8-1.8a2.6 2.6 0 0 0-3.7-3.7L7.6 4.2M9.3 7.2a2.6 2.6 0 0 0-3.7 0L3.8 9a2.6 2.6 0 1 0 3.7 3.7l.9-.9" />
    </Icon>
  ),
  image: (
    <Icon>
      <rect x="2" y="3" width="12" height="10" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="5.5" cy="6.5" r="1.1" fill="currentColor" />
      <path fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" d="m2.8 12.2 3.4-3.3 2.2 2.1 2.1-2.4 2.7 3.6" />
    </Icon>
  ),
  embed: (
    <Icon>
      <rect x="1.5" y="3.5" width="13" height="9" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path fill="currentColor" d="M6.4 6.2 10.2 8l-3.8 1.8z" />
    </Icon>
  ),
  table: (
    <Icon>
      <rect x="2" y="3" width="12" height="10" rx="1" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path fill="none" stroke="currentColor" strokeWidth="1.3" d="M2 6.2h12M2 9.8h12M6.5 3v10M9.5 3v10" />
    </Icon>
  ),
  row: (
    <Icon>
      <path fill="none" stroke="currentColor" strokeWidth="1.4" d="M2.5 4.5h11v7h-11zM2.5 8h11" />
      <path fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" d="M8 2.5v3M6.5 4h3" />
    </Icon>
  ),
  col: (
    <Icon>
      <path fill="none" stroke="currentColor" strokeWidth="1.4" d="M3.5 3.5h9v9h-9zM8 3.5v9" />
      <path fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" d="M13.5 8h-3M12 6.5v3" />
    </Icon>
  ),
  button: (
    <Icon>
      <rect x="1.5" y="5" width="13" height="6" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path fill="currentColor" d="M5 7.2h6v1.5H5z" />
    </Icon>
  ),
  clear: (
    <Icon>
      <path fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" d="M4 4.5 12 12.5M4.5 12.5h7.5" />
      <path fill="currentColor" d="M5.2 2.8h5.1l.9 1.4H4.3z" />
    </Icon>
  ),
  colour: (
    <Icon>
      <text x="3.2" y="11" fontSize="10" fontWeight="700" fill="currentColor">A</text>
    </Icon>
  ),
  highlight: (
    <Icon>
      <path fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" d="M3 11.5 8.2 3.4l3.3 2.2L6.4 13.5H3v-2z" />
      <path fill="currentColor" d="M2.5 13.2h11v1.3h-11z" />
    </Icon>
  ),
  hr: (
    <Icon>
      <path fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" d="M2 8h12" />
      <path fill="none" stroke="currentColor" strokeWidth="1.2" d="M4 5.5h8M4 10.5h8" />
    </Icon>
  ),
  codeBlock: (
    <Icon>
      <rect x="1.5" y="3" width="13" height="10" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" d="m5 6-2 2 2 2M11 6l2 2-2 2" />
    </Icon>
  ),
};

const CODE_LANGUAGES = [
  { value: 'plain', label: 'Plain text' },
  { value: 'js', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'py', label: 'Python' },
  { value: 'css', label: 'CSS' },
  { value: 'html', label: 'HTML' },
  { value: 'sql', label: 'SQL' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'java', label: 'Java' },
  { value: 'c', label: 'C' },
  { value: 'cpp', label: 'C++' },
];

function $codeLanguageFromSelection() {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) {
    return 'plain';
  }
  const code = $findMatchingParent(selection.anchor.getNode(), $isCodeNode);
  if (!$isCodeNode(code)) {
    return 'plain';
  }
  return normalizeCodeLang(code.getLanguage() || 'plain') || 'plain';
}

function $selectionInTable() {
  const selection = $getSelection();
  if ($isTableSelection(selection)) {
    return true;
  }
  if (!$isRangeSelection(selection)) {
    return false;
  }
  let node = selection.anchor.getNode();
  while (node) {
    if ($isTableNode(node) || $isTableCellNode(node)) {
      return true;
    }
    node = node.getParent();
  }
  return false;
}

function $tableMenuState() {
  const selection = $getSelection();
  const node = $isRangeSelection(selection)
    ? selection.anchor.getNode()
    : $isTableSelection(selection)
      ? selection.anchor.getNode()
      : null;
  const cell = node ? $getTableCellNodeFromLexicalNode(node) : null;
  let canMerge = false;
  if ($isTableSelection(selection)) {
    const cells = selection.getNodes().filter($isTableCellNode);
    canMerge = cells.length > 1;
  }
  return {
    inTable: $selectionInTable(),
    canMerge,
    canUnmerge: !!(cell && (cell.getColSpan() > 1 || cell.getRowSpan() > 1)),
    cellBg: cell ? cell.getBackgroundColor() || '' : '',
  };
}

function $isInLink() {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) {
    return false;
  }
  return !!$findMatchingParent(selection.anchor.getNode(), $isLinkNode);
}

function $blockTypeFromSelection() {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) {
    return 'paragraph';
  }
  const anchor = selection.anchor.getNode();
  if ($isRootOrShadowRoot(anchor)) {
    return 'paragraph';
  }
  const element =
    $findMatchingParent(anchor, (node) => {
      const parent = node.getParent();
      return parent !== null && $isRootOrShadowRoot(parent);
    }) || anchor.getTopLevelElementOrThrow();

  if ($isListNode(element)) {
    const parentList = $getNearestNodeOfType(anchor, ListNode);
    return (parentList || element).getListType();
  }
  if ($isHeadingNode(element)) {
    return element.getTag();
  }
  if ($isCodeNode(element)) {
    return 'code';
  }
  if (element.getType() === 'quote') {
    return 'quote';
  }
  return 'paragraph';
}

function $isAlignableBlock(node) {
  return $isElementNode(node) && !node.isInline();
}

function $elementFormatFromSelection() {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) {
    return '';
  }
  const node = selection.anchor.getNode();
  const element = $findMatchingParent(node, $isAlignableBlock);
  if ($isElementNode(element)) {
    return element.getFormatType();
  }
  return '';
}

function parseFontPx(value) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : 16;
}

export function ToolbarButton({ title, active, disabled, onClick, children, wide }) {
  return (
    <button
      type="button"
      className={'te-tb' + (wide ? ' te-tb--wide' : '') + (active ? ' is-active' : '')}
      title={title}
      aria-label={title}
      aria-pressed={active ? 'true' : 'false'}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function ColourMenu({ open, colours, current, onPick, extra }) {
  if (!open) {
    return null;
  }
  return (
    <div className="te-pop" role="menu">
      <div className="te-pop__swatches">
        {colours.map((item) => (
          <button
            key={item.label}
            type="button"
            className={'te-swatch' + (item.value === current ? ' is-active' : '')}
            style={{ background: item.value || 'transparent' }}
            title={item.label}
            aria-label={item.label}
            onClick={() => onPick(item.value)}
          >
            {!item.value ? '×' : ''}
          </button>
        ))}
      </div>
      {extra}
    </div>
  );
}

export default function Toolbar({ profile, htmlMode, onToggleHtml }) {
  const [editor] = useLexicalComposerContext();
  const { open } = useEditorUi();
  const rootRef = useRef(null);
  const [block, setBlock] = useState('paragraph');
  const [inTable, setInTable] = useState(false);
  const [canMerge, setCanMerge] = useState(false);
  const [canUnmerge, setCanUnmerge] = useState(false);
  const [cellBg, setCellBg] = useState('');
  const [isLink, setIsLink] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrike, setIsStrike] = useState(false);
  const [isCode, setIsCode] = useState(false);
  const [isSub, setIsSub] = useState(false);
  const [isSuper, setIsSuper] = useState(false);
  const [elementFormat, setElementFormat] = useState('');
  const [fontColor, setFontColor] = useState('');
  const [bgColor, setBgColor] = useState('');
  const [fontSize, setFontSize] = useState('');
  const [fontFamily, setFontFamily] = useState('');
  const [codeLang, setCodeLang] = useState('plain');
  const [openMenu, setOpenMenu] = useState(null);
  const showBlocks = profile === 'page';
  const disabled = htmlMode;

  const $updateToolbar = useCallback(() => {
    const tableState = $tableMenuState();
    setInTable(tableState.inTable);
    setCanMerge(tableState.canMerge);
    setCanUnmerge(tableState.canUnmerge);
    setCellBg(tableState.cellBg);
    $captureRange();
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) {
      return;
    }
    setIsLink($isInLink());
    setIsBold(selection.hasFormat('bold'));
    setIsItalic(selection.hasFormat('italic'));
    setIsUnderline(selection.hasFormat('underline'));
    setIsStrike(selection.hasFormat('strikethrough'));
    setIsCode(selection.hasFormat('code'));
    setIsSub(selection.hasFormat('subscript'));
    setIsSuper(selection.hasFormat('superscript'));
    setFontColor($getSelectionStyleValueForProperty(selection, 'color', ''));
    setBgColor($getSelectionStyleValueForProperty(selection, 'background-color', ''));
    setFontSize($getSelectionStyleValueForProperty(selection, 'font-size', ''));
    setFontFamily($getSelectionStyleValueForProperty(selection, 'font-family', ''));
    try {
      setBlock($blockTypeFromSelection());
      setElementFormat($elementFormatFromSelection());
      setCodeLang($codeLanguageFromSelection());
    } catch (e) {
      /* selection may sit on a decorator or table chrome */
    }
  }, []);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          $updateToolbar();
        });
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          $updateToolbar();
          return false;
        },
        COMMAND_PRIORITY_CRITICAL
      ),
      editor.registerCommand(
        CAN_UNDO_COMMAND,
        (payload) => {
          setCanUndo(payload);
          return false;
        },
        COMMAND_PRIORITY_CRITICAL
      ),
      editor.registerCommand(
        CAN_REDO_COMMAND,
        (payload) => {
          setCanRedo(payload);
          return false;
        },
        COMMAND_PRIORITY_CRITICAL
      )
    );
  }, [editor, $updateToolbar]);

  useEffect(() => {
    if (!openMenu) {
      return undefined;
    }
    const close = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [openMenu]);

  const $ensureRangeSelection = useCallback(() => $restoreRange(), []);

  const applyStyle = useCallback(
    (patch) => {
      editor.update(() => {
        const selection = $ensureRangeSelection();
        if ($isRangeSelection(selection)) {
          $patchStyleText(selection, patch);
        }
      });
    },
    [editor, $ensureRangeSelection]
  );

  const dispatch = useCallback(
    (command, payload) => {
      editor.update(() => {
        $ensureRangeSelection();
      });
      editor.dispatchCommand(command, payload);
    },
    [editor, $ensureRangeSelection]
  );

  const setHeading = useCallback(
    (tag) => {
      if (tag === 'bullet') {
        dispatch(INSERT_UNORDERED_LIST_COMMAND, undefined);
        return;
      }
      if (tag === 'number') {
        dispatch(INSERT_ORDERED_LIST_COMMAND, undefined);
        return;
      }
      if (tag === 'check') {
        dispatch(INSERT_CHECK_LIST_COMMAND, undefined);
        return;
      }
      if (block === 'bullet' || block === 'number' || block === 'check') {
        dispatch(REMOVE_LIST_COMMAND, undefined);
      }
      editor.update(() => {
        const selection = $ensureRangeSelection();
        if ($isRangeSelection(selection)) {
          if (tag === 'paragraph') {
            $setBlocksType(selection, () => $createParagraphNode());
          } else if (tag === 'quote') {
            $setBlocksType(selection, () => $createQuoteNode());
          } else if (tag === 'code') {
            $setBlocksType(selection, () => $createCodeNode('plain'));
          } else {
            $setBlocksType(selection, () => $createHeadingNode(tag));
          }
        }
      });
    },
    [editor, block, dispatch, $ensureRangeSelection]
  );

  const insertLink = useCallback(() => {
    editor.getEditorState().read(() => {
      $captureRange();
      open('link', $linkPayloadFromSelection());
    });
  }, [editor, open]);

  const insertCallout = useCallback(() => {
    editor.update(() => {
      $ensureRangeSelection();
      $insertNodes([$createCalloutNode('info', '', '')]);
    });
  }, [editor, $ensureRangeSelection]);

  const insertAccordion = useCallback(() => {
    editor.update(() => {
      $ensureRangeSelection();
      $insertNodes([$createAccordionNode([{ heading: '', body: '' }])]);
    });
  }, [editor, $ensureRangeSelection]);

  const insertSurvey = useCallback(() => {
    editor.update(() => {
      $ensureRangeSelection();
      $insertNodes([$createSurveyNode('', 'Take the survey', '')]);
    });
  }, [editor, $ensureRangeSelection]);

  const insertButton = useCallback(() => {
    editor.update(() => {
      $ensureRangeSelection();
      $insertNodes([$createButtonNode('Find out more', '', 'primary', false)]);
    });
  }, [editor, $ensureRangeSelection]);

  const insertImage = useCallback(() => {
    editor.getEditorState().read(() => {
      $captureRange();
      open('image', $imagePayloadFromSelection());
    });
  }, [editor, open]);

  const insertEmbed = useCallback(() => {
    editor.getEditorState().read(() => {
      $captureRange();
    });
    open('embed');
  }, [editor, open]);

  const insertTable = useCallback(() => {
    editor.getEditorState().read(() => {
      $captureRange();
    });
    open('table');
  }, [editor, open]);

  const insertHr = useCallback(() => {
    dispatch(INSERT_HORIZONTAL_RULE_COMMAND, undefined);
  }, [dispatch]);

  const setCodeLanguage = useCallback(
    (language) => {
      editor.update(() => {
        const selection = $ensureRangeSelection();
        if (!$isRangeSelection(selection)) {
          return;
        }
        const code = $findMatchingParent(selection.anchor.getNode(), $isCodeNode);
        if ($isCodeNode(code)) {
          code.setLanguage(language);
        }
      });
      setCodeLang(language);
    },
    [editor, $ensureRangeSelection]
  );

  const runTable = useCallback(
    (fn) => {
      editor.update(() => {
        $restoreRange();
        fn();
      });
      setOpenMenu(null);
    },
    [editor]
  );

  const mergeCells = useCallback(() => {
    runTable(() => {
      const selection = $getSelection();
      if ($isTableSelection(selection)) {
        $mergeCells(selection.getNodes().filter($isTableCellNode));
      }
    });
  }, [runTable]);

  const colourCell = useCallback(
    (value) => {
      runTable(() => {
        const selection = $getSelection();
        const nodes = $isTableSelection(selection)
          ? selection.getNodes().filter($isTableCellNode)
          : [];
        if (!nodes.length && $isRangeSelection(selection)) {
          const cell = $getTableCellNodeFromLexicalNode(selection.anchor.getNode());
          if (cell) {
            nodes.push(cell);
          }
        }
        nodes.forEach((cell) => cell.setBackgroundColor(value));
      });
    },
    [runTable]
  );

  const toggleHeaderRow = useCallback(() => {
    runTable(() => {
      const selection = $getSelection();
      const node = $isRangeSelection(selection)
        ? selection.anchor.getNode()
        : $isTableSelection(selection)
          ? selection.anchor.getNode()
          : null;
      if (!node) {
        return;
      }
      const table = $getTableNodeFromLexicalNodeOrThrow(node);
      const firstRow = table.getFirstChild();
      if (!$isTableRowNode(firstRow)) {
        return;
      }
      firstRow.getChildren().forEach((cell) => {
        if ($isTableCellNode(cell)) {
          cell.toggleHeaderStyle(TableCellHeaderStates.ROW);
        }
      });
    });
  }, [runTable]);

  const deleteTable = useCallback(() => {
    runTable(() => {
      const selection = $getSelection();
      const node = $isRangeSelection(selection)
        ? selection.anchor.getNode()
        : $isTableSelection(selection)
          ? selection.anchor.getNode()
          : null;
      if (!node) {
        return;
      }
      $getTableNodeFromLexicalNodeOrThrow(node).remove();
    });
  }, [runTable]);

  const setCellAlign = useCallback(
    (value) => {
      runTable(() => {
        const selection = $getSelection();
        const node = $isRangeSelection(selection)
          ? selection.anchor.getNode()
          : $isTableSelection(selection)
            ? selection.anchor.getNode()
            : null;
        const cell = node ? $getTableCellNodeFromLexicalNode(node) : null;
        if (cell) {
          cell.setVerticalAlign(value);
        }
      });
    },
    [runTable]
  );

  const clearFormatting = useCallback(() => {
    editor.update(() => {
      const selection = $ensureRangeSelection();
      if (!$isRangeSelection(selection)) {
        return;
      }
      if (selection.isCollapsed()) {
        selection.setFormat(0);
        selection.setStyle('');
      }
      selection.getNodes().forEach((node) => {
        if ($isTextNode(node)) {
          node.setFormat(0);
          node.setStyle('');
        }
      });
      const anchor = selection.anchor.getNode();
      const element = $findMatchingParent(anchor, $isAlignableBlock);
      if ($isElementNode(element) && !$isRootOrShadowRoot(element)) {
        element.setFormat('');
        element.setIndent(0);
      }
    });
    setOpenMenu(null);
  }, [editor, $ensureRangeSelection]);

  const changeFontSize = useCallback(
    (delta) => {
      const next = Math.min(48, Math.max(10, parseFontPx(fontSize) + delta));
      applyStyle({ 'font-size': `${next}px` });
    },
    [applyStyle, fontSize]
  );

  const alignActive = (value) => {
    if (value === 'left') {
      return elementFormat === '' || elementFormat === 'left' || elementFormat === 'start';
    }
    return elementFormat === value;
  };

  return (
    <div
      className="te-toolbar"
      role="toolbar"
      aria-label="Formatting"
      ref={rootRef}
      onMouseDown={(event) => {
        if (event.target.closest('select, input, textarea, .te-pop')) {
          return;
        }
        event.preventDefault();
      }}
    >
      <div className="te-toolbar__group">
        <ToolbarButton title="Undo (Ctrl+Z)" disabled={disabled || !canUndo} onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}>
          {icons.undo}
        </ToolbarButton>
        <ToolbarButton title="Redo (Ctrl+Y)" disabled={disabled || !canRedo} onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}>
          {icons.redo}
        </ToolbarButton>
      </div>

      <span className="te-toolbar__sep" />

      <div className="te-toolbar__group">
        <select
          className="te-tb-select te-tb-select--block"
          value={block}
          onChange={(e) => setHeading(e.target.value)}
          aria-label="Block type"
          disabled={disabled}
        >
          <option value="paragraph">Paragraph</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
          <option value="h4">Heading 4</option>
          <option value="h5">Heading 5</option>
          <option value="h6">Heading 6</option>
          <option value="quote">Quote</option>
          <option value="code">Code block</option>
          <option value="bullet">Bullet list</option>
          <option value="number">Numbered list</option>
          <option value="check">Checklist</option>
        </select>
        {block === 'code' && (
          <select
            className="te-tb-select te-tb-select--font"
            value={CODE_LANGUAGES.some((item) => item.value === codeLang) ? codeLang : 'plain'}
            onChange={(e) => setCodeLanguage(e.target.value)}
            aria-label="Code language"
            disabled={disabled}
          >
            {CODE_LANGUAGES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        )}
        <select
          className="te-tb-select te-tb-select--font"
          value={FONT_FAMILIES.some((f) => f.value === fontFamily) ? fontFamily : ''}
          onChange={(e) => applyStyle({ 'font-family': e.target.value || null })}
          aria-label="Font"
          disabled={disabled}
        >
          {FONT_FAMILIES.map((item) => (
            <option key={item.label} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <ToolbarButton title="Smaller text" disabled={disabled} onClick={() => changeFontSize(-2)}>
          −
        </ToolbarButton>
        <select
          className="te-tb-select te-tb-select--size"
          value={FONT_SIZES.includes(fontSize) ? fontSize : ''}
          onChange={(e) => applyStyle({ 'font-size': e.target.value || null })}
          aria-label="Font size"
          disabled={disabled}
        >
          <option value="">Size</option>
          {FONT_SIZES.map((size) => (
            <option key={size} value={size}>
              {size.replace('px', '')}
            </option>
          ))}
        </select>
        <ToolbarButton title="Larger text" disabled={disabled} onClick={() => changeFontSize(2)}>
          +
        </ToolbarButton>
      </div>

      <span className="te-toolbar__sep" />

      <div className="te-toolbar__group">
        <ToolbarButton title="Bold (Ctrl+B)" active={isBold} disabled={disabled} onClick={() => dispatch(FORMAT_TEXT_COMMAND, 'bold')}>
          {icons.bold}
        </ToolbarButton>
        <ToolbarButton title="Italic (Ctrl+I)" active={isItalic} disabled={disabled} onClick={() => dispatch(FORMAT_TEXT_COMMAND, 'italic')}>
          {icons.italic}
        </ToolbarButton>
        <ToolbarButton title="Underline (Ctrl+U)" active={isUnderline} disabled={disabled} onClick={() => dispatch(FORMAT_TEXT_COMMAND, 'underline')}>
          {icons.underline}
        </ToolbarButton>
        <ToolbarButton title="Strikethrough" active={isStrike} disabled={disabled} onClick={() => dispatch(FORMAT_TEXT_COMMAND, 'strikethrough')}>
          {icons.strike}
        </ToolbarButton>
        <ToolbarButton title="Inline code" active={isCode} disabled={disabled} onClick={() => dispatch(FORMAT_TEXT_COMMAND, 'code')}>
          {icons.code}
        </ToolbarButton>
        <ToolbarButton title="Subscript" active={isSub} disabled={disabled} onClick={() => dispatch(FORMAT_TEXT_COMMAND, 'subscript')}>
          {icons.sub}
        </ToolbarButton>
        <ToolbarButton title="Superscript" active={isSuper} disabled={disabled} onClick={() => dispatch(FORMAT_TEXT_COMMAND, 'superscript')}>
          {icons.super}
        </ToolbarButton>
        <div className="te-tb-wrap">
          <ToolbarButton
            title="Text colour"
            active={openMenu === 'color'}
            disabled={disabled}
            onClick={() => setOpenMenu(openMenu === 'color' ? null : 'color')}
          >
            <span className="te-tb-colour">
              {icons.colour}
              <span className="te-tb-colour__bar" style={{ background: fontColor || '#212b32' }} />
            </span>
          </ToolbarButton>
          <ColourMenu
            open={openMenu === 'color'}
            colours={TEXT_COLOURS}
            current={fontColor || null}
            onPick={(value) => {
              applyStyle({ color: value });
              setOpenMenu(null);
            }}
            extra={
              <label className="te-pop__custom">
                Custom
                <input
                  type="color"
                  value={/^#/.test(fontColor) ? fontColor : '#212b32'}
                  onChange={(e) => applyStyle({ color: e.target.value })}
                  disabled={disabled}
                />
              </label>
            }
          />
        </div>
        <div className="te-tb-wrap">
          <ToolbarButton
            title="Highlight colour"
            active={openMenu === 'bg'}
            disabled={disabled}
            onClick={() => setOpenMenu(openMenu === 'bg' ? null : 'bg')}
          >
            <span className="te-tb-colour">
              {icons.highlight}
              <span className="te-tb-colour__bar" style={{ background: bgColor || '#fff2a8' }} />
            </span>
          </ToolbarButton>
          <ColourMenu
            open={openMenu === 'bg'}
            colours={HIGHLIGHT_COLOURS}
            current={bgColor || null}
            onPick={(value) => {
              applyStyle({ 'background-color': value });
              setOpenMenu(null);
            }}
            extra={
              <label className="te-pop__custom">
                Custom
                <input
                  type="color"
                  value={/^#/.test(bgColor) ? bgColor : '#fff2a8'}
                  onChange={(e) => applyStyle({ 'background-color': e.target.value })}
                  disabled={disabled}
                />
              </label>
            }
          />
        </div>
        <ToolbarButton title="Clear formatting" disabled={disabled} onClick={clearFormatting}>
          {icons.clear}
        </ToolbarButton>
      </div>

      <span className="te-toolbar__sep" />

      <div className="te-toolbar__group">
        <ToolbarButton title="Align left" active={alignActive('left')} disabled={disabled} onClick={() => dispatch(FORMAT_ELEMENT_COMMAND, 'left')}>
          {icons.alignLeft}
        </ToolbarButton>
        <ToolbarButton title="Align centre" active={alignActive('center')} disabled={disabled} onClick={() => dispatch(FORMAT_ELEMENT_COMMAND, 'center')}>
          {icons.alignCenter}
        </ToolbarButton>
        <ToolbarButton title="Align right" active={alignActive('right')} disabled={disabled} onClick={() => dispatch(FORMAT_ELEMENT_COMMAND, 'right')}>
          {icons.alignRight}
        </ToolbarButton>
        <ToolbarButton title="Justify" active={alignActive('justify')} disabled={disabled} onClick={() => dispatch(FORMAT_ELEMENT_COMMAND, 'justify')}>
          {icons.alignJustify}
        </ToolbarButton>
        <ToolbarButton title="Outdent" disabled={disabled} onClick={() => dispatch(OUTDENT_CONTENT_COMMAND, undefined)}>
          {icons.outdent}
        </ToolbarButton>
        <ToolbarButton title="Indent" disabled={disabled} onClick={() => dispatch(INDENT_CONTENT_COMMAND, undefined)}>
          {icons.indent}
        </ToolbarButton>
      </div>

      <span className="te-toolbar__sep" />

      <div className="te-toolbar__group">
        <ToolbarButton title="Bullet list" active={block === 'bullet'} disabled={disabled} onClick={() => setHeading('bullet')}>
          {icons.bullet}
        </ToolbarButton>
        <ToolbarButton title="Numbered list" active={block === 'number'} disabled={disabled} onClick={() => setHeading('number')}>
          {icons.number}
        </ToolbarButton>
        <ToolbarButton title="Checklist" active={block === 'check'} disabled={disabled} onClick={() => setHeading('check')}>
          {icons.check}
        </ToolbarButton>
        <ToolbarButton title="Link" active={isLink} disabled={disabled} onClick={insertLink}>
          {icons.link}
        </ToolbarButton>
        <ToolbarButton title="Insert button" disabled={disabled} onClick={insertButton}>
          {icons.button}
        </ToolbarButton>
        <ToolbarButton title="Insert image" disabled={disabled} onClick={insertImage}>
          {icons.image}
        </ToolbarButton>
        <ToolbarButton title="Insert YouTube or Vimeo" disabled={disabled} onClick={insertEmbed}>
          {icons.embed}
        </ToolbarButton>
        <ToolbarButton title="Insert table" disabled={disabled} onClick={insertTable}>
          {icons.table}
        </ToolbarButton>
        <ToolbarButton title="Horizontal rule" disabled={disabled} onClick={insertHr}>
          {icons.hr}
        </ToolbarButton>
        <ToolbarButton title="Code block" active={block === 'code'} disabled={disabled} onClick={() => setHeading('code')}>
          {icons.codeBlock}
        </ToolbarButton>
        {inTable && (
          <div className="te-tb-wrap">
            <ToolbarButton
              title="Table cell options"
              active={openMenu === 'table'}
              disabled={disabled}
              onClick={() => setOpenMenu(openMenu === 'table' ? null : 'table')}
            >
              {icons.row}
            </ToolbarButton>
            {openMenu === 'table' && (
              <div
                className="te-pop te-table-menu"
                role="menu"
                onMouseDown={(event) => event.preventDefault()}
              >
                <button type="button" onClick={() => runTable(() => $insertTableRowAtSelection(false))}>
                  Insert row above
                </button>
                <button type="button" onClick={() => runTable(() => $insertTableRowAtSelection(true))}>
                  Insert row below
                </button>
                <button type="button" onClick={() => runTable(() => $insertTableColumnAtSelection(false))}>
                  Insert column left
                </button>
                <button type="button" onClick={() => runTable(() => $insertTableColumnAtSelection(true))}>
                  Insert column right
                </button>
                <button type="button" onClick={() => runTable(() => $deleteTableRowAtSelection())}>
                  Delete row
                </button>
                <button type="button" onClick={() => runTable(() => $deleteTableColumnAtSelection())}>
                  Delete column
                </button>
                <button type="button" onClick={toggleHeaderRow}>
                  Toggle header row
                </button>
                <button type="button" disabled={!canMerge} onClick={mergeCells}>
                  Merge cells
                </button>
                <button type="button" disabled={!canUnmerge} onClick={() => runTable(() => $unmergeCell())}>
                  Unmerge cell
                </button>
                <button type="button" onClick={() => setCellAlign('top')}>
                  Align top
                </button>
                <button type="button" onClick={() => setCellAlign('middle')}>
                  Align middle
                </button>
                <button type="button" onClick={() => setCellAlign('bottom')}>
                  Align bottom
                </button>
                <div className="te-table-menu__label">Cell colour</div>
                <div className="te-pop__swatches">
                  {HIGHLIGHT_COLOURS.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      className={'te-swatch' + (item.value === cellBg ? ' is-active' : '')}
                      style={{ background: item.value || 'transparent' }}
                      title={item.label}
                      aria-label={item.label}
                      onClick={() => colourCell(item.value)}
                    >
                      {!item.value ? '×' : ''}
                    </button>
                  ))}
                </div>
                <button type="button" className="te-table-menu__danger" onClick={deleteTable}>
                  Delete table
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {showBlocks && (
        <>
          <span className="te-toolbar__sep" />
          <div className="te-toolbar__group">
            <ToolbarButton title="Insert callout" disabled={disabled} wide onClick={insertCallout}>
              Callout
            </ToolbarButton>
            <ToolbarButton title="Insert accordion" disabled={disabled} wide onClick={insertAccordion}>
              Accordion
            </ToolbarButton>
            <ToolbarButton title="Insert survey" disabled={disabled} wide onClick={insertSurvey}>
              Survey
            </ToolbarButton>
          </div>
        </>
      )}

      <span className="te-toolbar__sep" />

      <div className="te-toolbar__group">
        <ToolbarButton title="Edit HTML source" active={htmlMode} wide onClick={onToggleHtml}>
          HTML
        </ToolbarButton>
      </div>
    </div>
  );
}
