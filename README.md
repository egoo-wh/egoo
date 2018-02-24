#egoo
Egoo CLI. includes several tools to improve work efficiency.
##安装：
1. 安装<a href="https://nodejs.org/" title="nodejs" target="_blank">Node.js</a>。v8.0+
2. 在命令行（开始--cmd），输入`node -v`，出现版本信息（类似`v8.0.0`），表明Node.js安装成功。
3. 安装 **egoo** 命令行工具。
```
npm install egoo --registry=http://192.168.0.11:7001 -g
```
更新 **egoo** 也使用上述命令。
4. 输入`egoo -v`，出现版本信息（类似`1.1.2`），表明egoo安装成功。
5. 如果更新有问题，则使用
```
npm rm egoo -g
```
先卸载，然后重复步骤3再次安装。

##用法：

###发布：
将文件发布到内网或者外网。
发布到内网。主要方便本地无web server的开发同学，1.进行H5页面真机调试; 2.将地址给相应设计同学进行体验确认。  
发布到外网。提供给需求方预览地址（主要是H5页面），供其扫描二维码体验确认。<a href="http://www.liantu.com/" title="URL转二维码链接" target="_blank">URL转二维码链接</a>。  
```
egoo pub/publish [source] [options]
```
####参数：
Param | Description
----- | ------------
source | 要上传的文件路径

####选项：

 Options  | Description
------------- | -------------
 -d  | 发布到外网。
--nocache | 无需缓存，全量覆盖。当不指定这一选项时，发布操作有缓存功能，即如果服务器已经存在和本地相同的文件，则该文件不会再次上传。指定这一选项后，则会忽略缓存，全部重新上传。
 --remotepath | 指定服务器目录地址，默认不需要指定。

例如：
```
egoo pub E:\workspace\zoom_bug -d
```
上述命令表示将zoom_bug文件夹发布到外网，发布成功之后即可通过 `https://preview.egoodev.cn/zoom_bug/` 进行访问。  
如不加`-d`则是内网环境（默认发布内网），对应的访问地址为： `http://192.168.1.11/preview/zoom_bug/` 。  
访问地址规则如下：

- 内网：`http://192.168.1.11/preview/[pathname]/`
- 外网：`https://preview.egoodev.cn/[pathname]/`

**[pathname]**表示上传文件名。  
cmd出现<span style="color:green;">**publish success.**</span>，表示发布成功。

####注意事项
1. 上传的文件夹（包括其下所有文件名、文件夹名）不能包含中文，否则会因乱码而无法访问。例如：
source为`E:\workspace\201503\互娱\a20150312mweud`可以。  
source为`E:\workspace\201503\互娱\a20150312mweud奖励`不可以。  
2. 上传的文件名不能有大写字母，否则无法访问。例如：
source为`E:\workspace\201503\互娱\SQ26659`，不可以。  
source为`E:\workspace\201503\互娱\sq26659`，可以。  
3. 如果上传的文件路径存在特殊字符，如空格、括号等，则需要用引号包裹。如:`E:\H5无线端页面\20141208-WX17007-双十二充值活动(submitted)\WX17007`，那么上传命令则为`egoo publish "E:\H5无线端页面\20141208-WX17007-双十二充值活动(submitted)\WX17007"`。
4. **重点：外网地址只是临时地址，仅用于预览体验，不能作为正式发布地址。如果接口人有分享该地址到朋友圈等公开地址的行为，要告知接口人不能这样做——就说是临时预览地址，不稳定，随时可能失效。**

---

###TinyPNG压缩：<span style="font-size:10px;color:red;">egoo 3.0+ nodejs 8.0+</span>
压缩PNG图片。
####使用前必读
使用之前，需前往[TinyPNG开发者页面](https://tinypng.com/developers)注册，获取免费的API KEY。获取步骤如下：
![注册][tinypng_reg]
注册完成之后，在如下页面会获取API KEY。  
![获取][tinypng_key]
这个KEY，会在初次使用本工具时，被要求使用。
```
egoo tiny/tinypng [source]
```
####参数：
Param | Description
----- | ------------
source | 要压缩的文件路径。可以是文件或目录。如果是目录，则压缩目录下所有PNG图片。

例如：
```
egoo tiny E:\workspace\a20170817wfgx\ossweb-img
```
上述命令表示压缩该目录下所有图片。

####注意事项
根据TinyPNG官网信息显示：每个免费的API KEY，每月只有500次的压缩机会，所以，请酌情使用。

---

###图片尺寸偶数化：<span style="font-size:10px;color:red;">egoo 3.0+ nodejs 8.0+</span>
将图片尺寸偶数化，如255x105的图片，将会被调整至256x106。因为京东规范要求**[图片尺寸严禁使用奇数值](https://jdc.jd.com/cp/#1-尺寸-单位)**，故创建本工具。
####使用前必读
使用之前，必须安装[GraphicsMagick](http://www.graphicsmagick.org/)，
[GraphicsMagick下载地址](ftp://ftp.graphicsmagick.org/pub/GraphicsMagick/windows/GraphicsMagick-1.3.26-Q16-win64-dll.exe)。

```
egoo ie/imgeven [source]
```
####参数：
Param | Description
----- | ------------
source | 要调整的文件路径。可以是文件或目录。如果是目录，则调整目录下所有图片。

例如：
```
egoo ie E:\workspace\a20170817wfgx\ossweb-img
```
上述命令表示调整该目录下所有图片。

####注意事项
1. 只能调整JPG，PNG格式的图片。
2. 调整都是向上调整。如157x155会调整成158x156。

###关于Windows命令行(cmd)使用技巧：

1. 粘贴。（鼠标右键--粘贴）
2. 复制。（鼠标右键--标记--选择文本）
3. 文件路径可直接将文件拖入cmd来生成。

---

##Release History
+ 2015-08-14   v1.6.0   添加图片分离功能，添加参数命令行输入提示。
+ 2015-09-15   v1.7.8   修改发布功能外网域名（启用专门的测试域名egooimg.cn）。
+ 2015-10-15   v1.8.1   因为腾讯将网站列入黑名单，更改测试地址访问方式。

	当上传的文件存在QQ登录等相关敏感信息时，腾讯管家就有可能将网站列入黑名单，从而访问受限。受限情况如下图所示：
	
	![网站黑名单][site_in_blacklist]

	而且，会导致微信直接无法访问。
	
	因无法解决腾讯管家列黑名单的问题，作为变通的解决办法为：

	将上传文件变更为**单独的二级域名访问**（由 `http://preview.egooimg.cn/[pathname]/` 变更为 `http://[pathname].egooimg.cn/`），防止相同域名下交叉感染，导致全部受限。

	然并卵，二级域名被禁，也可能牵连主域名，导致全部受限。

	唯一的解决办法是在服务端删除被请求文件的相关敏感代码，比较可行的方案为：在文件上传阶段处理敏感代码。

+ 2015-11-15   v1.8.4   将上传文件的异步操作全部用Promise重写。
+ 2016-12-10   v1.8.7   在上传阶段修改HTML文件，增加敏感代码注释（防止被QQ管家列入黑名单），敏感代码包含 统计相关代码(pingjs) 、分享相关代码等。
+ 2016-01-13   v1.9.0   对比待上传文件（除HTML）与服务器文件hash，相同则不上传，节省上传时间和带宽。
+ 2016-01-13   v2.0.0   增加强制退出(ctrl-c)的清理工作。
+ 2016-02-29   v2.0.3   更新过滤规则，将过滤规则单独提取出来。
+ 2016-03-10   v2.0.4   修改一些问题。
+ 2016-03-10   v2.0.5   fixed bug.修复大文件上传乱码问题。
+ 2016-03-18   v2.0.6   fixed bug.
	- 修复大文件上传时，编码解码导致的个别字符（Buffer衔接点）乱码问题。
	- 清理不必要的依赖库。
	- JS文件全部启用“严格模式”(strict mode)。
+ 2016-03-29   v2.0.8   Refactor上传相关代码。
	- 需要node 4.4.0+。
	- 相关LOG，增加颜色标记。
	- Promise操作全部使用[Q](https://github.com/kriskowal/q/)，更清晰的流程控制，更完善的错误处理。
	- 尝试使用ES6语法。
+ 2016-04-01   v2.1.3   优化代码。
	- 修改遍历文件树方法。
+ 2016-04-06   v2.1.7   fixed bug.修复require hash文件时，找不到模块的错误。应该require绝对路径地址。
+ 2016-05-17   v2.2.1   egoo build，构建工具，测试、灰度使用。
+ 2016-06-03   v2.2.6   egoo build，bug fixed.报错提示。
+ 2016-06-07   v2.2.7   egoo publish,添加nocache选项，修复*通配符问题。
+ 2016-11-29   v2.2.8   移除egoo build功能相关文件，有了更好的实现方式。添加错误时的exit标识，完善文档。
+ 2017-02-10   v2.3.0   测试域名(egooimg.cn)启用HTTPS。
+ 2017-02-10   v2.3.5   完善测试域名(egooimg.cn)nocache(Disable Cache)功能说明文档。
+ 2017-02-10   v2.3.7   fixed bug.修复空文件导致的上传故障。
+ 2017-02-10   v3.0.0   添加TinyPNG，imgEven工具。


源码：`git clone git@192.168.0.11:/home/git/repositories/ewf.git`

[site_in_blacklist]:https://github.com/egoo-wh/egoo/raw/master/images/site_in_blacklist.png
[tinypng_reg]:https://github.com/egoo-wh/egoo/raw/master/images/tinypng_reg.png
[tinypng_key]:https://github.com/egoo-wh/egoo/raw/master/images/tinypng_key.png


