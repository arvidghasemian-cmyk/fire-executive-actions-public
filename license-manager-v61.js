/**
 * Fire Executive Pro - License Manager v2.0.0 (v61)
 * Offline-first signed license verification.
 * Public key only. NEVER place the private signing key in the app/repository.
 */
const LicenseManager = (() => {
  'use strict';

  const VERSION = 2;
  const PRODUCT = 'fire-executive-pro';
  const INSTALL_KEY = 'fep_install_id_v2';
  const LICENSE_KEY = 'fep_license_v2';
  const CLOCK_KEY = 'fep_license_clock_v2';
  const CLOCK_ROLLBACK_TOLERANCE_MS = 5 * 60 * 1000;

  const PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAtHl8ty3+2agUEkPSL2H6
cnbwcPVcwmTrwMDWZc2J4Dq/HMgcflpDDIEMoYSsMr4bvOWdxK+OFuWuk2ulcNF6
QY4zei6GJEyFmTALTgqkUxSrdveLqodXpu1ze17ml5OLdaPJloltxsV6qw02xZga
m+XpsBNeZnI06wYOqtZPGcbTo3aie1lEvkYj4ZApNMuqCDf22CDSEGt0Au2kmSf1
Ju+YyKQwnBeuxYvZOoqOabrsN0Bf7YyuYjY68SaC7+9aAo8H18vUIDvqoQMAaJli
d23CpD0Onh4P2q6fScBRWZsMgn8kCm/3zqGWypuWgt70ceN5ZUUYV2ym8q4CbtMu
PQIDAQAB
-----END PUBLIC KEY-----`;

  const PLAN_TYPES = new Set(['professional', 'enterprise', 'developer']);

  function bytesToBase64(bytes) {
    let binary = '';
    const step = 0x8000;
    for (let i = 0; i < bytes.length; i += step) {
      binary += String.fromCharCode(...bytes.subarray(i, i + step));
    }
    return btoa(binary);
  }

  function base64ToBytes(base64) {
    const binary = atob(base64);
    return Uint8Array.from(binary, c => c.charCodeAt(0));
  }

  function base64UrlToBytes(value) {
    let s = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    return base64ToBytes(s);
  }

  function bytesToBase64Url(bytes) {
    return bytesToBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  function utf8ToBase64Url(text) {
    return bytesToBase64Url(new TextEncoder().encode(text));
  }

  function base64UrlToUtf8(value) {
    return new TextDecoder().decode(base64UrlToBytes(value));
  }

  function stableStringify(value) {
    if (value === null || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
    const keys = Object.keys(value).sort();
    return '{' + keys.map(k => JSON.stringify(k) + ':' + stableStringify(value[k])).join(',') + '}';
  }

  function newInstallId() {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    return 'FEP-' + hex.match(/.{1,4}/g).join('-');
  }

  function getInstallId() {
    let id = localStorage.getItem(INSTALL_KEY);
    if (!id || !/^FEP-(?:[A-F0-9]{4}-){7}[A-F0-9]{4}$/.test(id)) {
      id = newInstallId();
      localStorage.setItem(INSTALL_KEY, id);
    }
    return id;
  }

  function loadLicense() {
    const raw = localStorage.getItem(LICENSE_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (_) { return null; }
  }

  function saveLicense(license) {
    localStorage.setItem(LICENSE_KEY, JSON.stringify(license));
  }

  function clearLicense() {
    localStorage.removeItem(LICENSE_KEY);
    localStorage.removeItem(CLOCK_KEY);
  }

  function parseLicenseCode(code) {
    const raw = String(code || '').trim();
    if (!raw.startsWith('FEP2.')) throw new Error('unsupported_format');
    try {
      const json = base64UrlToUtf8(raw.slice(5));
      const license = JSON.parse(json);
      if (!license || typeof license !== 'object') throw new Error('invalid_payload');
      return license;
    } catch (error) {
      if (error && error.message === 'invalid_payload') throw error;
      throw new Error('invalid_code');
    }
  }

  function encodeLicenseCode(license) {
    return 'FEP2.' + utf8ToBase64Url(JSON.stringify(license));
  }

  async function importPublicKey() {
    const clean = PUBLIC_KEY_PEM
      .replace(/-----BEGIN PUBLIC KEY-----/g, '')
      .replace(/-----END PUBLIC KEY-----/g, '')
      .replace(/\s/g, '');
    return crypto.subtle.importKey(
      'spki',
      base64ToBytes(clean),
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify']
    );
  }

  function basicSchemaCheck(license) {
    if (license.version !== VERSION) return 'version_mismatch';
    if (license.product !== PRODUCT) return 'product_mismatch';
    if (!license.licenseId || typeof license.licenseId !== 'string') return 'missing_license_id';
    if (!license.deviceId || typeof license.deviceId !== 'string') return 'missing_device_id';
    if (!license.plan || !PLAN_TYPES.has(license.plan.type)) return 'invalid_plan';
    if (!license.dates || !license.dates.issuedAt) return 'invalid_dates';
    if (!license.signature || typeof license.signature !== 'string') return 'missing_signature';
    return null;
  }

  function clockRollbackDetected(nowMs) {
    const prev = Number(localStorage.getItem(CLOCK_KEY) || 0);
    return prev > 0 && nowMs + CLOCK_ROLLBACK_TOLERANCE_MS < prev;
  }

  function rememberClock(nowMs) {
    const prev = Number(localStorage.getItem(CLOCK_KEY) || 0);
    if (!prev || nowMs > prev) localStorage.setItem(CLOCK_KEY, String(nowMs));
  }

  async function verifyLicense(license, options = {}) {
    try {
      const schemaError = basicSchemaCheck(license);
      if (schemaError) return { valid: false, reason: schemaError };

      const payload = { ...license };
      delete payload.signature;
      const publicKey = await importPublicKey();
      const signatureBytes = base64UrlToBytes(license.signature);
      const data = new TextEncoder().encode(stableStringify(payload));
      const signatureValid = await crypto.subtle.verify(
        { name: 'RSASSA-PKCS1-v1_5' },
        publicKey,
        signatureBytes,
        data
      );
      if (!signatureValid) return { valid: false, reason: 'bad_signature' };

      const currentInstallId = getInstallId();
      if (license.deviceId !== currentInstallId) {
        return { valid: false, reason: 'device_mismatch', expectedDeviceId: currentInstallId };
      }

      const issuedMs = Date.parse(license.dates.issuedAt);
      if (!Number.isFinite(issuedMs)) return { valid: false, reason: 'invalid_dates' };

      const nowMs = Date.now();
      if (!options.ignoreClockRollback && clockRollbackDetected(nowMs)) {
        return { valid: false, reason: 'clock_rollback' };
      }

      let expiresAt = null;
      if (license.dates.expiresAt) {
        const expiresMs = Date.parse(license.dates.expiresAt);
        if (!Number.isFinite(expiresMs)) return { valid: false, reason: 'invalid_dates' };
        expiresAt = license.dates.expiresAt;
        if (nowMs > expiresMs) return {
          valid: false,
          reason: 'expired',
          expiresAt,
          plan: license.plan,
          licenseId: license.licenseId,
          deviceId: license.deviceId,
          owner: license.owner || null,
          features: Array.isArray(license.features) ? license.features : ['*']
        };
      }

      rememberClock(nowMs);
      return {
        valid: true,
        status: 'active',
        plan: license.plan,
        licenseId: license.licenseId,
        issuedAt: license.dates.issuedAt,
        expiresAt,
        permanent: !expiresAt,
        deviceId: license.deviceId,
        owner: license.owner || null,
        features: Array.isArray(license.features) ? license.features : ['*']
      };
    } catch (error) {
      return { valid: false, reason: error && error.message ? error.message : 'verification_error' };
    }
  }

  async function activateLicenseCode(code) {
    let license;
    try { license = parseLicenseCode(code); }
    catch (error) { return { valid: false, reason: error.message || 'invalid_code' }; }

    const result = await verifyLicense(license, { ignoreClockRollback: true });
    if (!result.valid) return result;
    saveLicense(license);
    rememberClock(Date.now());
    return result;
  }

  async function checkStatus() {
    const deviceId = getInstallId();
    const license = loadLicense();
    if (!license) {
      return {
        status: 'free',
        deviceId,
        legacyLicenseDetected: !!localStorage.getItem('FEP_LICENSE_V1') || !!localStorage.getItem('fep_license_v1')
      };
    }
    const result = await verifyLicense(license);
    if (result.valid) return result;
    return {
      status: 'invalid',
      deviceId,
      reason: result.reason,
      expiresAt: result.expiresAt || null,
      plan: result.plan || null,
      licenseId: result.licenseId || null,
      owner: result.owner || null,
      features: result.features || null
    };
  }

  function reasonFa(reason) {
    const map = {
      unsupported_format: 'فرمت کد فعال‌سازی پشتیبانی نمی‌شود.',
      invalid_payload: 'محتوای کد فعال‌سازی معتبر نیست.',
      invalid_code: 'کد فعال‌سازی معتبر نیست.',
      version_mismatch: 'نسخه لایسنس با این برنامه سازگار نیست.',
      product_mismatch: 'این لایسنس برای Fire Executive Pro صادر نشده است.',
      missing_license_id: 'شناسه لایسنس موجود نیست.',
      missing_device_id: 'شناسه دستگاه در لایسنس موجود نیست.',
      invalid_plan: 'نوع لایسنس معتبر نیست.',
      invalid_dates: 'تاریخ‌های لایسنس معتبر نیستند.',
      missing_signature: 'امضای دیجیتال لایسنس موجود نیست.',
      bad_signature: 'امضای دیجیتال لایسنس معتبر نیست.',
      device_mismatch: 'این لایسنس برای دستگاه دیگری صادر شده است.',
      expired: 'اعتبار این لایسنس به پایان رسیده است.',
      clock_rollback: 'تغییر غیرعادی ساعت دستگاه تشخیص داده شد.',
      verification_error: 'خطا در بررسی لایسنس.'
    };
    return map[reason] || 'لایسنس معتبر نیست.';
  }

  return {
    VERSION,
    getInstallId,
    getDeviceID: getInstallId,
    parseLicenseCode,
    encodeLicenseCode,
    verifyLicense,
    activateLicenseCode,
    saveLicense,
    loadLicense,
    clearLicense,
    checkStatus,
    reasonFa,
    stableStringify
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = LicenseManager;
}
