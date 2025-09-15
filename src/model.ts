import { Creep, Siege, Vector3 } from "github.com/octarine-public/wrapper/index"

import { GUI } from "./gui"
import { MenuManager } from "./menu"

export class CreepGroupModel {
	public HasSiege: boolean = false
	public IsVisible: boolean = false
	public readonly Creeps: Creep[] = []
	private readonly gui = new GUI()

	constructor(public readonly FirstCreep: Creep) {
		this.HasSiege = FirstCreep instanceof Siege
		this.IsVisible = FirstCreep.IsVisible
		this.Creeps.push(FirstCreep)
	}
	public get Position() {
		return Vector3.GetCenter(this.Creeps.map(x => x.Position))
	}
	public Draw(menu: MenuManager) {
		if (this.IsVisible) {
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
