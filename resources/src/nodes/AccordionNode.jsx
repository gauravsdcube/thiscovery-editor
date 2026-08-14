import { $getNodeByKey, DecoratorNode } from 'lexical';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';

function getNode(nodeKey) {
  return $getNodeByKey(nodeKey);
}

function AccordionView({ nodeKey, items }) {
  const [editor] = useLexicalComposerContext();
  const list = Array.isArray(items) && items.length ? items : [{ heading: '', body: '' }];

  const patch = (next) => {
    editor.update(() => {
      const node = getNode(nodeKey);
      if (node) {
        node.setItems(next);
      }
    });
  };

  return (
    <section className="ep-accordion te-deco">
      <div className="te-deco__bar">
        <span>Accordion</span>
        <button type="button" className="te-deco__remove" onClick={() => {
          editor.update(() => {
            const node = getNode(nodeKey);
            if (node) {
              node.remove();
            }
          });
        }}>Remove</button>
      </div>
      {list.map((item, i) => (
        <div className="te-acc-item" key={i}>
          <input
            className="te-deco__title"
            value={item.heading || ''}
            placeholder="Heading"
            onChange={(e) => {
              const next = list.map((row, idx) => (idx === i ? { ...row, heading: e.target.value } : row));
              patch(next);
            }}
          />
          <textarea
            className="te-deco__body"
            rows={3}
            value={item.body || ''}
            placeholder="Body"
            onChange={(e) => {
              const next = list.map((row, idx) => (idx === i ? { ...row, body: e.target.value } : row));
              patch(next);
            }}
          />
          {list.length > 1 && (
            <button type="button" className="te-deco__remove" onClick={() => patch(list.filter((_, idx) => idx !== i))}>
              Remove row
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        className="te-deco__add"
        onClick={() => patch(list.concat([{ heading: '', body: '' }]))}
      >
        Add item
      </button>
    </section>
  );
}

export class AccordionNode extends DecoratorNode {
  static getType() {
    return 'te-accordion';
  }

  static clone(node) {
    return new AccordionNode(node.__items, node.__key);
  }

  constructor(items, key) {
    super(key);
    this.__items = Array.isArray(items) && items.length ? items : [{ heading: '', body: '' }];
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
    return <AccordionView nodeKey={this.getKey()} items={this.__items} />;
  }

  exportJSON() {
    return { type: 'te-accordion', version: 1, items: this.__items };
  }

  static importJSON(json) {
    return $createAccordionNode(json.items);
  }

  exportDOM() {
    const section = document.createElement('section');
    section.setAttribute('data-te-node', 'accordion');
    section.className = 'ep-accordion';
    const list = document.createElement('div');
    list.className = 'ep-accordion__list';
    (this.__items || []).forEach((item, i) => {
      const details = document.createElement('details');
      details.className = 'ep-accordion__item';
      details.setAttribute('data-te-item', '1');
      if (i === 0) {
        details.setAttribute('open', '');
      }
      const summary = document.createElement('summary');
      summary.className = 'ep-accordion__summary';
      summary.setAttribute('data-te-field', 'heading');
      summary.textContent = item.heading || '';
      const body = document.createElement('div');
      body.className = 'ep-accordion__body';
      body.setAttribute('data-te-field', 'body');
      body.innerHTML = item.body || '';
      details.append(summary, body);
      list.append(details);
    });
    section.append(list);
    return { element: section };
  }

  static importDOM() {
    return {
      section: (domNode) => {
        if (domNode.getAttribute('data-te-node') !== 'accordion') {
          return null;
        }
        return {
          conversion: (el) => {
            const items = [];
            el.querySelectorAll('[data-te-item], details').forEach((row) => {
              const headingEl = row.querySelector('[data-te-field="heading"], summary');
              const bodyEl = row.querySelector('[data-te-field="body"]');
              items.push({
                heading: headingEl ? headingEl.textContent : '',
                body: bodyEl ? bodyEl.innerHTML : '',
              });
            });
            return { node: $createAccordionNode(items) };
          },
          priority: 4,
        };
      },
    };
  }

  setItems(items) {
    const writable = this.getWritable();
    writable.__items = items;
  }

  isInline() {
    return false;
  }
}

export function $createAccordionNode(items) {
  return new AccordionNode(items);
}

export function $isAccordionNode(node) {
  return node instanceof AccordionNode;
}
