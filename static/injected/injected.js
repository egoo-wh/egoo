// 预览专用 only for preview. injected file.

// override functions.
var noop = function (a, b, c, d) { }, _override = noop;
Object.defineProperty(window, 'PTTSendClick', { configurable: true, get: function () { return _override }, set: function (v) { } });
Object.defineProperty(window, 'pgvMain', { configurable: true, get: function () { return _override }, set: function (v) { } });
Object.defineProperty(window, 'TGMobileShare', { configurable: true, get: function () { return _override }, set: function (v) { } });

// milo.loader.need
var IGNORE_MILO_MODULES = ['biz.login'];
var _need = function (modules, callback) {
  if (!Array.isArray(modules)) {
    modules = new Array(modules)
  }
  modules = modules.reduce(function(arr, m){
    var isIgnoreModule = IGNORE_MILO_MODULES.some(function (ignoreM) { return m.indexOf(ignoreM) >= 0 });
    if (!isIgnoreModule) {
      arr.push(m);
    }
    return arr;
  }, [])
  // var mc = moduleContainer("", modules, callback);
  // start(mc);
  if (milo && milo.loader) {
    milo.loader.need(modules, callback);
  }
  return undefined
}
Object.defineProperty(window, 'need', { configurable: true, get: function () { return _need }, set: function (v) { } });

// block scripts
function blockScripts(urls){
  function blockScript(urls) {
    const scripts = Array.from(document.getElementsByTagName("SCRIPT"));
    if (scripts.length > 0) {
      scripts.forEach(function(script) {
        urls.forEach(function(url) {
          if (script.src.indexOf(url) >= 0) {
            script.parentNode.removeChild(script);
          }
        })
      })
    }
  }

  var observer = new MutationObserver((mutationsList, observer) => {
    for (let mutation of mutationsList) {
      var addedNodes = Array.from(mutation.addedNodes);
      if (addedNodes && addedNodes.some(function(n) { return n.nodeName === 'SCRIPT'})) {
        blockScript(urls);
      }
      // observer.disconnect();
    }
  });
  observer.observe(document, { childList: true, subtree: true });
}