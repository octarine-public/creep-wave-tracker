import "./translations"

import { GUI } from "./gui"
import { MenuManager } from "./menu"
import { CreepGroupModel } from "./model"

/** How far apart two creeps of one lane may stand and still march in one wave, in world units. */
const WAVE_REACH = 600
/**
 * How long our vision must cover where an unseen creep is guessed to be before the guess is
 * given up, in seconds: the guess may run a little ahead of the creep into the edge of our
 * vision, and a creep that is really there shows up within this.
 */
const EMPTY_SPOT_GRACE = 0.5

new (class CCreepWaveTracker {
	private readonly menu!: MenuManager
	private readonly gui = new GUI()
	/** The SDK's live creep registry, including creeps created before this tracker loaded. */
	private readonly creeps = EntityManager.GetEntitiesByClass(Creep)
	/** The waves the creeps stood in on the last update. */
	private readonly groups: CreepGroupModel[] = []
	/**
	 * Since when our vision has covered where each unseen creep is guessed to be; a creep whose
	 * spot stayed empty past {@link EMPTY_SPOT_GRACE} is not where the guess puts it.
	 */
	private readonly emptySince = new Map<Creep, number>()

	constructor(canBeInitialized: boolean) {
		if (!canBeInitialized) {
			return
		}
		this.menu = new MenuManager()
		EventsSDK.on("Draw", this.Draw.bind(this))
		EventsSDK.on("EntityDestroyed", this.EntityDestroyed.bind(this))
		EventsSDK.on("GameEnded", this.GameEnded.bind(this))
		EventsSDK.on("PostDataUpdate", this.PostDataUpdate.bind(this))
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
	protected EntityDestroyed(entity: Entity) {
		if (entity instanceof Creep) {
			this.emptySince.delete(entity)
		}
	}
	protected GameEnded() {
		this.groups.clear()
		this.emptySince.clear()
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
			this.groups[i].Draw(this.gui, this.menu, i)
		}
	}
	protected PostDataUpdate() {
		if (!this.shouldDraw) {
			this.groups.clear()
			this.emptySince.clear()
			return
		}
		this.regroup()
	}
	/**
	 * Sorts the creeps into waves again: every living creep joins the first wave of its lane it
	 * stands within reach of, or starts one of its own - but for one our vision found missing.
	 */
	private regroup() {
		this.groups.clear()
		const now = GameState.RawGameTime
		for (let i = this.creeps.length - 1; i > -1; i--) {
			const creep = this.creeps[i]
			if (
				!creep.IsValid ||
				!creep.IsLaneCreep ||
				!creep.IsEnemy() ||
				!creep.IsAlive ||
				creep.PredictedIsWaitingToSpawn
			) {
				this.emptySince.delete(creep)
				continue
			}
			if (this.isMissing(creep, now)) {
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
	/**
	 * Whether an unseen creep is known not to be where the SDK guesses it: our vision has covered
	 * that spot for {@link EMPTY_SPOT_GRACE} without the creep showing up. The guess is then given
	 * up until the creep is seen again, since wherever it walks on to next is as wrong.
	 */
	private isMissing(creep: Creep, now: number) {
		if (creep.IsVisible) {
			this.emptySince.delete(creep)
			return false
		}
		const since = this.emptySince.get(creep)
		if (since !== undefined && now - since >= EMPTY_SPOT_GRACE) {
			return true
		}
		if (!FogOfWar.IsPointVisible(creep.Position)) {
			this.emptySince.delete(creep)
			return false
		}
		if (since === undefined) {
			this.emptySince.set(creep, now)
		}
		return false
	}
})(true)
