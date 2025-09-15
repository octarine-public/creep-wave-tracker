import "./translations"

import {
	Creep,
	DOTAGameState,
	DOTAGameUIState,
	Entity,
	EventsSDK,
	GameRules,
	GameState,
	Siege
} from "github.com/octarine-public/wrapper/index"

import { MenuManager } from "./menu"
import { CreepGroupModel } from "./model"

new (class CreepWaveTracker {
	private readonly creeps: Creep[] = []
	private readonly groups: CreepGroupModel[] = []

	private readonly menu = new MenuManager()

	constructor() {
		EventsSDK.on("Draw", this.Draw.bind(this))
		EventsSDK.on("GameEnded", this.GameChanged.bind(this))
		EventsSDK.on("GameStarted", this.GameChanged.bind(this))
		EventsSDK.on("EntityCreated", this.EntityCreated.bind(this))
		EventsSDK.on("PostDataUpdate", this.PostDataUpdate.bind(this))
		EventsSDK.on("EntityDestroyed", this.EntityDestroyed.bind(this))
	}

	private get gameState() {
		return GameRules?.GameState ?? DOTAGameState.DOTA_GAMERULES_STATE_INIT
	}
	private get isInProgress() {
		return this.gameState === DOTAGameState.DOTA_GAMERULES_STATE_GAME_IN_PROGRESS
	}

	private Draw() {
		if (GameState.UIState !== DOTAGameUIState.DOTA_GAME_UI_DOTA_INGAME) {
			return
		}
		if (!this.isInProgress || !this.menu.State.value) {
			return
		}
		for (let i = this.groups.length - 1; i > -1; i--) {
			this.groups[i].Draw(this.menu)
		}
	}
	protected PostDataUpdate(delta: number) {
		if (!this.isInProgress || delta === 0) {
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
			if (creep.IsVisible) {
				group.IsVisible = true
			}
			group.Creeps.push(creep)
			group.HasSiege = creep instanceof Siege
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
	protected GameChanged() {
		this.groups.clear()
	}
	private isValidCreep(entity: Entity): entity is Creep {
		return entity instanceof Creep && entity.IsLaneCreep && entity.IsEnemy()
	}
})()
