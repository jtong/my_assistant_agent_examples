const fs = require('fs').promises; // 使用 fs.promises 进行异步文件操作
const fsSync = require('fs'); // 保留同步方法用于初始化
const path = require('path');

// 配置日志文件路径 (可以考虑使用环境变量或配置文件)
// 确保日志目录存在
const logDir = path.join(__dirname, '..', 'logs'); // 存放在 server/logs/
if (!fsSync.existsSync(logDir)) {
    try {
        fsSync.mkdirSync(logDir, { recursive: true });
    } catch (err) {
        console.error("Failed to create log directory:", logDir, err);
        // 如果日志目录创建失败，可能需要回退到控制台或其他方式
    }
}
const logFilePath = path.join(logDir, 'server.log');

// 使用队列处理异步日志写入，避免大量并发写入
class LogQueue {
    constructor() {
        this.queue = [];
        this.isProcessing = false;
    }

    enqueue(logEntry) {
        this.queue.push(logEntry);
        if (!this.isProcessing) {
            this.processQueue();
        }
    }

    async processQueue() {
        if (this.queue.length === 0) {
            this.isProcessing = false;
            return;
        }

        this.isProcessing = true;
        const entry = this.queue.shift();

        try {
            await fs.appendFile(entry.filePath, entry.message);
        } catch (err) {
            console.error("Failed to write log entry:", err);
            console.error("Original log message:", entry.message.trim());
        }

        // 继续处理队列中的下一个
        setImmediate(() => this.processQueue());
    }
}

class Logger {
    constructor() {
        this.logFilePath = logFilePath;
        this.baseDir = path.join(__dirname, '..'); // 设置为 server 目录
        this.logLevel = process.env.LOG_LEVEL || 'info'; // 设置日志级别 (debug, info, warn, error)
        this.logQueue = new LogQueue();

        // 定义不同级别的日志方法
        this.levels = { debug: 0, info: 1, warn: 2, error: 3 };
        this.currentLevel = this.levels[this.logLevel.toLowerCase()] ?? this.levels.info;
    }

    _log(level, message) {
        if (this.levels[level] < this.currentLevel) {
            return; // 低于当前级别的日志不记录
        }

        let logEntry = `[${new Date().toISOString()}] [${level.toUpperCase()}]`;

        try {
            const callSite = this._getCallSite();
            // 如果调用栈信息获取成功，添加文件名和行号
            if (callSite) {
                logEntry += ` [${callSite.fileName}:${callSite.lineNumber}]`;
            }
        } catch (e) {
            // 如果获取调用栈失败，则忽略
            logEntry += " [unknown source]";
        }

        logEntry += ` - ${message}\n`;

        // 将日志消息添加到队列中以异步写入
        this.logQueue.enqueue({
            filePath: this.logFilePath,
            message: logEntry
        });

        // 同时输出到控制台 (可选)
        if (level === 'error') {
            console.error(logEntry.trim());
        } else if (level === 'warn') {
            console.warn(logEntry.trim());
        } 
    }

    debug(message) {
        this._log('debug', message);
    }

    log(message) {
        this._log('info', message);
    } // 保持 log 作为 info 别名

    info(message) {
        this._log('info', message);
    }

    warn(message) {
        this._log('warn', message);
    }

    error(message) {
        this._log('error', message);
    }

    _getCallSite() {
        const originalPrepareStackTrace = Error.prepareStackTrace;
        try {
            Error.prepareStackTrace = (_, stack) => stack;
            const err = new Error();
            const stack = err.stack;
            Error.prepareStackTrace = originalPrepareStackTrace; // 恢复

            // 找到第一个不是 logger.js 内部调用的堆栈帧
            // stack[0] is _getCallSite
            // stack[1] is _log
            // stack[2] is the public method (debug, info, warn, error)
            // stack[3] should be the actual caller
            if (stack && stack.length > 3) {
                const callSite = stack[3];
                const fileName = callSite.getFileName();
                // 转换为相对于 baseDir 的路径
                const relativePath = fileName ? path.relative(this.baseDir, fileName) : 'unknown';
                return {
                    fileName: relativePath,
                    lineNumber: callSite.getLineNumber()
                };
            }
        } catch (e) {
            // console.error("Error getting call site:", e); // 调试时可以取消注释
            Error.prepareStackTrace = originalPrepareStackTrace; // 确保恢复
        }
        return null; // 获取失败
    }
}

// 创建并导出单例
const logger = new Logger();
module.exports = logger;