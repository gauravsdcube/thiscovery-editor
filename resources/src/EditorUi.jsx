import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const EditorUiContext = createContext({
  dialog: null,
  open: () => {},
  close: () => {},
});

export function EditorUiProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const open = useCallback((type, payload = {}) => {
    setDialog({ type, payload });
  }, []);
  const close = useCallback(() => setDialog(null), []);
  const value = useMemo(() => ({ dialog, open, close }), [dialog, open, close]);
  return <EditorUiContext.Provider value={value}>{children}</EditorUiContext.Provider>;
}

export function useEditorUi() {
  return useContext(EditorUiContext);
}
