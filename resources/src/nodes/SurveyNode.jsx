import { $getNodeByKey, DecoratorNode } from 'lexical';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { FormsContext } from '../FormsContext';
import { useContext } from 'react';

function getNode(nodeKey) {
  return $getNodeByKey(nodeKey);
}

function SurveyView({ nodeKey, formId, buttonLabel, intro }) {
  const [editor] = useLexicalComposerContext();
  const forms = useContext(FormsContext) || {};
  const entries = Object.entries(forms);

  return (
    <section className="ep-survey-cta te-deco">
      <div className="te-deco__bar">
        <span>Survey</span>
        <button type="button" className="te-deco__remove" onClick={() => {
          editor.update(() => {
            const node = getNode(nodeKey);
            if (node) {
              node.remove();
            }
          });
        }}>Remove</button>
      </div>
      {entries.length > 0 ? (
        <select
          value={formId || ''}
          onChange={(e) => editor.update(() => {
            const node = getNode(nodeKey);
            if (node) {
              node.setFormId(e.target.value);
            }
          })}
          aria-label="Thiscovery Form"
        >
          <option value="">Select a form…</option>
          {entries.map(([id, title]) => (
            <option key={id} value={id}>{title}</option>
          ))}
        </select>
      ) : (
        <p className="te-deco__hint">No Thiscovery Forms available. Pass form options from the page builder.</p>
      )}
      <input
        className="te-deco__title"
        value={buttonLabel || ''}
        placeholder="Button label"
        onChange={(e) => editor.update(() => {
          const node = getNode(nodeKey);
          if (node) {
            node.setButtonLabel(e.target.value);
          }
        })}
      />
      <textarea
        className="te-deco__body"
        rows={3}
        value={intro || ''}
        placeholder="Intro text"
        onChange={(e) => editor.update(() => {
          const node = getNode(nodeKey);
          if (node) {
            node.setIntro(e.target.value);
          }
        })}
      />
    </section>
  );
}

export class SurveyNode extends DecoratorNode {
  static getType() {
    return 'te-survey';
  }

  static clone(node) {
    return new SurveyNode(node.__formId, node.__buttonLabel, node.__intro, node.__key);
  }

  constructor(formId = '', buttonLabel = 'Take the survey', intro = '', key) {
    super(key);
    this.__formId = formId || '';
    this.__buttonLabel = buttonLabel || 'Take the survey';
    this.__intro = intro || '';
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
      <SurveyView
        nodeKey={this.getKey()}
        formId={this.__formId}
        buttonLabel={this.__buttonLabel}
        intro={this.__intro}
      />
    );
  }

  exportJSON() {
    return {
      type: 'te-survey',
      version: 1,
      formId: this.__formId,
      buttonLabel: this.__buttonLabel,
      intro: this.__intro,
    };
  }

  static importJSON(json) {
    return $createSurveyNode(json.formId, json.buttonLabel, json.intro);
  }

  exportDOM() {
    const section = document.createElement('section');
    section.setAttribute('data-te-node', 'survey');
    section.setAttribute('data-te-form-id', this.__formId);
    section.className = 'ep-survey-cta';
    const intro = document.createElement('div');
    intro.className = 'ep-survey-intro';
    intro.setAttribute('data-te-field', 'intro');
    intro.innerHTML = this.__intro || '';
    const btn = document.createElement('a');
    btn.className = 'btn btn-primary';
    btn.setAttribute('data-te-field', 'button');
    btn.setAttribute('href', '#');
    btn.textContent = this.__buttonLabel || 'Take the survey';
    section.append(intro, btn);
    return { element: section };
  }

  static importDOM() {
    return {
      section: (domNode) => {
        if (domNode.getAttribute('data-te-node') !== 'survey') {
          return null;
        }
        return {
          conversion: (el) => {
            const introEl = el.querySelector('[data-te-field="intro"]');
            const btnEl = el.querySelector('[data-te-field="button"]');
            return {
              node: $createSurveyNode(
                el.getAttribute('data-te-form-id') || '',
                btnEl ? btnEl.textContent : 'Take the survey',
                introEl ? introEl.innerHTML : ''
              ),
            };
          },
          priority: 4,
        };
      },
    };
  }

  setFormId(formId) {
    const writable = this.getWritable();
    writable.__formId = formId;
  }

  setButtonLabel(label) {
    const writable = this.getWritable();
    writable.__buttonLabel = label;
  }

  setIntro(intro) {
    const writable = this.getWritable();
    writable.__intro = intro;
  }

  isInline() {
    return false;
  }
}

export function $createSurveyNode(formId, buttonLabel, intro) {
  return new SurveyNode(formId, buttonLabel, intro);
}

export function $isSurveyNode(node) {
  return node instanceof SurveyNode;
}
