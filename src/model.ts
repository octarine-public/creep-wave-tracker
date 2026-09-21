import { GUI } from "./gui"
import { MenuManager } from "./menu"

/**
 * How far over a creep's health bar the chip stands, in world units: clear of the heroes and
 * jungle creeps that walk the same ground, and of the marks the game hangs over a camp.
 */
const WORLD_LIFT = 200

/**
 * The art a wave wears, cut for its faction: the game keeps a portrait of the lane creep only
 * for the Radiant, so the chip wears the one it draws for the creep of either side as a hero,
 * and the siege creep of the default creep set where the wave carries one.
 */
function ArtOf(team: Team, hasSiege: boolean) {
	const side = team === Team.Dire ? "dire" : "radiant"
	return hasSiege
		? `${PathData.ImagePath}/econ/creeps/lane_creeps/creep_dc_${side}/creep_dc_${side}_siege_png.vtex_c`
		: `${PathData.HeroImagePath}/npc_dota_hero_creep_${side}_png.vtex_c`
}

/** A wave: the enemy creeps marching together down one lane. */
export class CreepGroupModel {
	/** Whether any creep of the wave is in sight: a wave in sight needs no mark of ours. */
	public IsVisible = false
	public readonly Creeps: Creep[] = []
	/** Whether the wave carries a siege creep, whose art the chip wears over the others'. */
	private siege = false

	constructor(public readonly FirstCreep: Creep) {
		this.Add(FirstCreep)
	}
	public get Lane() {
		return this.FirstCreep.Lane
	}
	public get Team() {
		return this.FirstCreep.Team
	}
	public get Count() {
		return this.Creeps.length
	}
	public get HasSiege() {
		return this.siege
	}
	/** The middle of the wave. */
	public get Position() {
		const center = new Vector3()
		for (let i = this.Creeps.length - 1; i > -1; i--) {
			center.AddForThis(this.Creeps[i].Position)
		}
		return center.DivideScalarForThis(this.Creeps.length)
	}
	/** The art the chip wears: the siege creep where the wave has one, the faction's creep otherwise. */
	public get Glyph(): string {
		return ArtOf(this.Team, this.HasSiege)
	}
	/** Takes a creep into the wave, and what it brings with it: sight of the wave, or a siege creep. */
	public Add(creep: Creep) {
		this.Creeps.push(creep)
		if (creep.IsVisible) {
			this.IsVisible = true
		}
		if (creep instanceof Siege) {
			this.siege = true
		}
	}
	/** Whether `creep` marches with this wave: the same lane, within reach of the first creep. */
	public Holds(creep: Creep, reach: number) {
		return creep.Lane === this.Lane && creep.Distance(this.FirstCreep) <= reach
	}
	/** The chip in the world and the mark on the minimap, for a wave out of sight. */
	public Draw(gui: GUI, menu: MenuManager, key: string) {
		if (this.IsVisible) {
			return
		}
		const position = this.Position
		gui.DrawMinimap(position, this.Count, this.HasSiege, key, menu)
		// the chip stands over the middle of the wave, well over a creep's health bar
		gui.DrawWorld(
			position.AddScalarZ(this.FirstCreep.HealthBarOffset + WORLD_LIFT),
			this.Team,
			this.Glyph,
			this.Count,
			menu
		)
	}
}
