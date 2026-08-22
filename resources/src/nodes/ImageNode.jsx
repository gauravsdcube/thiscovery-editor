import { $getNodeByKey, DecoratorNode } from 'lexical';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useRef, useState } from 'react';
import { uploadImageFile } from '../upload.js';

function updateNode(editor, nodeKey, mutator) {
  editor.update(() => {
    const node = $getNodeByKey(nodeKey);
    if (node && typeof mutator === 'function') {
      mutator(node);
    }
  });
}

function ImageView({ nodeKey, src, alt }) {
  const [editor] = useLexicalComposerContext();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  const onPick = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) {
      return;
    }
    setBusy(true);
    setError('');
    try {
      const url = await uploadImageFile(file);
      updateNode(editor, nodeKey, (n) => {
        n.setSrc(url);
        if (!alt) {
          n.setAlt(file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '));
        }
      });
    } catch (err) {
      setError(err && err.message ? err.message : 'Upload failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <figure className="te-image te-deco">
      <div className="te-deco__bar">
        <span>Image</span>
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
      {src ? (
        <div className="te-image__preview">
          <img src={src} alt={alt || ''} />
        </div>
      ) : (
        <p className="te-deco__hint">Paste an image URL or upload a file.</p>
      )}
      <input
        className="te-deco__title"
        value={src}
        placeholder="https://… or /file/file/download?guid=…"
        onChange={(e) => updateNode(editor, nodeKey, (n) => n.setSrc(e.target.value))}
        aria-label="Image URL"
      />
      <input
        className="te-deco__title"
        value={alt}
        placeholder="Alt text (required for accessibility)"
        onChange={(e) => updateNode(editor, nodeKey, (n) => n.setAlt(e.target.value))}
        aria-label="Alt text"
      />
      <div className="te-image__row">
        <button
          type="button"
          className="te-deco__add"
          disabled={busy}
          onClick={() => fileRef.current && fileRef.current.click()}
        >
          {busy ? 'Uploading…' : 'Upload image'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={onPick}
        />
      </div>
      {error ? <p className="te-image__error">{error}</p> : null}
    </figure>
  );
}

function srcFrom(el) {
  return (el.getAttribute('src') || '').trim();
}

function altFrom(el, fallbackEl) {
  const alt = (el.getAttribute('alt') || '').trim();
  if (alt) {
    return alt;
  }
  if (fallbackEl) {
    return (fallbackEl.textContent || '').trim();
  }
  return '';
}

function convertImg(el) {
  return { node: $createImageNode(srcFrom(el), altFrom(el)) };
}

function convertFigure(el) {
  const img = el.querySelector('img');
  if (!img) {
    return { node: $createImageNode('', '') };
  }
  return { node: $createImageNode(srcFrom(img), altFrom(img, el.querySelector('figcaption'))) };
}

export class ImageNode extends DecoratorNode {
  static getType() {
    return 'te-image';
  }

  static clone(node) {
    return new ImageNode(node.__src, node.__alt, node.__key);
  }

  constructor(src = '', alt = '', key) {
    super(key);
    this.__src = src || '';
    this.__alt = alt || '';
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
    return <ImageView nodeKey={this.getKey()} src={this.__src} alt={this.__alt} />;
  }

  exportJSON() {
    return { type: 'te-image', version: 1, src: this.__src, alt: this.__alt };
  }

  static importJSON(json) {
    return $createImageNode(json.src, json.alt);
  }

  exportDOM() {
    const figure = document.createElement('figure');
    figure.setAttribute('data-te-node', 'image');
    figure.className = 'te-image-wrap';
    const img = document.createElement('img');
    img.setAttribute('src', this.__src || '');
    img.setAttribute('alt', this.__alt || '');
    figure.append(img);
    return { element: figure };
  }

  static importDOM() {
    return {
      figure: (domNode) => {
        if (domNode.getAttribute('data-te-node') === 'image') {
          return { conversion: convertFigure, priority: 4 };
        }
        const img = domNode.querySelector('img');
        if (img && !domNode.querySelector('iframe, video, table')) {
          return { conversion: convertFigure, priority: 4 };
        }
        return null;
      },
      img: (domNode) => {
        if (domNode.closest('figure[data-te-node="image"]') || (domNode.parentElement && domNode.parentElement.tagName === 'FIGURE')) {
          return null;
        }
        return { conversion: convertImg, priority: 4 };
      },
    };
  }

  setSrc(src) {
    const writable = this.getWritable();
    writable.__src = src || '';
  }

  setAlt(alt) {
    const writable = this.getWritable();
    writable.__alt = alt || '';
  }

  isInline() {
    return false;
  }
}

export function $createImageNode(src = '', alt = '') {
  return new ImageNode(src, alt);
}

export function $isImageNode(node) {
  return node instanceof ImageNode;
}
