import { useEffect, useRef, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $createTextNode,
  $getNodeByKey,
  $getSelection,
  $insertNodes,
  $isRangeSelection,
} from 'lexical';
import { $createLinkNode, $isLinkNode, $toggleLink } from '@lexical/link';
import { INSERT_TABLE_COMMAND } from '@lexical/table';
import { $findMatchingParent } from '@lexical/utils';
import { useEditorUi } from '../EditorUi.jsx';
import { $restoreRange, normalizeUrl } from '../rangeSelection.js';
import { $createImageNode, $isImageNode } from '../nodes/ImageNode.jsx';
import { $createRawHtmlNode } from '../nodes/RawHtmlNode.jsx';
import { iframeHtml } from '../embedUrl.js';
import { uploadImageFile } from '../upload.js';
import Dialog from '../ui/Dialog.jsx';

function useDialogForm(dialog, defaults) {
  const [values, setValues] = useState(() => ({ ...defaults, ...(dialog && dialog.payload ? dialog.payload : {}) }));
  useEffect(() => {
    if (dialog) {
      setValues({ ...defaults, ...(dialog.payload || {}) });
    }
    // dialog object is replaced whenever a new insert UI opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialog]);
  const set = (key, value) => setValues((prev) => ({ ...prev, [key]: value }));
  return [values, set];
}

function LinkDialog({ dialog, onClose }) {
  const [editor] = useLexicalComposerContext();
  const payload = dialog.payload || {};
  const [values, set] = useDialogForm(dialog, {
    url: '',
    text: '',
    newTab: true,
  });

  const apply = () => {
    const href = normalizeUrl(values.url);
    editor.update(() => {
      $restoreRange();
      const selection = $getSelection();
      if (!href) {
        $toggleLink(null);
        return;
      }
      const attrs = {
        target: values.newTab ? '_blank' : null,
        rel: values.newTab ? 'noopener noreferrer' : null,
      };
      if ($isRangeSelection(selection) && selection.isCollapsed() && !payload.existing) {
        const link = $createLinkNode(href, attrs);
        link.append($createTextNode((values.text || href).trim() || href));
        $insertNodes([link]);
        return;
      }
      $toggleLink(href, attrs);
    });
    onClose();
  };

  const unlink = () => {
    editor.update(() => {
      $restoreRange();
      $toggleLink(null);
    });
    onClose();
  };

  return (
    <Dialog
      title={payload.existing ? 'Edit link' : 'Insert link'}
      onClose={onClose}
      footer={
        <>
          {payload.existing ? (
            <button type="button" className="te-tb te-tb--wide" onClick={unlink}>
              Unlink
            </button>
          ) : null}
          <button type="button" className="te-tb te-tb--wide" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="te-tb te-tb--wide is-active" onClick={apply}>
            Save
          </button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          apply();
        }}
      >
        <label htmlFor="te-link-url">URL</label>
        <input
          id="te-link-url"
          type="text"
          value={values.url}
          onChange={(e) => set('url', e.target.value)}
          placeholder="https://"
        />
        {!payload.existing ? (
          <>
            <label htmlFor="te-link-text">Text</label>
            <input
              id="te-link-text"
              type="text"
              value={values.text}
              onChange={(e) => set('text', e.target.value)}
              placeholder="Link text"
            />
          </>
        ) : null}
        <label className="te-modal__check">
          <input
            type="checkbox"
            checked={!!values.newTab}
            onChange={(e) => set('newTab', e.target.checked)}
          />
          Open in a new tab
        </label>
      </form>
    </Dialog>
  );
}

function ImageDialog({ dialog, onClose }) {
  const [editor] = useLexicalComposerContext();
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const payload = dialog.payload || {};
  const [values, set] = useDialogForm(dialog, {
    src: '',
    alt: '',
    align: 'centre',
    width: '',
    nodeKey: null,
  });

  const apply = () => {
    const src = (values.src || '').trim();
    if (!src) {
      setError('Add an image URL or upload a file.');
      return;
    }
    editor.update(() => {
      $restoreRange();
      if (values.nodeKey) {
        const node = $getNodeByKey(values.nodeKey);
        if ($isImageNode(node)) {
          node.setSrc(src);
          node.setAlt(values.alt || '');
          node.setAlign(values.align || 'centre');
          node.setWidth(values.width || '');
          return;
        }
      }
      $insertNodes([$createImageNode(src, values.alt || '', values.align || 'centre', values.width || '')]);
    });
    onClose();
  };

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
      set('src', url);
      if (!values.alt) {
        set('alt', file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '));
      }
    } catch (err) {
      setError(err && err.message ? err.message : 'Upload failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      title={payload.nodeKey ? 'Edit image' : 'Insert image'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="te-tb te-tb--wide" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="te-tb te-tb--wide is-active" onClick={apply} disabled={busy}>
            {payload.nodeKey ? 'Save' : 'Insert'}
          </button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          apply();
        }}
      >
        {values.src ? (
          <div className="te-image__preview">
            <img src={values.src} alt={values.alt || ''} />
          </div>
        ) : null}
        <div className="te-image__row">
          <button
            type="button"
            className="te-deco__add te-image__upload"
            disabled={busy}
            onClick={() => fileRef.current && fileRef.current.click()}
          >
            {busy ? 'Uploading…' : 'Upload image'}
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPick} />
          <p className="te-image__hint">Or paste an image URL below.</p>
        </div>
        <label htmlFor="te-image-url">Image URL</label>
        <input
          id="te-image-url"
          type="text"
          value={values.src}
          onChange={(e) => set('src', e.target.value)}
          placeholder="https://… or /file/file/download?guid=…"
        />
        <label htmlFor="te-image-alt">Alt text</label>
        <input
          id="te-image-alt"
          type="text"
          value={values.alt}
          onChange={(e) => set('alt', e.target.value)}
          placeholder="Describe the image"
        />
        <label htmlFor="te-image-align">Alignment</label>
        <select
          id="te-image-align"
          className="te-tb-select"
          value={values.align}
          onChange={(e) => set('align', e.target.value)}
        >
          <option value="left">Left</option>
          <option value="centre">Centre</option>
          <option value="right">Right</option>
        </select>
        <label htmlFor="te-image-width">Width</label>
        <select
          id="te-image-width"
          className="te-tb-select"
          value={values.width}
          onChange={(e) => set('width', e.target.value)}
        >
          <option value="">Default</option>
          <option value="25%">25%</option>
          <option value="50%">50%</option>
          <option value="75%">75%</option>
          <option value="100%">100%</option>
          <option value="320px">320px</option>
          <option value="480px">480px</option>
        </select>
        {error ? <p className="te-image__error">{error}</p> : null}
      </form>
    </Dialog>
  );
}

function EmbedDialog({ dialog, onClose }) {
  const [editor] = useLexicalComposerContext();
  const [error, setError] = useState('');
  const [values, set] = useDialogForm(dialog, {
    url: '',
    title: '',
  });

  const apply = () => {
    const html = iframeHtml(values.url, values.title);
    if (!html) {
      setError('Paste a YouTube or Vimeo URL, or an embed iframe from those sites.');
      return;
    }
    editor.update(() => {
      $restoreRange();
      $insertNodes([$createRawHtmlNode(html)]);
    });
    onClose();
  };

  return (
    <Dialog
      title="Insert video"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="te-tb te-tb--wide" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="te-tb te-tb--wide is-active" onClick={apply}>
            Insert
          </button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          apply();
        }}
      >
        <label htmlFor="te-embed-url">YouTube or Vimeo URL</label>
        <input
          id="te-embed-url"
          type="text"
          value={values.url}
          onChange={(e) => {
            set('url', e.target.value);
            if (error) {
              setError('');
            }
          }}
          placeholder="https://www.youtube.com/watch?v=… or paste an iframe"
        />
        <p className="te-image__hint">Watch, Shorts, youtu.be, and Vimeo links are converted to a player. Other sites are not allowed.</p>
        <label htmlFor="te-embed-title">Title</label>
        <input
          id="te-embed-title"
          type="text"
          value={values.title}
          onChange={(e) => set('title', e.target.value)}
          placeholder="Optional — used as the iframe title"
        />
        {error ? <p className="te-image__error">{error}</p> : null}
      </form>
    </Dialog>
  );
}

function TableDialog({ dialog, onClose }) {
  const [editor] = useLexicalComposerContext();
  const [values, set] = useDialogForm(dialog, {
    rows: '3',
    columns: '3',
    headers: true,
  });

  const apply = () => {
    const rows = String(Math.min(20, Math.max(1, parseInt(values.rows, 10) || 3)));
    const columns = String(Math.min(10, Math.max(1, parseInt(values.columns, 10) || 3)));
    editor.update(() => {
      $restoreRange();
    });
    editor.dispatchCommand(INSERT_TABLE_COMMAND, {
      rows,
      columns,
      includeHeaders: !!values.headers,
    });
    onClose();
  };

  return (
    <Dialog
      title="Insert table"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="te-tb te-tb--wide" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="te-tb te-tb--wide is-active" onClick={apply}>
            Insert
          </button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          apply();
        }}
      >
        <label htmlFor="te-table-rows">Rows</label>
        <input
          id="te-table-rows"
          type="number"
          min="1"
          max="20"
          value={values.rows}
          onChange={(e) => set('rows', e.target.value)}
        />
        <label htmlFor="te-table-cols">Columns</label>
        <input
          id="te-table-cols"
          type="number"
          min="1"
          max="10"
          value={values.columns}
          onChange={(e) => set('columns', e.target.value)}
        />
        <label className="te-modal__check">
          <input
            type="checkbox"
            checked={!!values.headers}
            onChange={(e) => set('headers', e.target.checked)}
          />
          Header row
        </label>
      </form>
    </Dialog>
  );
}

export default function InsertDialogs() {
  const { dialog, close } = useEditorUi();
  if (!dialog) {
    return null;
  }
  if (dialog.type === 'link') {
    return <LinkDialog dialog={dialog} onClose={close} />;
  }
  if (dialog.type === 'image') {
    return <ImageDialog dialog={dialog} onClose={close} />;
  }
  if (dialog.type === 'embed') {
    return <EmbedDialog dialog={dialog} onClose={close} />;
  }
  if (dialog.type === 'table') {
    return <TableDialog dialog={dialog} onClose={close} />;
  }
  return null;
}

export function $linkPayloadFromSelection() {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) {
    return { url: '', text: '', newTab: true, existing: false };
  }
  const link = $findMatchingParent(selection.anchor.getNode(), $isLinkNode);
  if ($isLinkNode(link)) {
    return {
      url: link.getURL(),
      text: link.getTextContent(),
      newTab: link.getTarget() === '_blank',
      existing: true,
    };
  }
  return {
    url: '',
    text: selection.isCollapsed() ? '' : selection.getTextContent(),
    newTab: true,
    existing: false,
  };
}

export function $imagePayloadFromSelection() {
  const selection = $getSelection();
  if (!selection || typeof selection.getNodes !== 'function') {
    return {};
  }
  const node = selection.getNodes()[0];
  if ($isImageNode(node)) {
    return {
      nodeKey: node.getKey(),
      src: node.getSrc(),
      alt: node.getAlt(),
      align: node.getAlign(),
      width: node.getWidth(),
    };
  }
  return {};
}
