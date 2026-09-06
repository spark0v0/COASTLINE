# 资源与依赖记录

## 游戏内容

车辆、建筑、道路、地形、树木、灯塔、码头、标识、海水、噪声纹理、接触阴影、粒子和音效均由当前项目代码生成。

- 没有下载外部模型、图片、HDR 环境贴图、音乐或音效文件。
- 没有使用游戏品牌、汽车厂商品牌、商标或真实车型资产。
- 字体使用操作系统已有字体，不分发字体文件。
- RoomEnvironment 来自 Three.js 的官方 addons，在内存中生成反射环境，不下载 HDR 文件。

## 运行时依赖

| 依赖 | 固定版本 | 用途 | 许可 | 来源 |
| --- | --- | --- | --- | --- |
| Three.js | 0.185.1 | 渲染、材质、光影、环境贴图与几何工具 | MIT | https://github.com/mrdoob/three.js |

Three.js 的 MIT 许可文本保留于 `public/licenses/THREE-LICENSE.txt`，构建时复制到 `dist/licenses/`，代码压缩保留许可注释。

## 构建依赖

Vite 8.2.2 用于开发服务器和生产构建，使用 MIT 许可，来源 https://github.com/vitejs/vite 。Vite 与安装到项目中的完整依赖版本记录在 `package-lock.json` 中；各包许可位于对应包目录，Vite 汇总第三方许可保留于 `public/licenses/VITE-LICENSE.md`。

Prettier 3.9.6 仅用于源码格式化，使用 MIT 许可，来源 https://github.com/prettier/prettier 。它不会进入游戏运行时代码。

安装使用官方 npm 仓库 `https://registry.npmjs.org`，缓存指定为项目内 `.npm-cache/`。没有安装系统软件、全局依赖或浏览器扩展。

本文件记录第三方许可，不自动为项目所有原创代码决定对外开源许可证。发布 GitHub 前，可根据你的授权意愿为原创部分选择许可证。
