// COASTLINE island coordinates are metres. Artwork and routes share this data.
export const ISLAND_SCALE = 3.35;
export const ISLAND_CENTER = { x: -50 * ISLAND_SCALE, z: 0 };
export const ISLAND_BOUNDS = {
  minX: -1230,
  maxX: 880,
  minZ: -1300,
  maxZ: 1310,
};
export const ROUTE_NODES = [
  [-60, 206],
  [-60, 110],
  [-60, -25],
  [-66, -114],
  [-109, -160],
  [-171, -182],
  [-224, -226],
  [-207, -283],
  [-169, -298],
  [-140, -271],
  [-110, -302],
  [-82, -242],
  [-29, -278],
  [40, -303],
  [113, -273],
  [157, -211],
  [182, -123],
  [192, -20],
  [192, 102],
  [174, 210],
  [118, 257],
  [27, 258],
  [-60, 230],
].map(([x, z]) => ({ x: x * ISLAND_SCALE, z: z * ISLAND_SCALE }));
export const REGIONS = [
  { name: "棕榈港老城", x: -190, z: 490, color: "#e9bc91" },
  { name: "晴湾海岸", x: 655, z: 325, color: "#74c5bd" },
  { name: "松岭山道", x: -610, z: -750, color: "#7a9172" },
  { name: "橄榄谷地", x: -715, z: -60, color: "#b7be85" },
  { name: "北岬海崖", x: 335, z: -900, color: "#a8bdb3" },
];
export const RACE_DEFINITIONS = [
  {
    id: "coast",
    name: "晴湾海岸冲刺",
    subtitle: "海崖起跑 · 长弯与海风",
    from: 0.63,
    to: 0.97,
    count: 14,
  },
  {
    id: "ridge",
    name: "松岭爬山挑战",
    subtitle: "穿越山脊 · 连续弯与高差",
    from: 0.13,
    to: 0.61,
    count: 20,
  },
  {
    id: "island",
    name: "晴湾环岛长赛",
    subtitle: "五片风景 · 完整环岛",
    from: 0,
    to: 1,
    count: 36,
  },
];
