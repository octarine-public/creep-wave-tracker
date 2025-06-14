import {
	Creep,
	Entity,
	EventsSDK,
	Vector3
} from "github.com/octarine-public/wrapper/index"

import { CreepGroupModel } from "./model"

new (class CreepWaveTracker {
	private readonly creeps: Creep[] = []
	private readonly groups: CreepGroupModel[] = []

	constructor() {
		EventsSDK.on("Draw", this.Draw.bind(this))
		EventsSDK.on("EntityCreated", this.EntityCreated.bind(this))
		EventsSDK.on("PostDataUpdate", this.PostDataUpdate.bind(this))
		EventsSDK.on("EntityDestroyed", this.EntityDestroyed.bind(this))
	}

	private Draw() {
		for (let i = this.groups.length - 1; i > -1; i--) {
			this.groups[i].Draw()
		}
	}
	protected PostDataUpdate(delta: number) {
		if (delta === 0) {
			return
		}
		this.groups.clear()
		for (let i = this.creeps.length - 1; i > -1; i--) {
			const creep = this.creeps[i]
			if (!creep.IsAlive || creep.PredictedIsWaitingToSpawn) {
				continue
			}
			const group = this.groups.find(
				x =>
					creep.Lane === x.FirstCreep.Lane &&
					creep.Distance(x.FirstCreep) <= 600
			)
			if (group === undefined) {
				this.groups.push(new CreepGroupModel(creep))
				continue
			}
			group.Creeps.push(creep)
			group.Position.CopyFrom(Vector3.GetCenter(group.Creeps.map(x => x.Position)))
		}
	}
	protected EntityCreated(entity: Entity) {
		if (this.isValidCreep(entity)) {
			this.creeps.push(entity)
		}
	}
	protected EntityDestroyed(entity: Entity) {
		if (this.isValidCreep(entity)) {
			this.creeps.remove(entity)
		}
	}
	private isValidCreep(entity: Entity): entity is Creep {
		return entity instanceof Creep && entity.IsLaneCreep && entity.IsEnemy()
	}
})()
