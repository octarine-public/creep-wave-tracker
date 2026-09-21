const assert = require("node:assert/strict")
const { readFileSync } = require("node:fs")
const path = require("node:path")
const { test } = require("node:test")
const vm = require("node:vm")
const ts = require("typescript")

function tracker() {
	const entities = [],
		draws = [],
		listeners = new Map()
	const game = { LocalTeam: 0, UIState: 1 }
	class Vector3 {
		constructor(x = 0, y = 0, z = 0) {
			Object.assign(this, { x, y, z })
		}
		AddForThis(v) {
			this.x += v.x
			this.y += v.y
			this.z += v.z
			return this
		}
		DivideScalarForThis(n) {
			this.x /= n
			this.y /= n
			this.z /= n
			return this
		}
		AddScalarZ(z) {
			return new Vector3(this.x, this.y, this.z + z)
		}
	}
	class Creep {
		constructor(team = 3, overrides = {}) {
			Object.assign(
				this,
				{
					Team: team,
					Lane: 1,
					IsValid: true,
					IsAlive: true,
					IsLaneCreep: true,
					IsVisible: false,
					PredictedIsWaitingToSpawn: false,
					Position: new Vector3(),
					HealthBarOffset: 100
				},
				overrides
			)
		}
		IsEnemy() {
			return this.Team !== game.LocalTeam
		}
		Distance(other) {
			return Math.hypot(
				this.Position.x - other.Position.x,
				this.Position.y - other.Position.y
			)
		}
	}
	class Siege extends Creep {}
	const context = vm.createContext({
		Creep,
		Siege,
		Vector3,
		GameState: game,
		Team: { Radiant: 2, Dire: 3 },
		DOTAGameUIState: { DOTA_GAME_UI_DOTA_INGAME: 1 },
		DOTAGameState: { DOTA_GAMERULES_STATE_POST_GAME: 2 },
		Dota2SDK: { GameRules: { GameState: 1 } },
		PathData: { ImagePath: "images", HeroImagePath: "heroes" },
		EntityManager: { GetEntitiesByClass: () => entities },
		EventsSDK: {
			on(name, callback) {
				listeners.set(name, callback)
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
	`,
		context
	)
	const modules = {
		"./translations": {},
		"./menu": {
			MenuManager: class {
				State = { value: true }
			}
		},
		"./gui": {
			GUI: class {
				static BeginFrame() {}
				DrawMinimap() {}
				DrawWorld(position, team, glyph, count) {
					draws.push({ position, team, glyph, count })
				}
			}
		}
	}
	function load(name) {
		const filename = path.join(__dirname, "..", "src", name + ".ts")
		const code = ts.transpileModule(readFileSync(filename, "utf8"), {
			compilerOptions: {
				module: ts.ModuleKind.CommonJS,
				target: ts.ScriptTarget.ES2022
			}
		}).outputText
		const exports = {}
		vm.runInContext(`(function(require, exports) { ${code}\n })`, context)(
			id => modules[id],
			exports
		)
		return exports
	}
	modules["./model"] = load("model")
	load("index")
	const emit = (name, ...args) => listeners.get(name)?.(...args)
	function drawCounts() {
		draws.length = 0
		emit("Draw")
		return draws.map(draw => draw.count).sort((a, b) => a - b)
	}
	return {
		game,
		entities,
		Creep,
		Siege,
		Vector3,
		emit,
		drawCounts,
		Model: modules["./model"].CreepGroupModel,
		add(team = 3, overrides = {}) {
			const creep = new Creep(team, overrides)
			entities.push(creep)
			emit("EntityCreated", creep)
			return creep
		},
		counts(dt = 0.03) {
			emit("PostDataUpdate", dt)
			return drawCounts()
		}
	}
}

test("seven enemies plus five allies created before team assignment count as seven", () => {
	const t = tracker()
	for (let i = 0; i < 7; i++) t.add(3)
	for (let i = 0; i < 5; i++) t.add(2)
	t.game.LocalTeam = 2
	assert.deepEqual(t.counts(), [7])
})

test("team changes exclude former enemies and include former allies", () => {
	const t = tracker()
	t.game.LocalTeam = 2
	const enemy = t.add(3)
	t.add(2)
	assert.deepEqual(t.counts(), [1])
	enemy.Team = 2
	assert.deepEqual(t.counts(), [])
	t.game.LocalTeam = 3
	assert.deepEqual(t.counts(), [2])
})

test("repeated creation notifications do not inflate a wave", () => {
	const t = tracker()
	t.game.LocalTeam = 2
	for (let i = 0; i < 7; i++) {
		const creep = t.add()
		if (i < 5) t.emit("EntityCreated", creep)
	}
	assert.deepEqual(t.counts(), [7])
})

test("invalid entities with an alive life state do not count", () => {
	const t = tracker()
	t.game.LocalTeam = 2
	const creep = t.add()
	assert.deepEqual(t.counts(), [1])
	creep.IsValid = false
	assert.deepEqual(t.counts(), [])
})

test("zero-delta packets still refresh deaths and destroyed entities", () => {
	const t = tracker()
	t.game.LocalTeam = 2
	const dead = t.add(),
		removed = t.add()
	t.add()
	assert.deepEqual(t.counts(), [3])
	dead.IsAlive = false
	removed.IsValid = false
	t.entities.splice(t.entities.indexOf(removed), 1)
	t.emit("EntityDestroyed", removed)
	assert.deepEqual(t.counts(0), [1])
})

test("dead, pending-spawn and non-lane creeps are excluded; visible waves are hidden", () => {
	const t = tracker()
	t.game.LocalTeam = 2
	const creep = t.add()
	t.add(3, { IsAlive: false })
	t.add(3, { PredictedIsWaitingToSpawn: true })
	t.add(3, { IsLaneCreep: false })
	assert.deepEqual(t.counts(), [1])
	creep.IsVisible = true
	assert.deepEqual(t.counts(), [])
})

test("groups require the same team, lane and nearby position, and retain siege art", () => {
	const t = tracker()
	const group = new t.Model(new t.Siege(3))
	assert.equal(group.Holds(new t.Creep(2), 600), false)
	assert.equal(group.Holds(new t.Creep(3, { Lane: 2 }), 600), false)
	assert.equal(
		group.Holds(new t.Creep(3, { Position: new t.Vector3(601) }), 600),
		false
	)
	const creep = new t.Creep(3, { Position: new t.Vector3(600) })
	assert.equal(group.Holds(creep, 600), true)
	group.Add(creep)
	assert.equal(group.Count, 2)
	assert.equal(group.Position.x, 300)
	assert.equal(group.HasSiege, true)
	assert.match(group.Glyph, /siege/)
})

test("ending a game clears displayed groups without modifying the SDK registry", () => {
	const t = tracker()
	t.game.LocalTeam = 2
	t.add()
	assert.deepEqual(t.counts(), [1])
	t.emit("GameEnded")
	assert.deepEqual(t.drawCounts(), [])
	assert.equal(t.entities.length, 1)
})

test("counts follow the SDK registry even without creation or destruction notifications", () => {
	const t = tracker()
	t.game.LocalTeam = 2
	t.entities.push(new t.Creep())
	assert.deepEqual(t.counts(), [1])
	t.entities.length = 0
	assert.deepEqual(t.counts(), [])
})
