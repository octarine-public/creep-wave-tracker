import { ModelMenu } from "./menu"
import { CreepGroupModel } from "./model"
import { Paths } from "./paths"

/**
 * The models a particle is built for: `<model>.vpcf` and `<model>_ghost.vpcf` each carry one, named
 * after the model file. One particle per model, because a particle of several models plays every
 * one of them the sequence its first model runs under that number: a sleeping or a dying creep.
 */
const Models = [
	"models/creeps/lane_creeps/creep_radiant_melee/radiant_melee.vmdl",
	"models/creeps/lane_creeps/creep_radiant_melee/radiant_flagbearer.vmdl",
	"models/creeps/lane_creeps/creep_radiant_melee/radiant_melee_mega.vmdl",
	"models/creeps/lane_creeps/creep_radiant_melee/radiant_flagbearer_mega.vmdl",
	"models/creeps/lane_creeps/creep_radiant_ranged/radiant_ranged.vmdl",
	"models/creeps/lane_creeps/creep_radiant_ranged/radiant_ranged_mega.vmdl",
	"models/creeps/lane_creeps/creep_good_siege/creep_good_siege.vmdl",
	"models/creeps/lane_creeps/creep_bad_melee/creep_bad_melee.vmdl",
	"models/creeps/lane_creeps/creep_bad_melee/creep_bad_flagbearer.vmdl",
	"models/creeps/lane_creeps/creep_bad_melee/creep_bad_melee_mega.vmdl",
	"models/creeps/lane_creeps/creep_bad_melee/creep_bad_flagbearer_mega.vmdl",
	"models/creeps/lane_creeps/creep_bad_ranged/lane_dire_ranged.vmdl",
	"models/creeps/lane_creeps/creep_bad_ranged/lane_dire_ranged_mega.vmdl",
	"models/creeps/lane_creeps/creep_bad_siege/creep_bad_siege.vmdl"
]
const DefaultPaths = Models.map(model => ParticleOf(model, ""))
const GhostPaths = Models.map(model => ParticleOf(model, "_ghost"))
/**
 * How far apart the models of a wave walk in file, in world units: the creep in front and each
 * siege creep behind it, a catapult's length from the one before.
 */
const FILE_GAP = 150
/** What the height map answers for a point it has no ground under. */
const NO_GROUND = -16384
/**
 * The longest step of a frame a model turns by, in seconds: a frame after a hitch turns it no
 * further than this, instead of snapping it round.
 */
const MAX_TURN_STEP = 0.1

function ParticleOf(model: string, style: string) {
	const name = model.slice(model.lastIndexOf("/") + 1, model.lastIndexOf("."))
	return `${Paths.Particles}/${name}${style}.vpcf`
}

/**
 * Which of {@link Models} the creep walks as: the one it wears, or the one its unit is made with
 * when it wears a model no particle is built for.
 */
function ModelOf(creep: Creep) {
	const own = Models.indexOf(creep.ModelName)
	return own !== -1 ? own : Models.indexOf(creep.UnitData.ModelName)
}

/** Whether `creep` stands for its wave better than `than`: a melee creep over a ranged one. */
function Leads(creep: Creep, than: Nullable<Creep>) {
	if (than === undefined) {
		return true
	}
	return creep.IsRanged !== than.IsRanged ? !creep.IsRanged : creep.Index < than.Index
}

function ByIndex(a: Creep, b: Creep) {
	return a.Index - b.Index
}

/** A creep that wears a model: which one, where it stands drawn and which way it faces. */
class ShownCreep {
	/** The update that last asked for the model: one an update did not ask for comes off. */
	public Update = 0
	public Model = 0
	public readonly Position = new Vector3()
	/** Where the model faces; turned toward the lane's corner as fast as the creep itself turns. */
	public readonly Angles = new QAngle()
	public IsTurned = false
}

/**
 * The creeps that stand for an unseen wave in the order they march, and the corner of the lane the
 * leading one walks to: the one the SDK walks its guess toward.
 */
class Formation {
	public readonly Creeps: Creep[] = []
	public Target: Nullable<CreepPathCorner>
}

/**
 * A wave in the fog as one creep walking, the way Roshan walks in his pit, with every siege creep
 * of the wave behind it. The wave's other creeps wear nothing: the SDK walks the guesses of a wave
 * down one line on top of one another, and one creep reads as the wave where a crowd would not.
 *
 * The models walk in file from the leading creep's guess, which runs on the lane itself, and turn
 * to its corner as fast as the creep turns. The particle stands on our own player rather than on
 * the creep, since one standing on a unit the fog hides is not drawn at all.
 */
export class CreepModels {
	private readonly particles = new ParticlesSDK()
	private readonly shown = new Map<Creep, ShownCreep>()
	private readonly formations: Formation[] = []
	private formationCount = 0
	private update = 0
	private lastDraw = 0

	/**
	 * Stands a model on the creeps that stand for each unseen wave of `groups`, and takes it off
	 * every other. A model that stands in our sight is folded away: a creep there would be seen.
	 *
	 * Where a model stands and faces is left to {@link Draw} once it is up: the guess of a tick
	 * runs behind the one drawn, and handing it over would step the model back on every tick.
	 */
	public Update(groups: readonly CreepGroupModel[], menu: ModelMenu) {
		const owner = Dota2SDK.LocalPlayer
		if (!menu.State.value || owner === undefined) {
			this.Clear()
			return
		}
		const update = ++this.update,
			paths = menu.IsGhost ? GhostPaths : DefaultPaths,
			color = menu.Color.SelectedColor
		this.formationCount = 0
		for (let i = groups.length - 1; i > -1; i--) {
			const formation = this.gather(groups[i].Creeps, update)
			if (formation === undefined) {
				continue
			}
			this.place(formation, 0)
			const creeps = formation.Creeps
			for (let j = creeps.length - 1; j > -1; j--) {
				const creep = creeps[j],
					shown = this.shown.get(creep)!,
					path = paths[shown.Model],
					position = shown.Position,
					scale = FogOfWar.IsPointVisible(position) ? 0 : creep.ModelScale
				if (this.particles.AllParticles.get(creep)?.Path === path) {
					this.particles.SetModelLookByKey(creep, scale, color)
					continue
				}
				this.particles.DrawModel(
					creep,
					path,
					owner,
					position,
					scale,
					shown.Angles,
					color
				)
			}
		}
		for (const [creep, shown] of this.shown) {
			if (shown.Update !== update) {
				this.Remove(creep)
			}
		}
	}
	/** Walks every wave to where its leading creep is drawn this frame, turning it to its corner. */
	public Draw() {
		const now = hrtime(),
			step = Math.min((now - this.lastDraw) / 1000, MAX_TURN_STEP)
		this.lastDraw = now
		for (let i = this.formationCount - 1; i > -1; i--) {
			const creeps = this.formations[i].Creeps
			for (let j = creeps.length - 1; j > -1; j--) {
				const creep = creeps[j]
				if (!creep.IsValid || creep.IsVisible) {
					this.Remove(creep)
				}
			}
			if (creeps.length === 0) {
				continue
			}
			this.place(this.formations[i], step)
			for (let j = creeps.length - 1; j > -1; j--) {
				const shown = this.shown.get(creeps[j])!
				this.particles.SetModelPlacementByKey(
					creeps[j],
					shown.Position,
					shown.Angles
				)
			}
		}
	}
	public Remove(creep: Creep) {
		this.particles.DestroyByKey(creep)
		this.shown.delete(creep)
		for (let i = this.formationCount - 1; i > -1; i--) {
			this.formations[i].Creeps.remove(creep)
		}
	}
	public Clear() {
		this.particles.DestroyAll()
		this.shown.clear()
		this.formationCount = 0
	}
	/**
	 * The creeps that stand for an unseen wave, in marching order: one of its creeps, a melee one
	 * where it has one, and every siege creep behind it. Nothing when none of them has a model.
	 */
	private gather(creeps: readonly Creep[], update: number): Nullable<Formation> {
		const formation = (this.formations[this.formationCount] ??= new Formation()),
			members = formation.Creeps
		members.clear()
		let lead: Nullable<Creep>
		for (let i = creeps.length - 1; i > -1; i--) {
			const creep = creeps[i]
			if (creep.IsVisible || ModelOf(creep) === -1) {
				continue
			}
			if (creep instanceof Siege) {
				members.push(creep)
			} else if (Leads(creep, lead)) {
				lead = creep
			}
		}
		members.sort(ByIndex)
		if (lead !== undefined) {
			members.unshift(lead)
		}
		if (members.length === 0) {
			return undefined
		}
		for (let i = members.length - 1; i > -1; i--) {
			const creep = members[i]
			let shown = this.shown.get(creep)
			if (shown === undefined) {
				shown = new ShownCreep()
				this.shown.set(creep, shown)
			}
			shown.Update = update
			shown.Model = ModelOf(creep)
		}
		const leader = members[0]
		formation.Target = DotaMap.GetCreepCurrentTarget(
			leader.Position,
			leader.Team,
			leader.Lane
		)
		this.formationCount++
		return formation
	}
	/**
	 * Lays the models of a wave out in file from its leading creep's guess, and turns each toward
	 * the corner it walks to by as much as the creep turns in `step` seconds. A model that has not
	 * faced anywhere yet faces the corner outright, or where its creep was last seen facing.
	 */
	private place(formation: Formation, step: number) {
		const creeps = formation.Creeps,
			leader = creeps[0],
			anchor = leader.Position,
			target = formation.Target?.Position
		let heading = NaN
		if (target !== undefined && anchor.Distance2D(target) > 1) {
			heading = anchor.GetAngleTo(target)
		}
		let backX = 0,
			backY = 0
		for (let i = 0; i < creeps.length; i++) {
			const shown = this.shown.get(creeps[i])!,
				angles = shown.Angles
			if (!shown.IsTurned) {
				angles.y = Number.isNaN(heading) ? creeps[i].Angles.y : heading
				shown.IsTurned = true
			} else if (!Number.isNaN(heading)) {
				angles.y = leader.TurnYawToward(angles.y, heading, step)
			}
			if (i === 0) {
				const yaw = Math.degreesToRadian(angles.y)
				backX = -Math.cos(yaw) * FILE_GAP
				backY = -Math.sin(yaw) * FILE_GAP
			}
			const position = shown.Position
			position.SetVector(anchor.x + backX * i, anchor.y + backY * i, anchor.z)
			const height = Dota2SDK.GetPositionHeight(position)
			if (height !== NO_GROUND) {
				position.z = height
			}
		}
	}
}
