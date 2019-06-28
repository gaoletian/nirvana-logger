/**
 * Created by 高乐天 on 17/12/27.
 */
// filename: demo.js
const [LOG_PATH, LOG_FILE_NAME] = [__dirname, 'log0.json'];
process.env.LOG_FILE_NAME = LOG_FILE_NAME;
process.env.LOG_PATH = LOG_PATH;
process.env.env = 'production';

const L = require('.')('demo');

const articles = {
  code: 200, message: '操作成功', result: [
    {titile: '标题', content: '内容'},
    {titile: '标题', content: '内容'}
  ]
};

// 输出 js object
L('articles =>', articles);

const error = new Error('this is custom Error Object');
// 直接输出错误对象
L('error =>', error);
