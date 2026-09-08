# Thiscovery Editor

**Version 1.4.2**  
**Copyright (c) 2026 D Cube Consulting Ltd. All rights reserved.**  
**License:** [AGPL-3.0-or-later](LICENSE)

HumHub module providing a Thiscovery-owned Lexical rich-text editor. Used by Thiscovery Page Builder.

## Requirements

- HumHub **1.18+**
- PHP 8.1+
- Node.js 20+ (to rebuild the editor bundle)

## Install

1. Copy into `protected/modules/thiscovery-editor`
2. Enable **Thiscovery Editor** in Administration → Modules
3. Rebuild assets after JS changes:

```bash
cd protected/modules/thiscovery-editor
npm install
npm run build
```

## Widget

```php
use humhub\modules\thiscoveryEditor\widgets\EditorField;

echo EditorField::widget([
    'id' => 'my-field',
    'name' => 'body',
    'value' => $html,
    'height' => 320,
    'profile' => 'page', // or 'simple'
    'forms' => [ '1' => 'Patient survey' ],
]);
```

`profile=page` includes Callout, Accordion, and Survey insert buttons. Both profiles include Button, **Image** (dialog: URL or upload, alt, alignment, width), and **Table** (insert dialog; cell menu when the cursor is in a table). URLs (`https://…`, `www.…`) and email addresses become links as you type or paste. Links can also be added with the dialog, the floating edit bar, or Markdown `[text](url)`. Formatting covers colour, highlight, font, alignment, indent, strike/sub/super, inline code, headings 1–6, checklists, **code blocks**, and **horizontal rules**. Type Markdown shortcuts such as `**bold**`, `# heading`, `- list`, and `---` while editing. Select text to show a floating format bar. `simple` hides the page-only blocks.

Use the **HTML** toolbar button to edit raw markup. Iframes and other HTML that is not a native block are kept as HTML blocks. Public pages still sanitise output.

## JS API

```js
humhub.require('thiscoveryEditor').initEditors($scope);
humhub.require('thiscoveryEditor').saveEditors($scope);
humhub.require('thiscoveryEditor').destroyEditors($scope);
```
