<?php

/**
 * @copyright Copyright (c) 2026 D Cube Consulting Ltd. All rights reserved.
 * @license AGPL-3.0-or-later
 */

declare(strict_types=1);

namespace humhub\modules\thiscoveryEditor\assets;

use humhub\components\assets\AssetBundle;
use yii\web\View;

class EditorAsset extends AssetBundle
{
    public $sourcePath = '@thiscovery-editor/resources';

    public $css = [
        'dist/editor.css',
    ];

    public $js = [
        'dist/editor.js',
        'js/humhub.thiscoveryEditor.js',
    ];

    public $jsOptions = [
        'position' => View::POS_END,
    ];

    public $depends = [
        'humhub\assets\CoreApiAsset',
    ];

    public $appendTimestamp = true;

    public $publishOptions = [
        'forceCopy' => true,
        'except' => [
            'src',
            'node_modules',
        ],
    ];
}
