import { $getNodeByKey, DecoratorNode } from 'lexical';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';

function updateNode(editor, nodeKey, mutator) {
  editor.update(() => {
    const node = $getNodeByKey(nodeKey);
    if (node && typeof mutator === 'function') {
      mutator(node);
    }
  });
}

function CalloutView({ nodeKey, tone, title, body }) {
  const [editor] = useLexicalComposerContext();
  return (
    <aside className={`ep-callout ep-callout--${tone} te-deco`}>
      <div className="te-deco__bar">
        <select
          value={tone}
          onChange={(e) => updateNode(editor, nodeKey, (n) => n.setTone(e.target.value))}
          aria-label="Callout tone"
        >
          <option value="info">Information</option>
          <option value="success">Success</option>
          <option value="warning">Warning</option>
          <option value="neutral">Neutral</option>
        </select>
        <button type="button" className="te-deco__remove" onClick={() => {
          editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            if (node) {
              node.remove();
            }
          });
        }}>Remove</button>
      </div>
      <input
        className="te-deco__title"
        value={title}
        placeholder="Callout title"
        onChange={(e) => updateNode(editor, nodeKey, (n) => n.setTitle(e.target.value))}
      />
      <textarea
        className="te-deco__body"
        value={body}
        placeholder="Callout body"
        rows={4}
        onChange={(e) => updateNode(editor, nodeKey, (n) => n.setBody(e.target.value))}
      />
    </aside>
  );
}

export class CalloutNode extends DecoratorNode {
  static getType() {
    return 'te-callout';
  }

  static clone(node) {
    return new CalloutNode(node.__tone, node.__title, node.__body, node.__key);
  }

  constructor(tone = 'info', title = '', body = '', key) {
    super(key);
    this.__tone = tone || 'info';
    this.__title = title || '';
    this.__body = body || '';
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
    return (
      <CalloutView
        nodeKey={this.getKey()}
        tone={this.__tone}
        title={this.__title}
        body={this.__body}
      />
    );
  }

  exportJSON() {
    return {
      type: 'te-callout',
      version: 1,
      tone: this.__tone,
      title: this.__title,
      body: this.__body,
    };
  }

  static importJSON(json) {
    return $createCalloutNode(json.tone, json.title, json.body);
  }

  exportDOM() {
    const aside = document.createElement('aside');
    aside.setAttribute('data-te-node', 'callout');
    aside.setAttribute('data-te-tone', this.__tone);
    aside.className = `ep-callout ep-callout--${this.__tone}`;
    const title = document.createElement('strong');
    title.className = 'ep-callout__title';
    title.setAttribute('data-te-field', 'title');
    title.textContent = this.__title;
    const body = document.createElement('div');
    body.className = 'ep-callout__body';
    body.setAttribute('data-te-field', 'body');
    body.innerHTML = this.__body || '';
    aside.append(title, body);
    return { element: aside };
  }

  static importDOM() {
    return {
      aside: (domNode) => {
        if (domNode.getAttribute('data-te-node') !== 'callout') {
          return null;
        }
        return {
          conversion: (el) => {
            const tone = el.getAttribute('data-te-tone') || 'info';
            const titleEl = el.querySelector('[data-te-field="title"]');
            const bodyEl = el.querySelector('[data-te-field="body"]');
            return {
              node: $createCalloutNode(
                tone,
                titleEl ? titleEl.textContent : '',
                bodyEl ? bodyEl.innerHTML : el.innerHTML
              ),
            };
          },
          priority: 4,
        };
      },
    };
  }

  setTone(tone) {
    const writable = this.getWritable();
    writable.__tone = tone;
  }

  setTitle(title) {
    const writable = this.getWritable();
    writable.__title = title;
  }

  setBody(body) {
    const writable = this.getWritable();
    writable.__body = body;
  }

  isInline() {
    return false;
  }
}

export function $createCalloutNode(tone = 'info', title = '', body = '') {
  return new CalloutNode(tone, title, body);
}

export function $isCalloutNode(node) {
  return node instanceof CalloutNode;
}
