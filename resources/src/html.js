import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html';
import { $getRoot } from 'lexical';

export function editorToHtml(editor) {
  let html = '';
  editor.getEditorState().read(() => {
    html = $generateHtmlFromNodes(editor, null);
  });
  return html;
}

export function htmlToEditor(editor, html) {
  editor.update(() => {
    const parser = new DOMParser();
    const source = (html || '').trim() || '<p></p>';
    const dom = parser.parseFromString(source, 'text/html');
    const nodes = $generateNodesFromDOM(editor, dom);
    const root = $getRoot();
    root.clear();
    if (nodes.length) {
      root.append(...nodes);
    }
  });
}
