function normaliseUrl(url) {
  const trimmed = String(url || '').trim();
  if (!trimmed) {
    return trimmed;
  }
  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`;
  }
  if (!/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

function parseStartSeconds(value) {
  if (value == null || value === '') {
    return 0;
  }
  const s = String(value).trim();
  if (/^\d+$/.test(s)) {
    return parseInt(s, 10);
  }
  let total = 0;
  const h = s.match(/(\d+)h/i);
  const m = s.match(/(\d+)m/i);
  const sec = s.match(/(\d+)s/i);
  if (h) {
    total += parseInt(h[1], 10) * 3600;
  }
  if (m) {
    total += parseInt(m[1], 10) * 60;
  }
  if (sec) {
    total += parseInt(sec[1], 10);
  }
  return total;
}

function youtubeIdFromPath(path) {
  const segment = String(path || '')
    .replace(/^\/+|\/+$/g, '')
    .split('/')[0]
    .split('?')[0];
  return /^[A-Za-z0-9_-]{11}$/.test(segment) ? segment : null;
}

function isYouTubeHost(host) {
  const h = String(host || '').toLowerCase();
  return (
    h === 'youtube.com' ||
    h === 'www.youtube.com' ||
    h === 'm.youtube.com' ||
    h === 'music.youtube.com' ||
    h === 'youtube-nocookie.com' ||
    h === 'www.youtube-nocookie.com' ||
    h.endsWith('.youtube.com')
  );
}

function youtubeSrc(raw) {
  let parsed;
  try {
    parsed = new URL(normaliseUrl(raw));
  } catch (e) {
    return null;
  }
  const host = parsed.hostname.toLowerCase();
  const path = parsed.pathname || '';
  let id = null;
  if (host === 'youtu.be' || host === 'www.youtu.be') {
    id = youtubeIdFromPath(path);
  } else if (isYouTubeHost(host)) {
    const embed = path.match(/\/(?:embed|shorts|live|v)\/([A-Za-z0-9_-]{11})/);
    if (embed) {
      id = embed[1];
    } else if (/^[A-Za-z0-9_-]{11}$/.test(parsed.searchParams.get('v') || '')) {
      id = parsed.searchParams.get('v');
    }
  }
  if (!id) {
    return null;
  }
  let src = `https://www.youtube-nocookie.com/embed/${id}`;
  let start = parseStartSeconds(parsed.searchParams.get('t') || parsed.searchParams.get('start'));
  if (!start && parsed.hash) {
    const hashT = parsed.hash.match(/(?:^#|&)?t=([^&]+)/);
    if (hashT) {
      start = parseStartSeconds(hashT[1]);
    }
  }
  if (start > 0) {
    src += `?start=${start}`;
  }
  return src;
}

function vimeoSrc(raw) {
  let parsed;
  try {
    parsed = new URL(normaliseUrl(raw));
  } catch (e) {
    return null;
  }
  const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
  const path = (parsed.pathname || '').replace(/^\/+|\/+$/g, '');
  if (!host || !path) {
    return null;
  }

  let id = null;
  let hash = null;
  if (host === 'player.vimeo.com') {
    const m = path.match(/^video\/(\d+)(?:\/([a-zA-Z0-9]+))?$/);
    if (m) {
      id = m[1];
      hash = m[2] || null;
    }
  } else if (host === 'vimeo.com') {
    const first = path.split('/')[0].toLowerCase();
    const blocked = ['watch', 'home', 'upload', 'ondemand', 'user', 'manage', 'settings', 'store', 'plus', 'features', 'search', 'staff'];
    const nested = /^(channels|groups|album|video)\//.test(path);
    if (blocked.includes(first) && !nested) {
      return null;
    }
    const nestedMatch = path.match(/^(?:channels\/[^/]+|groups\/[^/]+\/videos|album\/\d+\/video|video)\/(\d+)$/);
    const plain = path.match(/^(\d+)(?:\/([a-zA-Z0-9]+))?$/);
    if (nestedMatch) {
      id = nestedMatch[1];
    } else if (plain) {
      id = plain[1];
      hash = plain[2] || null;
    }
  } else {
    return null;
  }

  if (!id) {
    return null;
  }
  if (!hash && parsed.searchParams.get('h')) {
    hash = String(parsed.searchParams.get('h')).replace(/[^a-zA-Z0-9]/g, '');
  }
  let src = `https://player.vimeo.com/video/${id}`;
  if (hash) {
    src += `?h=${hash}`;
  }
  return src;
}

export function parseEmbedInput(input) {
  let value = String(input || '').trim();
  if (!value) {
    return null;
  }
  const iframe = value.match(/<iframe[^>]+src=["']([^"']+)["']/i);
  if (iframe) {
    value = iframe[1];
  }
  const youtube = youtubeSrc(value);
  if (youtube) {
    return { provider: 'youtube', src: youtube };
  }
  const vimeo = vimeoSrc(value);
  if (vimeo) {
    return { provider: 'vimeo', src: vimeo };
  }
  return null;
}

function escapeAttr(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function iframeHtml(input, title = '') {
  const parsed = parseEmbedInput(input);
  if (!parsed) {
    return null;
  }
  const defaultTitle = parsed.provider === 'vimeo' ? 'Vimeo video' : 'YouTube video';
  const iframeTitle = String(title || '').trim() || defaultTitle;
  const allow =
    parsed.provider === 'vimeo'
      ? 'autoplay; fullscreen; picture-in-picture'
      : 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
  return `<iframe src="${escapeAttr(parsed.src)}" title="${escapeAttr(iframeTitle)}" allow="${escapeAttr(allow)}" allowfullscreen loading="lazy"></iframe>`;
}
