<?php

/**
 * @copyright Copyright (c) 2026 D Cube Consulting Ltd. All rights reserved.
 * @license AGPL-3.0-or-later
 */

declare(strict_types=1);

namespace humhub\modules\thiscoveryEditor\widgets;

use humhub\helpers\Html;
use humhub\modules\thiscoveryEditor\assets\EditorAsset;
use humhub\modules\thiscoveryEditor\helpers\EditorHtml;
use Yii;
use yii\base\InvalidConfigException;
use yii\helpers\Json;
use yii\widgets\InputWidget;

/**
 * Lexical editor field. The textarea POSTs HTML; JS mounts the editor on [data-te-editor].
 */
class EditorField extends InputWidget
{
    public string $placeholder = '';

    public int $height = 280;

    /**
     * page = callout/survey/accordion insert; simple = core formatting only.
     */
    public string $profile = 'page';

    /**
     * @var array<string,string> form id => title for Survey node
     */
    public array $forms = [];

    public function init()
    {
        parent::init();

        if (!Yii::$app->hasModule('thiscovery-editor') || Yii::$app->getModule('thiscovery-editor') === null) {
            throw new InvalidConfigException(
                'The Thiscovery Editor module (thiscovery-editor) must be installed and enabled.'
            );
        }

        Html::addCssClass($this->options, ['te-field__input', 'form-control']);
        $this->options['data-te-input'] = '1';
        if ($this->placeholder !== '') {
            $this->options['placeholder'] = $this->placeholder;
        }
    }

    public function run()
    {
        EditorAsset::register($this->getView());

        $raw = (string) $this->value;
        if ($this->hasModel()) {
            $attr = $this->attribute;
            $raw = (string) $this->model->$attr;
            $this->name = Html::getInputName($this->model, $this->attribute);
        }
        $value = EditorHtml::toEditorHtml($raw);

        $wrapOpts = [
            'class' => 'te-field',
            'data-te-editor' => '1',
            'data-te-height' => (string) $this->height,
            'data-te-profile' => $this->profile,
        ];
        if ($this->forms !== []) {
            $wrapOpts['data-te-forms'] = Json::encode($this->forms);
        }

        echo Html::beginTag('div', $wrapOpts);
        echo Html::textarea($this->name, $value, $this->options);
        echo Html::tag('div', '', ['class' => 'te-field__mount', 'data-te-mount' => '1']);
        echo Html::endTag('div');
    }
}
