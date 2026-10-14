const assert = require("node:assert/strict")
const { readFileSync } = require("node:fs")
const path = require("node:path")
const { test } = require("node:test")
const vm = require("node:vm")
const ts = require("typescript")

const MELEE = "models/creeps/lane_creeps/creep_bad_melee/creep_bad_melee.vmdl"
const RANGED = "models/creeps/lane_creeps/creep_bad_ranged/lane_dire_ranged.vmdl"
const SIEGE = "models/creeps/lane_creeps/creep_bad_siege/creep_bad_siege.vmdl"

function models() {
	const particles = new Map()
	class Vector3 {
		constructor(x = 0, y = 0, z = 0) {
			Object.assign(this, { x, y, z })
		}
		SetVector(x, y, z) {
			Object.assign(this, { x, y, z })
			return this
		}
		CopyFrom(v) {
			return this.SetVector(v.x, v.y, v.z)
		}
		AddForThis(v) {
			return this.SetVector(this.x + v.x, this.y + v.y, this.z + v.z)
		}
		DivideScalarForThis(n) {
			return this.SetVector(this.x / n, this.y / n, this.z / n)
		}
		Distance2D(v) {
			return Math.hypot(this.x - v.x, this.y - v.y)
		}
		GetAngleTo(v) {
			const angle = (Math.atan2(v.y - this.y, v.x - this.x) * 180) / Math.PI
			return angle < 0 ? angle + 360 : angle
		}
	}
	class QAngle extends Vector3 {}
	let index = 0
	class Creep {
		constructor(model, overrides = {}) {
			Object.assign(
				this,
				{
					Index: ++index,
					ModelName: model,
					UnitData: { ModelName: model },
					ModelScale: 1,
					IsValid: true,
					IsVisible: false,
					IsRanged: model === RANGED,
					Team: 3,
					Lane: 1,
					Position: new Vector3(),
					Angles: new QAngle()
				},
				overrides
			)
		}
	}
	Creep.prototype.TurnRate = () => 0.5
	Creep.prototype.TurnYawToward = function (yaw, heading, seconds) {
		const turn = (30 * this.TurnRate() * seconds * 180) / Math.PI
		let left = (heading - yaw + 180) % 360
		if (left < 0) left += 360
		left -= 180
		return (yaw + Math.max(-turn, Math.min(turn, left)) + 360) % 360
	}
	class Siege extends Creep {}
	const clock = { now: 0 }
	const copy = value => (value instanceof Vector3 ? { ...value } : value)
	const context = vm.createContext({
		Vector3,
		QAngle,
		Siege,
		Math,
		hrtime: () => clock.now,
		Dota2SDK: { LocalPlayer: {}, GetPositionHeight: () => -16384 },
		FogOfWar: { IsPointVisible: () => false },
		DotaMap: { GetCreepCurrentTarget: () => ({ Position: new Vector3(0, 1000) }) },
		ParticlesSDK: class {
			AllParticles = particles
			DrawModel(key, path, _owner, position, scale, angles, color) {
				particles.set(key, {
					Path: path,
					Position: copy(position),
					Scale: scale,
					Angles: copy(angles),
					Color: color
				})
			}
			SetModelLookByKey(key, scale, color) {
				const particle = particles.get(key)
				if (particle !== undefined) {
					particle.Scale = scale
					particle.Color = color
				}
			}
			SetModelPlacementByKey(key, position, angles) {
				const particle = particles.get(key)
				if (particle !== undefined) {
					particle.Position = copy(position)
					particle.Angles = copy(angles)
				}
			}
			DestroyByKey(key) {
				particles.delete(key)
			}
			DestroyAll() {
				particles.clear()
			}
		}
	})
	vm.runInContext(
		`
		Array.prototype.clear = function () { this.length = 0 }
		Array.prototype.remove = function (value) {
			const index = this.indexOf(value)
			if (index !== -1) this.splice(index, 1)
		}
		Math.degreesToRadian = degrees => (degrees * Math.PI) / 180
		Math.radianToDegrees = radians => (radians * 180) / Math.PI
	`,
		context
	)
	const filename = path.join(__dirname, "..", "src", "creep-models.ts")
	const code = ts.transpileModule(readFileSync(filename, "utf8"), {
		compilerOptions: {
			module: ts.ModuleKind.CommonJS,
			target: ts.ScriptTarget.ES2022
		}
	}).outputText
	const exports = {}
	const modules = { "./paths": { Paths: { Particles: "particles" } } }
	vm.runInContext(`(function(require, exports) { ${code}\n })`, context)(
		id => modules[id] ?? {},
		exports
	)
	const menu = {
		State: { value: true },
		IsGhost: false,
		Color: { SelectedColor: {} }
	}
	const corner = { Position: new Vector3(0, 1000) }
	context.DotaMap.GetCreepCurrentTarget = () => corner
	return {
		Creep,
		Siege,
		Vector3,
		clock,
		corner,
		particles,
		menu,
		models: new exports.CreepModels()
	}
}

test("a wave walks as one creep, a melee one where it has one, with its catapults behind", () => {
	const t = models()
	const ranged = new t.Creep(RANGED),
		melee = new t.Creep(MELEE),
		other = new t.Creep(MELEE),
		siege = new t.Siege(SIEGE)
	t.models.Update([{ Creeps: [ranged, other, siege, melee] }], t.menu)
	assert.deepEqual(
		[...t.particles.keys()].sort((a, b) => a.Index - b.Index),
		[melee, siege]
	)
	const front = t.particles.get(melee).Position,
		back = t.particles.get(siege).Position
	assert.ok(
		front.y > back.y,
		"the creep walks ahead of its catapult, toward the corner"
	)
})

test("a wave of ranged creeps alone still walks as one of them", () => {
	const t = models()
	const ranged = new t.Creep(RANGED)
	t.models.Update([{ Creeps: [new t.Creep(RANGED, { Index: 99 }), ranged] }], t.menu)
	assert.deepEqual([...t.particles.keys()], [ranged])
})

test("a creep in sight hands the wave to the next one, and the catapult keeps walking", () => {
	const t = models()
	const melee = new t.Creep(MELEE),
		next = new t.Creep(MELEE),
		siege = new t.Siege(SIEGE)
	const wave = { Creeps: [melee, next, siege] }
	t.models.Update([wave], t.menu)
	melee.IsVisible = true
	t.models.Draw()
	assert.deepEqual([...t.particles.keys()], [siege])
	t.models.Update([wave], t.menu)
	assert.deepEqual(new Set(t.particles.keys()), new Set([next, siege]))
})

test("a creep turns toward a new corner as fast as it turns in the game, not at once", () => {
	const t = models()
	const melee = new t.Creep(MELEE)
	const wave = { Creeps: [melee] }
	t.models.Update([wave], t.menu)
	assert.equal(t.particles.get(melee).Angles.y, 90)
	t.corner.Position = new t.Vector3(1000, 0)
	t.models.Update([wave], t.menu)
	t.clock.now = 10
	t.models.Draw()
	const turn = (30 * 0.5 * 0.01 * 180) / Math.PI
	assert.ok(Math.abs(t.particles.get(melee).Angles.y - (90 - turn)) < 1e-6)
	t.clock.now = 1000
	t.models.Draw()
	assert.equal(t.particles.get(melee).Angles.y, 0)
})

test("an update leaves where a standing model is drawn to the frame, so it never steps back", () => {
	const t = models()
	const melee = new t.Creep(MELEE)
	const wave = { Creeps: [melee] }
	t.models.Update([wave], t.menu)
	melee.Position = new t.Vector3(0, 50)
	t.models.Draw()
	assert.equal(t.particles.get(melee).Position.y, 50)
	melee.Position = new t.Vector3(0, 40)
	t.models.Update([wave], t.menu)
	assert.equal(t.particles.get(melee).Position.y, 50)
})
