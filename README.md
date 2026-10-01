# 智聘招聘平台前端

Vue 3 + Element Plus + JavaScript + HTML + 原生 CSS。基于 `hire` 后端现有接口开发，无 React、TypeScript 或 CSS 预处理器。参考提供的蓝白招聘平台设计，适配桌面与移动端。

后端仓库：[hire-backend](https://github.com/liuruibo07-creator/hire-backend)。本仓库发布自 `zhi-mi-front`，是一个包含三种角色入口的单页面应用。

## 启动

Node.js 20.19+ 或 22+，npm 10+。

```sh
npm ci
npm run dev
```

默认访问 http://localhost:5174。开发代理将 `/api` 转发至 `http://localhost:10086`。在 `.env.local` 中设置 `VITE_GATEWAY_URL` 可切换网关，变量说明见 `.env.example`。环境配置改动后需要重启开发服务器。

`VITE_API_BASE_URL` 留空使用同源接口；如填写跨域 API origin，后端必须配置对应 CORS。不要在任何 VITE 环境变量中保存密钥。

```sh
npm test
npm run build
npm run preview -- --port 4173
```

构建目录为 `dist/`。生产环境需配置 `/api` 网关代理及 History 路由回退，见 `deploy/nginx.conf.example`。`vite preview` 仅用于静态产物检查，正式接口代理应由 Web 服务器提供。

## 页面与功能

- 首页、职位搜索（城市、薪资、经验、学历、类别、行业、类型、排序和分页，含实习职位筛选）、职位详情。
- 公司目录（按已加载公开职位汇总）与公司招聘概览；`/campus` 重定向到实习职位搜索。
- 登录、求职者/企业注册、服务端身份确认、角色路由与菜单、资料编辑、修改密码。
- 求职者：简历创建/编辑/预览/删除/设置默认、职位投递、投递进度（真实提交时间与当前状态）、我的面试。
- 企业：发布和编辑职位、上下架申请、收到的投递、简历查看、处理状态与公开反馈、面试安排（时间地点保存于投递备注）。
- 管理员：平台统计、职位审核/下架、投递巡检、用户详情/启用/禁用。
- 本人通知筛选、单条/全部标读；求职者和企业聊天，历史分页、增量轮询、未读与已读处理。

统一请求层包含 baseURL、Bearer token、15秒超时、错误提示和失效处理；长整型 ID 无损解析。生产页面只展示真实接口数据，不自动回退演示职位。

## 工程结构

```text
src/api/           请求传输层与真实接口封装
src/router/        路由、身份与角色守卫
src/stores/        当前标签页登录态
src/composables/   加载/错误与请求竞争控制
src/components/    职位卡、状态视图、简历预览
src/views/         业务页面
src/styles.css     响应式原生 CSS
public/images/    复用仓库已有首页插画
tests/             请求层回归测试与独立浏览器测试夹具
docs/API.md        请求/响应字段、方法、权限和网关注意事项
deploy/            Nginx 部署示例
```

## 后端联调前提

完整接口对照见 [docs/API.md](docs/API.md)。配套后端公开仓库已提供本地基础路由与匿名白名单，仍需在实际部署环境确认 `/api/user` 保留前缀，其他服务按约定剥除两段前缀，并补齐精确的匿名入口。

当前交付验证环境没有运行 `localhost:10086` 网关，真实后端的注册、登录、投递、审核和聊天持久化尚未端到端验证。安装、构建、请求层测试和浏览器验证分别记录在 `docs/VERIFICATION.md`。测试夹具通过不能代替真实服务联调。

后端没有独立企业库、收藏、附件上传、面试接受/改期等接口，对应功能未虚构实现；公司目录由公开职位按企业聚合而成，不虚构企业简介、规模或认证信息。校园招聘入口复用职位搜索的 `jobType=实习` 筛选。企业编辑非招聘中职位时须确认薪资月数，因为列表不返回该字段且更新接口缺省会覆盖为12。管理员投递详情不越权读取仅投递双方可见的完整简历。

## 独立浏览器测试

```sh
npm run build
node tests/fixture-server.js
```

仅在本机 http://localhost:4174 提供静态产物与内存测试数据。测试账号 `seeker`、`employer`、`admin`，密码均为 `test123`；所有账号及职位均为虚构测试记录。服务退出即丢弃数据。该工具不在生产依赖链中，也不会连接真实后端。日常使用请运行 `npm run dev`，不要使用测试端口。

代码格式：`npx prettier --write src tests vite.config.js`。

## Docker 容器化部署

采用 Node.js 多阶段构建生成 `dist/`，由 Nginx 提供静态资源、History 路由回退和同源 `/api` 代理。三个角色共用一个前端容器，登录后根据权限进入对应工作台。聊天使用 REST 和增量轮询。

完整 Compose、数据库初始化和中间件说明见[后端容器部署文档](https://github.com/liuruibo07-creator/hire-backend/blob/main/docs/DEPLOYMENT.md)。两个仓库必须放在同级目录：

```sh
git clone https://github.com/liuruibo07-creator/hire-backend.git
git clone https://github.com/liuruibo07-creator/hire-frontend.git
cd hire-backend
cp .env.example .env
# 编辑 .env，设置独立的数据库、Redis、RabbitMQ 密码及 JWT 密钥
docker compose up -d --build
```

默认入口为 `http://localhost:8080`。Nginx 的 `cloud-gateway:10086` 是 Compose 服务名，不能直接改为容器内的 localhost。如独立部署前端，需让 Nginx 与网关处于可互通的网络并调整代理地址。`VITE_API_BASE_URL` 是构建期变量，修改后需要重建镜像。

容器方案尚未在此交付环境启动验证；真实注册、投递、审核等业务需在部署环境完成联调。
