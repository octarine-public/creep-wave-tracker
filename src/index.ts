import "./translations"

import { GUI } from "./gui"
import { MenuManager } from "./menu"
import { CreepGroupModel } from "./model"

/** How far apart two creeps of one lane may stand and still march in one wave, in world units. */
const WAVE_REACH = 600

new (class CCreepWaveTracker {
	private readonly menu!: MenuManager
	private readonly gui = new GUI()
	/** Every enemy lane creep there is, in sight or not. */
	private readonly creeps: Creep[] = []
	/** The waves the creeps stood in on the last update. */
	private readonly groups: CreepGroupModel[] = []

	constructor(canBeInitialized: boolean) {
		if (!canBeInitialized) {
			return
		}
		this.menu = new MenuManager()
		EventsSDK.on("Draw", this.Draw.bind(this))
		EventsSDK.on("GameEnded", this.GameEnded.bind(this))
		EventsSDK.on("PostDataUpdate", this.PostDataUpdate.bind(this))

		EventsSDK.on("EntityCreated", this.EntityCreated.bind(this))
		EventsSDK.on("EntityDestroyed", this.EntityDestroyed.bind(this))
	}
	private get isUIGame() {
		return GameState.UIState === DOTAGameUIState.DOTA_GAME_UI_DOTA_INGAME
	}
	private get isPostGame() {
		return (
			Dota2SDK.GameRules === undefined ||
			Dota2SDK.GameRules.GameState === DOTAGameState.DOTA_GAMERULES_STATE_POST_GAME
		)
	}
	private get shouldDraw() {
		return this.menu.State.value && this.isUIGame && !this.isPostGame
	}
	protected GameEnded() {
		this.groups.clear()
		this.creeps.clear()
	}
	protected Draw() {
		if (!this.shouldDraw) {
			return
		}
		GUI.BeginFrame()
		for (let i = this.groups.length - 1; i > -1; i--) {
			// the mark on the minimap is kept under the wave's place in the list: an icon drawn
			// under a key and then not drawn again is gone the next frame, so a wave that broke
			// up leaves nothing behind
			this.groups[i].Draw(this.gui, this.menu, `creep_wave_${i}`)
		}
	}
	protected PostDataUpdate(dt: number) {
		if (dt === 0 || this.isPostGame) {
			return
		}
		this.regroup()
	}
	protected EntityCreated(entity: Entity) {
		if (this.isLaneCreep(entity)) {
			this.creeps.push(entity)
		}
	}
	protected EntityDestroyed(entity: Entity) {
		if (this.isLaneCreep(entity)) {
			this.creeps.remove(entity)
		}
	}
	/**
	 * Sorts the creeps into waves again: every living creep joins the first wave of its lane it
	 * stands within reach of, or starts one of its own.
	 */
	private regroup() {
		this.groups.clear()
		for (let i = this.creeps.length - 1; i > -1; i--) {
			const creep = this.creeps[i]
			if (!creep.IsAlive || creep.PredictedIsWaitingToSpawn) {
				continue
			}
			const group = this.groups.find(x => x.Holds(creep, WAVE_REACH))
			if (group === undefined) {
				this.groups.push(new CreepGroupModel(creep))
			} else {
				group.Add(creep)
			}
		}
	}
	private isLaneCreep(entity: Entity): entity is Creep {
		return entity instanceof Creep && entity.IsLaneCreep && entity.IsEnemy()
	}
})(true)
