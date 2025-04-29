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

// 处理请求的主函数
function processRequest() {
    try {
        $.log("微信读书 skey 更新器运行中...");
        
        // 从请求头中获取 skey
        const skey = $request.headers['skey'] || $request.headers['Skey'] || '';
        
        if (!skey) {
            $.log("请求头中未找到 skey");
            $done({});
            return;
        }
        
        $.log(`找到 skey: ${skey}`);
        
        // 读取 data.json 文件
        $persistentStore.read({
            key: 'weread-data-file',
            path: dataFilePath
        }, (response) => {
            if (response.error) {
                $.log(`读取文件错误: ${response.error}`);
                $done({});
                return;
            }
            
            try {
                // 解析 JSON 数据
                let data = JSON.parse(response.value);
                
                // 查找并更新 wr_skey 条目
                let updated = false;
                for (let i = 0; i < data.length; i++) {
                    if (data[i].name === "wr_skey") {
                        data[i].value = skey;
                        updated = true;
                        break;
                    }
                }
                
                // 如果 wr_skey 不存在，则添加它
                if (!updated) {
                    data.push({
                        name: "wr_skey",
                        value: skey
                    });
                }
                
                // 写回文件
                $persistentStore.write({
                    key: 'weread-data-file',
                    value: JSON.stringify(data, null, 2),
                    path: dataFilePath
                }, (writeResponse) => {
                    if (writeResponse.error) {
                        $.log(`写入文件错误: ${writeResponse.error}`);
                    } else {
                        $.log(`成功更新 skey 为: ${skey}`);
                        $notify("微信读书 skey 已更新", "", `成功更新 skey 为: ${skey}`);
                    }
                    $done({});
                });
            } catch (e) {
                $.log(`解析 JSON 错误: ${e.message}`);
                $done({});
            }
        });
    } catch (e) {
        $.log(`意外错误: ${e.message}`);
        $done({});
    }
}

// 如果这是一个请求，则开始处理
if ($request) {
    processRequest();
} else {
    $.log("此脚本应作为请求脚本使用");
    $done({});
}
