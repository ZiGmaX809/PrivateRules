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

// 获取BoxJS配置
const $ = new Env('微信读书登录信息监控');
let githubToken = $.getdata('wr_github_token') || '';
let gistId = $.getdata('wr_gist_id') || '';
let gistFilename = $.getdata('wr_gist_filename') || 'weread_login_info.json';
let gistDescription = $.getdata('wr_gist_description') || '微信读书登录信息';
let enableGistUpload = $.getdata('wr_enable_gist') === 'true';
let debugMode = $.getdata('wr_debug_mode') === 'true';

// 配置通知信息
const NOTIFY_TITLE = '微信读书登录信息';
const NOTIFY_SUCCESS_MSG = '登录信息已成功提取';
const NOTIFY_ERROR_MSG = '登录信息提取失败';

// 调试日志函数
function debugLog(message) {
	if (debugMode) {
		console.log(`[DEBUG] ${message}`);
	}
}

// 函数：推送数据到GitHub Gist
function pushToGist(data) {
	if (!enableGistUpload) {
		debugLog('Gist上传功能已禁用');
		return;
	}

	if (!githubToken) {
		debugLog('请先在BoxJS中设置有效的GitHub Token');
		$.msg(NOTIFY_TITLE, 'Gist上传失败', '请先在BoxJS中设置有效的GitHub Token');
		return;
	}

	// 构建内容
	const timestamp = new Date().toISOString();
	debugLog(`开始推送到Gist，时间戳: ${timestamp}`);

	// 添加时间戳到数据中
	const dataWithTimestamp = {
		...data,
		timestamp: timestamp,
		deviceInfo: {
			device: $.isNode() ? 'Node.js' : $.isQuanX() ? 'QuanX' : $.isSurge() ? 'Surge' : 'Unknown',
			version: $.isNode() ? process.version : 'App',
		},
	};

	const content = JSON.stringify(dataWithTimestamp, null, 2);
	debugLog(`准备推送的内容长度: ${content.length} 字节`);

	// 构建文件对象
	const files = {};
	files[gistFilename] = {
		content: content,
	};

	// 判断是更新还是创建Gist
	if (gistId && gistId.trim() !== '') {
		// 更新现有Gist
		debugLog(`使用现有Gist ID: ${gistId}`);
		updateGist(gistId, files, timestamp);
	} else {
		// 创建新的Gist
		debugLog('创建新的Gist');
		createGist(files, timestamp);
	}
}

// 函数：创建新的Gist
function createGist(files, timestamp) {
	const gistUrl = 'https://api.github.com/gists';
	debugLog(`准备创建Gist，调用API: ${gistUrl}`);

	const body = {
		description: `${gistDescription} - ${timestamp}`,
		public: false, // 默认创建私有Gist，更安全
		files: files,
	};

	const headers = {
		Authorization: `token ${githubToken}`,
		'User-Agent': 'Quantumult X Script',
		'Content-Type': 'application/json',
		Accept: 'application/json',
	};

	debugLog('发送创建Gist请求...');

	// 发送创建Gist的请求
	const requestOptions = {
		url: gistUrl,
		headers: headers,
		body: JSON.stringify(body),
	};

	$.post(requestOptions, (error, response, data) => {
		if (error) {
			console.log(`Gist创建请求失败: ${JSON.stringify(error)}`);
			debugLog(`错误详情: ${JSON.stringify(error)}`);
			$.msg(NOTIFY_TITLE, 'Gist创建请求失败', `${error}`);
			return;
		}

		// 获取HTTP状态码
		const statusCode = response.status || response.statusCode || 0;
		debugLog(`Gist创建响应状态码: ${statusCode}`);

		if (statusCode === 201) {
			try {
				const respData = JSON.parse(data);
				const newGistId = respData.id;
				debugLog(`成功创建Gist，ID: ${newGistId}`);
				console.log(`成功创建Gist，ID: ${newGistId}`);
				$.msg(NOTIFY_TITLE, 'Gist创建成功', `ID: ${newGistId}\n请将此ID保存到BoxJS中`);

				// 自动保存Gist ID到BoxJS
				$.setdata(newGistId, 'wr_gist_id');
				gistId = newGistId;
			} catch (e) {
				console.log(`解析Gist响应失败: ${e}`);
				debugLog(`解析响应数据失败: ${e}, 响应数据: ${data}`);
				$.msg(NOTIFY_TITLE, 'Gist创建成功', '但无法解析返回的ID');
			}
		} else {
			console.log(`Gist创建失败: 状态码 ${statusCode}`);
			debugLog(`创建失败响应数据: ${data}`);
			$.msg(NOTIFY_TITLE, 'Gist创建失败', `状态码: ${statusCode}\n${data.substring(0, 100)}`);
		}
	});
}

// 函数：更新现有Gist - 修正为使用PATCH方法
function updateGist(gistId, files, timestamp) {
	const gistUrl = `https://api.github.com/gists/${gistId}`;
	debugLog(`准备更新Gist，调用API: ${gistUrl}`);

	const body = {
		description: `${gistDescription} - 更新于 ${timestamp}`,
		files: files,
	};

	const headers = {
		Authorization: `token ${githubToken}`,
		'User-Agent': 'Quantumult X Script',
		'Content-Type': 'application/json',
		Accept: 'application/json',
	};

	debugLog('发送更新Gist请求...');

	// 使用自定义方法发送PATCH请求
	customRequest(
		{
			url: gistUrl,
			headers: headers,
			body: JSON.stringify(body),
			method: 'PATCH',
		},
		(error, response, data) => {
			if (error) {
				console.log(`Gist更新请求失败: ${JSON.stringify(error)}`);
				debugLog(`错误详情: ${JSON.stringify(error)}`);
				$.msg(NOTIFY_TITLE, 'Gist更新请求失败', `${error}`);
				return;
			}

			const statusCode = response.status || response.statusCode || 0;
			debugLog(`Gist更新响应状态码: ${statusCode}`);

			if (statusCode === 200) {
				console.log('成功更新Gist');
				debugLog(`更新成功，响应数据: ${data.substring(0, 100)}...`);
				$.msg(NOTIFY_TITLE, 'Gist更新成功', `数据已成功推送到Gist - ${timestamp}`);
			} else if (statusCode === 404) {
				console.log('Gist不存在，尝试创建新的Gist');
				debugLog('404错误，指定的Gist不存在');
				$.msg(NOTIFY_TITLE, '指定的Gist不存在', '正在尝试创建新的Gist');
				createGist(files, timestamp);
			} else {
				console.log(`Gist更新失败: 状态码 ${statusCode}`);
				debugLog(`更新失败响应数据: ${data}`);
				$.msg(NOTIFY_TITLE, 'Gist更新失败', `状态码: ${statusCode}\n${data.substring(0, 100)}`);
			}
		}
	);
}

// 自定义请求函数，支持PATCH方法
function customRequest(options, callback) {
	const method = options.method || 'GET';

	if ($.isQuanX()) {
		options.method = method;
		$task.fetch(options).then(
			response => {
				const { statusCode, headers, body } = response;
				callback(null, { status: statusCode, headers, body }, body);
			},
			reason => {
				debugLog(`请求失败: ${JSON.stringify(reason)}`);
				callback(reason.error, null, null);
			}
		);
	} else if ($.isSurge() || $.isLoon() || $.isStash()) {
		$httpClient[method.toLowerCase()](options, (error, response, body) => {
			callback(error, response, body);
		});
	} else {
		debugLog('不支持的环境');
		callback('不支持的环境', null, null);
	}
}

// HTTP请求处理函数
function processRequest(request) {
	try {
		debugLog('开始处理请求...');
		debugLog(`请求URL: ${request.url}`);

		// 获取请求头和请求体
		const headers = request.headers;
		let requestBody = {};

		debugLog(`请求头: ${JSON.stringify(headers)}`);

		// 尝试解析请求体为JSON (如果是JSON格式)
		try {
			if (request.body) {
				debugLog(`原始请求体: ${request.body}`);

				// 判断请求体是否为JSON字符串
				const bodyText = decodeURIComponent(request.body);
				if (bodyText.trim().startsWith('{') && bodyText.trim().endsWith('}')) {
					requestBody = JSON.parse(bodyText);
					debugLog('请求体已解析为JSON对象');
				} else {
					// 尝试解析表单编码的请求体
					debugLog('尝试解析为表单数据');
					const formParams = bodyText.split('&');
					formParams.forEach(param => {
						const [key, value] = param.split('=');
						if (key && value) {
							requestBody[key] = decodeURIComponent(value);
						}
					});
					debugLog('请求体已解析为表单数据对象');
				}
			} else {
				debugLog('请求体为空');
			}
		} catch (e) {
			console.log(`解析请求体出错: ${e}`);
			debugLog(`解析请求体出错: ${e.stack || e}`);
			requestBody = { raw: request.body };
		}

		// 提取需要的信息
		const vid = headers.vid || '';
		debugLog(`提取的VID: ${vid}`);

		// 构建结果JSON对象
		const result = {
			vid: vid,
			requestBody: requestBody,
			headers: headers, // 添加完整的头信息以便更全面的分析
		};

		// 将结果转换为JSON字符串以便日志记录
		const jsonResult = JSON.stringify(result, null, 2);

		// 发送通知
		$.msg(NOTIFY_TITLE, NOTIFY_SUCCESS_MSG, 'VID: ' + vid);

		console.log('微信读书登录信息:\n' + jsonResult);

		// 推送到GitHub Gist
		debugLog('准备推送到GitHub Gist');
		pushToGist(result);

		// 返回原始请求内容，不做修改
		return request;
	} catch (err) {
		console.log(`处理请求时出错: ${err}`);
		debugLog(`处理请求时出错: ${err.stack || err}`);
		$.msg(NOTIFY_TITLE, NOTIFY_ERROR_MSG, err.toString());
		return request;
	}
}

// 主函数
function main() {
	debugLog('脚本开始执行');

	if ($request) {
		debugLog('检测到请求，开始处理');
		const modifiedRequest = processRequest($request);
		$done(modifiedRequest);
	} else {
		debugLog('没有检测到请求');
		$done({});
	}
}

// BoxJS 订阅
function addBoxJSSubscription() {
	const boxjs = {
		id: boxjsConfig.id,
		name: boxjsConfig.name,
		keys: boxjsConfig.keys,
		settings: [
			{
				id: 'wr_github_token',
				name: 'GitHub Token',
				val: '',
				type: 'text',
				desc: '请输入GitHub Personal Access Token',
			},
			{
				id: 'wr_gist_id',
				name: 'Gist ID',
				val: '',
				type: 'text',
				desc: '留空将自动创建新的Gist',
			},
			{
				id: 'wr_gist_filename',
				name: 'Gist文件名',
				val: 'weread_login_info.json',
				type: 'text',
				desc: 'Gist中的文件名',
			},
			{
				id: 'wr_gist_description',
				name: 'Gist描述',
				val: '微信读书登录信息',
				type: 'text',
				desc: 'Gist的描述信息',
			},
			{
				id: 'wr_enable_gist',
				name: '启用Gist上传',
				val: true,
				type: 'boolean',
				desc: '是否将信息上传到GitHub Gist',
			},
			{
				id: 'wr_debug_mode',
				name: '启用调试模式',
				val: false,
				type: 'boolean',
				desc: '是否输出详细调试信息',
			},
		],
		author: '@ZiGma (改进版)',
		repo: 'https://github.com/ZiGmaX809/PrivateRules',
		icons: [
			'https://raw.githubusercontent.com/ZiGmaX809/PrivateRules/refs/heads/master/QuantumultX/img/weread.png',
			'https://raw.githubusercontent.com/ZiGmaX809/PrivateRules/refs/heads/master/QuantumultX/img/weread.png',
		],
	};

	return boxjs;
}

// 环境兼容函数库
function Env(t, e) {
	class s {
		constructor(t) {
			this.env = t;
		}
		send(t, e = 'GET') {
			t = 'string' == typeof t ? { url: t } : t;
			let s = this.get;
			return (
				'POST' === e && (s = this.post),
				new Promise((e, a) => {
					s.call(this, t, (t, s, r) => {
						t ? a(t) : e(s);
					});
				})
			);
		}
		get(t) {
			return this.send.call(this.env, t);
		}
		post(t) {
			return this.send.call(this.env, t, 'POST');
		}
	}
	return new (class {
		constructor(t, e) {
			(this.name = t),
				(this.http = new s(this)),
				(this.data = null),
				(this.dataFile = 'box.dat'),
				(this.logs = []),
				(this.isMute = !1),
				(this.isNeedRewrite = !1),
				(this.logSeparator = '\n'),
				(this.encoding = 'utf-8'),
				(this.startTime = new Date().getTime()),
				Object.assign(this, e),
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
		toObj(t, e = null) {
			try {
				return JSON.parse(t);
			} catch {
				return e;
			}
		}
		toStr(t, e = null) {
			try {
				return JSON.stringify(t);
			} catch {
				return e;
			}
		}
		getjson(t, e) {
			let s = e;
			const a = this.getdata(t);
			if (a)
				try {
					s = JSON.parse(this.getdata(t));
				} catch {}
			return s;
		}
		setjson(t, e) {
			try {
				return this.setdata(JSON.stringify(t), e);
			} catch {
				return !1;
			}
		}
		getScript(t) {
			return new Promise(e => {
				this.get({ url: t }, (t, s, a) => e(a));
			});
		}
		runScript(t, e) {
			return new Promise(s => {
				let a = this.getdata('@chavy_boxjs_userCfgs.httpapi');
				a = a ? a.replace(/\n/g, '').trim() : a;
				let r = this.getdata('@chavy_boxjs_userCfgs.httpapi_timeout');
				(r = r ? 1 * r : 20), (r = e && e.timeout ? e.timeout : r);
				const [i, o] = a.split('@'),
					n = {
						url: `http://${o}/v1/scripting/evaluate`,
						body: { script_text: t, mock_type: 'cron', timeout: r },
						headers: { 'X-Key': i, Accept: '*/*' },
						timeout: r,
					};
				this.post(n, (t, e, a) => s(a));
			}).catch(t => this.logErr(t));
		}
		loaddata() {
			if (!this.isNode()) return {};
			{
				(this.fs = this.fs ? this.fs : require('fs')),
					(this.path = this.path ? this.path : require('path'));
				const t = this.path.resolve(this.dataFile),
					e = this.path.resolve(process.cwd(), this.dataFile),
					s = this.fs.existsSync(t),
					a = !s && this.fs.existsSync(e);
				if (!s && !a) return {};
				{
					const a = s ? t : e;
					try {
						return JSON.parse(this.fs.readFileSync(a));
					} catch (t) {
						return {};
					}
				}
			}
		}
		writedata() {
			if (this.isNode()) {
				(this.fs = this.fs ? this.fs : require('fs')),
					(this.path = this.path ? this.path : require('path'));
				const t = this.path.resolve(this.dataFile),
					e = this.path.resolve(process.cwd(), this.dataFile),
					s = this.fs.existsSync(t),
					a = !s && this.fs.existsSync(e),
					r = JSON.stringify(this.data);
				s
					? this.fs.writeFileSync(t, r)
					: a
					? this.fs.writeFileSync(e, r)
					: this.fs.writeFileSync(t, r);
			}
		}
		lodash_get(t, e, s) {
			const a = e.replace(/\[(\d+)\]/g, '.$1').split('.');
			let r = t;
			for (const t of a) if (((r = Object(r)[t]), void 0 === r)) return s;
			return r;
		}
		lodash_set(t, e, s) {
			return Object(t) !== t
				? t
				: (Array.isArray(e) || (e = e.toString().match(/[^.[\]]+/g) || []),
				  (e
						.slice(0, -1)
						.reduce(
							(t, s, a) =>
								Object(t[s]) === t[s]
									? t[s]
									: (t[s] = Math.abs(e[a + 1]) >> 0 == +e[a + 1] ? [] : {}),
							t
						)[e[e.length - 1]] = s),
				  t);
		}
		getdata(t) {
			let e = this.getval(t);
			if (/^@/.test(t)) {
				const [, s, a] = /^@(.*?)\.(.*?)$/.exec(t),
					r = s ? this.getval(s) : '';
				if (r)
					try {
						const t = JSON.parse(r);
						e = t ? this.lodash_get(t, a, '') : e;
					} catch (t) {
						e = '';
					}
			}
			return e;
		}
		setdata(t, e) {
			let s = !1;
			if (/^@/.test(e)) {
				const [, a, r] = /^@(.*?)\.(.*?)$/.exec(e),
					i = this.getval(a),
					o = a ? ('null' === i ? null : i || '{}') : '{}';
				try {
					const e = JSON.parse(o);
					this.lodash_set(e, r, t), (s = this.setval(JSON.stringify(e), a));
				} catch (e) {
					const i = {};
					this.lodash_set(i, r, t), (s = this.setval(JSON.stringify(i), a));
				}
			} else s = this.setval(t, e);
			return s;
		}
		getval(t) {
			return this.isSurge() || this.isLoon() || this.isStash()
				? $persistentStore.read(t)
				: this.isQuanX()
				? $prefs.valueForKey(t)
				: this.isNode()
				? ((this.data = this.loaddata()), this.data[t])
				: (this.data && this.data[t]) || null;
		}
		setval(t, e) {
			return this.isSurge() || this.isLoon() || this.isStash()
				? $persistentStore.write(t, e)
				: this.isQuanX()
				? $prefs.setValueForKey(t, e)
				: this.isNode()
				? ((this.data = this.loaddata()), (this.data[e] = t), this.writedata(), !0)
				: (this.data && this.data[e]) || null;
		}
		initGotEnv(t) {
			(this.got = this.got ? this.got : require('got')),
				(this.cktough = this.cktough ? this.cktough : require('tough-cookie')),
				(this.ckjar = this.ckjar ? this.ckjar : new this.cktough.CookieJar()),
				t &&
					((t.headers = t.headers ? t.headers : {}),
					void 0 === t.headers.Cookie && void 0 === t.cookieJar && (t.cookieJar = this.ckjar));
		}
		get(t, e = () => {}) {
			if (
				(t.headers && (delete t.headers['Content-Type'], delete t.headers['Content-Length']),
				this.isSurge() || this.isLoon() || this.isStash())
			)
				this.isSurge() &&
					this.isNeedRewrite &&
					((t.headers = t.headers || {}),
					Object.assign(t.headers, { 'X-Surge-Skip-Scripting': !1 })),
					$httpClient.get(t, (t, s, a) => {
						!t &&
							s &&
							((s.body = a),
							(s.statusCode = s.status ? s.status : s.statusCode),
							(s.status = s.statusCode)),
							e(t, s, a);
					});
			else if (this.isQuanX())
				this.isNeedRewrite && ((t.opts = t.opts || {}), Object.assign(t.opts, { hints: !1 })),
					$task.fetch(t).then(
						t => {
							const { statusCode: s, statusCode: a, headers: r, body: i, bodyBytes: o } = t;
							e(null, { status: s, statusCode: a, headers: r, body: i, bodyBytes: o }, i, o);
						},
						t => e((t && t.error) || 'UndefinedError')
					);
			else if (this.isNode()) {
				let s = require('iconv-lite');
				this.initGotEnv(t),
					this.got(t)
						.on('redirect', (t, e) => {
							try {
								if (t.headers['set-cookie']) {
									const s = t.headers['set-cookie'].map(this.cktough.Cookie.parse).toString();
									s && this.ckjar.setCookieSync(s, null), (e.cookieJar = this.ckjar);
								}
							} catch (t) {
								this.logErr(t);
							}
						})
						.then(
							t => {
								const { statusCode: a, statusCode: r, headers: i, rawBody: o } = t,
									n = s.decode(o, this.encoding);
								e(null, { status: a, statusCode: r, headers: i, rawBody: o, body: n }, n);
							},
							t => {
								const { message: a, response: r } = t;
								e(a, r, r && s.decode(r.rawBody, this.encoding));
							}
						);
			}
		}
		post(t, e = () => {}) {
			const s = t.method ? t.method.toLocaleLowerCase() : 'post';
			if (
				(t.body &&
					t.headers &&
					!t.headers['Content-Type'] &&
					(t.headers['Content-Type'] = 'application/x-www-form-urlencoded'),
				t.headers && delete t.headers['Content-Length'],
				this.isSurge() || this.isLoon() || this.isStash())
			)
				this.isSurge() &&
					this.isNeedRewrite &&
					((t.headers = t.headers || {}),
					Object.assign(t.headers, { 'X-Surge-Skip-Scripting': !1 })),
					$httpClient[s](t, (t, s, a) => {
						!t &&
							s &&
							((s.body = a),
							(s.statusCode = s.status ? s.status : s.statusCode),
							(s.status = s.statusCode)),
							e(t, s, a);
					});
			else if (this.isQuanX())
				(t.method = s),
					this.isNeedRewrite && ((t.opts = t.opts || {}), Object.assign(t.opts, { hints: !1 })),
					$task.fetch(t).then(
						t => {
							const { statusCode: s, statusCode: a, headers: r, body: i, bodyBytes: o } = t;
							e(null, { status: s, statusCode: a, headers: r, body: i, bodyBytes: o }, i, o);
						},
						t => e((t && t.error) || 'UndefinedError')
					);
			else if (this.isNode()) {
				let a = require('iconv-lite');
				this.initGotEnv(t);
				const { url: r, ...i } = t;
				this.got[s](r, i).then(
					t => {
						const { statusCode: s, statusCode: r, headers: i, rawBody: o } = t,
							n = a.decode(o, this.encoding);
						e(null, { status: s, statusCode: r, headers: i, rawBody: o, body: n }, n);
					},
					t => {
						const { message: s, response: r } = t;
						e(s, r, r && a.decode(r.rawBody, this.encoding));
					}
				);
			}
		}
		time(t, e = null) {
			const s = e ? new Date(e) : new Date();
			let a = {
				'M+': s.getMonth() + 1,
				'd+': s.getDate(),
				'H+': s.getHours(),
				'm+': s.getMinutes(),
				's+': s.getSeconds(),
				'q+': Math.floor((s.getMonth() + 3) / 3),
				S: s.getMilliseconds(),
			};
			/(y+)/.test(t) &&
				(t = t.replace(RegExp.$1, (s.getFullYear() + '').substr(4 - RegExp.$1.length)));
			for (let e in a)
				new RegExp('(' + e + ')').test(t) &&
					(t = t.replace(
						RegExp.$1,
						1 == RegExp.$1.length ? a[e] : ('00' + a[e]).substr(('' + a[e]).length)
					));
			return t;
		}
		queryStr(t) {
			let e = '';
			for (const s in t) {
				let a = t[s];
				null != a &&
					'' !== a &&
					('object' == typeof a && (a = JSON.stringify(a)), (e += `${s}=${a}&`));
			}
			return (e = e.substring(0, e.length - 1)), e;
		}
		msg(e = t, s = '', a = '', r) {
			const i = t => {
				if (!t) return t;
				if ('string' == typeof t)
					return this.isLoon()
						? t
						: this.isQuanX()
						? { 'open-url': t }
						: this.isSurge() || this.isStash()
						? { url: t }
						: void 0;
				if ('object' == typeof t) {
					if (this.isLoon()) {
						let e = t.openUrl || t.url || t['open-url'],
							s = t.mediaUrl || t['media-url'];
						return { openUrl: e, mediaUrl: s };
					}
					if (this.isQuanX()) {
						let e = t['open-url'] || t.url || t.openUrl,
							s = t['media-url'] || t.mediaUrl,
							a = t['update-pasteboard'] || t.updatePasteboard;
						return { 'open-url': e, 'media-url': s, 'update-pasteboard': a };
					}
					if (this.isSurge() || this.isStash()) {
						let e = t.url || t.openUrl || t['open-url'];
						return { url: e };
					}
				}
			};
			if (
				(this.isMute ||
					(this.isSurge() || this.isLoon() || this.isStash()
						? $notification.post(e, s, a, i(r))
						: this.isQuanX() && $notify(e, s, a, i(r))),
				!this.isMuteLog)
			) {
				let t = ['', '==============📣系统通知📣=============='];
				t.push(e),
					s && t.push(s),
					a && t.push(a),
					console.log(t.join('\n')),
					(this.logs = this.logs.concat(t));
			}
		}
		log(...t) {
			t.length > 0 && (this.logs = [...this.logs, ...t]), console.log(t.join(this.logSeparator));
		}
		logErr(t, e) {
			const s = !this.isSurge() && !this.isQuanX() && !this.isLoon() && !this.isStash();
			s
				? this.log('', `❗️${this.name}, 错误!`, t.stack)
				: this.log('', `❗️${this.name}, 错误!`, t);
		}
		wait(t) {
			return new Promise(e => setTimeout(e, t));
		}
		done(t = {}) {
			const e = new Date().getTime(),
				s = (e - this.startTime) / 1e3;
			this.log('', `🔔${this.name}, 结束! 🕛 ${s} 秒`),
				this.log(),
				this.isSurge() || this.isQuanX() || this.isLoon() || this.isStash()
					? $done(t)
					: this.isNode() && process.exit(1);
		}
	})(t, e);
}

// 执行主函数
main();

// 导出BoxJS订阅
if (typeof $request === 'undefined') {
	// 在BoxJS界面中加载
	if (typeof $response !== 'undefined') {
		const subscription = addBoxJSSubscription();
		const resp = { body: JSON.stringify(subscription) };
		$done(resp);
	}
} else {
	// 正常执行脚本
	main();
}
