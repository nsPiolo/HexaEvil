/**
 * Choix du terrain d'une course (GDD §2.2). Un cercle propose plusieurs variantes de piste et
 * une seule est jouée : les trois courses d'un cercle ne se ressemblent donc pas.
 */
import type { Terrain } from '../config/schema'
import { seededRng } from './rng'

/**
 * Décalage appliqué à la graine avant de tirer le terrain (nombre d'or sur 32 bits, le mélangeur
 * usuel de mulberry32). Le tirage se fait sur un générateur à part : à graine égale, le flux de
 * hasard de la course — dés, vitrine — reste identique, seule la piste change.
 */
const TERRAIN_SALT = 0x9e3779b9

/** Terrain joué pour une graine donnée. Déterministe : la même graine rejoue la même piste. */
export function terrainFor(terrains: readonly Terrain[], seed: number): Terrain {
  return terrains[seededRng((seed ^ TERRAIN_SALT) >>> 0).int(terrains.length)]!
}
