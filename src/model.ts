import { Creep, Siege, Vector3 } from "github.com/octarine-public/wrapper/index"

export class CreepGroupModel {
	public readonly Creeps: Creep[] = []
	public readonly Siege: boolean = false
	public readonly Position = new Vector3().Invalidate()

	constructor(public readonly FirstCreep: Creep) {
		this.Siege = FirstCreep instanceof Siege
		this.Position.CopyFrom(FirstCreep.Position)
		this.Creeps.push(FirstCreep)
	}

	public Draw() {
		// TODO
	}
}
