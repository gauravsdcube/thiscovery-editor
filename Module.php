<?php

/**
 * @copyright Copyright (c) 2026 D Cube Consulting Ltd. All rights reserved.
 * @license AGPL-3.0-or-later
 */

declare(strict_types=1);

namespace humhub\modules\thiscoveryEditor;

use Yii;

class Module extends \humhub\components\Module
{
    public $resourcesPath = 'resources';

    public function getName()
    {
        return Yii::t('ThiscoveryEditorModule.base', 'Thiscovery Editor');
    }

    public function getDescription()
    {
        return Yii::t(
            'ThiscoveryEditorModule.base',
            'Lexical editor with formatting, tables, images, YouTube/Vimeo embeds, and Thiscovery callout, survey, accordion, and button blocks.'
        );
    }
}
