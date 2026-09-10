# 资源与依赖记录

## 2026-09-10 环境美术收尾

本轮没有下载新素材、安装依赖或替换主车。新增 512×512 枝叶遮罩由 Canvas 代码绘制；砌石墙纹理、树冠与灌木的分层几何、维护草坪遮罩和种植床渐变均由项目代码生成。

主要实现位于 src/scenery/forest-assets.js、tree-crowns.js、src/art-materials.js、src/landscape-material.js。遮罩与材质在运行时复用，远景保留冠层范围，仅简化内部几何。主车 CC BY 4.0、HDR 与地表 CC0 资源继续按下方记录署名。构建内的完整署名入口为 licenses/COASTLINE-CREDITS.txt。

## 当前试玩候选版：2026-09-09 主车与日光资源

当前主车使用第三方模型，日光反射使用第三方 HDR。下方早期“没有下载模型/贴图”的文字为历史记录，不描述本版本的完整资源状态。

| 本地资源 | 作者与来源 | 许可证 | 修改方式 |
| --- | --- | --- | --- |
| public/assets/vehicles/coast-gt.glb | Car Concept，© 2024 Darmstadt Graphics Group GmbH；模型与贴图 Eric Chadwick。[源项目](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/CarConcept) | CC BY 4.0；原始底模来自 Unity Fan 的 CC0 模型，但本次分发的衍生资源按 CC BY 4.0 署名 | 移除隐藏内饰、发动机/车轴、未使用变体；裁剪无引用数据；移除牌照/胎侧标志贴图；调整银蓝车漆、简化深色玻璃；前轮姿态归正，接入游戏转向/车轮/卡钳/灯光动画 |
| public/assets/environment/coast-daylight.hdr | [Kloofendal 48d Partly Cloudy](https://polyhaven.com/a/kloofendal_48d_partly_cloudy)，Greg Zaal / Poly Haven | CC0 1.0 | 1K HDR 原样随项目提供；运行时 PMREM 预过滤用于环境光与反射 |

车辆文件约 9.42 MB，HDR 约 1.64 MB。没有新增依赖、系统安装或运行时素材外链。

主车原始下载 SHA-256：c272098089d78c5cd9fd9f24ff50ee8acf8d932c55f2d55fc10adb6c8998966b。
制作脚本：scripts/prepare-car.mjs；用原始 GLB 作为输入可重新生成修改版。模型内保留原作者信息与处理声明。完整 CC BY 4.0 许可位于 public/licenses/CAR-CC-BY-4.0.txt，原来源说明位于 CAR-CONCEPT-SOURCE.md。

公开分享必须保留 public/licenses/COASTLINE-CREDITS.txt（构建后在 dist/licenses），其中包含作者、来源、许可链接和修改说明；游戏主菜单提供署名入口。移除来源标志不表示模型变为无署名资源，也不表示原作者背书本游戏。

本轮住宅、树木、龙舌兰、庭院布局和共享几何由项目代码制作；沿用现有 CC0 表面材质。没有新增外部声音素材。第三方资源许可不会自动为项目全部代码授予同一许可。

## 历史记录

## 2026-09-09 晴湾曲线路线与跑车曲面

本轮新增的连续跑车座舱、车身改型、坡屋顶、沿岸岩体布局、外海石灰岩小岛与观景支路均为项目内原创代码构造，未引入第三方车型、模型、声音、贴图或依赖。材质继续使用下列已有本地 CC0 表面资源，曲面与实例化依赖既有 Three.js MIT 组件。没有运行时外部资源请求。实际交付与限制见 `docs/COASTAL-DRIVE.md`。

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

自然布局修订（2026-09-09）：新增 ground-patches、scenic-gardens、scenic-route 模块由项目内代码制作，复用既有纹理与几何。真实画面 scenic-route-2026-09-09.jpg 为本项目本地浏览器截图，没有使用生成图片或外部照片替代游戏画面；未新增资源下载或第三方依赖。

道路外景观扩充：网球场、围网纹理、柑橘园、园艺种植箱、工作棚和双环雕塑均由项目内代码制作，入口文件为 src/scenery/open-spaces.js。围网通过 Canvas 本地生成，其他材质复用本记录已有资源；没有新增下载、第三方模型或依赖。

新增的三类住宅主体、叶簇树冠、W 形护栏、接触暗部贴图、统一日照配置与微表面法线代码均在项目内制作。复用已记录的 Poly Haven 贴图与 Three.js 几何工具，没有新增下载或依赖。相关源码分别位于 src/scenery/villa-models.js、tree-crowns.js、contact-shadows.js、roads.js，以及 src/daylight.js、surface-detail.js。
