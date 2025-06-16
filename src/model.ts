import { Creep, Siege, Vector3 } from "github.com/octarine-public/wrapper/index"

import { GUI } from "./gui"
import { MenuManager } from "./menu"

export class CreepGroupModel {
	public readonly Creeps: Creep[] = []
	public readonly Position = new Vector3().Invalidate()

	public HasSiege: boolean = false
	public IsVisible: boolean = false

	private readonly gui = new GUI()

	constructor(public readonly FirstCreep: Creep) {
		this.HasSiege = FirstCreep instanceof Siege
		this.IsVisible = FirstCreep.IsVisible
		this.Position.CopyFrom(FirstCreep.Position)
		this.Creeps.push(FirstCreep)
	}
	public Draw(menu: MenuManager) {
		if (this.IsVisible || !this.Position.IsValid) {
			return
		}
		this.gui.DrawMinimap(menu, this.Position, this.Creeps.length, this.HasSiege)
		this.gui.DrawWorld(
			menu,
			this.Position,
			this.Creeps.length,
			this.FirstCreep.Team,
			this.HasSiege
		)
	}
}
