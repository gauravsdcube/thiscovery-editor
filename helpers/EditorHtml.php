<?php

/**
 * @copyright Copyright (c) 2026 D Cube Consulting Ltd. All rights reserved.
 * @license AGPL-3.0-or-later
 */

declare(strict_types=1);

namespace humhub\modules\thiscoveryEditor\helpers;

use humhub\modules\content\widgets\richtext\RichText;
use Yii;
use yii\helpers\Html;
use yii\helpers\HtmlPurifier;

/**
 * Converts stored editor content (Lexical HTML, TinyMCE HTML, or HumHub markdown)
 * for the editor and for public output.
 */
class EditorHtml
{
    public static function looksLikeHtml(string $content): bool
    {
        return (bool) preg_match(
            '/<\/?(p|div|h[1-6]|ul|ol|li|table|thead|tbody|tr|td|th|strong|em|br|a|span|img|blockquote|figure|iframe|pre|code|hr|sub|sup|mark|aside|section|details|summary)(\s|\/|>)/i',
            $content
        );
    }

    public static function toEditorHtml(?string $content): string
    {
        $content = trim((string) $content);
        if ($content === '') {
            return '';
        }
        if (self::looksLikeHtml($content)) {
            return $content;
        }

        try {
            return RichText::convert($content, RichText::FORMAT_HTML);
        } catch (\Throwable $e) {
            Yii::warning('Thiscovery Editor markdown→HTML failed: ' . $e->getMessage(), 'thiscovery-editor');
            return Html::encode($content);
        }
    }

    public static function toHtml(?string $content): string
    {
        $content = trim((string) $content);
        if ($content === '') {
            return '';
        }
        if (self::looksLikeHtml($content)) {
            return self::rewriteSurveyLinks(self::purify($content));
        }

        try {
            return RichText::convert($content, RichText::FORMAT_HTML);
        } catch (\Throwable $e) {
            Yii::warning('Thiscovery Editor markdown render failed: ' . $e->getMessage(), 'thiscovery-editor');
            return Html::encode($content);
        }
    }

    public static function purify(string $html): string
    {
        $html = self::normaliseIndentStyles($html);

        return HtmlPurifier::process($html, static function ($config): void {
            /* @var \HTMLPurifier_Config $config */
            $config->set('HTML.DefinitionID', 'thiscovery-editor');
            $config->set('HTML.DefinitionRev', 6);
            $config->set('HTML.Attr.Name.UseCDATA', true);
            $config->set('Attr.AllowedFrameTargets', ['_blank']);
            $config->set('Attr.EnableID', true);
            $config->set('CSS.AllowTricky', true);
            $config->set('HTML.SafeIframe', true);
            $config->set(
                'URI.SafeIframeRegexp',
                '%^(https?:)?//(www\.youtube(?:-nocookie)?\.com/embed/|player\.vimeo\.com/video/)%'
            );

            $definition = $config->maybeGetRawHTMLDefinition();
            if ($definition === null) {
                return;
            }

            $definition->addAttribute('iframe', 'allowfullscreen', 'Bool');
            $definition->addAttribute('iframe', 'allow', 'Text');
            $definition->addAttribute('img', 'style', 'Text');
            $definition->addAttribute('img', 'class', 'Text');
            $definition->addAttribute('img', 'alt', 'Text');
            $definition->addAttribute('figure', 'data-te-node', 'Text');
            $definition->addAttribute('figure', 'class', 'Text');
            $definition->addAttribute('figure', 'style', 'Text');
            $definition->addAttribute('table', 'style', 'Text');
            $definition->addAttribute('table', 'class', 'Text');
            $definition->addAttribute('th', 'style', 'Text');
            $definition->addAttribute('th', 'class', 'Text');
            $definition->addAttribute('td', 'style', 'Text');
            $definition->addAttribute('td', 'class', 'Text');
            $definition->addAttribute('p', 'style', 'Text');
            $definition->addAttribute('span', 'style', 'Text');
            $definition->addAttribute('div', 'style', 'Text');
            $definition->addAttribute('aside', 'data-te-node', 'Text');
            $definition->addAttribute('aside', 'data-te-tone', 'Text');
            $definition->addAttribute('aside', 'class', 'Text');
            $definition->addAttribute('section', 'data-te-node', 'Text');
            $definition->addAttribute('section', 'data-te-form-id', 'Text');
            $definition->addAttribute('section', 'class', 'Text');
            $definition->addAttribute('div', 'data-te-field', 'Text');
            $definition->addAttribute('div', 'data-te-item', 'Text');
            $definition->addAttribute('div', 'data-te-node', 'Text');
            $definition->addAttribute('strong', 'data-te-field', 'Text');
            $definition->addAttribute('strong', 'class', 'Text');
            $definition->addAttribute('details', 'class', 'Text');
            $definition->addAttribute('details', 'open', 'Bool');
            $definition->addAttribute('summary', 'data-te-field', 'Text');
            $definition->addAttribute('summary', 'class', 'Text');
            $definition->addAttribute('a', 'data-te-field', 'Text');
            $definition->addAttribute('a', 'data-te-node', 'Text');
            $definition->addAttribute('a', 'data-te-style', 'Text');
            $definition->addAttribute('a', 'class', 'Text');
            $definition->addAttribute('p', 'data-te-node', 'Text');
            $definition->addAttribute('p', 'class', 'Text');
            $definition->addAttribute('span', 'class', 'Text');
            if (!isset($definition->info['mark'])) {
                $definition->addElement('mark', 'Inline', 'Inline', 'Common');
            }
            foreach (['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'ul', 'ol', 'li', 'code', 'sub', 'sup', 'mark'] as $tag) {
                $definition->addAttribute($tag, 'style', 'Text');
                $definition->addAttribute($tag, 'class', 'Text');
            }
            $definition->addAttribute('ol', 'start', 'Number');
            $definition->addAttribute('li', 'value', 'Number');
            $definition->addAttribute('li', 'role', 'Text');
            $definition->addAttribute('li', 'tabindex', 'Text');
            $definition->addAttribute('li', 'aria-checked', 'Enum#true,false');
            $definition->addAttribute('hr', 'class', 'Text');
            $definition->addAttribute('pre', 'class', 'Text');
            $definition->addAttribute('pre', 'style', 'Text');
            $definition->addAttribute('pre', 'spellcheck', 'Enum#true,false');
            $definition->addAttribute('pre', 'data-language', 'Text');
            $definition->addAttribute('pre', 'data-highlight-language', 'Text');
        });
    }

    /**
     * Lexical indent uses padding-inline-start: calc(n * 40px), which HtmlPurifier drops.
     */
    private static function normaliseIndentStyles(string $html): string
    {
        $html = preg_replace_callback(
            '/padding-inline-start\s*:\s*calc\(\s*(\d+(?:\.\d+)?)\s*\*\s*(\d+(?:\.\d+)?)px\s*\)/i',
            static function (array $m): string {
                return 'padding-left: ' . (string) (int) round(((float) $m[1]) * ((float) $m[2])) . 'px';
            },
            $html
        ) ?? $html;

        return preg_replace('/padding-inline-start\s*:/i', 'padding-left:', $html) ?? $html;
    }

    /**
     * Resolve Survey node buttons to Thiscovery Form URLs when that module is present.
     */
    public static function rewriteSurveyLinks(string $html): string
    {
        if ($html === '' || !str_contains($html, 'data-te-node')) {
            return $html;
        }
        if (!class_exists(\humhub\modules\thiscoveryForms\models\CustomForm::class)
            || !class_exists(\humhub\modules\thiscoveryForms\helpers\Url::class)) {
            return $html;
        }

        $dom = new \DOMDocument();
        $prev = libxml_use_internal_errors(true);
        $dom->loadHTML('<?xml encoding="utf-8"><div id="te-wrap">' . $html . '</div>', LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);
        libxml_clear_errors();
        libxml_use_internal_errors($prev);

        $xpath = new \DOMXPath($dom);
        foreach ($xpath->query('//*[@data-te-node="survey"]') as $section) {
            $formId = (int) $section->getAttribute('data-te-form-id');
            if ($formId < 1) {
                continue;
            }
            $form = \humhub\modules\thiscoveryForms\models\CustomForm::findOne($formId);
            if ($form === null) {
                continue;
            }
            $url = \humhub\modules\thiscoveryForms\helpers\Url::toView($form);
            foreach ($xpath->query('.//*[@data-te-field="button"]', $section) as $btn) {
                if ($btn instanceof \DOMElement) {
                    $btn->setAttribute('href', $url);
                }
            }
        }

        $wrap = $dom->getElementById('te-wrap');
        if ($wrap === null) {
            return $html;
        }
        $out = '';
        foreach ($wrap->childNodes as $child) {
            $out .= $dom->saveHTML($child);
        }
        return $out !== '' ? $out : $html;
    }
}
