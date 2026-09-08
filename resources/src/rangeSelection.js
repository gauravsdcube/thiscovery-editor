import {
  $createRangeSelection,
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $setSelection,
} from 'lexical';
import {
  $createTableSelectionFrom,
  $isTableCellNode,
  $isTableNode,
  $isTableSelection,
} from '@lexical/table';

let captured = null;

export function $captureRange() {
  const selection = $getSelection();
  if ($isRangeSelection(selection)) {
    captured = {
      kind: 'range',
      anchorKey: selection.anchor.key,
      anchorOffset: selection.anchor.offset,
      anchorType: selection.anchor.type,
      focusKey: selection.focus.key,
      focusOffset: selection.focus.offset,
      focusType: selection.focus.type,
    };
    return;
  }
  if ($isTableSelection(selection) && selection.isValid()) {
    captured = {
      kind: 'table',
      tableKey: selection.tableKey,
      anchorKey: selection.anchor.key,
      focusKey: selection.focus.key,
    };
  }
}

function $restoreCapturedTable() {
  if (!captured || captured.kind !== 'table') {
    return null;
  }
  const table = $getNodeByKey(captured.tableKey);
  const anchor = $getNodeByKey(captured.anchorKey);
  const focus = $getNodeByKey(captured.focusKey);
  if ($isTableNode(table) && $isTableCellNode(anchor) && $isTableCellNode(focus)) {
    $setSelection($createTableSelectionFrom(table, anchor, focus));
    const restored = $getSelection();
    if ($isTableSelection(restored)) {
      return restored;
    }
  }
  return null;
}

function $restoreCapturedRange() {
  if (!captured || (captured.kind && captured.kind !== 'range')) {
    return null;
  }
  const anchorNode = $getNodeByKey(captured.anchorKey);
  const focusNode = $getNodeByKey(captured.focusKey);
  if (!anchorNode || !focusNode) {
    return null;
  }
  const next = $createRangeSelection();
  next.anchor.set(captured.anchorKey, captured.anchorOffset, captured.anchorType);
  next.focus.set(captured.focusKey, captured.focusOffset, captured.focusType);
  $setSelection(next);
  const restored = $getSelection();
  return $isRangeSelection(restored) ? restored : null;
}

export function $restoreRange() {
  const selection = $getSelection();
  if ($isTableSelection(selection)) {
    return selection;
  }
  if (captured && captured.kind === 'table') {
    const table = $restoreCapturedTable();
    if (table) {
      return table;
    }
  }
  if ($isRangeSelection(selection)) {
    return selection;
  }
  const range = $restoreCapturedRange();
  if (range) {
    return range;
  }
  const root = $getRoot();
  if (root.getLastChild()) {
    root.selectEnd();
    const fallback = $getSelection();
    if ($isRangeSelection(fallback)) {
      return fallback;
    }
  }
  return null;
}

export function normalizeUrl(raw) {
  const url = (raw || '').trim();
  if (!url) {
    return '';
  }
  if (/^(https?:|mailto:|tel:|\/|#)/i.test(url)) {
    return url;
  }
  return 'https://' + url;
}
