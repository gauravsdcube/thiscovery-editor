import React, { createRef } from 'react';
import { createRoot } from 'react-dom/client';
import EditorApp, { writeHtml } from './EditorApp.jsx';
import './editor.css';

const instances = new WeakMap();

function parseForms(el) {
  const raw = el.getAttribute('data-te-forms');
  if (!raw) {
    return {};
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    return {};
  }
}

function mount(wrapper) {
  if (!wrapper || instances.has(wrapper)) {
    return;
  }
  const textarea = wrapper.querySelector('[data-te-input], textarea');
  const mountEl = wrapper.querySelector('[data-te-mount]');
  if (!textarea || !mountEl) {
    return;
  }
  const height = parseInt(wrapper.getAttribute('data-te-height'), 10) || 280;
  const profile = wrapper.getAttribute('data-te-profile') || 'page';
  const forms = parseForms(wrapper);
  const editorRef = createRef();
  const saveRef = createRef();
  const root = createRoot(mountEl);
  root.render(
    <EditorApp
      textarea={textarea}
      height={height}
      profile={profile}
      html={textarea.value || ''}
      forms={forms}
      editorRef={editorRef}
      saveRef={saveRef}
    />
  );
  textarea.classList.add('te-field__input--hidden');
  instances.set(wrapper, { root, textarea, editorRef, saveRef });
}

function save(wrapper) {
  const inst = wrapper && instances.get(wrapper);
  if (!inst) {
    return;
  }
  if (inst.saveRef && typeof inst.saveRef.current === 'function') {
    inst.saveRef.current();
    return;
  }
  if (inst.editorRef && inst.editorRef.current) {
    writeHtml(inst.editorRef.current, inst.textarea);
  }
}

function destroy(wrapper) {
  const inst = wrapper && instances.get(wrapper);
  if (!inst) {
    return;
  }
  save(wrapper);
  try {
    inst.root.unmount();
  } catch (e) {}
  inst.textarea.classList.remove('te-field__input--hidden');
  instances.delete(wrapper);
}

function init(target) {
  if (!target) {
    return;
  }
  if (target.hasAttribute && target.hasAttribute('data-te-editor')) {
    mount(target);
    return;
  }
  const nodes = target.querySelectorAll ? target.querySelectorAll('[data-te-editor]') : [];
  nodes.forEach(mount);
}

function saveAll() {
  document.querySelectorAll('[data-te-editor]').forEach((el) => {
    if (instances.has(el)) {
      save(el);
    }
  });
}

const api = { init, destroy, save, saveAll, mount };
window.ThiscoveryEditor = api;
export default api;
