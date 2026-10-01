# 验证记录

本文件记录 zhi-mi-front 在交付前的实际验证方式与结果，供复查与答辩引用。

## 安装与启动

- 环境要求：Node.js 20.19+（或 22+）、npm 10+。
- `npm ci` 按 `package-lock.json` 安装依赖。
- `npm run dev` 启动 Vite 开发服务器，`/api` 代理转发到 `http://localhost:10086` 网关；切换网关见 `.env.example`。

## 构建

- `npm run build` 产出 `dist/`。
- 最近一次执行结果：构建成功（约 17 秒），仅有 Rollup 提示主 chunk 超过 500 kB 的警告（Element Plus 全量引入所致，不影响产物运行）。
- `npm run preview -- --port 4173` 仅用于静态产物检查。

## 请求层测试

- `npm test` 运行 `tests/transport.test.js` 与 `tests/recruitment.test.js`。
- 最近一次执行结果：11 项全部通过（传输层 7 项 + 招聘流程 4 项），0 失败。
- 覆盖点包括：长整型 ID 无损解析、超时中断、网络/无效 JSON/HTTP 失败不伪造数据、旧版兼容 code 拒绝、面试安排备注往返与校验、进度不虚构中间事件、公司按 employerId 聚合去重。

## 浏览器验证（隔离夹具）

真实后端未在交付环境运行 `localhost:10086` 网关，浏览器验证使用独立夹具，不连真实服务：

```sh
npm run build
node tests/fixture-server.js
```

- 仅监听 http://127.0.0.1:4174，提供静态产物与内存测试数据，服务退出即丢弃。
- 测试账号：`seeker` / `employer` / `admin`，密码均为 `test123`；全部职位、简历、投递、消息为虚构测试记录。
- 夹具按 `docs/API.md` 的契约实现同形状响应（含投递状态、备注、面试安排备注往返）。

## 尚未验证

- 与真实后端的端到端联调（注册、登录、投递、审核、聊天持久化）。
- 网关匿名白名单的部署环境确认（见 `docs/API.md` 网关部署前提）。
- 生产 Nginx 代理与 History 路由回退（配置示例见 `deploy/nginx.conf.example`）。

测试夹具通过不能代替真实服务联调。
