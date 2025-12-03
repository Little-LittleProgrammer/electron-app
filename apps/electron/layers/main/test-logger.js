// 测试 logger 功能
const { logger } = require('./dist/index.cjs');

console.log('=== 测试 logger 功能 ===');

// 测试不同级别的日志
logger.error('这是一个错误日志');
logger.warn('这是一个警告日志');
logger.info('这是一个信息日志');
logger.debug('这是一个调试日志');

// 测试带元数据的日志
logger.info('带元数据的日志', {
    timestamp: new Date().toISOString(),
    user: 'test-user',
    action: 'test-action',
});

// 测试获取日志路径
console.log('日志文件路径:', logger.getLogFilePath());
console.log('日志目录:', logger.getLogDir());

console.log('=== 测试完成 ===');
