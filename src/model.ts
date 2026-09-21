import { GUI } from "./gui"
import { MenuManager } from "./menu"

/**
 * The art of a creep: the game's portrait of its kind. A super or a mega creep wears the plain
 * one's, and a flagbearer the melee creep's it marches with, since neither has a portrait of
 * its own.
 */
function ArtOf(creep: Creep) {
	const name = creep.Name.replace(/_upgraded(_mega)?$/, "")
	return ImageData.GetCreepTexture(name.replace("_flagbearer", "_melee"))
}

/** A wave: the enemy creeps marching together down one lane. */
export class CreepGroupModel {
	/** Whether any creep of the wave is in sight: a wave in sight needs no mark of ours. */
	public IsVisible = false
	public readonly Creeps: Creep[] = []
	/** The siege creep the wave carries, whose art the chip wears over the others'. */
	private siege: Nullable<Siege>

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
		return this.siege !== undefined
	}
	/** The middle of the wave. */
	public get Position() {
		const center = new Vector3()
		for (let i = this.Creeps.length - 1; i > -1; i--) {
			center.AddForThis(this.Creeps[i].Position)
		}
		return center.DivideScalarForThis(this.Creeps.length)
	}
	/** The art the chip wears: the siege creep's where the wave has one, the first creep's otherwise. */
	public get Glyph(): string {
		return ArtOf(this.siege ?? this.FirstCreep)
	}
	/** Takes a creep into the wave, and what it brings with it: sight of the wave, or a siege creep. */
	public Add(creep: Creep) {
		this.Creeps.push(creep)
		if (creep.IsVisible) {
			this.IsVisible = true
		}
		if (creep instanceof Siege) {
			this.siege ??= creep
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
		// the chip stands over the middle of the wave, as high as a creep's health bar
		gui.DrawWorld(
			position.AddScalarZ(this.FirstCreep.HealthBarOffset),
			this.Team,
			this.Glyph,
			this.Count,
			menu
		)
	}
}
