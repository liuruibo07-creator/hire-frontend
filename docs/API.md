# 后端接口对照

核对来源：`hire` 项目各服务 Controller、DTO、VO、Service、Mapper，以及网关过滤器。前端只调用对外接口，不调用 Feign 内部接口。以下路径均为浏览器访问的网关路径。

## 通用约定

- 响应为 `{code: 200, message: string, data: ...}`；分页为 `{total, list}`，投递分页额外包含 `page,size`。失败码包括 400/401/403/404/409/500。
- 旧 `com.hire.common.Result` 中 `code=1` 是内部兼容协议，不视为前端接口成功。
- 登录响应 `data={token,userId,username,role,realName}`。随后 `GET /me` 获取服务端当前身份。角色为 `seeker/employer/admin`。
- 认证头 `Authorization: Bearer <token>`，token 保存在当前标签页 sessionStorage。前端不发送 `userId/role/X-User-Id` 身份头。
- 大于 JS 安全整数范围的 JSON 数字经 `json-bigint` 保留为字符串；聊天 ID 本来就是字符串。路径和请求 JSON 不进行 `Number(id)` 转换。
- 空字符串筛选项省略，数字 `0` 保留。请求超时为 15 秒。401 清除已登录会话，受保护页面返回登录页；登录接口的 401 只展示登录失败。
- 所有错误统一提示；读取页面另外提供错误状态与重试。没有生产演示数据、自动猜测路径或失败时伪造成功。

## 用户服务

| 方法 | 路径 | 请求 | data | 权限 |
| --- | --- | --- | --- | --- |
| POST | `/api/user/users/register` | username,password,email,phone?,role,realName? | 用户 ID | 公开，role 仅 seeker/employer |
| POST | `/api/user/users/login` | username,password | 登录对象 | 公开，需部署环境放行 |
| GET | `/api/user/users/me` | 无 | id,username,realName,role,status,avatar,email,phone,lastLoginTime,createTime | 登录 |
| PUT | `/api/user/users/me` | realName,email,phone,avatar | null | 登录 |
| PUT | `/api/user/users/me/password` | oldPassword,newPassword | null | 登录 |
| GET | `/api/user/users/{id}/info` | 路径 id | 用户基础信息 | 按后端权限；已封装，界面不批量枚举 |
| GET | `/api/user/admin/users` | page,size,role?,status?,keyword? | 分页用户 | admin |
| GET | `/api/user/admin/users/{id}` | 路径 id | 用户详情（含联系方式及时间） | admin |
| PUT | `/api/user/admin/users/{id}/status` | status: 0禁用/1启用 | id,status | admin |
| GET | `/api/user/admin/statistics` | days: 7/30/90 | overview,dailyTrend | admin |

注册用户名 3-50 字符、密码 6-20 字符、邮箱不超过 100 字符、姓名不超过 50、电话不超过 20、头像 URL 不超过 500。统计 `overview` 字段为 `registeredUserTotal,enterpriseTotal,jobTotal,applicationTotal`；`dailyTrend` 每项为 `date,newRegisteredUsers,newEnterprises,newJobs,newApplications`。

## 职位服务

| 方法 | 路径 | 请求 | data | 权限 |
| --- | --- | --- | --- | --- |
| GET | `/api/job/categories` | 无 | 树数组 id,parentId,name,sortOrder,level,children | 公开 |
| GET | `/api/job/jobs/search` | keyword?,jobType?,city?,categoryId?,industry?,experienceReq?,educationReq?,salaryMin?,salaryMax?,sort?,page,size | 分页 JobSearchItem | 公开，需网关放行 |
| GET | `/api/job/jobs/{id}` | id | JobDetail | 招聘中职位；需网关放行 |
| POST | `/api/job/jobs` | JobSave | 职位 ID | employer |
| PUT | `/api/job/jobs/{id}` | JobSave | null | 所属 employer |
| GET | `/api/job/jobs/my` | page,size,status?,keyword? | 分页 JobVO | employer |
| PUT | `/api/job/jobs/{id}/status` | status: 0下架/1申请上架 | null | 所属 employer |
| GET | `/api/job/admin/jobs` | page,size,status?,city?,employerId?,keyword? | 分页 JobVO | admin |
| GET | `/api/job/admin/jobs/{id}` | id | JobDetail（全部状态） | admin |
| PUT | `/api/job/admin/jobs/{id}/offline` | 无 | null | admin |
| PUT | `/api/job/admin/jobs/{id}/review` | decision: approve/reject,remark? | id,status,reviewRemark,reviewedBy,reviewedAt | admin |

JobSave：`title,categoryId,description,jobType,industry,city,address,experienceReq,educationReq,salaryMin,salaryMax,salaryMonths,skills,headcount`。title、jobType、city 必填；薪资单位 K，skills 为逗号分隔文本；jobType 为全职/兼职/实习/合同制。

JobSearchItem：`id,title,employerName,categoryName,city,salaryMin,salaryMax,jobType,experienceReq,educationReq,skills,createTime,highlight`。高亮内容不直接注入 HTML，避免 XSS。

JobVO：上述业务字段及 `employerId,categoryId,description,industry,headcount,status,viewCount,applyCount`，不含 address 和 salaryMonths。JobDetail 才有 `address,salaryMonths,reviewRemark,updateTime`。

职位状态：0企业下架、1招聘中、2平台下架、3待审核、4审核拒绝。只有1可下架，0/4可申请上架，2不可编辑，3可审核。拒绝必须有审核意见（最多500字）。企业编辑招聘中/拒绝/待审核职位后重新进入待审核；下架职位编辑后保持下架。

**后端字段限制**：企业没有可读取全部状态完整详情的接口。对非招聘中职位，编辑表单保持 address 为 undefined（Mapper 忽略 null 地址），但必须重新确认 salaryMonths，因为 Service 缺省会写入12。不能声称空薪资月数可保持原值。

## 简历与投递

路径公共前缀 `/api/application`。

| 方法 | 后续路径 | 请求 | data | 权限 |
| --- | --- | --- | --- | --- |
| POST | `/resumes` | ResumeDTO | null | seeker |
| PUT | `/resumes/{id}` | ResumeDTO（不发送归属字段） | null | 本人 seeker |
| GET | `/resumes/my` | 无 | Resume[] | seeker |
| GET | `/resumes/default` | 无 | Resume/null | seeker |
| GET | `/resumes/{id}` | id | Resume | 本人 seeker |
| DELETE | `/resumes/{id}` | id | null | 本人 seeker |
| PUT | `/resumes/{id}/default` | 无 | null | 本人 seeker |
| POST | `/applications` | jobId,resumeId,coverLetter? | 投递 ID | seeker |
| GET | `/applications/my` | page,size,status? | 分页 MyApplication | seeker |
| GET | `/applications/received` | page,size,jobId?,status? | 分页 ReceivedApplication | employer |
| GET | `/applications/{id}` | id | ApplicationDetail | 投递人或所属企业；不对 admin 开放 |
| PUT | `/applications/{id}/status` | status:1..4,remark? | null | 所属 employer |
| GET | `/admin/applications` | page,size,jobId?,employerId?,userId?,status?,startDate?,endDate? | 分页 AdminApplication | admin |
| GET | `/admin/jobs/{jobId}/statistics` | jobId | jobId,jobTitle,applicationTotal,pendingCount,viewedCount,interviewCount,offeredCount,rejectedCount | admin |

ResumeDTO 可编辑字段：`title,name,gender,birthYear,phone,email,education,university,major,graduationDate,workExperience,skills,expectedPosition,expectedSalary,expectedCity,selfEvaluation`。gender 为0女、1男，日期按 `YYYY-MM-DD`；不发送 userId/deleted。Resume 响应额外含 id,userId,isDefault,deleted，没有 createTime/updateTime。默认简历使用专用接口，更新简历接口忽略 isDefault。

MyApplication：`id,jobId,jobTitle,jobCity,resumeId,resumeTitle,status,coverLetter,createTime`。ReceivedApplication 增加 `applicantId,applicantName,resume`；详情增加 remark。AdminApplication 包含 `userId,employerId,applicantName,remark`，不带完整 resume，因此管理端只展示列表提供的信息，不调用受限详情。

投递状态：0待处理、1已查看、2面试邀请、3已录用、4已拒绝。日期筛选为 `YYYY-MM-DD`。同一用户同一职位唯一投递，重复错误直接展示。SQL 限制 coverLetter 最长1000、remark 最长500。

## 通知与聊天

| 方法 | 路径 | 请求 | data |
| --- | --- | --- | --- |
| GET | `/api/notification/notifications` | page,size,type?,isRead? | 分页 Notification |
| GET | `/api/notification/notifications/unread-count` | 无 | 整数 |
| PUT | `/api/notification/notifications/{id}/read` | 无 | null |
| PUT | `/api/notification/notifications/read-all` | 无 | null |
| POST | `/api/chat/conversations` | seeker仅jobId；employer仅applicationId | ChatConversation |
| GET | `/api/chat/conversations` | page,size | total,list |
| GET | `/api/chat/conversations/{id}/messages` | beforeId或afterId（互斥）,size | list,hasMore,nextBeforeId,nextAfterId |
| POST | `/api/chat/conversations/{id}/messages` | content（非空、最多2000字） | ChatMessage |
| PUT | `/api/chat/conversations/{id}/read` | throughMessageId | userId,throughMessageId |
| GET | `/api/chat/unread-count` | 无 | 整数 |

通知仅登录本人可读写。Notification 展示字段：id,title,content,type,isRead,createTime。聊天仅 seeker/employer 会话成员有权访问，admin 不提供聊天入口。

ChatConversation：`id,jobId,seekerId,employerId,jobTitle,lastMessageId,seekerReadId,employerReadId,createTime,updateTime,lastMessageContent,unreadCount`。
ChatMessage：`id,conversationId,senderId,content,createTime`。
聊天采用真实 REST 游标增量轮询（5秒）；切换会话防止旧响应覆盖新会话；离开页面停止轮询；后台标签页暂停；历史分页、失败后重试、发送后标读均使用上述接口。后端存在 WebSocket，本版没有启用它。

## 网关部署前提

`cloud-gateway` 本地端口为10086，路由从 Nacos 的 `gateway-routes.json` 获取，该配置不在仓库中。`/api/job/**`、`/api/application/**`、`/api/notification/**`、`/api/chat/**` 按 Controller 注释应 StripPrefix=2；用户 Controller 自带 `/api/user`，用户路由不可剥除该前缀。

本地 application.yml 白名单只有旧 `/jobs/search`、`/jobs/{id}`、`/user/**`，以及新注册和类别路径。部署时必须精确补齐 POST `/api/user/users/login`、GET `/api/job/jobs/search`、GET `/api/job/jobs/{数字id}` 匿名访问，避免将 `/api/job/jobs/my` 误放行。这里记录的是部署前提，不代替已经核实在线 Nacos 路由。前端没有修改后端源代码。

## 参考图与后端边界

没有独立企业目录/企业主页、收藏、上传文件、独立面试日历或公开平台统计接口。没有虚构对应 API 或伪造企业规模、头像、知名企业合作及平台总数。前端公司目录由公开职位按企业聚合，不虚构企业资料；校园招聘入口 `/campus` 重定向到职位搜索并携带 `jobType=实习`；面试进度通过投递状态展示；企业信息以职位接口实际返回字段为准。首页以真实职位和服务入口替代缺乏数据来源的企业品牌墙与统计数字。
