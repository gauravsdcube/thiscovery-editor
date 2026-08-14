import { $getNodeByKey, DecoratorNode } from 'lexical';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';

const STYLES = {
  primary: 'btn btn-primary',
  secondary: 'btn btn-secondary',
  light: 'btn btn-light',
};

function styleClass(style) {
  return STYLES[style] || STYLES.primary;
}

function updateNode(editor, nodeKey, mutator) {
  editor.update(() => {
    const node = $getNodeByKey(nodeKey);
    if (node && typeof mutator === 'function') {
      mutator(node);
    }
  });
}

function ButtonView({ nodeKey, label, url, style, newTab }) {
  const [editor] = useLexicalComposerContext();
  return (
    <div className="te-button te-deco">
      <div className="te-deco__bar">
        <span>Button</span>
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
      <input
        className="te-deco__title"
        value={label}
        placeholder="Button label"
        onChange={(e) => updateNode(editor, nodeKey, (n) => n.setLabel(e.target.value))}
      />
      <input
        className="te-deco__title"
        value={url}
        placeholder="https://…"
        onChange={(e) => updateNode(editor, nodeKey, (n) => n.setUrl(e.target.value))}
      />
      <div className="te-button__row">
        <select
          value={style}
          onChange={(e) => updateNode(editor, nodeKey, (n) => n.setStyle(e.target.value))}
          aria-label="Button style"
        >
          <option value="primary">Primary</option>
          <option value="secondary">Secondary</option>
          <option value="light">Light</option>
        </select>
        <label className="te-button__newtab">
          <input
            type="checkbox"
            checked={!!newTab}
            onChange={(e) => updateNode(editor, nodeKey, (n) => n.setNewTab(e.target.checked))}
          />
          Open in new tab
        </label>
      </div>
      <div className="te-button__preview">
        <span className={styleClass(style)}>{label || 'Button'}</span>
      </div>
    </div>
  );
}

function convertButtonElement(el) {
  const anchor = el.tagName === 'A' ? el : el.querySelector('a');
  if (!anchor) {
    return { node: $createButtonNode('Button', '', 'primary', false) };
  }
  let style = anchor.getAttribute('data-te-style') || '';
  if (!STYLES[style]) {
    if (anchor.classList.contains('btn-light')) {
      style = 'light';
    } else if (anchor.classList.contains('btn-secondary') || anchor.classList.contains('btn-default')) {
      style = 'secondary';
    } else {
      style = 'primary';
    }
  }
  return {
    node: $createButtonNode(
      (anchor.textContent || '').trim() || 'Button',
      anchor.getAttribute('href') || '',
      style,
      anchor.getAttribute('target') === '_blank'
    ),
  };
}

export class ButtonNode extends DecoratorNode {
  static getType() {
    return 'te-button';
  }

  static clone(node) {
    return new ButtonNode(node.__label, node.__url, node.__style, node.__newTab, node.__key);
  }

  constructor(label = 'Button', url = '', style = 'primary', newTab = false, key) {
    super(key);
    this.__label = label || 'Button';
    this.__url = url || '';
    this.__style = STYLES[style] ? style : 'primary';
    this.__newTab = !!newTab;
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
      <ButtonView
        nodeKey={this.getKey()}
        label={this.__label}
        url={this.__url}
        style={this.__style}
        newTab={this.__newTab}
      />
    );
  }

  exportJSON() {
    return {
      type: 'te-button',
      version: 1,
      label: this.__label,
      url: this.__url,
      style: this.__style,
      newTab: this.__newTab,
    };
  }

  static importJSON(json) {
    return $createButtonNode(json.label, json.url, json.style, json.newTab);
  }

  exportDOM() {
    const wrap = document.createElement('p');
    wrap.setAttribute('data-te-node', 'button');
    wrap.className = 'te-button-wrap';
    const a = document.createElement('a');
    a.className = styleClass(this.__style);
    a.setAttribute('data-te-node', 'button');
    a.setAttribute('data-te-style', this.__style);
    a.setAttribute('href', this.__url || '#');
    if (this.__newTab) {
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer');
    }
    a.textContent = this.__label || 'Button';
    wrap.append(a);
    return { element: wrap };
  }

  static importDOM() {
    return {
      p: (domNode) => {
        if (domNode.getAttribute('data-te-node') !== 'button') {
          return null;
        }
        return { conversion: convertButtonElement, priority: 4 };
      },
      a: (domNode) => {
        if (domNode.getAttribute('data-te-node') === 'button') {
          return { conversion: convertButtonElement, priority: 4 };
        }
        if (
          domNode.classList.contains('btn')
          && !domNode.closest('[data-te-node="survey"]')
          && !domNode.closest('[data-te-node="button"]')
        ) {
          return { conversion: convertButtonElement, priority: 3 };
        }
        return null;
      },
    };
  }

  setLabel(label) {
    const writable = this.getWritable();
    writable.__label = label;
  }

  setUrl(url) {
    const writable = this.getWritable();
    writable.__url = url;
  }

  setStyle(style) {
    const writable = this.getWritable();
    writable.__style = STYLES[style] ? style : 'primary';
  }

  setNewTab(newTab) {
    const writable = this.getWritable();
    writable.__newTab = !!newTab;
  }

  isInline() {
    return false;
  }
}

export function $createButtonNode(label = 'Button', url = '', style = 'primary', newTab = false) {
  return new ButtonNode(label, url, style, newTab);
}

export function $isButtonNode(node) {
  return node instanceof ButtonNode;
}
