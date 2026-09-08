# 资源与依赖记录

## 2026-09-08 模型改造

现代建筑套件（src/scenery/architecture.js）、跑车曲面与轮拱（src/vehicle-geometry.js）、植物分枝和树冠均为本项目代码构造，未新增外部模型、贴图、音频或依赖。RoundedBoxGeometry 来自已安装的 Three.js addons，沿用下方 Three.js MIT 许可。已有 CC0 表面贴图继续本地复用。

## 地表与景观修订

地形分层着色器、草叶、薰衣草、灌木布局和室外反射均由项目代码生成；石与沙继续复用既有 CC0 贴图，未增加下载或项目依赖。草地不再把航拍照片叠乘到整片地面。

## 沿路生活场景与模型更新

新增的自行车、桌椅、遮阳伞、冲浪板、公交候车亭、市集、商亭、补给设施和帆船均由本项目代码制作，未下载外部资产，也未新增依赖。招牌通过 Canvas 绘制。所用 CapsuleGeometry、LatheGeometry、TorusGeometry 等来自已列出的 Three.js MIT 依赖。布局和模型分别位于 src/resort-places.js 与 src/scenery/resort-*.js、marina-models.js。

## 镜湖公园与庭院

湖岸、湖盆、湖水着色器、喷泉曲线与水滴着色器、环湖栈道、观景亭、芦苇睡莲和庭院均为项目代码生成。沿用本地 CC0 表面贴图与 Three.js MIT 依赖；本次没有下载或安装任何新增素材、依赖。

## 游戏内容

车辆、建筑、道路、地形、树木、灯塔、码头、标识、海水、接触阴影、粒子和音效由当前项目代码生成。

- 表面贴图采用 Poly Haven 的 CC0（公有领域）照片纹理，随项目分发、运行时从本地 `assets/` 加载，无任何在线请求（见下表）。
- 瓦顶、木材纹理与所有几何模型（建筑套件、羽状棕榈、松树、橄榄树、灯塔、帆船、教堂、拱门、观景台）由 `src/art-materials.js`、`src/island-scene.js` 程序化构建。
- 没有使用游戏品牌、汽车厂商品牌、商标或真实车型资产。
- 字体使用操作系统已有字体，不分发字体文件。
- 当前环境反射由 src/outdoor-environment.js 的项目原创天空/地面着色器在内存中生成，不下载 HDR 文件；旧版 RoomEnvironment 已替换。

## 表面贴图（Poly Haven，CC0）

| 项目内文件 | 资产 | 来源 | 许可证 | 处理 |
| --- | --- | --- | --- | --- |
| `public/assets/surfaces/asphalt_02_diff_1k.jpg` | asphalt_02 | https://polyhaven.com/a/asphalt_02 | CC0 | 原样使用 |
| `public/assets/surfaces/asphalt_02_nor_gl_1k.jpg` | asphalt_02 | https://polyhaven.com/a/asphalt_02 | CC0 | 原样使用（预留，当前管线未引用） |
| `public/assets/surfaces/asphalt_02_rough_1k.jpg` | asphalt_02 | https://polyhaven.com/a/asphalt_02 | CC0 | 原样使用 |
| `public/assets/surfaces/aerial_rocks_02_diff_1k.jpg` | aerial_rocks_02 | https://polyhaven.com/a/aerial_rocks_02 | CC0 | 原样使用 |
| `public/assets/surfaces/clay_plaster_diff_1k.jpg` | clay_plaster | https://polyhaven.com/a/clay_plaster | CC0 | 原样使用 |
| `public/assets/surfaces/aerial_grass_rock_diff_1k.jpg` | aerial_grass_rock | https://polyhaven.com/a/aerial_grass_rock | CC0 | 本轮新增下载 |
| `public/assets/surfaces/aerial_beach_01_diff_1k.jpg` | aerial_beach_01 | https://polyhaven.com/a/aerial_beach_01 | CC0 | 本轮新增下载 |

Poly Haven 许可证说明：https://polyhaven.com/license （CC0：允许任意用途含商业项目与再分发，无需署名）。

## 运行时依赖

| 依赖 | 固定版本 | 用途 | 许可 | 来源 |
| --- | --- | --- | --- | --- |
| Three.js | 0.185.1 | 渲染、材质、光影、环境贴图与几何工具 | MIT | https://github.com/mrdoob/three.js |

Three.js 的 MIT 许可文本保留于 `public/licenses/THREE-LICENSE.txt`，构建时复制到 `dist/licenses/`，代码压缩保留许可注释。

## 构建依赖

Vite 8.2.2 用于开发服务器和生产构建，使用 MIT 许可，来源 https://github.com/vitejs/vite 。Vite 与安装到项目中的完整依赖版本记录在 `package-lock.json` 中；各包许可位于对应包目录，Vite 汇总第三方许可保留于 `public/licenses/VITE-LICENSE.md`。

Prettier 3.9.6 仅用于源码格式化，使用 MIT 许可，来源 https://github.com/prettier/prettier 。它不会进入游戏运行时代码。

安装使用官方 npm 仓库 `https://registry.npmjs.org`，缓存指定为项目内 `.npm-cache/`。没有安装系统软件、全局依赖或浏览器扩展。

## 别墅庭院与连续街景

本轮新增的入口门柱、信箱、收起的格栅门、泳池、扶梯、躺椅、沙发、烧烤台、廊架、曲面花盆、弯曲叶片、花摊和步道均由项目代码构建，水纹着色器由项目代码实现。没有下载新模型、纹理或声音，没有新增第三方依赖。模型复用上述既有材质与 Three.js 几何工具；涉及的第三方许可仍按本文件原有记录。

本文件记录第三方许可，不自动为项目所有原创代码决定对外开源许可证。发布 GitHub 前，可根据你的授权意愿为原创部分选择许可证。

## 住宅主体与渲染品质修订

道路外景观扩充：网球场、围网纹理、柑橘园、园艺种植箱、工作棚和双环雕塑均由项目内代码制作，入口文件为 src/scenery/open-spaces.js。围网通过 Canvas 本地生成，其他材质复用本记录已有资源；没有新增下载、第三方模型或依赖。

新增的三类住宅主体、叶簇树冠、W 形护栏、接触暗部贴图、统一日照配置与微表面法线代码均在项目内制作。复用已记录的 Poly Haven 贴图与 Three.js 几何工具，没有新增下载或依赖。相关源码分别位于 src/scenery/villa-models.js、tree-crowns.js、contact-shadows.js、roads.js，以及 src/daylight.js、surface-detail.js。
