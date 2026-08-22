function csrfParts() {
  const param = document.querySelector('meta[name="csrf-param"]');
  const token = document.querySelector('meta[name="csrf-token"]');
  return {
    param: param ? param.getAttribute('content') : '_csrf',
    token: token ? token.getAttribute('content') : '',
  };
}

function uploadUrl() {
  try {
    if (window.humhub && window.humhub.config && window.humhub.config.file && window.humhub.config.file.upload) {
      return window.humhub.config.file.upload.url;
    }
  } catch (e) {
    /* ignore */
  }
  return '/index.php?r=file/file/upload';
}

function errorText(info) {
  if (!info) {
    return 'Upload failed.';
  }
  if (typeof info.errors === 'string') {
    return info.errors;
  }
  if (Array.isArray(info.errors) && info.errors.length) {
    return info.errors.join(' ');
  }
  if (info.error && typeof info.error === 'string') {
    return info.error;
  }
  return 'Upload failed.';
}

/**
 * Upload an image via HumHub /file/file/upload. Returns the public file URL.
 */
export async function uploadImageFile(file) {
  if (!file) {
    throw new Error('No file selected.');
  }
  if (file.type && file.type.indexOf('image/') !== 0) {
    throw new Error('Please choose an image file.');
  }

  const { param, token } = csrfParts();
  const body = new FormData();
  body.append('files[]', file);
  body.append('hideInStream', '1');
  if (token) {
    body.append(param, token);
  }

  const url = uploadUrl();
  const sep = url.indexOf('?') >= 0 ? '&' : '?';
  const headers = {
    'X-Requested-With': 'XMLHttpRequest',
  };
  if (token) {
    headers['X-CSRF-Token'] = token;
  }

  const res = await fetch(url + sep + 'hideInStream=1', {
    method: 'POST',
    body,
    credentials: 'same-origin',
    headers,
  });
  if (!res.ok) {
    throw new Error('Upload failed (' + res.status + ').');
  }
  const json = await res.json();
  const info = json && Array.isArray(json.files) ? json.files[0] : null;
  if (!info || info.error) {
    throw new Error(errorText(info));
  }
  return info.url || info.relUrl || '';
}
