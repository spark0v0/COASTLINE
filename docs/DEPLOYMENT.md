# 静态部署与本地启动

## 已有生产构建

本次本地交付的 dist 是生产版本，资源均位于构建内部。双击项目根目录的“启动游戏.cmd”，或在根目录运行 npm start。该启动器仅监听 127.0.0.1:8765，不是后台服务；关闭启动窗口即停止。

端口占用时可运行：

```sh
node scripts/serve.mjs --port=8766
```

## 从源码构建

使用 Node.js 24 和项目的 package-lock.json：

```sh
npm ci
npm run build
```

Vite 配置采用 base: "./"。将 dist **里面的内容**复制到网站根目录或子目录（例如 /COASTLINE/）。保留原目录结构，包括 assets/vehicles、assets/environment、assets/surfaces 和 licenses。

静态服务器应返回正确的 JavaScript MIME 类型；.glb 可以为 model/gltf-binary，.hdr 可以为 application/octet-stream。服务器须允许读取这两类文件，不能把缺失资源请求统一替换成 index.html。

不需要数据库、服务端游戏逻辑、素材 CDN 或 API 密钥。使用普通 HTTP/HTTPS 服务，不要通过 file:// 打开。

## GitHub 与服务器

提交源码、public 中的资源以及许可证。node_modules、dist、.tmp 已忽略；从仓库重新构建即可得到生产版。现有 Actions 在 CI 成功后提供名为 dist 的构建产物，本轮未轮询其结果。

若使用 GitHub Pages，可另行配置构建工作流或手动发布 dist 内容；当前 CI 的 artifact 上传不等于已部署 Pages。本轮仅推送仓库，不自动创建网站或部署服务器。

## 首次加载与缓存

主车 GLB 约 9.42 MB，日光 HDR 约 1.64 MB，另有已有地表贴图和代码。等待“海风正在路上”加载屏结束后开始驾驶。资源失败时提示备用车或基础日光；若整个场景失败则显示错误信息。

HTML 应允许重新验证缓存。车辆和 HDR 使用稳定文件名，替换素材时请让服务器更新它们的缓存，避免玩家使用旧资源。不得删掉 licenses 文件夹；主车 CC BY 4.0 需要署名与修改声明。

## 存档与清理

存档按浏览器和网站来源保存：从本机地址换到正式域名不会自动迁移纪录。未改动已有存档键。浏览器站点数据清理会删除纪录和设置。

本地测试启动器关闭即停止，无计划任务、开机启动项或全局依赖。清理 dist、node_modules、.tmp 的方法见 README。

