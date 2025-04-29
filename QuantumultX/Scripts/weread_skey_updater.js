/***********************************
> 微信读书 skey 更新器 (Quantumult X 版)
>  
> 该脚本从微信读书请求头中提取 skey 值，
> 并更新到 Obsidian 微信读书插件的 data.json 文件中
> 

[rewrite_local]
# 微信读书 skey 捕获
^https?:\/\/i\.weread\.qq\.com\/book\/read url script-request-header weread_skey_updater.js

[mitm]
hostname = i.weread.qq.com

***********************************/

// Obsidian 微信读书插件数据文件路径
const dataFilePath =
	'drive://iCloud/Obsidian/Obsidian Vault/.obsidian/plugins/obsidian-weread-plugin/data.json';

const $ = new Env('weread');

!(async () => {
	if (typeof $request != 'undefined') {
		$.msg('- 正在获取Skey, 请稍后');
		await processRequest();
	}
})()
	.catch(e => $.logErr(e))
	.finally(() => $.done());

// 处理请求的主函数
async function processRequest() {
    try {
			$.log('微信读书 skey 更新器运行中...');

			// 从请求头中获取 skey
			const skey = $request.headers['skey'] || $request.headers['Skey'] || '';

			if (!skey) {
				$.log('请求头中未找到 skey');
				$done({});
				return;
			}

			// 保存到 Quantumult X 持久化存储
			$prefs.setValueForKey(skey, 'weread_skey');
	
			$.msg('微信读书skey保存成功');
			$done();

		} catch (e) {
        $.log(`意外错误: ${e.message}`);
        $done({});
    }
}




// Wbi签名获取
function getWbiSigns(r){function t(r){let t="";return e.forEach(s=>{t+=r[s]}),t.slice(0,32)}function s(r,s,u){const e=t(s+u),i=parseInt($.startTime/1e3);let n="";r=Object.assign(r,{wts:i}),n=$.queryStr(Object.fromEntries(new Map(Array.from(Object.entries(r)).sort())));const l=md5(n+e);return n+"&w_rid="+l}function u(){return img_url=config.user.wbi_img.img_url,sub_url=config.user.wbi_img.sub_url,{img_key:img_url.substring(img_url.lastIndexOf("/")+1,img_url.length).split(".")[0],sub_key:sub_url.substring(sub_url.lastIndexOf("/")+1,sub_url.length).split(".")[0]}}const e=[46,47,18,2,53,8,23,32,15,50,10,31,58,3,45,35,27,43,5,49,33,9,42,19,29,28,14,39,12,38,41,13,37,48,7,16,24,55,40,61,26,17,0,1,60,51,30,4,22,25,54,21,56,59,6,63,57,62,11,36,20,34,44,52],i=u();return s(r,i.img_key,i.sub_key)}

// md5(32位)
function md5(r){function n(r,n){return r<<n|r>>>32-n}function t(r,n){var t,o,e,u,f;return e=2147483648&r,u=2147483648&n,t=1073741824&r,o=1073741824&n,f=(1073741823&r)+(1073741823&n),t&o?2147483648^f^e^u:t|o?1073741824&f?3221225472^f^e^u:1073741824^f^e^u:f^e^u}function o(r,n,t){return r&n|~r&t}function e(r,n,t){return r&t|n&~t}function u(r,n,t){return r^n^t}function f(r,n,t){return n^(r|~t)}function i(r,e,u,f,i,a,c){return r=t(r,t(t(o(e,u,f),i),c)),t(n(r,a),e)}function a(r,o,u,f,i,a,c){return r=t(r,t(t(e(o,u,f),i),c)),t(n(r,a),o)}function c(r,o,e,f,i,a,c){return r=t(r,t(t(u(o,e,f),i),c)),t(n(r,a),o)}function C(r,o,e,u,i,a,c){return r=t(r,t(t(f(o,e,u),i),c)),t(n(r,a),o)}function g(r){for(var n,t=r.length,o=t+8,e=(o-o%64)/64,u=16*(e+1),f=Array(u-1),i=0,a=0;a<t;)n=(a-a%4)/4,i=a%4*8,f[n]=f[n]|r.charCodeAt(a)<<i,a++;return n=(a-a%4)/4,i=a%4*8,f[n]=f[n]|128<<i,f[u-2]=t<<3,f[u-1]=t>>>29,f}function h(r){var n,t,o="",e="";for(t=0;t<=3;t++)n=r>>>8*t&255,e="0"+n.toString(16),o+=e.slice(-2);return o}function d(r){r=r.replace(/\r\n/g,"\n");for(var n="",t=0;t<r.length;t++){var o=r.charCodeAt(t);o<128?n+=String.fromCharCode(o):o>127&&o<2048?(n+=String.fromCharCode(o>>6|192),n+=String.fromCharCode(63&o|128)):(n+=String.fromCharCode(o>>12|224),n+=String.fromCharCode(o>>6&63|128),n+=String.fromCharCode(63&o|128))}return n}var m,S,v,l,A,s,y,p,w,L=Array(),b=7,j=12,k=17,q=22,x=5,z=9,B=14,D=20,E=4,F=11,G=16,H=23,I=6,J=10,K=15,M=21;for(r=d(r),L=g(r),s=1732584193,y=4023233417,p=2562383102,w=271733878,m=0;m<L.length;m+=16)S=s,v=y,l=p,A=w,s=i(s,y,p,w,L[m+0],b,3614090360),w=i(w,s,y,p,L[m+1],j,3905402710),p=i(p,w,s,y,L[m+2],k,606105819),y=i(y,p,w,s,L[m+3],q,3250441966),s=i(s,y,p,w,L[m+4],b,4118548399),w=i(w,s,y,p,L[m+5],j,1200080426),p=i(p,w,s,y,L[m+6],k,2821735955),y=i(y,p,w,s,L[m+7],q,4249261313),s=i(s,y,p,w,L[m+8],b,1770035416),w=i(w,s,y,p,L[m+9],j,2336552879),p=i(p,w,s,y,L[m+10],k,4294925233),y=i(y,p,w,s,L[m+11],q,2304563134),s=i(s,y,p,w,L[m+12],b,1804603682),w=i(w,s,y,p,L[m+13],j,4254626195),p=i(p,w,s,y,L[m+14],k,2792965006),y=i(y,p,w,s,L[m+15],q,1236535329),s=a(s,y,p,w,L[m+1],x,4129170786),w=a(w,s,y,p,L[m+6],z,3225465664),p=a(p,w,s,y,L[m+11],B,643717713),y=a(y,p,w,s,L[m+0],D,3921069994),s=a(s,y,p,w,L[m+5],x,3593408605),w=a(w,s,y,p,L[m+10],z,38016083),p=a(p,w,s,y,L[m+15],B,3634488961),y=a(y,p,w,s,L[m+4],D,3889429448),s=a(s,y,p,w,L[m+9],x,568446438),w=a(w,s,y,p,L[m+14],z,3275163606),p=a(p,w,s,y,L[m+3],B,4107603335),y=a(y,p,w,s,L[m+8],D,1163531501),s=a(s,y,p,w,L[m+13],x,2850285829),w=a(w,s,y,p,L[m+2],z,4243563512),p=a(p,w,s,y,L[m+7],B,1735328473),y=a(y,p,w,s,L[m+12],D,2368359562),s=c(s,y,p,w,L[m+5],E,4294588738),w=c(w,s,y,p,L[m+8],F,2272392833),p=c(p,w,s,y,L[m+11],G,1839030562),y=c(y,p,w,s,L[m+14],H,4259657740),s=c(s,y,p,w,L[m+1],E,2763975236),w=c(w,s,y,p,L[m+4],F,1272893353),p=c(p,w,s,y,L[m+7],G,4139469664),y=c(y,p,w,s,L[m+10],H,3200236656),s=c(s,y,p,w,L[m+13],E,681279174),w=c(w,s,y,p,L[m+0],F,3936430074),p=c(p,w,s,y,L[m+3],G,3572445317),y=c(y,p,w,s,L[m+6],H,76029189),s=c(s,y,p,w,L[m+9],E,3654602809),w=c(w,s,y,p,L[m+12],F,3873151461),p=c(p,w,s,y,L[m+15],G,530742520),y=c(y,p,w,s,L[m+2],H,3299628645),s=C(s,y,p,w,L[m+0],I,4096336452),w=C(w,s,y,p,L[m+7],J,1126891415),p=C(p,w,s,y,L[m+14],K,2878612391),y=C(y,p,w,s,L[m+5],M,4237533241),s=C(s,y,p,w,L[m+12],I,1700485571),w=C(w,s,y,p,L[m+3],J,2399980690),p=C(p,w,s,y,L[m+10],K,4293915773),y=C(y,p,w,s,L[m+1],M,2240044497),s=C(s,y,p,w,L[m+8],I,1873313359),w=C(w,s,y,p,L[m+15],J,4264355552),p=C(p,w,s,y,L[m+6],K,2734768916),y=C(y,p,w,s,L[m+13],M,1309151649),s=C(s,y,p,w,L[m+4],I,4149444226),w=C(w,s,y,p,L[m+11],J,3174756917),p=C(p,w,s,y,L[m+2],K,718787259),y=C(y,p,w,s,L[m+9],M,3951481745),s=t(s,S),y=t(y,v),p=t(p,l),w=t(w,A);return(h(s)+h(y)+h(p)+h(w)).toLowerCase()}

/***************** Env *****************/
// prettier-ignore
// https://github.com/chavyleung/scripts/blob/master/Env.min.js

function Env(a,b){var c=Math.floor;return new class{constructor(a,b){this.name=a,this.version="1.7.4",this.data=null,this.logs=[],this.isMute=!1,this.isNeedRewrite=!1,this.logSeparator="\n",this.encoding="utf-8",this.startTime=new Date().getTime(),Object.assign(this,b),this.log("",`🔔${this.name}, 开始!`)}platform(){return"undefined"!=typeof $environment&&$environment["surge-version"]?"Surge":"undefined"!=typeof $environment&&$environment["stash-version"]?"Stash":"undefined"==typeof module||!module.exports?"undefined"==typeof $task?"undefined"==typeof $loon?"undefined"==typeof $rocket?"undefined"==typeof Egern?void 0:"Egern":"Shadowrocket":"Loon":"Quantumult X":"Node.js"}isQuanX(){return"Quantumult X"===this.platform()}isSurge(){return"Surge"===this.platform()}isLoon(){return"Loon"===this.platform()}isShadowrocket(){return"Shadowrocket"===this.platform()}isStash(){return"Stash"===this.platform()}isEgern(){return"Egern"===this.platform()}toObj(a,b=null){try{return JSON.parse(a)}catch{return b}}toStr(a,b=null){try{return JSON.stringify(a)}catch{return b}}lodash_get(a={},b="",c=void 0){Array.isArray(b)||(b=this.toPath(b));const d=b.reduce((a,b)=>Object(a)[b],a);return d===void 0?c:d}lodash_set(a={},b="",c){return Array.isArray(b)||(b=this.toPath(b)),b.slice(0,-1).reduce((a,c,d)=>Object(a[c])===a[c]?a[c]:a[c]=/^\d+$/.test(b[d+1])?[]:{},a)[b[b.length-1]]=c,a}toPath(a){return a.replace(/\[(\d+)\]/g,".$1").split(".").filter(Boolean)}getItem(a=new String,b=null){let c=b;switch(a.startsWith("@")){case!0:const{key:b,path:d}=a.match(/^@(?<key>[^.]+)(?:\.(?<path>.*))?$/)?.groups;a=b;let e=this.getItem(a,{});"object"!=typeof e&&(e={}),c=this.lodash_get(e,d);try{c=JSON.parse(c)}catch(a){}break;default:switch(this.platform()){case"Surge":case"Loon":case"Stash":case"Egern":case"Shadowrocket":c=$persistentStore.read(a);break;case"Quantumult X":c=$prefs.valueForKey(a);break;default:c=this.data?.[a]||null}try{c=JSON.parse(c)}catch(a){}}return c??b}setItem(a=new String,b=new String){let c=!1;switch(typeof b){case"object":b=JSON.stringify(b);break;default:b=b+""}switch(a.startsWith("@")){case!0:const{key:d,path:e}=a.match(/^@(?<key>[^.]+)(?:\.(?<path>.*))?$/)?.groups;a=d;let f=this.getItem(a,{});"object"!=typeof f&&(f={}),this.lodash_set(f,e,b),c=this.setItem(a,f);break;default:switch(this.platform()){case"Surge":case"Loon":case"Stash":case"Egern":case"Shadowrocket":c=$persistentStore.write(b,a);break;case"Quantumult X":c=$prefs.setValueForKey(b,a);break;default:c=this.data?.[a]||null}}return c}async fetch(a={},b={}){switch(a.constructor){case Object:a={...a,...b};break;case String:a={url:a,...b}}a.method||(a.method=a.body??a.bodyBytes?"POST":"GET"),delete a.headers?.Host,delete a.headers?.[":authority"],delete a.headers?.["Content-Length"],delete a.headers?.["content-length"];const c=a.method.toLocaleLowerCase();switch(this.platform()){case"Loon":case"Surge":case"Stash":case"Egern":case"Shadowrocket":default:return a.policy&&(this.isLoon()&&(a.node=a.policy),this.isStash()&&this.lodash_set(a,"headers.X-Stash-Selected-Proxy",encodeURI(a.policy))),a.followRedirect&&((this.isSurge()||this.isLoon())&&(a["auto-redirect"]=!1),this.isQuanX()&&(a.opts?a.opts.redirection=!1:a.opts={redirection:!1})),a.bodyBytes&&!a.body&&(a.body=a.bodyBytes,delete a.bodyBytes),await new Promise((b,d)=>{$httpClient[c](a,(c,e,f)=>{c?d(c):(e.ok=/^2\d\d$/.test(e.status),e.statusCode=e.status,f&&(e.body=f,!0==a["binary-mode"]&&(e.bodyBytes=f)),b(e))})});case"Quantumult X":return a.policy&&this.lodash_set(a,"opts.policy",a.policy),"boolean"==typeof a["auto-redirect"]&&this.lodash_set(a,"opts.redirection",a["auto-redirect"]),a.body instanceof ArrayBuffer?(a.bodyBytes=a.body,delete a.body):ArrayBuffer.isView(a.body)?(a.bodyBytes=a.body.buffer.slice(a.body.byteOffset,a.body.byteLength+a.body.byteOffset),delete object.body):a.body&&delete a.bodyBytes,await $task.fetch(a).then(a=>(a.ok=/^2\d\d$/.test(a.statusCode),a.status=a.statusCode,a),a=>Promise.reject(a.error))}}time(a,b=null){const d=b?new Date(b):new Date;let e={"M+":d.getMonth()+1,"d+":d.getDate(),"H+":d.getHours(),"m+":d.getMinutes(),"s+":d.getSeconds(),"q+":c((d.getMonth()+3)/3),S:d.getMilliseconds()};for(let c in /(y+)/.test(a)&&(a=a.replace(RegExp.$1,(d.getFullYear()+"").slice(4-RegExp.$1.length))),e)new RegExp("("+c+")").test(a)&&(a=a.replace(RegExp.$1,1==RegExp.$1.length?e[c]:("00"+e[c]).slice((""+e[c]).length)));return a}getBaseURL(a){return a.replace(/[?#].*$/,"")}isAbsoluteURL(a){return /^[a-z][a-z0-9+.-]*:/.test(a)}getURLParameters(a){return(a.match(/([^?=&]+)(=([^&]*))/g)||[]).reduce((b,a)=>(b[a.slice(0,a.indexOf("="))]=a.slice(a.indexOf("=")+1),b),{})}getTimestamp(a=new Date){return c(a.getTime()/1e3)}queryStr(a){let b=[];for(let c in a)a.hasOwnProperty(c)&&b.push(`${c}=${a[c]}`);let c=b.join("&");return c}queryObj(a){let b={},c=a.split("&");for(let d of c){let a=d.split("="),c=a[0],e=a[1]||"";c&&(b[c]=e)}return b}msg(a=this.name,b="",c="",d){const e=a=>{switch(typeof a){case void 0:return a;case"string":switch(this.platform()){case"Surge":case"Stash":case"Egern":default:return{url:a};case"Loon":case"Shadowrocket":return a;case"Quantumult X":return{"open-url":a}}case"object":switch(this.platform()){case"Surge":case"Stash":case"Egern":case"Shadowrocket":default:{let b=a.url||a.openUrl||a["open-url"];return{url:b}}case"Loon":{let b=a.openUrl||a.url||a["open-url"],c=a.mediaUrl||a["media-url"];return{openUrl:b,mediaUrl:c}}case"Quantumult X":{let b=a["open-url"]||a.url||a.openUrl,c=a["media-url"]||a.mediaUrl,d=a["update-pasteboard"]||a.updatePasteboard;return{"open-url":b,"media-url":c,"update-pasteboard":d}}}default:}};if(!this.isMute)switch(this.platform()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":default:$notification.post(a,b,c,e(d));break;case"Quantumult X":$notify(a,b,c,e(d))}}log(...a){0<a.length&&(this.logs=[...this.logs,...a]),console.log(a.join(this.logSeparator))}logErr(a,b){switch(this.platform()){case"Surge":case"Loon":case"Stash":case"Egern":case"Shadowrocket":case"Quantumult X":default:this.log("",`❗️${this.name}, 错误!`,a,b)}}wait(a){return new Promise(b=>setTimeout(b,a))}done(a={}){const b=new Date().getTime(),c=(b-this.startTime)/1e3;switch(this.log("",`🔔${this.name}, 结束! 🕛 ${c} 秒`),this.platform()){case"Surge":a.policy&&this.lodash_set(a,"headers.X-Surge-Policy",a.policy),$done(a);break;case"Loon":a.policy&&(a.node=a.policy),$done(a);break;case"Stash":a.policy&&this.lodash_set(a,"headers.X-Stash-Selected-Proxy",encodeURI(a.policy)),$done(a);break;case"Egern":$done(a);break;case"Shadowrocket":default:$done(a);break;case"Quantumult X":a.policy&&this.lodash_set(a,"opts.policy",a.policy),delete a["auto-redirect"],delete a["auto-cookie"],delete a["binary-mode"],delete a.charset,delete a.host,delete a.insecure,delete a.method,delete a.opt,delete a.path,delete a.policy,delete a["policy-descriptor"],delete a.scheme,delete a.sessionIndex,delete a.statusCode,delete a.timeout,a.body instanceof ArrayBuffer?(a.bodyBytes=a.body,delete a.body):ArrayBuffer.isView(a.body)?(a.bodyBytes=a.body.buffer.slice(a.body.byteOffset,a.body.byteLength+a.body.byteOffset),delete a.body):a.body&&delete a.bodyBytes,$done(a)}}}(a,b)}