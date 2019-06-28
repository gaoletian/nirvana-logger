/**
 * author: gaoletian
 */
const path = require('path');
const color = require('chalk');
const lodash = require('lodash');
const inspect = require('util').inspect;
/**
 *  测试了以下四个库的效率， fast-safe-stringify 最快
 *  "fast-json-stringify": "^0.17.0","fast-safe-stringify": "^1.2.2",
 *  "fast-stable-stringify": "^1.0.0", "safe-json-stringify": "^1.0.4"
 */
const fastSafeStringify = require('fast-safe-stringify');

const K8_CONSOLE_MAX_LINE = 200;
let logCounter = 0;

const isColor = process.env.LOG_COLOR || false;

const stringify = (value, opt = {showHidden: false, depth: null, colors: isColor, breakLength: Infinity}) => {
  if (isK8Env() || isProdEnv()) {
    return fastSafeStringify(value);
  }
  return inspect(value, opt);
};
const fs = require('fs');
// Stack trace format :
// https://github.com/v8/v8/wiki/Stack%20Trace%20API
const stackReg = /at\s+(.*)\s+\((.*):(\d*):(\d*)\)/i;
const stackReg2 = /at\s+()(.*):(\d*):(\d*)/i;

/**
 * 判断是否K8环境
 * @return {boolean}
 */
const isK8Env = () => {
  const {LOG_PATH, LOG_FILE_NAME} = process.env;
  return (!!LOG_PATH) && (!!LOG_FILE_NAME);
};

/**
 * 是否生产环境
 */
const isProdEnv = () => process.env.env === 'production';

/**
 * 错误对象字符串化
 * @param err
 * @return {string}
 */
const errorStringify = (err) => {
  const res = Object.getOwnPropertyNames(err).map(key => {
    return key === 'stack'
      ? `${key}: ${err[key]}`
      : `${key}: ${stringify(err[key])}`;
  }).join('\n');
  return (process.env.env === 'production' || isK8Env()) ? res : color.red(res);
};

/**
 * 格式化时间
 * @param formatStr
 * @return {string|XML}
 */
const formatDate = formatStr => {
  const D = new Date();
  const [YYYY, MM, DD, HH, mm, ss, SSS] = [
    D.getFullYear(), (D.getMonth() + 1), D.getDate(),
    D.getHours(), D.getMinutes(), D.getSeconds(), D.getMilliseconds(),
  ].map(e => '0' + e);
  return formatStr.replace('YYYY', YYYY.slice(-4))
                  .replace('YY', YYYY.slice(-2))
                  .replace('MM', MM.slice(-2))
                  .replace('DD', DD.slice(-2))
                  .replace('HH', HH.slice(-2))
                  .replace('mm', mm.slice(-2))
                  .replace('ss', ss.slice(-2))
                  .replace('SSS', SSS.slice(-3));
};

/**
 * 字符串截断
 * @param str
 * @param length
 * @return {Buffer|ArrayBuffer|Blob|string|Array.<T>}
 */
function strSlice(str, length = 512) {
  return str.length > length ? (str.slice(0, length)) : str;
}

/**
 * 替换多余空格
 * @param str
 * @return {*|string|void|XML}
 */
function replaceBank(str) {
  return str;
  // 替换空格比较耗时暂时关闭
  // return str.replace(/ {2，100}/g, '').replace(/\s{2,100}/g, '');
}

/**
 * nirvana-logger 构造函数
 * @param nameSpace
 * @returns {Function}
 */
module.exports.default = module.exports = function(nameSpace = null) {
  const logger = function(...args) {
    const startTime = new Date();
    const {LOG_PATH, LOG_FILE_NAME, env, serviceName} = process.env;
    const isk8OrProd = process.env.env === 'production' || isK8Env();
    try {
      const err = (new Error).stack.split('\n')[2];
      const sp = stackReg.exec(err) || stackReg2.exec(err);
      const pathSplit = sp[2].split('/');
      const lengthFromRight = Math.max(-2, -pathSplit.length);
      const filePath = pathSplit.slice(lengthFromRight).join('/');

      const file = logger.fileName || (isk8OrProd ? filePath : color.red(filePath));
      const currentTime = isK8Env() ? formatDate('YYYY-MM-DD HH:mm:ss.SSS') : formatDate('YYMMDD/HHmmss.SSS');
      const timestamp = isk8OrProd ? currentTime : color.gray(currentTime);
      const scope = isk8OrProd ? '【' + nameSpace + '】' : (nameSpace ? color.yellow('【' + nameSpace + '】') : '');

      let argsStringifys = args.map(arg => {
        // Error对象处理
        if (lodash.isString(arg)) {
          return logger.strMaxLen
            ? replaceBank(strSlice(arg, logger.strMaxLen))
            : replaceBank(strSlice(arg));
        }
        if (arg === null) return 'null';
        if (arg === undefined) return 'undefined';
        if (lodash.isError(arg)) return '\n' + errorStringify(arg);
        if (lodash.isFunction(arg)) return 'function';
        if (lodash.isObject(arg)) {
          return logger.strMaxLen
            ? strSlice(replaceBank(stringify(arg)), logger.strMaxLen)
            : strSlice(replaceBank(stringify(arg)));
        }
        return arg;
      });

      const content = argsStringifys.join(` `);

      const traceId = logger.traceId || '';

      // 输出json

      if (isK8Env()) {
        const jsonPath = path.join(LOG_PATH, LOG_FILE_NAME);
        const writeContent = stringify({serviceName, timestamp, file, scope, traceId, env, content});
        fs.existsSync(jsonPath)
          ? fs.appendFile(jsonPath, writeContent + '\n', function() { })
          : fs.writeFileSync(jsonPath, writeContent + '\n');
        if (++logCounter > K8_CONSOLE_MAX_LINE) {
          return;
        }
      }

      // 日志输出格式为：
      // 时间 文件 【名字空间】[串号][内部时间] 详细内容
      const log = logger.mockLog ? logger.mockLog : console.log;
      const tractIdFormat = traceId.toString().length ? `[${traceId}]` : '';
      const eatTime = ((new Date) - startTime) + 'ms';
      return log(`${timestamp} ${file}${scope}${tractIdFormat}[${eatTime}]`, content);
    } catch (err) {
      console.trace(err);
    }
  };

  /**
   * 设置串号
   * @param {string} id - 设置串号
   * @return {logger} - 返回logger自身
   */
  logger.setId = function(traceId) {
    logger.traceId = traceId;
    return logger;
  };

  /**
   * 设置log 用于单元测试
   * @param {string} id - 设置串号
   * @return {logger} - 返回logger自身
   */
  logger.setLog = function(log) {
    logger.mockLog = log;
    return logger;
  };

  /**
   * 设置最大长度
   * @param length
   */
  logger.setLength = logger.setMaxLength = function(length = 512) {
    logger.strMaxLen = length;
    return logger;
  };

  /**
   * 设置文件名
   * @param fileName
   * @returns {logger}
   */
  logger.setName = logger.setFileName = function(fileName = '') {
    logger.fileName = fileName;
    return logger;
  };

  logger.warn = console.warn;
  logger.trace = console.trace;
  logger.error = console.error;
  return logger;
};
