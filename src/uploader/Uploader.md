上传功能

## 防止预览网址被拉黑的办法
因为页面上很多腾讯相关功能，特别是登录等，极容易被腾讯电脑管家拉黑，报“恶意网站”无法正常访问。
尝试通过以下几个方法来防止被拉黑
1. CSP限制请求资源，不请求敏感资源（如腾讯登录组件请求的login.js等）
2. 在<head>注入预览专用js文件(injected.js)，js内重载（override）一些函数（如 PTTSendClick、TGShareMobile等），这些函数在任何情形下都具有最高执行优先级。
3. 去除 <title> 内腾讯官方网站等字眼

### CSP规则
BLOCK https://ossweb-img.qq.com/images/js/milo_bundle/biz/login.js
BLOCK https://game.gtimg.cn/images/js/eas/eas.js

## git
服务器每日定时任务
每日0点清空git，包含历史记录。（历史记录过多，会导致pages部署很慢）

### CSP参考资料
http://www.ruanyifeng.com/blog/2016/09/csp.html