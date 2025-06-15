import {
	Color,
	Creep,
	GUIInfo,
	Rectangle,
	RendererSDK,
	Siege,
	Vector3
} from "github.com/octarine-public/wrapper/index"

import { GUI } from "./gui"
import { MenuManager } from "./menu"

export class CreepGroupModel {
	public HasSiege: boolean = false
	public IsVisible: boolean = false

	public readonly Creeps: Creep[] = []
	public readonly Position = new Vector3().Invalidate()

	private readonly gui = new GUI()

	constructor(public readonly FirstCreep: Creep) {
		this.HasSiege = FirstCreep instanceof Siege
		this.IsVisible = FirstCreep.IsVisible
		this.Position.CopyFrom(FirstCreep.Position)
		this.Creeps.push(FirstCreep)
	}
	public Draw(menu: MenuManager) {
		if (!this.Position.IsValid || this.IsVisible) {
			return
		}
		const w2s = RendererSDK.WorldToScreen(this.Position)
		if (w2s === undefined) {
			return
		}
		const size = Math.max(menu.World.Size.value, 24)
		const vecSize = GUIInfo.ScaleVector(size, size)
		const position = new Rectangle(w2s, w2s.Add(vecSize))
		position.x -= position.Width / 2
		position.y -= position.Height / 2
		RendererSDK.TextByFlags(`${this.Creeps.length}`, position, Color.Red)
	}
}
