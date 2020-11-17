import HTMLCommenterPatch from '../../../src/uploader/patchs/HTMLCommenterPatch'
import { setAppRoot, } from '../../../src/utils/index'
import * as path from 'path';

let hm: HTMLCommenterPatch;
beforeAll(()=>{
  setAppRoot(path.join(__dirname, '../../..'))
  hm = new HTMLCommenterPatch()
})

test('prepare', async ()=>{
  await hm.prepare()
  expect(hm.rules).toEqual(expect.arrayContaining([
    expect.objectContaining({
      pattern: expect.any(String),
      replacement: expect.any(String)
    })
  ]))
})

describe('wrapComment', () => {
  test('wrap TGMobileShare script', () => {
    let result1 = hm.wrapComment('<script src="//ossweb-img.qq.com/images/js/TGMobileShare/TGMobileShare.min.js"></script>')
    expect(result1).toEqual(`<!-- <script src="//ossweb-img.qq.com/images/js/TGMobileShare/TGMobileShare.min.js"></script> -->`)

    let result2 = hm.wrapComment('<script  src="https://ossweb-img.qq.com/images/js/TGMobileShare/TGMobileShare.min.js"></script>')
    expect(result2).toEqual(`<!-- <script  src="https://ossweb-img.qq.com/images/js/TGMobileShare/TGMobileShare.min.js"></script> -->`)

    let result3 = hm.wrapComment('<script  src="http://ossweb-img.qq.com/images/js/TGMobileShare/TGMobileShare.min.js"  ></script>')
    expect(result3).toEqual(`<!-- <script  src="http://ossweb-img.qq.com/images/js/TGMobileShare/TGMobileShare.min.js"  ></script> -->`)
  })

  test('wrap TGMobileShare call', () => {
    let r1 = hm.wrapComment(`
    <script>
    //分享
    TGMobileShare({
        shareTitle:'三分之地，音你而聚', //不设置或设置为空时，页面有title，则调取title
        shareDesc:'探索王者荣耀三分之地的声音', //不设置或设置为空时，页面有Description，则调取Description
        shareImgUrl:'https://game.gtimg.cn/images/yxzj/cp/a20200703kingdomh/share.png', //分享图片尺寸200*200，且填写绝对路径
        shareLink:'', //分享链接要跟当前页面同域名(手Q分享有这个要求) ,不设置或设置为空时，默认调取当前URL
        actName:'a20200703kingdomh' //点击流命名，用于统计分享量，专题一般采用目录名称如a20151029demo
    });
    </script>`)
    expect(r1).toEqual(`
    <script>
    //分享
    /* TGMobileShare({
        shareTitle:'三分之地，音你而聚', //不设置或设置为空时，页面有title，则调取title
        shareDesc:'探索王者荣耀三分之地的声音', //不设置或设置为空时，页面有Description，则调取Description
        shareImgUrl:'https://game.gtimg.cn/images/yxzj/cp/a20200703kingdomh/share.png', //分享图片尺寸200*200，且填写绝对路径
        shareLink:'', //分享链接要跟当前页面同域名(手Q分享有这个要求) ,不设置或设置为空时，默认调取当前URL
        actName:'a20200703kingdomh' //点击流命名，用于统计分享量，专题一般采用目录名称如a20151029demo
    }); */
    </script>`)

    let r2 = hm.wrapComment(`
    <script>
    //分享
    TGMobileShare({
        shareTitle: '三分之地，音你而聚', //不设置或设置为空时，页面有title，则调取title
        shareDesc: '探索王者荣耀三分之地的声音', //不设置或设置为空时，页面有Description，则调取Description
        shareImgUrl: 'https://game.gtimg.cn/images/yxzj/cp/a20200703kingdomh/share.png', //分享图片尺寸200*200，且填写绝对路径
        shareLink: '', //分享链接要跟当前页面同域名(手Q分享有这个要求) ,不设置或设置为空时，默认调取当前URL
        actName: 'a20200703kingdomh' //点击流命名，用于统计分享量，专题一般采用目录名称如a20151029demo
    });
    </script>`)
    expect(r2).toEqual(`
    <script>
    //分享
    /* TGMobileShare({
        shareTitle: '三分之地，音你而聚', //不设置或设置为空时，页面有title，则调取title
        shareDesc: '探索王者荣耀三分之地的声音', //不设置或设置为空时，页面有Description，则调取Description
        shareImgUrl: 'https://game.gtimg.cn/images/yxzj/cp/a20200703kingdomh/share.png', //分享图片尺寸200*200，且填写绝对路径
        shareLink: '', //分享链接要跟当前页面同域名(手Q分享有这个要求) ,不设置或设置为空时，默认调取当前URL
        actName: 'a20200703kingdomh' //点击流命名，用于统计分享量，专题一般采用目录名称如a20151029demo
    }); */
    </script>`)
  })


  test('wrap login call', () => {
    let r1 = hm.wrapComment(`
    need(["biz.login"], function(LoginManager) {
      LoginManager.checkLogin(function() {
          
      }, function() {
        LoginManager.login();
      });
    })
    `)
    expect(r1).toEqual(`
    need(["biz.login"], function(LoginManager) {
      return;LoginManager.checkLogin(function() {
          
      }, function() {
        return;LoginManager.login();
      });
    })
    `)

    let r2 = hm.wrapComment(`
    need(["biz.login"], function(LoginManager) {
      LoginManager.checkLogin(function() {
          
      }, function() {
        LoginManager.login();
      }, {
        appConfig: {
          avoidConflict: true,
          WxAppId: "wx1cd4fbe9335888fe",
          scope: "snsapi_userinfo"
        }
      });
    })
    `)
    expect(r2).toEqual(`
    need(["biz.login"], function(LoginManager) {
      return;LoginManager.checkLogin(function() {
          
      }, function() {
        return;LoginManager.login();
      }, {
        appConfig: {
          avoidConflict: true,
          WxAppId: "wx1cd4fbe9335888fe",
          scope: "snsapi_userinfo"
        }
      });
    })
    `)

    let r3 = hm.wrapComment(`
    <p id="unlogin" style="display: block;" class="login1901-p">
          <span class="login1901-avatar-wrap"><img src="//ossweb-img.qq.com/images/lol/v2/personal/avatar/default.png"
              width="50" class="fl" /></span>
          亲爱的召唤师，请 <a href="javascript:LoginManager.login();" id="ptLoginBtn">登录</a></p>
    `)
    expect(r3).toEqual(`
    <p id="unlogin" style="display: block;" class="login1901-p">
          <span class="login1901-avatar-wrap"><img src="//ossweb-img.qq.com/images/lol/v2/personal/avatar/default.png"
              width="50" class="fl" /></span>
          亲爱的召唤师，请 <a href="javascript:return;LoginManager.login();" id="ptLoginBtn">登录</a></p>
    `)
      
  })
})
