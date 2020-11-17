// 预览专用 only for preview. injected file. override functions.
var noop = function (a, b, c, d) { }, _override = noop;
Object.defineProperty(window, 'PTTSendClick', { configurable: true, get: function () { return _override }, set: function (v) { } });
Object.defineProperty(window, 'pgvMain', { configurable: true, get: function () { return _override }, set: function (v) { } });
Object.defineProperty(window, 'TGMobileShare', { configurable: true, get: function () { return _override }, set: function (v) { } });
window.LoginManager = window.LoginManager || {}
Object.defineProperty(LoginManager, 'checkLogin', { configurable: true, get: function () { return _override }, set: function (v) { } });
Object.defineProperty(LoginManager, 'login', { configurable: true, get: function () { return _override }, set: function (v) { } });
Object.defineProperty(LoginManager, 'logout', { configurable: true, get: function () { return _override }, set: function (v) { } });
Object.defineProperty(LoginManager, 'loginByWXAndQQ', { configurable: true, get: function () { return _override }, set: function (v) { } });
Object.defineProperty(LoginManager, 'loginByWX', { configurable: true, get: function () { return _override }, set: function (v) { } });
Object.defineProperty(LoginManager, 'loginByWx', { configurable: true, get: function () { return _override }, set: function (v) { } });