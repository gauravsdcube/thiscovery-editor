import { $getNodeByKey, DecoratorNode } from 'lexical';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useEditorUi } from '../EditorUi.jsx';

function alignFrom(el) {
  const cls = el.getAttribute('class') || '';
  if (cls.indexOf('te-image-wrap--left') >= 0 || (el.style && el.style.textAlign === 'left')) {
    return 'left';
  }
  if (cls.indexOf('te-image-wrap--right') >= 0 || (el.style && el.style.textAlign === 'right')) {
    return 'right';
  }
  return 'centre';
}

function widthFrom(img) {
  return (img && img.style && img.style.width) || '';
}

function ImageView({ nodeKey, src, alt, align, width }) {
  const [editor] = useLexicalComposerContext();
  const { open } = useEditorUi();

  return (
    <figure className={'te-image te-deco te-image--' + (align || 'centre')}>
      <div className="te-deco__bar">
        <span>Image</span>
        <span>
          <button
            type="button"
            className="te-deco__add"
            onClick={() => open('image', { nodeKey, src, alt, align, width })}
          >
            Edit
          </button>{' '}
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
        </span>
      </div>
      {src ? (
        <div
          className="te-image__preview"
          onClick={() => open('image', { nodeKey, src, alt, align, width })}
        >
          <img src={src} alt={alt || ''} style={width ? { width } : undefined} />
        </div>
      ) : (
        <p className="te-deco__hint">No image yet. Click Edit to add a URL or upload a file.</p>
      )}
      {alt ? <p className="te-deco__hint">{alt}</p> : <p className="te-deco__hint">Add alt text in Edit.</p>}
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
  return { node: $createImageNode(srcFrom(el), altFrom(el), alignFrom(el.parentElement || el), widthFrom(el)) };
}

function convertFigure(el) {
  const img = el.querySelector('img');
  if (!img) {
    return { node: $createImageNode('', '', alignFrom(el), '') };
  }
  return {
    node: $createImageNode(srcFrom(img), altFrom(img, el.querySelector('figcaption')), alignFrom(el), widthFrom(img)),
  };
}

export class ImageNode extends DecoratorNode {
  static getType() {
    return 'te-image';
  }

  static clone(node) {
    return new ImageNode(node.__src, node.__alt, node.__align, node.__width, node.__key);
  }

  constructor(src = '', alt = '', align = 'centre', width = '', key) {
    super(key);
    this.__src = src || '';
    this.__alt = alt || '';
    this.__align = align || 'centre';
    this.__width = width || '';
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
      <ImageView
        nodeKey={this.getKey()}
        src={this.__src}
        alt={this.__alt}
        align={this.__align}
        width={this.__width}
      />
    );
  }

  exportJSON() {
    return {
      type: 'te-image',
      version: 2,
      src: this.__src,
      alt: this.__alt,
      align: this.__align,
      width: this.__width,
    };
  }

  static importJSON(json) {
    return $createImageNode(json.src, json.alt, json.align, json.width);
  }

  exportDOM() {
    const figure = document.createElement('figure');
    figure.setAttribute('data-te-node', 'image');
    const align = this.__align || 'centre';
    figure.className = 'te-image-wrap te-image-wrap--' + align;
    figure.style.textAlign = align === 'centre' ? 'center' : align;
    const img = document.createElement('img');
    img.setAttribute('src', this.__src || '');
    img.setAttribute('alt', this.__alt || '');
    if (this.__width) {
      img.style.width = this.__width;
    }
    img.style.maxWidth = '100%';
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

  getSrc() {
    return this.__src;
  }

  getAlt() {
    return this.__alt;
  }

  getAlign() {
    return this.__align || 'centre';
  }

  getWidth() {
    return this.__width || '';
  }

  setSrc(src) {
    const writable = this.getWritable();
    writable.__src = src || '';
  }

  setAlt(alt) {
    const writable = this.getWritable();
    writable.__alt = alt || '';
  }

  setAlign(align) {
    const writable = this.getWritable();
    writable.__align = align || 'centre';
  }

  setWidth(width) {
    const writable = this.getWritable();
    writable.__width = width || '';
  }

  isInline() {
    return false;
  }
}

export function $createImageNode(src = '', alt = '', align = 'centre', width = '') {
  return new ImageNode(src, alt, align, width);
}

export function $isImageNode(node) {
  return node instanceof ImageNode;
}
