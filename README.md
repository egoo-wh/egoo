# egoo
egoo命令行。包含一些提高工作效率的工具。

## 安装
1. 安装[Node.js](https://nodejs.org/)(v10.0+)。如已有node环境则跳过此步。
2. 安装[Git](https://git-scm.com/)。如已有Git环境则跳过此步。
3. 安装 **egoo** 命令行工具。`npm i -g git+https://e.coding.net/egoo-wh/egoo-cli/egoo.git`。更新 **egoo** 也使用此命令。
4. 输入`egoo -v`，出现版本信息（类似`2.0.0`），表明 **egoo** 安装成功。
5. 如果更新有问题，则使用`npm rm egoo -g`。先卸载，然后重复步骤3再次安装。

## 使用
- [发布功能](#发布)
- [分离功能](#分离)

## 发布
将文件发布到内网或者外网。  
发布到内网。主要方便本地无web server的开发同学，1.进行H5页面真机调试; 2.将地址给相应设计同学进行体验确认。  
发布到外网。提供给需求方预览地址（主要是H5页面），供其扫描二维码体验确认。[URL转二维码链接](http://www.liantu.com/)
```
egoo pub/publish [sources] [options]
```
### 参数说明：
参数 | 说明
----- | ------------
sources | 要上传的文件路径。支持多个路径，多个路径用空格分割线。

### 选项说明：

 选项  | 说明
------------- | -------------
--mode | 上传的模式，可以是egoo/pinna，默认为egoo。egoo上传到egoodev.top，pinna上传到pinnadev.top。  
-p --pinna | 等同于--mode pinna --ignore-injected --ignore-replaced
-e --egoo | 等同于--mode egoo
--ignore-cache | 忽略缓存，全量上传  
--config-forcereload | 重新加载配置文件
--ignore-injected | 忽略文件注入
--ignore-replaced | 忽略文本替换

例如：
```
egoo pub E:\workspace\zoom_bug
egoo pub E:\workspace\zoom_bug -p
```
上述命令表示发布zoom_bug文件夹。  
命令行出现**publish success.**，表示发布成功。 **preview url**表示预览地址。

### 注意事项
1. **重点：外网地址只是临时地址，仅用于预览体验，不能作为正式发布地址。如果接口人有分享该地址到朋友圈等公开地址的行为，要告知接口人不能这样做——就说是临时预览地址，不稳定，随时可能失效。**
2. 如果上传的文件路径存在特殊字符，如空格、括号等，则需要用引号包裹。如:  
`E:\H5无线端页面\20141208-WX17007-双十二充值活动(submitted)\WX17007`，那么上传命令则为`egoo publish "E:\H5无线端页面\20141208-WX17007-双十二充值活动(submitted)\WX17007"`。
3. 上传的文件夹（包括其下所有文件名、文件夹名）不能包含中文，否则会因乱码而无法访问。例如：  
source为`E:\workspace\201503\互娱\a20150312mweud`可以。  
source为`E:\workspace\201503\互娱\a20150312mweud奖励`不可以。  
4. 上传的文件名不能有大写字母，否则无法访问。例如：  
source为`E:\workspace\201503\互娱\SQ26659`，不可以。  
source为`E:\workspace\201503\互娱\sq26659`，可以。  

---

## 分离
为了简化图片分离操作，实现此功能。  
分离工具。做下列几件事情：  
1. 复制并重命名（项目名后面加“分离后”）整个包；
2. 分离图片。将html文件(.htm,.html,.shtml,.inc)和css文件内的相对地址（ossweb-img/images）转换成cdn地址。[查看分离规则](#分离规则)。 
3. 去除协议（可选）。删除url中的 **http(s):** 部分。不包含嵌入data uri(data:image/...)内的http(s):部分

### 分离规则
#### 分离html
只会处理html标签的**href|src|poster**属性。
注意
1. 不会处理懒加载等场景下添加的自定义属性。如`<div data-lazy=url />`
2. 不会处理`<form action=url>、<button formaction=url>、<head profile=url>`等

#### 分离样式
只会处理样式的`url()`部分  

所以，分离功能将创建一个分离后的版本。
```
egoo fenli [sources] [options]
```
### 参数说明：
参数 | 说明
----- | ------------
sources | 要分离的文件路径。支持多个路径，多个路径用空格分割线。

### 选项说明：

 选项  | 说明
------------- | -------------
-u --url  | 指定分离路径。如（//game.gtimg.cn/images/dnf/cp/）
-a --aliases | 项目所属产品的别名，根据产品找到对应分离路径。如地下城与勇士为dnf，QQ飞车为speed，王者荣耀为pvp，一般为产品官网缩写。具体别名请查看(https://fenli.egooidea.com/) ，如果别名未找到，请添加或使用-u选项。
--forcehttps | 强制https，会在分离地址前加上https:，同时，http: 地址会发出错误提示。-a dnf会默认开启强制https

例如：
- `egoo fenli E:\workspace\DNF-元宵许愿\a20180108wish -a DNF`
- `egoo fenli E:\workspace\DNF-元宵许愿\a20180108wish -u //game.gtimg.cn/images/dnf/cp/`

上述命令会创建一个*分离后的项目*。
### 注意事项
1. 分离工具，只分离html文件和CSS文件。如果其他文件（JS文件）有需要分离的路径，需自行单独处理。
2. 只会分离ossweb-img|images目录下的图片
3. beta阶段，谨慎使用。

---

### 关于Windows命令行(cmd)使用技巧：

1. 粘贴。（鼠标右键--粘贴）
2. 复制。（鼠标右键--标记--选择文本）
3. 文件路径可直接将文件拖入cmd来生成。


