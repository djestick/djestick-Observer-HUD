import { Player, Side, WeaponRaw } from "csgogsi-socket";
import maps, { ScaleConfig } from "./maps";
import {
  ExtendedGrenade,
  RadarGrenadeObject,
  RadarPlayerObject,
} from "./interface";
import type { InfernoGrenade as CSGOInfernoGrenade } from "csgogsi";
import config from "./config";

export const playersStates: Player[][] = [];
export const grenadesStates: ExtendedGrenade[][] = [];
const directions: { [key: string]: number } = {};

export const explosionPlaces: Record<string, number[]> = {};

type ShootingState = {
    ammo: number,
    weapon: string,
    lastShoot: number
}
let shootingState: Record<string, ShootingState> = {};

const toArray = <T>(value: T[] | Record<string, T> | undefined): T[] =>
  Array.isArray(value) ? value : Object.values(value || {});

type RadarWeapon = WeaponRaw & { id?: string };

type BasicPosition = number[];
type RawPosition = BasicPosition | string | { x: number; y: number; z?: number } | undefined | null;

const isValidNumber = (value: unknown): value is number =>
  typeof value === "number" && !Number.isNaN(value);

export const normalizePosition = (candidate: RawPosition): BasicPosition | null => {
  if (candidate === undefined || candidate === null) return null;
  if (Array.isArray(candidate)) {
    const numbers = candidate.map(Number);
    if (numbers.length < 2) return null;
    if (!numbers.slice(0, 2).every(isValidNumber)) return null;
    return numbers;
  }
  if (typeof candidate === "object") {
    const { x, y, z } = candidate;
    if (!isValidNumber(x) || !isValidNumber(y)) return null;
    const result: BasicPosition = [x, y];
    if (isValidNumber(z)) {
      result.push(z);
    }
    return result;
  }
  if (typeof candidate === "string") {
    const numbers = candidate
      .split(",")
      .map((part) => Number(part.trim()));
    if (numbers.length < 2) return null;
    if (!numbers.slice(0, 2).every(isValidNumber)) return null;
    return numbers;
  }
  return null;
};

const safeHeight = (position: RawPosition): number => {
  const normalized = normalizePosition(position);
  if (!normalized || normalized.length < 3) return 0;
  const height = normalized[2];
  return isValidNumber(height) ? height : 0;
};

const calculateDirection = (player: Player) => {
    if (directions[player.steamid] && !player.state.health) return directions[player.steamid];

    const [forwardV1, forwardV2] = player.forward;
    let direction = 0;

    const [axisA, axisB] = [Math.asin(forwardV1), Math.acos(forwardV2)].map(axis => axis * 180 / Math.PI);

    if (axisB < 45) {
        direction = Math.abs(axisA);
    } else if (axisB > 135) {
        direction = 180 - Math.abs(axisA);
    } else {
        direction = axisB;
    }

    if (axisA < 0) {
        direction = -(direction -= 360);
    }

    if (!directions[player.steamid]) {
        directions[player.steamid] = direction;
    }

    const previous = directions[player.steamid];

    let modifier = previous;
    modifier -= 360 * Math.floor(previous / 360);
    modifier = -(modifier -= direction);

    if (Math.abs(modifier) > 180) {
        modifier -= 360 * Math.abs(modifier) / modifier;
    }
    directions[player.steamid] += modifier;

    return directions[player.steamid];
}

export const round = (n: number) => {
    const r = 0.02;
    return Math.round(n / r) * r;
}

export const parsePosition = (position: RawPosition, config: ScaleConfig, size = 0) => {
    const normalized = normalizePosition(position);
    if (!normalized) return null;
    const [x, y] = normalized;
    const left = config.origin.x + (x * config.pxPerUX) - size / 2;
    const top = config.origin.y + (y * config.pxPerUY) - size / 2;

    return [round(left), round(top)];
}

export const parsePlayerPosition = ({ player, mapConfig, scale }: { player: Player; mapConfig: ScaleConfig; scale: number; }) => {
    const playerData = playersStates.slice(0, 5).map(players => players.filter(pl => pl.steamid === player.steamid)[0]).filter(pl => !!pl);
    const size = config.playerSize * scale;
    const positions = playerData.length === 0
        ? []
        : playerData
            .map(playerEntry => parsePosition(playerEntry.position, mapConfig, size))
            .filter((entry): entry is number[] => entry !== null);

    let x = 0;
    let y = 0;
    const dataSource = positions.length > 0 ? positions : (() => {
        const fallback = parsePosition(player.position, mapConfig, size);
        return fallback ? [fallback] : [];
    })();

    const entryAmount = dataSource.length || 1;
    for (const position of dataSource.length ? dataSource : [[0, 0]]) {
        x += position[0];
        y += position[1];
    }

    const degree = calculateDirection(player);
    return [x / entryAmount, y / entryAmount, degree];
}


const parseGrenadePosition = (grenade: ExtendedGrenade, config: ScaleConfig) => {
    const size = grenade.type === "smoke" ? 60 : 30;
    if(grenade.id in explosionPlaces) return parsePosition(explosionPlaces[grenade.id], config, size);
    const grenadeData = grenadesStates.slice(0, 5).map(grenades => grenades.filter(gr => gr.id === grenade.id)[0]).filter(pl => !!pl);
    if (grenadeData.length === 0) {
        if (!("position" in grenade)) return null;
        return parsePosition(grenade.position, config, size);
    }
    const positions = grenadeData
        .map(grenadeEntry => ("position" in grenadeEntry ? parsePosition(grenadeEntry.position, config, size) : null))
        .filter((posData): posData is number[] => posData !== null);
    if (positions.length === 0) return null;
    const entryAmount = positions.length;
    let x = 0;
    let y = 0;
    for (const position of positions) {
        x += position[0];
        y += position[1];
    }

    return [x / entryAmount, y / entryAmount];
}

export const EXPLODE_TIME_FRAG = 1.6;
export const EXPLODE_TIME_FLASH = 1.45;

export const extendGrenade = ({grenade, mapName, side }: { side: Side | null, grenade: ExtendedGrenade, mapName: string}) => {
   // const owner = this.props.players.find(player => player.steamid === grenade.owner);
    const extGrenade: ExtendedGrenade = {
        ...grenade,
        side:/* owner?.team.side ||*/ side
    }
    const map = maps[mapName];
    if (extGrenade.type === "inferno") {
        const mapFlame = (key: string, flame: CSGOInfernoGrenade["flames"][number] | string | { position?: RawPosition; id?: string } | undefined, index: number) => {
            if (!flame) return null;
            const rawPosition =
                typeof flame === "string"
                    ? flame
                    : "position" in flame
                    ? flame.position
                    : flame;
            const flamePosition = normalizePosition(rawPosition as RawPosition);
            if (!flamePosition) {
                return null;
            }
            const height = safeHeight(rawPosition as RawPosition);
            const baseId = typeof flame === "object" && flame && "id" in flame && flame.id
                ? `${flame.id}_${extGrenade.id}`
                : `${extGrenade.id}_flame_${key || index}`;
            if ("config" in map) {
                const position = parsePosition(flamePosition, map.config, 12);
                if (!position) return null;
                return ({
                    position,
                    id: baseId,
                    visible: true
                });
            }
            return map.configs.map(config => {
                const position = parsePosition(flamePosition, config.config, 12);
                if (!position) return null;
                return ({
                    id: `${baseId}_${config.id}`,
                    visible: config.isVisible(height),
                    position
                });
            }).filter((entry): entry is { id: string; visible: boolean; position: number[] } => entry !== null);
        }
        const entries = extGrenade.flames
            ? Object.entries(extGrenade.flames as Record<string, unknown>)
            : [];
        const flames = entries.flatMap(([key, value], index) => {
            const mapped = mapFlame(key, value as any, index);
            if (!mapped) return [];
            return Array.isArray(mapped) ? mapped : [mapped];
        });
        const flameObjects: RadarGrenadeObject[] = flames.map(flame => ({
            ...flame,
            side: extGrenade.side,
            type: 'inferno',
            state: 'landed'
        }));
        return flameObjects;
    }

    if ("config" in map) {
        const position = parseGrenadePosition(extGrenade, map.config);
        
        if (!position) return null;
        const grenadeObject: RadarGrenadeObject = {
            type: extGrenade.type,
            state: 'inair',
            side: extGrenade.side,
            position,
            id: extGrenade.id,
            visible: true
        }
        if (extGrenade.type === "smoke") {
            if (extGrenade.effecttime !== 0) {
                grenadeObject.state = "landed";
                if (extGrenade.effecttime >= 16.5) {
                    grenadeObject.state = 'exploded';
                }
            }
        } else if ((extGrenade.type === 'flashbang' && extGrenade.lifetime >= EXPLODE_TIME_FLASH) || (extGrenade.type === 'frag' && extGrenade.lifetime >= EXPLODE_TIME_FRAG)) {
            grenadeObject.state = 'exploded';
        }
        return grenadeObject;
    }
    return map.configs.map(config => {
        const position = parseGrenadePosition(extGrenade, config.config);
        if (!position) return null;
        const grenadeObject: RadarGrenadeObject = {
            type: extGrenade.type,
            state: 'inair',
            side: extGrenade.side,
            position,
            id: `${extGrenade.id}_${config.id}`,
            visible: config.isVisible(safeHeight(extGrenade.position))
        }
        if (extGrenade.type === "smoke") {
            if (extGrenade.effecttime !== 0) {
                grenadeObject.state = "landed";
                if (extGrenade.effecttime >= 16.5) {
                    grenadeObject.state = 'exploded';
                }
            }
        } else if ((extGrenade.type === 'flashbang' && extGrenade.lifetime >= EXPLODE_TIME_FLASH) || (extGrenade.type === 'frag' && extGrenade.lifetime >= EXPLODE_TIME_FRAG)) {
            grenadeObject.state = 'exploded';
        }
        return grenadeObject;
    }).filter((grenade): grenade is RadarGrenadeObject => grenade !== null);
}

export const extendPlayer = ({ player, steamId, mapName }: { mapName: string, player: Player, steamId: string | null}): RadarPlayerObject | RadarPlayerObject[] | null => {
    const weapons = toArray<RadarWeapon>(player.weapons as any);
    const weapon = weapons.find(weapon => weapon.state === "active" && weapon.type !== "C4" && weapon.type !== "Knife" && weapon.type !== "Grenade");

    const shooting: ShootingState = { ammo: weapon?.ammo_clip ?? 0, weapon: weapon?.name ?? '', lastShoot: 0 };

    const lastShoot = shootingState[player.steamid] || shooting;

    let isShooting = false;

    if (shooting.weapon === lastShoot.weapon && shooting.ammo < lastShoot.ammo) {
        isShooting = true;
    }

    shooting.lastShoot = isShooting ? (new Date()).getTime() : lastShoot.lastShoot;

    shootingState[player.steamid] = shooting;
    const map = maps[mapName];
    const playerObject: RadarPlayerObject = {
        id: player.steamid,
        label: player.observer_slot !== undefined ? player.observer_slot : "",
        side: player.team.side,
        position: [],
        visible: true,
        isActive: steamId === player.steamid,
        forward: 0,
        scale: 1,
        steamid: player.steamid,
        flashed: player.state.flashed > 35,
        shooting: isShooting,
        lastShoot: shooting.lastShoot,
        isAlive: player.state.health > 0,
        hasBomb: !!toArray<RadarWeapon>(player.weapons as any).find(weapon => weapon.type === "C4"),
        player
    }
    if ("config" in map) {
        const scale = map.config.originHeight === undefined ? 1 : (1 + (player.position[2] - map.config.originHeight) / 1000);

        playerObject.scale = scale;

        const position = parsePlayerPosition({ player, mapConfig: map.config, scale });
        playerObject.position = position;

        return playerObject;
    }
    return map.configs.map(config => {
        const scale = config.config.originHeight === undefined ? 1 : (1 + (player.position[2] - config.config.originHeight) / 750);

        playerObject.scale = scale;

        return ({
            ...playerObject,
            position: parsePlayerPosition({ player, mapConfig: config.config, scale }),
            id: `${player.steamid}_${config.id}`,
            visible: config.isVisible(player.position[2])
        })
    });
}
