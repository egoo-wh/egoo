import FenliPatch from "../../../src/fenli/patchs/FenliPatch";

let fl: FenliPatch;
beforeAll(() => {
  fl = new FenliPatch();
  fl.setFenliPath('//game.gtimg.cn/images/dnf/cp/a20200319box')
})


const EXAMPLE1 = `
<html>
<head>
<link rel="stylesheet" href="ossweb-img/comm.css">
</head>
<body>
<div class="wrap">
  <img src="../images/slogan.jpg" />
  <img src="../../ossweb-img/box.jpg" />
  <img src="//ossweb-img.qq.com/cp/a20201111/box.jpg" />
  <video muted="true" autoplay="true" preload="auto" poster="../ossweb-img/poster.jpg" >
</div>
<script src="//ossweb-img.qq.com/images/js/jquery/jquery-1.9.1.min.js"></script>
<script src="./ossweb-img/comm.js" type="text/javascript></script>
<script>
var path = 'ossweb-img/';
var src = 'ossweb-img/';
$('.main').css('backgroundImage', 'url(ossweb-img/bg2.jpg)')
</script>
</body>
</html>
`
describe('replaceRelativeUrlsInHTMLTag', () => {
  test('src property', ()=>{
    let result = fl.replaceRelativeUrlsInHTMLTag('<img src="../images/slogan.jpg" />')
    expect(result).toEqual('<img src="//game.gtimg.cn/images/dnf/cp/a20200319box/slogan.jpg" />');
  })
  test('href property', () => {
    let result = fl.replaceRelativeUrlsInHTMLTag('<link rel="stylesheet" href="ossweb-img/comm.css">')
    expect(result).toEqual('<link rel="stylesheet" href="//game.gtimg.cn/images/dnf/cp/a20200319box/comm.css">');
  })
  test('poster property', ()=>{
    let result = fl.replaceRelativeUrlsInHTMLTag('<video muted="true" autoplay="true" preload="auto" poster="../ossweb-img/poster.jpg" >')
    expect(result).toEqual('<video muted="true" autoplay="true" preload="auto" poster="//game.gtimg.cn/images/dnf/cp/a20200319box/poster.jpg" >');
  })
  test('html', () => {
    let result = fl.replaceRelativeUrlsInHTMLTag(EXAMPLE1)
    expect(result).toEqual(`
<html>
<head>
<link rel="stylesheet" href="//game.gtimg.cn/images/dnf/cp/a20200319box/comm.css">
</head>
<body>
<div class="wrap">
  <img src="//game.gtimg.cn/images/dnf/cp/a20200319box/slogan.jpg" />
  <img src="//game.gtimg.cn/images/dnf/cp/a20200319box/box.jpg" />
  <img src="//ossweb-img.qq.com/cp/a20201111/box.jpg" />
  <video muted="true" autoplay="true" preload="auto" poster="//game.gtimg.cn/images/dnf/cp/a20200319box/poster.jpg" >
</div>
<script src="//ossweb-img.qq.com/images/js/jquery/jquery-1.9.1.min.js"></script>
<script src="//game.gtimg.cn/images/dnf/cp/a20200319box/comm.js" type="text/javascript></script>
<script>
var path = 'ossweb-img/';
var src = 'ossweb-img/';
$('.main').css('backgroundImage', 'url(ossweb-img/bg2.jpg)')
</script>
</body>
</html>
`)
  })
})

const EXAMPLE2 = `
<html>
<head>
<style>
.wrap{background-image: url(./ossweb-img/wrap.jpg)}
.logo{background: url("../ossweb-img/logo.png") no-repeat}
.head{background: url(//game.gtimg.com/ossweb-img/logo.png) no-repeat}
</style>
<link rel="stylesheet" href="ossweb-img/comm.css">
</head>
<body>
<div class="wrap" style="background: url(ossweb-img/bg2.jpg) no-repeat">
  <img src="../images/slogan.jpg" />
  <img src="../../ossweb-img/box.jpg" />
</div>
<script>
var path = 'ossweb-img/';
</script>
</body>
</html>
`
describe('replaceRelativeUrlsInStyle', () => {
  test('html', () => {
    let result = fl.replaceRelativeUrlsInStyle(EXAMPLE2)
    expect(result).toEqual(`
<html>
<head>
<style>
.wrap{background-image: url(//game.gtimg.cn/images/dnf/cp/a20200319box/wrap.jpg)}
.logo{background: url("//game.gtimg.cn/images/dnf/cp/a20200319box/logo.png") no-repeat}
.head{background: url(//game.gtimg.com/ossweb-img/logo.png) no-repeat}
</style>
<link rel="stylesheet" href="ossweb-img/comm.css">
</head>
<body>
<div class="wrap" style="background: url(//game.gtimg.cn/images/dnf/cp/a20200319box/bg2.jpg) no-repeat">
  <img src="../images/slogan.jpg" />
  <img src="../../ossweb-img/box.jpg" />
</div>
<script>
var path = 'ossweb-img/';
</script>
</body>
</html>
`)
  })
})