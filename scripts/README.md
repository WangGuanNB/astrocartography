# Scripts 目录说明

## 数据导出脚本

### 1. `export-chat-sessions.ts` - 会话元数据导出
**用途**: 导出所有聊天会话的元数据（不包含完整消息内容）  
**适用场景**: 快速统计会话数量、用户数量、时间分布  
**运行命令**: `npx tsx scripts/export-chat-sessions.ts`  
**输出文件**: `exports/chat-sessions-[timestamp].json`  
**建议**: ✅ **保留** - 用于快速统计和监控

---

### 2. `export-sample-chats.ts` - 样本数据导出
**用途**: 导出最近500条聊天记录（包含完整消息内容）  
**适用场景**: 小规模数据分析、快速查看用户问题  
**运行命令**: `npx tsx scripts/export-sample-chats.ts`  
**输出文件**: 
- `exports/chat-sample-[timestamp].json` - 完整聊天记录
- `exports/user-questions-[timestamp].txt` - 用户问题列表  
**建议**: ✅ **保留** - 用于日常分析和问题排查

---

### 3. `export-large-sample.ts` - 大量数据导出
**用途**: 分批导出3000条聊天记录（避免D1内存限制）  
**适用场景**: 深度数据分析、生成分析报告  
**运行命令**: `npx tsx scripts/export-large-sample.ts`  
**输出文件**: 
- `exports/chat-large-sample-[timestamp].json` - 3000条完整记录
- `exports/chat-titles-[timestamp].txt` - 3000条标题列表  
**建议**: ✅ **保留** - 用于定期深度分析（建议每月运行一次）

---

## 其他脚本

### 4. `migrate-to-d1.ts` - 数据库迁移
**用途**: 数据库迁移脚本  
**建议**: ✅ **保留** - 可能需要用于未来的数据迁移

### 5. `cf-build.js` - Cloudflare构建
**用途**: Cloudflare部署构建脚本  
**建议**: ✅ **保留** - 部署必需

### 6. `test-r2.js` - R2存储测试
**用途**: 测试Cloudflare R2存储功能  
**建议**: ✅ **保留** - 用于调试和测试

---

## 使用建议

### 定期分析流程
1. **每周**: 运行 `export-sample-chats.ts` 查看最新用户问题
2. **每月**: 运行 `export-large-sample.ts` 进行深度分析
3. **按需**: 运行 `export-chat-sessions.ts` 获取统计数据

### 数据分析工作流
```bash
# 1. 导出大量数据
npx tsx scripts/export-large-sample.ts

# 2. 使用bash命令进行统计分析
cd exports
cat chat-titles-*.txt | grep -i "love" | wc -l
cat chat-titles-*.txt | grep -i "career" | wc -l

# 3. 查看完整分析报告
open ../USER_NEEDS_ANALYSIS_REPORT.md
```

---

## 环境变量要求

所有导出脚本需要以下环境变量（在 `.env.local` 中配置）：

```env
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_D1_DATABASE_ID=your_database_id
CLOUDFLARE_D1_TOKEN=your_api_token
```

---

## 注意事项

1. **数据隐私**: 导出的数据包含用户信息，请妥善保管，不要提交到Git仓库
2. **Git忽略**: `exports/` 目录已添加到 `.gitignore`
3. **D1限制**: 单次查询不能超过D1内存限制，大量数据需要分批导出
4. **API限制**: 避免频繁调用Cloudflare API，建议添加延迟

---

## 总结

**建议保留所有脚本**，它们各有用途：
- ✅ `export-chat-sessions.ts` - 快速统计
- ✅ `export-sample-chats.ts` - 日常分析
- ✅ `export-large-sample.ts` - 深度分析
- ✅ 其他脚本 - 部署和测试必需

**不建议删除任何脚本**，因为它们都是有用的工具。
