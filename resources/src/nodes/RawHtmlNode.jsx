import { $getNodeByKey, DecoratorNode } from 'lexical';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';

function RawHtmlView({ nodeKey, html }) {
  const [editor] = useLexicalComposerContext();
  return (
    <div className="te-rawhtml te-deco">
      <div className="te-deco__bar">
        <span>{/<(iframe|video)\b/i.test(html || '') ? 'Video' : 'HTML'}</span>
        <button
          type="button"
          className="te-deco__remove"
          onClick={() => {
            editor.update(() => {
              const node = $getNodeByKey(nodeKey);
              if (node) {
                node.remove();
              }
            });
          }}
        >
          Remove
        </button>
      </div>
      <div className="te-rawhtml__preview" dangerouslySetInnerHTML={{ __html: html || '' }} />
      <p className="te-deco__hint">Edit this markup in HTML view.</p>
    </div>
  );
}

function convertElement(el) {
  return { node: $createRawHtmlNode(el.outerHTML) };
}

export class RawHtmlNode extends DecoratorNode {
  static getType() {
    return 'te-html';
  }

  static clone(node) {
    return new RawHtmlNode(node.__html, node.__key);
  }

  constructor(html = '', key) {
    super(key);
    this.__html = html || '';
  }

  createDOM() {
    const el = document.createElement('div');
    el.className = 'te-deco-wrap';
    return el;
  }

  updateDOM() {
    return false;
  }

  decorate() {
    return <RawHtmlView nodeKey={this.getKey()} html={this.__html} />;
  }

  exportJSON() {
    return { type: 'te-html', version: 1, html: this.__html };
  }

  static importJSON(json) {
    return $createRawHtmlNode(json.html);
  }

  exportDOM() {
    const tpl = document.createElement('template');
    tpl.innerHTML = (this.__html || '').trim();
    const elements = [...tpl.content.childNodes].filter((n) => n.nodeType === 1);
    if (elements.length === 1) {
      return { element: elements[0].cloneNode(true) };
    }
    const wrap = document.createElement('div');
    wrap.setAttribute('data-te-node', 'html');
    wrap.innerHTML = this.__html || '';
    return { element: wrap };
  }

  static importDOM() {
    return {
      iframe: () => ({ conversion: convertElement, priority: 3 }),
      video: () => ({ conversion: convertElement, priority: 3 }),
      figure: (domNode) => {
        if (domNode.getAttribute('data-te-node') === 'image' || domNode.querySelector('img')) {
          return null;
        }
        return { conversion: convertElement, priority: 3 };
      },
      div: (domNode) => {
        if (domNode.getAttribute('data-te-node') !== 'html') {
          return null;
        }
        return {
          conversion: (el) => ({ node: $createRawHtmlNode(el.innerHTML) }),
          priority: 4,
        };
      },
    };
  }

  setHtml(html) {
    const writable = this.getWritable();
    writable.__html = html;
  }

  isInline() {
    return false;
  }
}

export function $createRawHtmlNode(html = '') {
  return new RawHtmlNode(html);
}

export function $isRawHtmlNode(node) {
  return node instanceof RawHtmlNode;
}
