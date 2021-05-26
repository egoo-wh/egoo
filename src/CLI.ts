import Fenli from './fenli/Fenli'
import Uploader from './uploader/Uploader';

const publish = async function (sources, mode, ignores, configForceReload) {
  const uploader: Uploader = new Uploader();
  await uploader.run(sources, mode, ignores, configForceReload);
  return uploader;
}

const fenli = async function (sources, options) {
  let { aliases, url, forcehttps: forceHttps = false } = options;
  if (aliases.toLowerCase() == 'dnf') {
    forceHttps = true;
  }
  const fl = new Fenli(sources, forceHttps);
  await fl.run(aliases, url);
  return fl;
}

export default {
  publish,
  fenli
}