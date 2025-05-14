/**
 * 微信读书登录请求监控脚本 (BoxJS版) - 改进版
 * 功能说明：
 * 1. 监控https://i.weread.qq.com/login的请求
 * 2. 提取header中的vid和完整的request_body
 * 3. 将提取的信息格式化为JSON
 * 4. 发送通知提示用户
 * 5. 将信息推送到GitHub Gist
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
    
    // 检查是否存在指定的gistId
    if (gistId) {
      try {
        // 获取现有Gist
        const checkResult = await $.http.get({
          url: `https://api.github.com/gists/${gistId}`,
          headers: headers
        }).then(response => {
          return { 
            status: response.statusCode, 
            body: response.body 
          };
        });
        
        if (checkResult.status === 200) {
          // Gist存在，更新它
          const updateData = {
            description: gistDescription,
            files: {
              [gistFilename]: {
                content: content
              }
            }
          };
          
          const updateResult = await $.http.put({
            url: `https://api.github.com/gists/${gistId}`,
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
              $.log(`Gist更新成功: ${gistId}`);
            }
            return { success: true, message: `Gist已更新: ${gistId}` };
          } else {
            $.log(`Gist更新失败: ${JSON.stringify(updateResult)}`);
            return { success: false, message: `Gist更新失败: ${updateResult.status}` };
          }
        } else {
          $.log(`指定的Gist不存在或无权限访问: ${gistId}`);
          // Gist不存在，创建新的
          return await createNewGist(content, headers);
        }
      } catch (error) {
        $.log(`检查Gist时出错: ${error}`);
        // 出错时尝试创建新的
        return await createNewGist(content, headers);
      }
    } else {
      // 未指定gistId，创建新的
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
            $.log(`新Gist已创建: ${newGistId}`);
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

function Env(e, t) {
	class s {
		constructor(e) {
			this.env = e;
		}
		send(e, t = 'GET') {
			e = 'string' == typeof e ? { url: e } : e;
			let s = this.get;
			'POST' === t && (s = this.post);
			const i = new Promise((t, i) => {
				s.call(this, e, (e, s, o) => {
					e ? i(e) : t(s);
				});
			});
			return e.timeout
				? ((e, t = 1e3) =>
						Promise.race([
							e,
							new Promise((e, s) => {
								setTimeout(() => {
									s(new Error('请求超时'));
								}, t);
							}),
						]))(i, e.timeout)
				: i;
		}
		get(e) {
			return this.send.call(this.env, e);
		}
		post(e) {
			return this.send.call(this.env, e, 'POST');
		}
	}
	return new (class {
		constructor(e, t) {
			(this.logLevels = { debug: 0, info: 1, warn: 2, error: 3 }),
				(this.logLevelPrefixs = {
					debug: '[DEBUG] ',
					info: '[INFO] ',
					warn: '[WARN] ',
					error: '[ERROR] ',
				}),
				(this.logLevel = 'info'),
				(this.name = e),
				(this.http = new s(this)),
				(this.data = null),
				(this.dataFile = 'box.dat'),
				(this.logs = []),
				(this.isMute = !1),
				(this.isNeedRewrite = !1),
				(this.logSeparator = '\n'),
				(this.encoding = 'utf-8'),
				(this.startTime = new Date().getTime()),
				Object.assign(this, t),
				this.log('', `🔔${this.name}, 开始!`);
		}
		getEnv() {
			return 'undefined' != typeof $environment && $environment['surge-version']
				? 'Surge'
				: 'undefined' != typeof $environment && $environment['stash-version']
				? 'Stash'
				: 'undefined' != typeof module && module.exports
				? 'Node.js'
				: 'undefined' != typeof $task
				? 'Quantumult X'
				: 'undefined' != typeof $loon
				? 'Loon'
				: 'undefined' != typeof $rocket
				? 'Shadowrocket'
				: void 0;
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
		toObj(e, t = null) {
			try {
				return JSON.parse(e);
			} catch {
				return t;
			}
		}
		toStr(e, t = null, ...s) {
			try {
				return JSON.stringify(e, ...s);
			} catch {
				return t;
			}
		}
		getjson(e, t) {
			let s = t;
			if (this.getdata(e))
				try {
					s = JSON.parse(this.getdata(e));
				} catch {}
			return s;
		}
		setjson(e, t) {
			try {
				return this.setdata(JSON.stringify(e), t);
			} catch {
				return !1;
			}
		}
		getScript(e) {
			return new Promise(t => {
				this.get({ url: e }, (e, s, i) => t(i));
			});
		}
		runScript(e, t) {
			return new Promise(s => {
				let i = this.getdata('@chavy_boxjs_userCfgs.httpapi');
				i = i ? i.replace(/\n/g, '').trim() : i;
				let o = this.getdata('@chavy_boxjs_userCfgs.httpapi_timeout');
				(o = o ? 1 * o : 20), (o = t && t.timeout ? t.timeout : o);
				const [r, a] = i.split('@'),
					n = {
						url: `http://${a}/v1/scripting/evaluate`,
						body: { script_text: e, mock_type: 'cron', timeout: o },
						headers: { 'X-Key': r, Accept: '*/*' },
						policy: 'DIRECT',
						timeout: o,
					};
				this.post(n, (e, t, i) => s(i));
			}).catch(e => this.logErr(e));
		}
		loaddata() {
			if (!this.isNode()) return {};
			{
				(this.fs = this.fs ? this.fs : require('fs')),
					(this.path = this.path ? this.path : require('path'));
				const e = this.path.resolve(this.dataFile),
					t = this.path.resolve(process.cwd(), this.dataFile),
					s = this.fs.existsSync(e),
					i = !s && this.fs.existsSync(t);
				if (!s && !i) return {};
				{
					const i = s ? e : t;
					try {
						return JSON.parse(this.fs.readFileSync(i));
					} catch (e) {
						return {};
					}
				}
			}
		}
		writedata() {
			if (this.isNode()) {
				(this.fs = this.fs ? this.fs : require('fs')),
					(this.path = this.path ? this.path : require('path'));
				const e = this.path.resolve(this.dataFile),
					t = this.path.resolve(process.cwd(), this.dataFile),
					s = this.fs.existsSync(e),
					i = !s && this.fs.existsSync(t),
					o = JSON.stringify(this.data);
				s
					? this.fs.writeFileSync(e, o)
					: i
					? this.fs.writeFileSync(t, o)
					: this.fs.writeFileSync(e, o);
			}
		}
		lodash_get(e, t, s) {
			const i = t.replace(/\[(\d+)\]/g, '.$1').split('.');
			let o = e;
			for (const e of i) if (((o = Object(o)[e]), void 0 === o)) return s;
			return o;
		}
		lodash_set(e, t, s) {
			return (
				Object(e) !== e ||
					(Array.isArray(t) || (t = t.toString().match(/[^.[\]]+/g) || []),
					(t
						.slice(0, -1)
						.reduce(
							(e, s, i) =>
								Object(e[s]) === e[s]
									? e[s]
									: (e[s] = Math.abs(t[i + 1]) >> 0 == +t[i + 1] ? [] : {}),
							e
						)[t[t.length - 1]] = s)),
				e
			);
		}
		getdata(e) {
			let t = this.getval(e);
			if (/^@/.test(e)) {
				const [, s, i] = /^@(.*?)\.(.*?)$/.exec(e),
					o = s ? this.getval(s) : '';
				if (o)
					try {
						const e = JSON.parse(o);
						t = e ? this.lodash_get(e, i, '') : t;
					} catch (e) {
						t = '';
					}
			}
			return t;
		}
		setdata(e, t) {
			let s = !1;
			if (/^@/.test(t)) {
				const [, i, o] = /^@(.*?)\.(.*?)$/.exec(t),
					r = this.getval(i),
					a = i ? ('null' === r ? null : r || '{}') : '{}';
				try {
					const t = JSON.parse(a);
					this.lodash_set(t, o, e), (s = this.setval(JSON.stringify(t), i));
				} catch (t) {
					const r = {};
					this.lodash_set(r, o, e), (s = this.setval(JSON.stringify(r), i));
				}
			} else s = this.setval(e, t);
			return s;
		}
		getval(e) {
			switch (this.getEnv()) {
				case 'Surge':
				case 'Loon':
				case 'Stash':
				case 'Shadowrocket':
					return $persistentStore.read(e);
				case 'Quantumult X':
					return $prefs.valueForKey(e);
				case 'Node.js':
					return (this.data = this.loaddata()), this.data[e];
				default:
					return (this.data && this.data[e]) || null;
			}
		}
		setval(e, t) {
			switch (this.getEnv()) {
				case 'Surge':
				case 'Loon':
				case 'Stash':
				case 'Shadowrocket':
					return $persistentStore.write(e, t);
				case 'Quantumult X':
					return $prefs.setValueForKey(e, t);
				case 'Node.js':
					return (this.data = this.loaddata()), (this.data[t] = e), this.writedata(), !0;
				default:
					return (this.data && this.data[t]) || null;
			}
		}
		initGotEnv(e) {
			(this.got = this.got ? this.got : require('got')),
				(this.cktough = this.cktough ? this.cktough : require('tough-cookie')),
				(this.ckjar = this.ckjar ? this.ckjar : new this.cktough.CookieJar()),
				e &&
					((e.headers = e.headers ? e.headers : {}),
					e &&
						((e.headers = e.headers ? e.headers : {}),
						void 0 === e.headers.cookie &&
							void 0 === e.headers.Cookie &&
							void 0 === e.cookieJar &&
							(e.cookieJar = this.ckjar)));
		}
		get(e, t = () => {}) {
			switch (
				(e.headers &&
					(delete e.headers['Content-Type'],
					delete e.headers['Content-Length'],
					delete e.headers['content-type'],
					delete e.headers['content-length']),
				e.params && (e.url += '?' + this.queryStr(e.params)),
				void 0 === e.followRedirect ||
					e.followRedirect ||
					((this.isSurge() || this.isLoon()) && (e['auto-redirect'] = !1),
					this.isQuanX() && (e.opts ? (e.opts.redirection = !1) : (e.opts = { redirection: !1 }))),
				this.getEnv())
			) {
				case 'Surge':
				case 'Loon':
				case 'Stash':
				case 'Shadowrocket':
				default:
					this.isSurge() &&
						this.isNeedRewrite &&
						((e.headers = e.headers || {}),
						Object.assign(e.headers, { 'X-Surge-Skip-Scripting': !1 })),
						$httpClient.get(e, (e, s, i) => {
							!e &&
								s &&
								((s.body = i),
								(s.statusCode = s.status ? s.status : s.statusCode),
								(s.status = s.statusCode)),
								t(e, s, i);
						});
					break;
				case 'Quantumult X':
					this.isNeedRewrite && ((e.opts = e.opts || {}), Object.assign(e.opts, { hints: !1 })),
						$task.fetch(e).then(
							e => {
								const { statusCode: s, statusCode: i, headers: o, body: r, bodyBytes: a } = e;
								t(null, { status: s, statusCode: i, headers: o, body: r, bodyBytes: a }, r, a);
							},
							e => t((e && e.error) || 'UndefinedError')
						);
					break;
				case 'Node.js':
					let s = require('iconv-lite');
					this.initGotEnv(e),
						this.got(e)
							.on('redirect', (e, t) => {
								try {
									if (e.headers['set-cookie']) {
										const s = e.headers['set-cookie'].map(this.cktough.Cookie.parse).toString();
										s && this.ckjar.setCookieSync(s, null), (t.cookieJar = this.ckjar);
									}
								} catch (e) {
									this.logErr(e);
								}
							})
							.then(
								e => {
									const { statusCode: i, statusCode: o, headers: r, rawBody: a } = e,
										n = s.decode(a, this.encoding);
									t(null, { status: i, statusCode: o, headers: r, rawBody: a, body: n }, n);
								},
								e => {
									const { message: i, response: o } = e;
									t(i, o, o && s.decode(o.rawBody, this.encoding));
								}
							);
					break;
			}
		}
		post(e, t = () => {}) {
			const s = e.method ? e.method.toLocaleLowerCase() : 'post';
			switch (
				(e.body &&
					e.headers &&
					!e.headers['Content-Type'] &&
					!e.headers['content-type'] &&
					(e.headers['content-type'] = 'application/x-www-form-urlencoded'),
				e.headers && (delete e.headers['Content-Length'], delete e.headers['content-length']),
				void 0 === e.followRedirect ||
					e.followRedirect ||
					((this.isSurge() || this.isLoon()) && (e['auto-redirect'] = !1),
					this.isQuanX() && (e.opts ? (e.opts.redirection = !1) : (e.opts = { redirection: !1 }))),
				this.getEnv())
			) {
				case 'Surge':
				case 'Loon':
				case 'Stash':
				case 'Shadowrocket':
				default:
					this.isSurge() &&
						this.isNeedRewrite &&
						((e.headers = e.headers || {}),
						Object.assign(e.headers, { 'X-Surge-Skip-Scripting': !1 })),
						$httpClient[s](e, (e, s, i) => {
							!e &&
								s &&
								((s.body = i),
								(s.statusCode = s.status ? s.status : s.statusCode),
								(s.status = s.statusCode)),
								t(e, s, i);
						});
					break;
				case 'Quantumult X':
					(e.method = s),
						this.isNeedRewrite && ((e.opts = e.opts || {}), Object.assign(e.opts, { hints: !1 })),
						$task.fetch(e).then(
							e => {
								const { statusCode: s, statusCode: i, headers: o, body: r, bodyBytes: a } = e;
								t(null, { status: s, statusCode: i, headers: o, body: r, bodyBytes: a }, r, a);
							},
							e => t((e && e.error) || 'UndefinedError')
						);
					break;
				case 'Node.js':
					let i = require('iconv-lite');
					this.initGotEnv(e);
					const { url: o, ...r } = e;
					this.got[s](o, r).then(
						e => {
							const { statusCode: s, statusCode: o, headers: r, rawBody: a } = e,
								n = i.decode(a, this.encoding);
							t(null, { status: s, statusCode: o, headers: r, rawBody: a, body: n }, n);
						},
						e => {
							const { message: s, response: o } = e;
							t(s, o, o && i.decode(o.rawBody, this.encoding));
						}
					);
					break;
			}
		}
		time(e, t = null) {
			const s = t ? new Date(t) : new Date();
			let i = {
				'M+': s.getMonth() + 1,
				'd+': s.getDate(),
				'H+': s.getHours(),
				'm+': s.getMinutes(),
				's+': s.getSeconds(),
				'q+': Math.floor((s.getMonth() + 3) / 3),
				S: s.getMilliseconds(),
			};
			/(y+)/.test(e) &&
				(e = e.replace(RegExp.$1, (s.getFullYear() + '').substr(4 - RegExp.$1.length)));
			for (let t in i)
				new RegExp('(' + t + ')').test(e) &&
					(e = e.replace(
						RegExp.$1,
						1 == RegExp.$1.length ? i[t] : ('00' + i[t]).substr(('' + i[t]).length)
					));
			return e;
		}
		queryStr(e) {
			let t = '';
			for (const s in e) {
				let i = e[s];
				null != i &&
					'' !== i &&
					('object' == typeof i && (i = JSON.stringify(i)), (t += `${s}=${i}&`));
			}
			return (t = t.substring(0, t.length - 1)), t;
		}
		msg(t = e, s = '', i = '', o = {}) {
			const r = e => {
				const { $open: t, $copy: s, $media: i, $mediaMime: o } = e;
				switch (typeof e) {
					case void 0:
						return e;
					case 'string':
						switch (this.getEnv()) {
							case 'Surge':
							case 'Stash':
							default:
								return { url: e };
							case 'Loon':
							case 'Shadowrocket':
								return e;
							case 'Quantumult X':
								return { 'open-url': e };
							case 'Node.js':
								return;
						}
					case 'object':
						switch (this.getEnv()) {
							case 'Surge':
							case 'Stash':
							case 'Shadowrocket':
							default: {
								const r = {};
								let a = e.openUrl || e.url || e['open-url'] || t;
								a && Object.assign(r, { action: 'open-url', url: a });
								let n = e['update-pasteboard'] || e.updatePasteboard || s;
								n && Object.assign(r, { action: 'clipboard', text: n });
								let h = e.mediaUrl || e['media-url'] || i;
								if (h) {
									let e, t;
									if (h.startsWith('http'));
									else if (h.startsWith('data:')) {
										const [s] = h.split(';'),
											[, i] = h.split(',');
										(e = i), (t = s.replace('data:', ''));
									} else {
										(e = h),
											(t = (e => {
												const t = {
													JVBERi0: 'application/pdf',
													R0lGODdh: 'image/gif',
													R0lGODlh: 'image/gif',
													iVBORw0KGgo: 'image/png',
													'/9j/': 'image/jpg',
												};
												for (var s in t) if (0 === e.indexOf(s)) return t[s];
												return null;
											})(h));
									}
									Object.assign(r, {
										'media-url': h,
										'media-base64': e,
										'media-base64-mime': o ?? t,
									});
								}
								return Object.assign(r, { 'auto-dismiss': e['auto-dismiss'], sound: e.sound }), r;
							}
							case 'Loon': {
								const s = {};
								let o = e.openUrl || e.url || e['open-url'] || t;
								o && Object.assign(s, { openUrl: o });
								let r = e.mediaUrl || e['media-url'] || i;
								return r && Object.assign(s, { mediaUrl: r }), console.log(JSON.stringify(s)), s;
							}
							case 'Quantumult X': {
								const o = {};
								let r = e['open-url'] || e.url || e.openUrl || t;
								r && Object.assign(o, { 'open-url': r });
								let a = e.mediaUrl || e['media-url'] || i;
								a && Object.assign(o, { 'media-url': a });
								let n = e['update-pasteboard'] || e.updatePasteboard || s;
								return (
									n && Object.assign(o, { 'update-pasteboard': n }),
									console.log(JSON.stringify(o)),
									o
								);
							}
							case 'Node.js':
								return;
						}
					default:
						return;
				}
			};
			if (!this.isMute)
				switch (this.getEnv()) {
					case 'Surge':
					case 'Loon':
					case 'Stash':
					case 'Shadowrocket':
					default:
						$notification.post(t, s, i, r(o));
						break;
					case 'Quantumult X':
						$notify(t, s, i, r(o));
						break;
					case 'Node.js':
						break;
				}
			if (!this.isMuteLog) {
				let e = ['', '==============📣系统通知📣=============='];
				e.push(t),
					s && e.push(s),
					i && e.push(i),
					console.log(e.join('\n')),
					(this.logs = this.logs.concat(e));
			}
		}
		debug(...e) {
			this.logLevels[this.logLevel] <= this.logLevels.debug &&
				(e.length > 0 && (this.logs = [...this.logs, ...e]),
				console.log(
					`${this.logLevelPrefixs.debug}${e.map(e => e ?? String(e)).join(this.logSeparator)}`
				));
		}
		info(...e) {
			this.logLevels[this.logLevel] <= this.logLevels.info &&
				(e.length > 0 && (this.logs = [...this.logs, ...e]),
				console.log(
					`${this.logLevelPrefixs.info}${e.map(e => e ?? String(e)).join(this.logSeparator)}`
				));
		}
		warn(...e) {
			this.logLevels[this.logLevel] <= this.logLevels.warn &&
				(e.length > 0 && (this.logs = [...this.logs, ...e]),
				console.log(
					`${this.logLevelPrefixs.warn}${e.map(e => e ?? String(e)).join(this.logSeparator)}`
				));
		}
		error(...e) {
			this.logLevels[this.logLevel] <= this.logLevels.error &&
				(e.length > 0 && (this.logs = [...this.logs, ...e]),
				console.log(
					`${this.logLevelPrefixs.error}${e.map(e => e ?? String(e)).join(this.logSeparator)}`
				));
		}
		log(...e) {
			e.length > 0 && (this.logs = [...this.logs, ...e]),
				console.log(e.map(e => e ?? String(e)).join(this.logSeparator));
		}
		logErr(e, t) {
			switch (this.getEnv()) {
				case 'Surge':
				case 'Loon':
				case 'Stash':
				case 'Shadowrocket':
				case 'Quantumult X':
				default:
					this.log('', `❗️${this.name}, 错误!`, t, e);
					break;
				case 'Node.js':
					this.log('', `❗️${this.name}, 错误!`, t, void 0 !== e.message ? e.message : e, e.stack);
					break;
			}
		}
		wait(e) {
			return new Promise(t => setTimeout(t, e));
		}
		done(e = {}) {
			const t = (new Date().getTime() - this.startTime) / 1e3;
			switch ((this.log('', `🔔${this.name}, 结束! 🕛 ${t} 秒`), this.log(), this.getEnv())) {
				case 'Surge':
				case 'Loon':
				case 'Stash':
				case 'Shadowrocket':
				case 'Quantumult X':
				default:
					$done(e);
					break;
				case 'Node.js':
					process.exit(1);
			}
		}
	})(e, t);
}
