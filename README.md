# 使用nirvana-logger进行 nodejs 日志标准化

> nirvana-logger 是一个简单的日志包，灵感来源于 `debug` 和 `tracer`
> 
> mesos部署 日志输出到console 的格式为 [时间] [文件] [scope] [content]
> 
> k8环境部署 日志输出为json 格式为 {serviceName, timestamp, file, scope, traceId, env, content}

# 特性

- 自动截断过长内容，默认截断长度为 `512`,  通过 `.setLength()` 更改截断长度

- 自动识别K8环境, 如果是K8则日志以 `json` 格式式输出到指定路径中，否则直接输出到 console

- 支持指定文件名 `.setName(fileName)`

- 支持日志串号设置  `.setId(trackId)`
 
# 安装

```sh
yarn add nirvana-logger@latest
# 或
npm i nirvana-logger@latest
```

> package.json

![-w296](media/15131469552777/15143704410138.jpg)


# 用法
```js
// filename: demo.js
const L = require('nirvana-logger')('注册')

const articles = {code: 200, message: '操作成功', result: [
	{titile: '标题', content: '内容'},
	{titile: '标题', content: '内容'},
]};

// 输出 js object
L('articles =>', articles);


const error = new Error('this is custom Error Object')
// 直接输出错误对象
L('error =>', error);

```

> mesos部署方式输出到 console

![](media/15131469552777/15143650439239.jpg)

> k8部署输出json 格式为：  {serviceName, timestamp, file, scope, traceId, env, content}

![](media/15131469552777/15143689307921.jpg)


# 实例方法

- setId  设置串号,方便日志查询

	```js
  /**
   * 设置串号
   * @param {string} id - 设置串号
   * @return {logger} - 返回logger自身
   */
  logger.setId = function(traceId) {
    logger.traceId = traceId;
    return logger;
  };
	```
	
	example
	
	```js
   const trackId = channelCode + ':' userId;
   L.setId(trackId);
	```	

- setMaxLength 别名`setLength` 设置日志截取长度，默认 `512`
  
  ```js
  /**
   * 设置最大长度
   * @param length
   */
  logger.setLength = logger.setMaxLength = function(length = 512) {
    logger.strMaxLen = length;
    return logger;
  };
  ```
  
- setFileName 设置文件名

 ```
  /**
   * 设置文件名
   * @param fileName
   * @returns {logger}
   */
  logger.setName = logger.setFileName = function(fileName = '') {
    logger.fileName = fileName;
    return logger;
  };
 ```
 
 
# 单元测试

```js
const fakeLog = (...args) => args;
const fs = require('fs');
const execSync = (cmd) => require('child_process').execSync(cmd, {encodeing: 'utf-8'});
const path = require('path');
const L = require('../')('scopeA');
L.setLog(fakeLog);
const sleep = (duration) => {
  return new Promise((resolve, reject) => {
    setTimeout(resolve('ok'), duration);
  });
};

describe('nirvana-logger test', () => {
  it('should has nameSpace', () => {
    const res = L('hello');
    expect(res[0].indexOf('scopeA') > 0).toBe(true);
  });
  it('should has trackId', () => {
    L.setId('ID:12345678');
    const res = L('trackId test');
    expect(L.traceId).toBe('ID:12345678');
    expect(res[0].indexOf('ID:12345678') > 0).toBe(true);
  });
  it('should has fileName', () => {
    const res = L('hello');
    expect(res[0].indexOf('logger.spec.js') > 0).toBe(true);
  });
  it('should support param is null', () => {
    const res = L(null);
    expect(res[1].indexOf('null') > 0).toBe(true);
  });
  it('should support param is undifined', () => {
    const res = L(undefined);
    expect(res[1].indexOf('undefined') > 0).toBe(true);
  });
  it('should support param is function', () => {
    const res = L(function() {});
    expect(res[1].indexOf('function') > 0).toBe(true);
  });
  it('数据量过大时应自动截断', () => {
    const res = L(require('../example/bigObject'));
    expect(res[1].length).toBe(true);
  });

  it('支持自定义输出字符长度', () => {
    const L1 = require('../')('scopeB');
    L1.setLog(fakeLog);
    L1.setMaxLength(2000);
    const res = L1(require('../example/bigObject'));
    expect(res[1].length > 1999).toBe(true);
  });

  it('when exist LOG_PATH && LOG_FILE_NAME, should output json', () => {
    const [LOG_PATH, LOG_FILE_NAME] = [__dirname, 'log0.json'];
    process.env.LOG_FILE_NAME = LOG_FILE_NAME;
    process.env.LOG_PATH = LOG_PATH;
    process.env.env = 'production';
    L.setMaxLength(4000);

    const logPath = path.join(LOG_PATH, LOG_FILE_NAME);
    execSync('rm -rf ' + logPath);
    const bigObject = require('../example/bigObject');
    L('[入参]', bigObject);
    L('[出参]', bigObject);
    expect(fs.existsSync(logPath)).toBe(true);
  });
});

```


	

