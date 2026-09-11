<?php

/**
 * @copyright Copyright (c) 2026 D Cube Consulting Ltd. All rights reserved.
 * @license AGPL-3.0-or-later
 */

declare(strict_types=1);

namespace humhub\modules\thiscoveryEditor\helpers;

use yii\helpers\Html;

/**
 * Turns a YouTube or Vimeo URL (or pasted iframe) into an iframe that
 * HTML Purifier will keep (www.youtube.com/embed, youtube-nocookie, player.vimeo.com).
 */
class EmbedUrl
{
    public static function iframeHtml(string $input, string $title = ''): ?string
    {
        $parsed = self::parse($input);
        if ($parsed === null) {
            return null;
        }

        $defaultTitle = $parsed['provider'] === 'vimeo' ? 'Vimeo video' : 'YouTube video';
        $iframeTitle = trim($title) !== '' ? trim($title) : $defaultTitle;
        $allow = $parsed['provider'] === 'vimeo'
            ? 'autoplay; fullscreen; picture-in-picture'
            : 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';

        return '<iframe src="' . Html::encode($parsed['src'])
            . '" title="' . Html::encode($iframeTitle)
            . '" allow="' . Html::encode($allow)
            . '" allowfullscreen loading="lazy"></iframe>';
    }

    /**
     * @return array{provider: string, src: string}|null
     */
    public static function parse(string $input): ?array
    {
        $input = trim($input);
        if ($input === '') {
            return null;
        }

        if (preg_match('/<iframe[^>]+src=["\']([^"\']+)["\']/i', $input, $m)) {
            $input = html_entity_decode($m[1], ENT_QUOTES | ENT_HTML5, 'UTF-8');
        }

        $youtube = self::youtubeSrc($input);
        if ($youtube !== null) {
            return ['provider' => 'youtube', 'src' => $youtube];
        }

        $vimeo = self::vimeoSrc($input);
        if ($vimeo !== null) {
            return ['provider' => 'vimeo', 'src' => $vimeo];
        }

        return null;
    }

    public static function isSupported(string $input): bool
    {
        return self::parse($input) !== null;
    }

    private static function youtubeSrc(string $url): ?string
    {
        $url = self::normaliseUrl($url);
        $parts = parse_url($url);
        if ($parts === false || empty($parts['host'])) {
            return null;
        }

        $host = strtolower($parts['host']);
        $path = (string) ($parts['path'] ?? '');
        parse_str((string) ($parts['query'] ?? ''), $query);

        $id = null;
        if ($host === 'youtu.be' || $host === 'www.youtu.be') {
            $id = self::youtubeIdFromSegment($path);
        } elseif (self::isYouTubeHost($host)) {
            if (preg_match('#/(?:embed|shorts|live|v)/([A-Za-z0-9_-]{11})#', $path, $m)) {
                $id = $m[1];
            } elseif (!empty($query['v']) && preg_match('/^[A-Za-z0-9_-]{11}$/', (string) $query['v'])) {
                $id = (string) $query['v'];
            }
        }

        if ($id === null) {
            return null;
        }

        $src = 'https://www.youtube-nocookie.com/embed/' . $id;
        $start = self::parseStartSeconds($query['t'] ?? $query['start'] ?? null);
        if ($start === 0 && !empty($parts['fragment']) && preg_match('/(?:^|&)?t=([^&]+)/', (string) $parts['fragment'], $fm)) {
            $start = self::parseStartSeconds($fm[1]);
        }
        if ($start > 0) {
            $src .= '?start=' . $start;
        }

        return $src;
    }

    private static function vimeoSrc(string $url): ?string
    {
        $url = self::normaliseUrl($url);
        $parts = parse_url($url);
        if ($parts === false || empty($parts['host'])) {
            return null;
        }

        $host = strtolower(preg_replace('/^www\./', '', (string) $parts['host']) ?? '');
        $path = trim((string) ($parts['path'] ?? ''), '/');
        if ($host === '' || $path === '') {
            return null;
        }

        $id = null;
        $hash = null;

        if ($host === 'player.vimeo.com') {
            if (preg_match('#^video/(\d+)(?:/([a-zA-Z0-9]+))?$#', $path, $m)) {
                $id = $m[1];
                $hash = $m[2] ?? null;
            }
        } elseif ($host === 'vimeo.com') {
            $blocked = ['watch', 'home', 'upload', 'ondemand', 'user', 'manage', 'settings', 'store', 'plus', 'features', 'search', 'staff'];
            $first = strtolower(explode('/', $path)[0]);
            if (in_array($first, $blocked, true) && !preg_match('#^(channels|groups|album|video)/#', $path)) {
                return null;
            }
            if (preg_match('#^(?:channels/[^/]+|groups/[^/]+/videos|album/\d+/video|video)/(\d+)$#', $path, $m)) {
                $id = $m[1];
            } elseif (preg_match('#^(\d+)(?:/([a-zA-Z0-9]+))?$#', $path, $m)) {
                $id = $m[1];
                $hash = $m[2] ?? null;
            }
        } else {
            return null;
        }

        if ($id === null) {
            return null;
        }

        parse_str((string) ($parts['query'] ?? ''), $query);
        if ($hash === null && !empty($query['h'])) {
            $hash = preg_replace('/[^a-zA-Z0-9]/', '', (string) $query['h']);
        }

        $src = 'https://player.vimeo.com/video/' . $id;
        if (is_string($hash) && $hash !== '') {
            $src .= '?h=' . $hash;
        }

        return $src;
    }

    private static function isYouTubeHost(string $host): bool
    {
        $host = strtolower($host);
        return $host === 'youtube.com'
            || $host === 'www.youtube.com'
            || $host === 'm.youtube.com'
            || $host === 'music.youtube.com'
            || $host === 'youtube-nocookie.com'
            || $host === 'www.youtube-nocookie.com'
            || str_ends_with($host, '.youtube.com');
    }

    private static function youtubeIdFromSegment(string $path): ?string
    {
        $segment = trim($path, '/');
        $segment = explode('/', $segment)[0] ?? '';
        $segment = explode('?', $segment)[0] ?? '';
        return preg_match('/^[A-Za-z0-9_-]{11}$/', $segment) ? $segment : null;
    }

    private static function parseStartSeconds(mixed $value): int
    {
        if ($value === null || $value === '') {
            return 0;
        }
        $s = trim((string) $value);
        if (preg_match('/^\d+$/', $s)) {
            return (int) $s;
        }
        $total = 0;
        if (preg_match('/(\d+)h/i', $s, $m)) {
            $total += ((int) $m[1]) * 3600;
        }
        if (preg_match('/(\d+)m/i', $s, $m)) {
            $total += ((int) $m[1]) * 60;
        }
        if (preg_match('/(\d+)s/i', $s, $m)) {
            $total += (int) $m[1];
        }
        return $total;
    }

    private static function normaliseUrl(string $url): string
    {
        $url = trim($url);
        if ($url === '') {
            return $url;
        }
        if (str_starts_with($url, '//')) {
            return 'https:' . $url;
        }
        if (!preg_match('#^[a-z][a-z0-9+.-]*:#i', $url)) {
            return 'https://' . $url;
        }
        return $url;
    }
}
