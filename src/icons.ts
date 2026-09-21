import { Paths } from "./paths"

/** Icons of the menu: the SDK set where it has one, our own outline glyphs next to it. */
export const CreepWaveIcons = {
	/** The page itself: a wave of creeps on the march down the lane. */
	Waves: `${Paths.Icons}/creep-wave.svg`,
	State: Menu.Icons.Power,
	/** The section of the chip a wave wears in the world. */
	World: Menu.Icons.Globe,
	/** The section of the icon a wave leaves on the minimap. */
	Minimap: `${Paths.Icons}/minimap.svg`,
	/** The count written on its own, with no card under it. */
	OnlyText: Menu.Icons.Type,
	Size: Menu.Icons.Expand,
	Color: Menu.Icons.Pipette,
	/** The catapult a wave comes with: the colour a wave carrying one is marked in. */
	Siege: `${Paths.Icons}/siege.svg`
} as const
