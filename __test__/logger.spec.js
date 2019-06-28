const fakeLog = (...args) => args;
const fs = require('fs');
const execSync = (cmd) => require('child_process').execSync(cmd, {encodeing: 'utf-8'});
const path = require('path');
const L = require('../')('scopeA');
L.setLog(fakeLog);

describe('nirvana-logger test', () => {

  it('should has nameSpace', () => {
    const L1 = require('../')();
    L1('无namespace');
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
    expect(res[1] === 'null').toBe(true);
  });
  it('should support param is undifined', () => {
    const res = L(undefined);
    expect(res[1] === 'undefined').toBe(true);
  });
  it('should support param is function', () => {
    const res = L(function() {});
    expect(res[1] === 'function').toBe(true);
  });
  it('should support param is number', () => {
    const res = L(123);
    expect(res[1] === '123').toBe(true);
  });
  it('should support param is error', () => {
    const res = L(new Error('this is error'));
    expect(res[1].indexOf('stack:') > 0).toBe(true);
  });
  it('should support param is array', () => {
    const res = L(['abc', 123]);
    console.log(res[1]);
    expect(res[1].indexOf('abc') > 0).toBe(true);
  });
  it('数据量过大时应自动截断', () => {
    const res = L(require('../example/bigObject'));
    expect(res[1].length < 600).toBe(true);
  });

  it('支持自定义输出字符长度', () => {
    const L1 = require('../')('scopeB');
    L1.setLog(fakeLog);
    L1.setMaxLength();
    L1.setMaxLength(2000);
    const res = L1(require('../example/bigObject'));
    expect(res[1].length > 1999).toBe(true);
  });

  it('支持自定义文件名称', () => {
    const L = require('../')('scopeB');
    L.setLog(fakeLog);
    L.setName();
    L.setName('new-file-name');
    console.log(L('')[0]);
    expect(L('')[0].indexOf('new-file-name') > 0).toBe(true);
  });

  it('K8环境测试 LOG_PATH && LOG_FILE_NAME, should output json', () => {
    const [LOG_PATH, LOG_FILE_NAME] = [__dirname, 'log0.json'];
    const L = require('../')('k8');
    L.setLog(fakeLog);
    process.env.LOG_FILE_NAME = LOG_FILE_NAME;
    process.env.LOG_PATH = LOG_PATH;
    process.env.env = 'production';
    L.setMaxLength(60);

    const logPath = path.join(LOG_PATH, LOG_FILE_NAME);
    execSync('rm -rf ' + logPath);
    const bigObject = require('../example/bigObject');
    L('[入参]----------', bigObject);
    L('[出参]----------', bigObject);
    expect(fs.existsSync(logPath)).toBe(true);
  });
});


