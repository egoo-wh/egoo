# egoo
Egoo CLI. includes several tools to improve work efficiency.
## 安装
1. 安装[Node.js](https://nodejs.org/)。v8.0+
2. 在命令行（开始--cmd），输入`node -v`，出现版本信息（类似`v8.0.0`），表明Node.js安装成功。
3. 安装 **egoo** 命令行工具。
```
npm install -g https://github.com/egoo-wh/egoo
```
更新 **egoo** 也使用上述命令。

4. 输入`egoo -v`，出现版本信息（类似`1.1.2`），表明egoo安装成功。
5. 如果更新有问题，则使用
```
npm rm egoo -g
```
先卸载，然后重复步骤3再次安装。

## 使用
- [发布功能](#发布)
- [分离功能](#分离)(beta)
- [TinyPNG图片压缩](#tinypng批量图片压缩)(beta)
- [图片尺寸偶数化](#图片尺寸偶数化)(beta)

## 发布
将文件发布到内网或者外网。  
发布到内网。主要方便本地无web server的开发同学，1.进行H5页面真机调试; 2.将地址给相应设计同学进行体验确认。  
发布到外网。提供给需求方预览地址（主要是H5页面），供其扫描二维码体验确认。[URL转二维码链接](http://www.liantu.com/)
```
egoo pub/publish [source] [options]
```
### 参数：
Param | Description
----- | ------------
source | 要上传的文件路径

### 选项：

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
命令行出现**publish success.**，表示发布成功。

### 注意事项
1. **重点：外网地址只是临时地址，仅用于预览体验，不能作为正式发布地址。如果接口人有分享该地址到朋友圈等公开地址的行为，要告知接口人不能这样做——就说是临时预览地址，不稳定，随时可能失效。**
2. 如果上传的文件路径存在特殊字符，如空格、括号等，则需要用引号包裹。如:`E:\H5无线端页面\20141208-WX17007-双十二充值活动(submitted)\WX17007`，那么上传命令则为`egoo publish "E:\H5无线端页面\20141208-WX17007-双十二充值活动(submitted)\WX17007"`。
3. 上传的文件名不能有大写字母，否则无法访问。例如：  
source为`E:\workspace\201503\互娱\SQ26659`，不可以。  
source为`E:\workspace\201503\互娱\sq26659`，可以。  
4. 上传的文件夹（包括其下所有文件名、文件夹名）不能包含中文，否则会因乱码而无法访问。例如：  
source为`E:\workspace\201503\互娱\a20150312mweud`可以。  
source为`E:\workspace\201503\互娱\a20150312mweud奖励`不可以。  

---

## 分离
为了简化图片分离操作，实现此功能。  
分离功能做下列几件事情：
1. 复制项目并重命名（项目名后面加“分离后”）
2. 图片分离，分离html文件(.htm,.html,.shtml,.inc)和css文件中的图片地址。
3. 去掉html文件中绝对路径前的http(s):

所以，该功能将创建一个分离后的版本。
```
egoo fenli [source] [options]
```
### 参数：
Param | Description
----- | ------------
source | 要分离的文件路径

### 选项：

 Options  | Description
------------- | -------------
-d --url  | 指定分离路径。如（//game.gtimg.cn/images/dnf/cp/）
-a --aliases | 项目所属产品的别名，根据产品找到对应分离路径。如地下城与勇士为dnf，QQ飞车为speed，王者荣耀为pvp，一般为产品官网缩写。如果别名未找到，请使用-u。~~具体别名请查看(http://192.168.1.11/fenli)~~

例如：
- `egoo fenli E:\workspace\DNF-元宵许愿\a20180108wish -a DNF`
- `egoo fenli E:\workspace\DNF-元宵许愿\a20180108wish -u //game.gtimg.cn/images/dnf/cp/`

上述命令会创建一个*分离后的项目*。
### 注意事项
1. 分离工具，只分离html文件和CSS文件。如果其他文件（JS文件）有需要分离的路径，需自己单独处理。
2. beta阶段，谨慎使用。

---

## TinyPNG批量图片压缩
压缩PNG图片。
因为tiny压缩图片非常繁琐。需要经过好几个步骤
1. 打开tinypng.com
2. 将文件拖入
3. 等待压缩完成，下载文件
4. 将下载文件复制到项目内

步骤比较繁琐，所以实现这个功能来简化操作。
### 使用前必读
使用之前，需前往[TinyPNG开发者页面](https://tinypng.com/developers)注册，获取免费的API KEY。获取步骤如下：
![注册][tinypng_reg]
注册完成之后，在如下页面会获取API KEY。  
![获取][tinypng_key]
这个KEY，会在初次使用本工具时，被要求使用。
```
egoo tiny/tinypng [source]
```
### 参数：
Param | Description
----- | ------------
source | 要压缩的文件路径。可以是文件或目录。如果是目录，则压缩目录下所有PNG图片。

例如：
```
egoo tiny E:\workspace\a20170817wfgx\ossweb-img
```
上述命令表示压缩该目录下所有图片。

### 注意事项
1. 根据TinyPNG官网信息显示：每个免费的API KEY，每月只有500次的压缩机会，所以，请酌情使用。
2. beta阶段，谨慎使用。

---

## 图片尺寸偶数化
将图片尺寸偶数化，如255x105的图片，将会被调整至256x106。因为京东规范要求[图片尺寸严禁使用奇数值](https://jdc.jd.com/cp/#1-尺寸-单位)，故创建本工具。
针对PNG图片，偶数化通过增加1px的透明边实现；JPG图片则直接向上拉伸为偶数。
### 使用前必读
使用之前，必须安装[GraphicsMagick](http://www.graphicsmagick.org/)，
[GraphicsMagick下载地址](ftp://ftp.graphicsmagick.org/pub/GraphicsMagick/windows/GraphicsMagick-1.3.26-Q16-win64-dll.exe)。

```
egoo ie/imgeven [source]
```
### 参数：
Param | Description
----- | ------------
source | 要调整的文件路径。可以是文件或目录。如果是目录，则调整目录下所有图片。

例如：
```
egoo ie E:\workspace\a20170817wfgx\ossweb-img
```
上述命令表示调整该目录下所有图片。

### 注意事项
1. 只能调整JPG，PNG格式的图片。
2. 调整都是向上调整。如157x155会调整成158x156。
3. beta阶段，谨慎使用。

--- 

### 关于Windows命令行(cmd)使用技巧：

1. 粘贴。（鼠标右键--粘贴）
2. 复制。（鼠标右键--标记--选择文本）
3. 文件路径可直接将文件拖入cmd来生成。


[site_in_blacklist]:https://github.com/egoo-wh/egoo/raw/master/demo/site_in_blacklist.png
[tinypng_reg]:https://github.com/egoo-wh/egoo/raw/master/demo/tinypng_reg.png
[tinypng_key]:https://github.com/egoo-wh/egoo/raw/master/demo/tinypng_key.png


