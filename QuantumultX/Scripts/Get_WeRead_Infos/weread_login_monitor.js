/**
 * 微信读书登录请求监控脚本 (BoxJS版) - 改进版
 * 功能说明：
 * 1. 监控https://i.weread.qq.com/login的请求
 * 2. 提取header中的vid和完整的request_body
 * 3. 将提取的信息格式化为JSON
 * 4. 发送通知提示用户
 * 5. 将信息推送到GitHub Gist，优先查找并更新已存在的指定文件
 *
 * 使用方法：
 * 1. 将此脚本添加到Quantumult X的rewrite_local配置中
 * 2. 在BoxJS中配置GitHub Token和其他选项
 * 3. 重新打开微信读书App并登录
 * 4. 脚本将自动捕获登录请求并处理
 */
// 创建Env环境实例
const $ = new Env('微信读书登录信息监控');

// BoxJS 订阅信息
let boxjsConfig = {
  id: 'WeReadLogin',
  name: '微信读书登录信息监控',
  keys: [
    'wr_github_token',
    'wr_gist_id',
    'wr_gist_filename',
    'wr_gist_description',
    'wr_enable_gist',
    'wr_debug_mode',
  ],
};

// 从BoxJS获取配置
let githubToken = $.getdata('wr_github_token') || '';
let gistId = $.getdata('wr_gist_id') || '';
let gistFilename = $.getdata('wr_gist_filename') || 'weread_login_info.json';
let gistDescription = $.getdata('wr_gist_description') || '微信读书登录信息';
let enableGistUpload = $.getdata('wr_enable_gist') === 'true';
let debugMode = $.getdata('wr_debug_mode') === 'true';

// 通知常量
const NOTIFY_TITLE = '微信读书登录信息';
const NOTIFY_SUCCESS_MSG = '登录信息已成功提取';
const NOTIFY_ERROR_MSG = '登录信息提取失败';
const NOTIFY_GIST_SUCCESS = '已成功上传到Gist';
const NOTIFY_GIST_ERROR = 'Gist上传失败';

!(async () => {
  await processRequest($request);  // 处理请求
})()
  .catch((e) => $.logErr(e))  // 捕获并记录错误
  .finally(() => $.done());    // 完成请求处理


/**
 * 处理微信读书登录请求
 * @param {Object} request - 捕获的HTTP请求对象
 * @returns {Object} - 处理后的请求对象
 */
async function processRequest(request) {
  try {
    $.log('开始处理微信读书登录请求...');
    
    // 提取关键信息
    const headers = request.headers;
    const vid = headers.vid || '';
    
    // 解析请求体
    let requestBody = parseRequestBody(request.body);
    
    // 构建结果对象
    const result = {
      vid,
      requestBody,
      headers,
      captureTime: new Date().toISOString()
    };
    
    // 发送通知
    $.msg(NOTIFY_TITLE, NOTIFY_SUCCESS_MSG, 'VID: ' + vid);
    let gist_body = JSON.stringify(result, null, 2);
    
    if (debugMode) {
      $.log('微信读书登录信息:\n' + gist_body);
    }
  
    // 推送到GitHub Gist
    if (enableGistUpload && githubToken) {
      const gistResult = await pushToGist(gist_body);
      if (gistResult.success) {
        $.msg(NOTIFY_TITLE, NOTIFY_GIST_SUCCESS, gistResult.message || '');
      } else {
        $.msg(NOTIFY_TITLE, NOTIFY_GIST_ERROR, gistResult.message || '');
      }
    }
    
    return request;
  } catch (err) {
    $.log(`处理请求时出错: ${err}`);
    $.msg(NOTIFY_TITLE, NOTIFY_ERROR_MSG, err.toString());
    return request;
  }
}

/**
 * 解析请求体
 * @param {string} body - 请求体
 * @returns {Object} - 解析后的对象
 */
function parseRequestBody(body) {
  if (!body) return {};
  
  try {
    const bodyText = decodeURIComponent(body);
    
    // 尝试解析为JSON
    if (bodyText.trim().startsWith('{') && bodyText.trim().endsWith('}')) {
      return JSON.parse(bodyText);
    }
    
    // 尝试解析为表单数据
    const result = {};
    bodyText.split('&').forEach(param => {
      const [key, value] = param.split('=');
      if (key && value) {
        result[key] = decodeURIComponent(value);
      }
    });
    return result;
  } catch {
    // 解析失败，返回原始请求体
    return { raw: body };
  }
}

/**
 * 推送数据到GitHub Gist
 * @param {string} content - 要推送的内容
 * @returns {Object} - 推送结果
 */
async function pushToGist(content) {
  try {
    if (!githubToken) {
      return { success: false, message: 'GitHub Token未设置' };
    }
    
    // 使用安全的方式处理token（避免硬编码）
    const token = githubToken;
    
    // 设置通用headers
    const headers = {
      Authorization: `token ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'WeReadLoginMonitor'
    };
    
    // 查找所有当前用户的gists
    let targetGistId = null;
    let needCreateNew = true;
    
    try {
      // 首先尝试查找包含指定文件名的gist
      const gistsResult = await $.http.get({
        url: 'https://api.github.com/gists',
        headers: headers
      }).then(response => {
        return { 
          status: response.statusCode, 
          body: response.body 
        };
      });
      
      if (gistsResult.status === 200) {
        const gists = JSON.parse(gistsResult.body);
        if (Array.isArray(gists)) {
          // 查找包含指定文件名的gist
          for (const gist of gists) {
            if (gist.files && gist.files[gistFilename]) {
              targetGistId = gist.id;
              needCreateNew = false;
              if (debugMode) {
                $.log(`找到包含文件 ${gistFilename} 的Gist: ${targetGistId}`);
              }
              break;
            }
          }
          
          // 如果没找到包含指定文件的gist，但指定了gistId，则尝试使用该gistId
          if (needCreateNew && gistId) {
            targetGistId = gistId;
            needCreateNew = false;
            if (debugMode) {
              $.log(`未找到包含文件 ${gistFilename} 的Gist，将使用指定的Gist ID: ${targetGistId}`);
            }
          }
        }
      }
    } catch (error) {
      $.log(`查找Gist时出错: ${error}`);
      // 查找出错但指定了gistId，则尝试使用该gistId
      if (gistId) {
        targetGistId = gistId;
        needCreateNew = false;
      }
    }
    
    // 更新现有Gist
    if (!needCreateNew && targetGistId) {
      try {
        const updateData = {
          description: gistDescription,
          files: {
            [gistFilename]: {
              content: content
            }
          }
        };

        const updateResult = await $.http.patch({
          url: `https://api.github.com/gists/${targetGistId}`,
          headers: headers,
          body: JSON.stringify(updateData)
        }).then(response => {
          return { 
            status: response.statusCode, 
            body: response.body 
          };
        });
        
        if (updateResult.status === 200) {
          if (debugMode) {
            $.log(`Gist更新成功: ${targetGistId}, 文件: ${gistFilename}`);
          }
          
          // 如果之前没有存储过gistId，则现在存储
          if (!gistId) {
            $.setdata(targetGistId, 'wr_gist_id');
          }
          
          return { success: true, message: `Gist已更新: ${targetGistId}` };
        } else {
          $.log(`Gist更新失败: ${JSON.stringify(updateResult)}`);
          return { success: false, message: `Gist更新失败: ${updateResult.status}` };
        }
      } catch (error) {
        $.log(`更新Gist时出错: ${error}`);
        // 出错则尝试创建新的
        return await createNewGist(content, headers);
      }
    } else {
      // 需要创建新的Gist
      return await createNewGist(content, headers);
    }
  } catch (error) {
    $.log(`Gist操作出错: ${error}`);
    return { success: false, message: `操作失败: ${error.message || error}` };
  }
}

/**
 * 创建新的Gist
 * @param {string} content - 要推送的内容
 * @param {Object} headers - 请求头
 * @returns {Object} - 创建结果
 */
async function createNewGist(content, headers) {
  try {
    const createData = {
      description: gistDescription,
      public: false,
      files: {
        [gistFilename]: {
          content: content
        }
      }
    };
    
    const createResult = await $.http.post({
      url: 'https://api.github.com/gists',
      headers: headers,
      body: JSON.stringify(createData)
    }).then(response => {
      return { 
        status: response.statusCode, 
        body: response.body 
      };
    });
    
    if (createResult.status === 201) {
      try {
        const resultObj = JSON.parse(createResult.body);
        const newGistId = resultObj.id;
        
        // 保存新创建的gistId到BoxJS
        if (newGistId) {
          $.setdata(newGistId, 'wr_gist_id');
          if (debugMode) {
            $.log(`新Gist已创建: ${newGistId}, 文件: ${gistFilename}`);
          }
          return { success: true, message: `新Gist已创建: ${newGistId}` };
        }
      } catch (e) {
        $.log(`解析Gist创建响应失败: ${e}`);
      }
    }
    
    $.log(`Gist创建失败: ${JSON.stringify(createResult)}`);
    return { success: false, message: `Gist创建失败: ${createResult.status}` };
  } catch (error) {
    $.log(`创建Gist时出错: ${error}`);
    return { success: false, message: `创建失败: ${error.message || error}` };
  }
}

/***************** Env 工具类 *****************/
// 精简的Quantumult X环境工具类 - 来源：https://github.com/chavyleung/scripts/blob/master/Env.min.js
// 提供了平台检测、持久化存储、HTTP请求、日志记录等功能
function Env(name, opts) {
	class Http {
		constructor(env) {
			this.env = env;
		}

		send(opts, method = 'GET') {
			opts = typeof opts === 'string' ? { url: opts } : opts;
			let sender = this.get;
			if (method === 'POST') {
				sender = this.post;
			}

			const delayPromise = (promise, delay = 1000) => {
				return Promise.race([
					promise,
					new Promise((resolve, reject) => {
						setTimeout(() => {
							reject(new Error('请求超时'));
						}, delay);
					}),
				]);
			};

			const call = new Promise((resolve, reject) => {
				sender.call(this, opts, (err, resp, body) => {
					if (err) reject(err);
					else resolve(resp);
				});
			});

			return opts.timeout ? delayPromise(call, opts.timeout) : call;
		}

		get(opts) {
			return this.send.call(this.env, opts);
		}

		post(opts) {
			return this.send.call(this.env, opts, 'POST');
		}

		patch(opts) {
			return this.send.call(this.env, opts, 'PATCH');
		}
	}

	return new (class {
		constructor(name, opts) {
			this.logLevels = { debug: 0, info: 1, warn: 2, error: 3 };
			this.logLevelPrefixs = {
				debug: '[DEBUG] ',
				info: '[INFO] ',
				warn: '[WARN] ',
				error: '[ERROR] ',
			};
			this.logLevel = 'info';
			this.name = name;
			this.http = new Http(this);
			this.data = null;
			this.dataFile = 'box.dat';
			this.logs = [];
			this.isMute = false;
			this.isNeedRewrite = false;
			this.logSeparator = '\n';
			this.encoding = 'utf-8';
			this.startTime = new Date().getTime();
			Object.assign(this, opts);
			this.log('', `🔔${this.name}, 开始!`);
		}

		getEnv() {
			if ('undefined' !== typeof $environment && $environment['surge-version']) return 'Surge';
			if ('undefined' !== typeof $environment && $environment['stash-version']) return 'Stash';
			if ('undefined' !== typeof module && !!module.exports) return 'Node.js';
			if ('undefined' !== typeof $task) return 'Quantumult X';
			if ('undefined' !== typeof $loon) return 'Loon';
			if ('undefined' !== typeof $rocket) return 'Shadowrocket';
		}

		isNode() {
			return 'Node.js' === this.getEnv();
		}

		isQuanX() {
			return 'Quantumult X' === this.getEnv();
		}

		isSurge() {
			return 'Surge' === this.getEnv();
		}

		isLoon() {
			return 'Loon' === this.getEnv();
		}

		isShadowrocket() {
			return 'Shadowrocket' === this.getEnv();
		}

		isStash() {
			return 'Stash' === this.getEnv();
		}

		toObj(str, defaultValue = null) {
			try {
				return JSON.parse(str);
			} catch {
				return defaultValue;
			}
		}

		toStr(obj, defaultValue = null, ...args) {
			try {
				return JSON.stringify(obj, ...args);
			} catch {
				return defaultValue;
			}
		}

		getjson(key, defaultValue) {
			let json = defaultValue;
			const val = this.getdata(key);
			if (val) {
				try {
					json = JSON.parse(this.getdata(key));
				} catch {}
			}
			return json;
		}

		setjson(val, key) {
			try {
				return this.setdata(JSON.stringify(val), key);
			} catch {
				return false;
			}
		}

		getScript(url) {
			return new Promise(resolve => {
				this.get({ url }, (err, resp, body) => resolve(body));
			});
		}

		runScript(script, runOpts) {
			return new Promise(resolve => {
				let httpapi = this.getdata('@chavy_boxjs_userCfgs.httpapi');
				httpapi = httpapi ? httpapi.replace(/\n/g, '').trim() : httpapi;
				let httpapi_timeout = this.getdata('@chavy_boxjs_userCfgs.httpapi_timeout');
				httpapi_timeout = httpapi_timeout ? httpapi_timeout * 1 : 20;
				httpapi_timeout = runOpts && runOpts.timeout ? runOpts.timeout : httpapi_timeout;
				const [key, addr] = httpapi.split('@');
				const opts = {
					url: `http://${addr}/v1/scripting/evaluate`,
					body: {
						script_text: script,
						mock_type: 'cron',
						timeout: httpapi_timeout,
					},
					headers: {
						'X-Key': key,
						Accept: '*/*',
					},
					policy: 'DIRECT',
					timeout: httpapi_timeout,
				};
				this.post(opts, (err, resp, body) => resolve(body));
			}).catch(e => this.logErr(e));
		}

		loaddata() {
			if (this.isNode()) {
				this.fs = this.fs ? this.fs : require('fs');
				this.path = this.path ? this.path : require('path');
				const curDirDataFilePath = this.path.resolve(this.dataFile);
				const rootDirDataFilePath = this.path.resolve(process.cwd(), this.dataFile);
				const isCurDirDataFile = this.fs.existsSync(curDirDataFilePath);
				const isRootDirDataFile = !isCurDirDataFile && this.fs.existsSync(rootDirDataFilePath);
				if (isCurDirDataFile || isRootDirDataFile) {
					const datPath = isCurDirDataFile ? curDirDataFilePath : rootDirDataFilePath;
					try {
						return JSON.parse(this.fs.readFileSync(datPath));
					} catch (e) {
						return {};
					}
				} else return {};
			} else return {};
		}

		writedata() {
			if (this.isNode()) {
				this.fs = this.fs ? this.fs : require('fs');
				this.path = this.path ? this.path : require('path');
				const curDirDataFilePath = this.path.resolve(this.dataFile);
				const rootDirDataFilePath = this.path.resolve(process.cwd(), this.dataFile);
				const isCurDirDataFile = this.fs.existsSync(curDirDataFilePath);
				const isRootDirDataFile = !isCurDirDataFile && this.fs.existsSync(rootDirDataFilePath);
				const jsondata = JSON.stringify(this.data);
				if (isCurDirDataFile) {
					this.fs.writeFileSync(curDirDataFilePath, jsondata);
				} else if (isRootDirDataFile) {
					this.fs.writeFileSync(rootDirDataFilePath, jsondata);
				} else {
					this.fs.writeFileSync(curDirDataFilePath, jsondata);
				}
			}
		}

		lodash_get(source, path, defaultValue = undefined) {
			const paths = path.replace(/\[(\d+)\]/g, '.$1').split('.');
			let result = source;
			for (const p of paths) {
				result = Object(result)[p];
				if (result === undefined) {
					return defaultValue;
				}
			}
			return result;
		}

		lodash_set(obj, path, value) {
			if (Object(obj) !== obj) return obj;
			if (!Array.isArray(path)) path = path.toString().match(/[^.[\]]+/g) || [];
			path
				.slice(0, -1)
				.reduce(
					(a, c, i) =>
						Object(a[c]) === a[c]
							? a[c]
							: (a[c] = Math.abs(path[i + 1]) >> 0 === +path[i + 1] ? [] : {}),
					obj
				)[path[path.length - 1]] = value;
			return obj;
		}

		getdata(key) {
			let val = this.getval(key);
			// 如果以 @
			if (/^@/.test(key)) {
				const [, objkey, paths] = /^@(.*?)\.(.*?)$/.exec(key);
				const objval = objkey ? this.getval(objkey) : '';
				if (objval) {
					try {
						const objedval = JSON.parse(objval);
						val = objedval ? this.lodash_get(objedval, paths, '') : val;
					} catch (e) {
						val = '';
					}
				}
			}
			return val;
		}

		setdata(val, key) {
			let issuc = false;
			if (/^@/.test(key)) {
				const [, objkey, paths] = /^@(.*?)\.(.*?)$/.exec(key);
				const objdat = this.getval(objkey);
				const objval = objkey ? (objdat === 'null' ? null : objdat || '{}') : '{}';
				try {
					const objedval = JSON.parse(objval);
					this.lodash_set(objedval, paths, val);
					issuc = this.setval(JSON.stringify(objedval), objkey);
				} catch (e) {
					const objedval = {};
					this.lodash_set(objedval, paths, val);
					issuc = this.setval(JSON.stringify(objedval), objkey);
				}
			} else {
				issuc = this.setval(val, key);
			}
			return issuc;
		}

		getval(key) {
			switch (this.getEnv()) {
				case 'Surge':
				case 'Loon':
				case 'Stash':
				case 'Shadowrocket':
					return $persistentStore.read(key);
				case 'Quantumult X':
					return $prefs.valueForKey(key);
				case 'Node.js':
					this.data = this.loaddata();
					return this.data[key];
				default:
					return (this.data && this.data[key]) || null;
			}
		}

		setval(val, key) {
			switch (this.getEnv()) {
				case 'Surge':
				case 'Loon':
				case 'Stash':
				case 'Shadowrocket':
					return $persistentStore.write(val, key);
				case 'Quantumult X':
					return $prefs.setValueForKey(val, key);
				case 'Node.js':
					this.data = this.loaddata();
					this.data[key] = val;
					this.writedata();
					return true;
				default:
					return (this.data && this.data[key]) || null;
			}
		}

		initGotEnv(opts) {
			this.got = this.got ? this.got : require('got');
			this.cktough = this.cktough ? this.cktough : require('tough-cookie');
			this.ckjar = this.ckjar ? this.ckjar : new this.cktough.CookieJar();
			if (opts) {
				opts.headers = opts.headers ? opts.headers : {};
				if (opts) {
					opts.headers = opts.headers ? opts.headers : {};
					if (
						undefined === opts.headers.cookie &&
						undefined === opts.headers.Cookie &&
						undefined === opts.cookieJar
					) {
						opts.cookieJar = this.ckjar;
					}
				}
			}
		}

		get(request, callback = () => {}) {
			if (request.headers) {
				delete request.headers['Content-Type'];
				delete request.headers['Content-Length'];

				// HTTP/2 全是小写
				delete request.headers['content-type'];
				delete request.headers['content-length'];
			}
			if (request.params) {
				request.url += '?' + this.queryStr(request.params);
			}
			// followRedirect 禁止重定向
			if (typeof request.followRedirect !== 'undefined' && !request['followRedirect']) {
				if (this.isSurge() || this.isLoon()) request['auto-redirect'] = false; // Surge & Loon
				if (this.isQuanX())
					request.opts
						? (request['opts']['redirection'] = false)
						: (request.opts = { redirection: false }); // Quantumult X
			}
			switch (this.getEnv()) {
				case 'Surge':
				case 'Loon':
				case 'Stash':
				case 'Shadowrocket':
				default:
					if (this.isSurge() && this.isNeedRewrite) {
						request.headers = request.headers || {};
						Object.assign(request.headers, { 'X-Surge-Skip-Scripting': false });
					}
					$httpClient.get(request, (err, resp, body) => {
						if (!err && resp) {
							resp.body = body;
							resp.statusCode = resp.status ? resp.status : resp.statusCode;
							resp.status = resp.statusCode;
						}
						callback(err, resp, body);
					});
					break;
				case 'Quantumult X':
					if (this.isNeedRewrite) {
						request.opts = request.opts || {};
						Object.assign(request.opts, { hints: false });
					}
					$task.fetch(request).then(
						resp => {
							const { statusCode: status, statusCode, headers, body, bodyBytes } = resp;
							callback(null, { status, statusCode, headers, body, bodyBytes }, body, bodyBytes);
						},
						err => callback((err && err.error) || 'UndefinedError')
					);
					break;
				case 'Node.js':
					let iconv = require('iconv-lite');
					this.initGotEnv(request);
					this.got(request)
						.on('redirect', (resp, nextOpts) => {
							try {
								if (resp.headers['set-cookie']) {
									const ck = resp.headers['set-cookie'].map(this.cktough.Cookie.parse).toString();
									if (ck) {
										this.ckjar.setCookieSync(ck, null);
									}
									nextOpts.cookieJar = this.ckjar;
								}
							} catch (e) {
								this.logErr(e);
							}
							// this.ckjar.setCookieSync(resp.headers['set-cookie'].map(Cookie.parse).toString())
						})
						.then(
							resp => {
								const { statusCode: status, statusCode, headers, rawBody } = resp;
								const body = iconv.decode(rawBody, this.encoding);
								callback(null, { status, statusCode, headers, rawBody, body }, body);
							},
							err => {
								const { message: error, response: resp } = err;
								callback(error, resp, resp && iconv.decode(resp.rawBody, this.encoding));
							}
						);
					break;
			}
		}

		post(request, callback = () => {}) {
			const method = request.method ? request.method.toLocaleLowerCase() : 'post';

			// 如果指定了请求体, 但没指定 `Content-Type`、`content-type`, 则自动生成。
			if (
				request.body &&
				request.headers &&
				!request.headers['Content-Type'] &&
				!request.headers['content-type']
			) {
				// HTTP/1、HTTP/2 都支持小写 headers
				request.headers['content-type'] = 'application/x-www-form-urlencoded';
			}
			// 为避免指定错误 `content-length` 这里删除该属性，由工具端 (HttpClient) 负责重新计算并赋值
			if (request.headers) {
				delete request.headers['Content-Length'];
				delete request.headers['content-length'];
			}
			// followRedirect 禁止重定向
			if (typeof request.followRedirect !== 'undefined' && !request['followRedirect']) {
				if (this.isSurge() || this.isLoon()) request['auto-redirect'] = false; // Surge & Loon
				if (this.isQuanX())
					request.opts
						? (request['opts']['redirection'] = false)
						: (request.opts = { redirection: false }); // Quantumult X
			}
			switch (this.getEnv()) {
				case 'Surge':
				case 'Loon':
				case 'Stash':
				case 'Shadowrocket':
				default:
					if (this.isSurge() && this.isNeedRewrite) {
						request.headers = request.headers || {};
						Object.assign(request.headers, { 'X-Surge-Skip-Scripting': false });
					}
					$httpClient[method](request, (err, resp, body) => {
						if (!err && resp) {
							resp.body = body;
							resp.statusCode = resp.status ? resp.status : resp.statusCode;
							resp.status = resp.statusCode;
						}
						callback(err, resp, body);
					});
					break;
				case 'Quantumult X':
					request.method = method;
					if (this.isNeedRewrite) {
						request.opts = request.opts || {};
						Object.assign(request.opts, { hints: false });
					}
					$task.fetch(request).then(
						resp => {
							const { statusCode: status, statusCode, headers, body, bodyBytes } = resp;
							callback(null, { status, statusCode, headers, body, bodyBytes }, body, bodyBytes);
						},
						err => callback((err && err.error) || 'UndefinedError')
					);
					break;
				case 'Node.js':
					let iconv = require('iconv-lite');
					this.initGotEnv(request);
					const { url, ..._request } = request;
					this.got[method](url, _request).then(
						resp => {
							const { statusCode: status, statusCode, headers, rawBody } = resp;
							const body = iconv.decode(rawBody, this.encoding);
							callback(null, { status, statusCode, headers, rawBody, body }, body);
						},
						err => {
							const { message: error, response: resp } = err;
							callback(error, resp, resp && iconv.decode(resp.rawBody, this.encoding));
						}
					);
					break;
			}
		}

		/**
		 * 此方法已添加
		 *
		 * 发送 PATCH 请求
		 */
		patch(opts, callback = () => {}) {
			// 如果传入的opts是字符串，则将其转换为对象形式
			if (typeof opts === 'string') opts = { url: opts };
			// 添加默认method为'patch'
			opts.method = 'patch';
			// 调用post方法处理请求
			// 由于post方法中已经处理了不同环境下的请求发送逻辑
			// 这里直接复用post方法，只需确保method为'patch'
			this.post(opts, callback);
		}
		/**
		 *
		 * 示例:$.time('yyyy-MM-dd qq HH:mm:ss.S')
		 *    :$.time('yyyyMMddHHmmssS')
		 *    y:年 M:月 d:日 q:季 H:时 m:分 s:秒 S:毫秒
		 *    其中y可选0-4位占位符、S可选0-1位占位符，其余可选0-2位占位符
		 * @param {string} fmt 格式化参数
		 * @param {number} 可选: 根据指定时间戳返回格式化日期
		 *
		 */
		time(fmt, ts = null) {
			const date = ts ? new Date(ts) : new Date();
			let o = {
				'M+': date.getMonth() + 1,
				'd+': date.getDate(),
				'H+': date.getHours(),
				'm+': date.getMinutes(),
				's+': date.getSeconds(),
				'q+': Math.floor((date.getMonth() + 3) / 3),
				S: date.getMilliseconds(),
			};
			if (/(y+)/.test(fmt))
				fmt = fmt.replace(RegExp.$1, (date.getFullYear() + '').substr(4 - RegExp.$1.length));
			for (let k in o)
				if (new RegExp('(' + k + ')').test(fmt))
					fmt = fmt.replace(
						RegExp.$1,
						RegExp.$1.length == 1 ? o[k] : ('00' + o[k]).substr(('' + o[k]).length)
					);
			return fmt;
		}

		/**
		 *
		 * @param {Object} options
		 * @returns {String} 将 Object 对象 转换成 queryStr: key=val&name=senku
		 */
		queryStr(options) {
			let queryString = '';

			for (const key in options) {
				let value = options[key];
				if (value != null && value !== '') {
					if (typeof value === 'object') {
						value = JSON.stringify(value);
					}
					queryString += `${key}=${value}&`;
				}
			}
			queryString = queryString.substring(0, queryString.length - 1);

			return queryString;
		}

		/**
		 * 系统通知
		 *
		 * > 通知参数: 同时支持 QuanX 和 Loon 两种格式, EnvJs根据运行环境自动转换, Surge 环境不支持多媒体通知
		 *
		 * 示例:
		 * $.msg(title, subt, desc, 'twitter://')
		 * $.msg(title, subt, desc, { 'open-url': 'twitter://', 'media-url': 'https://github.githubassets.com/images/modules/open_graph/github-mark.png' })
		 * $.msg(title, subt, desc, { 'open-url': 'https://bing.com', 'media-url': 'https://github.githubassets.com/images/modules/open_graph/github-mark.png' })
		 *
		 * @param {*} title 标题
		 * @param {*} subt 副标题
		 * @param {*} desc 通知详情
		 * @param {*} opts 通知参数
		 *
		 */
		msg(title = name, subt = '', desc = '', opts = {}) {
			const toEnvOpts = rawopts => {
				const { $open, $copy, $media, $mediaMime } = rawopts;
				switch (typeof rawopts) {
					case undefined:
						return rawopts;
					case 'string':
						switch (this.getEnv()) {
							case 'Surge':
							case 'Stash':
							default:
								return { url: rawopts };
							case 'Loon':
							case 'Shadowrocket':
								return rawopts;
							case 'Quantumult X':
								return { 'open-url': rawopts };
							case 'Node.js':
								return undefined;
						}
					case 'object':
						switch (this.getEnv()) {
							case 'Surge':
							case 'Stash':
							case 'Shadowrocket':
							default: {
								const options = {};

								// 打开URL
								let openUrl = rawopts.openUrl || rawopts.url || rawopts['open-url'] || $open;
								if (openUrl) Object.assign(options, { action: 'open-url', url: openUrl });

								// 粘贴板
								let copy = rawopts['update-pasteboard'] || rawopts.updatePasteboard || $copy;
								if (copy) {
									Object.assign(options, { action: 'clipboard', text: copy });
								}

								// 图片通知
								let mediaUrl = rawopts.mediaUrl || rawopts['media-url'] || $media;
								if (mediaUrl) {
									let media = undefined;
									let mime = undefined;
									// http 开头的网络地址
									if (mediaUrl.startsWith('http')) {
										//不做任何操作
									}
									// 带标识的 Base64 字符串
									// data:image/png;base64,iVBORw0KGgo...
									else if (mediaUrl.startsWith('data:')) {
										const [data] = mediaUrl.split(';');
										const [, base64str] = mediaUrl.split(',');
										media = base64str;
										mime = data.replace('data:', '');
									}
									// 没有标识的 Base64 字符串
									// iVBORw0KGgo...
									else {
										// https://stackoverflow.com/questions/57976898/how-to-get-mime-type-from-base-64-string
										const getMimeFromBase64 = encoded => {
											const signatures = {
												JVBERi0: 'application/pdf',
												R0lGODdh: 'image/gif',
												R0lGODlh: 'image/gif',
												iVBORw0KGgo: 'image/png',
												'/9j/': 'image/jpg',
											};
											for (var s in signatures) {
												if (encoded.indexOf(s) === 0) {
													return signatures[s];
												}
											}
											return null;
										};
										media = mediaUrl;
										mime = getMimeFromBase64(mediaUrl);
									}

									Object.assign(options, {
										'media-url': mediaUrl,
										'media-base64': media,
										'media-base64-mime': $mediaMime ?? mime,
									});
								}

								Object.assign(options, {
									'auto-dismiss': rawopts['auto-dismiss'],
									sound: rawopts['sound'],
								});
								return options;
							}
							case 'Loon': {
								const options = {};

								let openUrl = rawopts.openUrl || rawopts.url || rawopts['open-url'] || $open;
								if (openUrl) Object.assign(options, { openUrl });

								let mediaUrl = rawopts.mediaUrl || rawopts['media-url'] || $media;
								if (mediaUrl) Object.assign(options, { mediaUrl });

								console.log(JSON.stringify(options));
								return options;
							}
							case 'Quantumult X': {
								const options = {};

								let openUrl = rawopts['open-url'] || rawopts.url || rawopts.openUrl || $open;
								if (openUrl) Object.assign(options, { 'open-url': openUrl });

								let mediaUrl = rawopts.mediaUrl || rawopts['media-url'] || $media;
								if (mediaUrl) Object.assign(options, { 'media-url': mediaUrl });

								let copy = rawopts['update-pasteboard'] || rawopts.updatePasteboard || $copy;
								if (copy) Object.assign(options, { 'update-pasteboard': copy });

								console.log(JSON.stringify(options));
								return options;
							}
							case 'Node.js':
								return undefined;
						}
					default:
						return undefined;
				}
			};
			if (!this.isMute) {
				switch (this.getEnv()) {
					case 'Surge':
					case 'Loon':
					case 'Stash':
					case 'Shadowrocket':
					default:
						$notification.post(title, subt, desc, toEnvOpts(opts));
						break;
					case 'Quantumult X':
						$notify(title, subt, desc, toEnvOpts(opts));
						break;
					case 'Node.js':
						break;
				}
			}
			if (!this.isMuteLog) {
				let logs = ['', '==============📣系统通知📣=============='];
				logs.push(title);
				subt ? logs.push(subt) : '';
				desc ? logs.push(desc) : '';
				console.log(logs.join('\n'));
				this.logs = this.logs.concat(logs);
			}
		}

		debug(...logs) {
			if (this.logLevels[this.logLevel] <= this.logLevels.debug) {
				if (logs.length > 0) {
					this.logs = [...this.logs, ...logs];
				}
				console.log(
					`${this.logLevelPrefixs.debug}${logs.map(l => l ?? String(l)).join(this.logSeparator)}`
				);
			}
		}

		info(...logs) {
			if (this.logLevels[this.logLevel] <= this.logLevels.info) {
				if (logs.length > 0) {
					this.logs = [...this.logs, ...logs];
				}
				console.log(
					`${this.logLevelPrefixs.info}${logs.map(l => l ?? String(l)).join(this.logSeparator)}`
				);
			}
		}

		warn(...logs) {
			if (this.logLevels[this.logLevel] <= this.logLevels.warn) {
				if (logs.length > 0) {
					this.logs = [...this.logs, ...logs];
				}
				console.log(
					`${this.logLevelPrefixs.warn}${logs.map(l => l ?? String(l)).join(this.logSeparator)}`
				);
			}
		}

		error(...logs) {
			if (this.logLevels[this.logLevel] <= this.logLevels.error) {
				if (logs.length > 0) {
					this.logs = [...this.logs, ...logs];
				}
				console.log(
					`${this.logLevelPrefixs.error}${logs.map(l => l ?? String(l)).join(this.logSeparator)}`
				);
			}
		}

		log(...logs) {
			if (logs.length > 0) {
				this.logs = [...this.logs, ...logs];
			}
			console.log(logs.map(l => l ?? String(l)).join(this.logSeparator));
		}

		logErr(err, msg) {
			switch (this.getEnv()) {
				case 'Surge':
				case 'Loon':
				case 'Stash':
				case 'Shadowrocket':
				case 'Quantumult X':
				default:
					this.log('', `❗️${this.name}, 错误!`, msg, err);
					break;
				case 'Node.js':
					this.log(
						'',
						`❗️${this.name}, 错误!`,
						msg,
						typeof err.message !== 'undefined' ? err.message : err,
						err.stack
					);
					break;
			}
		}

		wait(time) {
			return new Promise(resolve => setTimeout(resolve, time));
		}

		done(val = {}) {
			const endTime = new Date().getTime();
			const costTime = (endTime - this.startTime) / 1000;
			this.log('', `🔔${this.name}, 结束! 🕛 ${costTime} 秒`);
			this.log();
			switch (this.getEnv()) {
				case 'Surge':
				case 'Loon':
				case 'Stash':
				case 'Shadowrocket':
				case 'Quantumult X':
				default:
					$done(val);
					break;
				case 'Node.js':
					process.exit(1);
			}
		}
	})(name, opts);
}