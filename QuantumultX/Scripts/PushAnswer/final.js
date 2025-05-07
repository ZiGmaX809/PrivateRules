/**
 * @fileoverview 拦截模拟考试API响应并提取答案进行通知的脚本
 * @author 基于原模板修改
 */

// 脚本函数 - 处理API响应
const processResponse = function(response) {
    try {
      // 解析JSON响应
      const responseData = JSON.parse(response.body);
      
      // 检查响应是否成功且包含答案数据
      if (responseData.flag === 1 && responseData.data && responseData.data.answer) {
        const questionId = responseData.data.id;
        const answer = responseData.data.answer;
        const title = responseData.data.title || "未知题目";
        const typeName = responseData.data.types_name || "未知类型";
        
        // 获取对应的答案文本
        const options = responseData.data.opts || [];
        let answerText = "";
        
        if (options.length > 0) {
          // 查找以答案字母开头的选项
          for (const option of options) {
            if (option.startsWith(answer)) {
              answerText = option;
              break;
            }
          }
        }
        
        // 准备通知内容（截取题目标题，防止过长）
        const shortTitle = title.length > 20 ? title.substring(0, 20) + "..." : title;
        
        // 创建通知
        $notify(
          "模拟考试答案提示", 
          `【${typeName}】题目ID: ${questionId}`,
          `正确答案: ${answer}${answerText ? "\n" + answerText : ""}`
        );
        
        // 记录额外信息到日志
        console.log(`题目: ${title}`);
        console.log(`答案: ${answer}`);
        if (answerText) {
          console.log(`答案选项: ${answerText}`);
        }
      } else {
        console.log("响应中未找到有效答案数据");
      }
      
      // 返回原始响应，不做修改
      return response;
    } catch (error) {
      console.log("处理响应时出错: " + error.message);
      return response; // 出错时返回原始响应
    }
  };
  
  // 脚本主入口
  var body = $response.body;
  var url = $request.url;
  
  if (url.indexOf("https://www.zjlxsxkh.cn/mockexam/get_ques") !== -1) {
    const response = {
      body: body,
      statusCode: $response.statusCode
    };
    
    // 处理响应
    processResponse(response);
  }
  
  // 返回原始响应
  $done({});