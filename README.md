# Thiscovery Editor

**Version 1.0.0**  
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

`profile=page` includes Callout, Accordion, and Survey insert buttons. Both profiles include a Button insert (label, URL, style). `simple` is otherwise core formatting only.

Use the **HTML** toolbar button to edit raw markup. Tables, iframes, and other HTML that is not a native block are kept as HTML blocks. Public pages still sanitise output.

## JS API

```js
humhub.require('thiscoveryEditor').initEditors($scope);
humhub.require('thiscoveryEditor').saveEditors($scope);
humhub.require('thiscoveryEditor').destroyEditors($scope);
```
