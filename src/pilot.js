import { angleDiff, clamp, distance } from "./math.js";
// Verification driver: produces normal steering/throttle inputs; never teleports the car.
export class RoutePilot {
  constructor(world) {
    this.world = world;
    this.progress = 0;
  }
  input(car) {
    const world = this.world,
      start = Math.max(0, this.progress - 6),
      end = Math.min(world.routeLength, this.progress + 45);
    let nearest = Infinity,
      best = this.progress;
    for (let s = start; s <= end; s += 0.8) {
      const d = distance(world.pointAt(s), car);
      if (d < nearest) {
        nearest = d;
        best = s;
      }
    }
    this.progress = best;
    const look = 7 + car.speed * 0.34,
      p = world.pointAt(Math.min(world.routeLength, this.progress + look)),
      angle = angleDiff(Math.atan2(p.x - car.x, -(p.z - car.z)), car.yaw),
      curvature = (2 * Math.sin(angle)) / look,
      steer = clamp(
        Math.atan((curvature * 2.65) / 0.77) / (0.56 / (1 + car.speed * 0.075)),
        -1,
        1,
      );
    const future = world.pointAt(
        Math.min(world.routeLength, this.progress + 30),
      ),
      corner = Math.abs(angleDiff(future.yaw, car.yaw)),
      target = clamp(34 - corner * 23, 11, 34);
    return {
      steer,
      throttle: car.speed < target,
      brake: car.speed > target + 1.2,
    };
  }
}
