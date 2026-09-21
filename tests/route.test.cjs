const assert = require("node:assert/strict")
const { readFileSync } = require("node:fs")
const path = require("node:path")
const { test } = require("node:test")
const vm = require("node:vm")
const ts = require("typescript")

function preview({ hideAnchor = false, target, coversHud = false } = {}) {
	const lines = [],
		projections = [],
		lookups = []
	class Vector3 {
		constructor(x = 0, y = 0, z = 0) {
			Object.assign(this, { x, y, z })
		}
	}
	class Color {
		constructor(r = 0, g = 0, b = 0, a = 255) {
			Object.assign(this, { r, g, b, a })
		}
		Clone() {
			return new Color(this.r, this.g, this.b, this.a)
		}
		SetA(a) {
			this.a = a
			return this
		}
	}
	const exports = {}
	const context = vm.createContext({
		exports,
		Vector3,
		Color,
		Rectangle: class {},
		Vector2: class {},
		Team: { Radiant: 2, Dire: 3 },
		MenuSDK: {
			HudCardRadius: 4,
			HudBold: 700,
			hudH: value => value,
			setHudWorldScale() {},
			SetActiveSurface() {},
			HudColors: { readable: color => color },
			HudText: { Width: () => 20, Center() {} },
			EHudTextEffect: { Outline: 1 }
		},
		GUIInfo: { Contains: () => coversHud },
		DotaMap: {
			GetCreepCurrentTarget(anchor, team, lane) {
				lookups.push({ team, lane })
				return target
			}
		},
		Dota2SDK: { GetPositionHeight: point => point.x / 10 + point.y / 5 },
		RendererSDK: {
			WorldToScreen(point) {
				projections.push({ ...point })
				return hideAnchor && point.x === 0 && point.y === 0
					? undefined
					: { x: point.x, y: point.y }
			}
		},
		require: () => ({
			canvas: {
				Line(from, to, color) {
					lines.push({ from, to, alpha: color.a })
				}
			}
		})
	})
	const source = readFileSync(path.join(__dirname, "../src/gui.ts"), "utf8")
	vm.runInContext(
		ts.transpileModule(source, {
			compilerOptions: {
				module: ts.ModuleKind.CommonJS,
				target: ts.ScriptTarget.ES2022
			}
		}).outputText,
		context
	)
	context.gui = new exports.GUI()
	vm.runInContext(
		`gui.DrawWorld(new Vector3(), 3, "creep", 7, {
		World: { Size: { value: 4 }, OnlyText: { value: true } }
	}, 2)`,
		context,
		{ timeout: 1000 }
	)
	return { lines, projections, lookups }
}

function bentRoute() {
	return {
		Position: { x: 225, y: 0 },
		TargetPath: {
			Position: { x: 225, y: 225 },
			TargetPath: { Position: { x: 1000, y: 225 } }
		}
	}
}

test("preview follows multiple upcoming lane corners instead of ending before the turn", () => {
	const { lines, projections, lookups } = preview({ target: bentRoute() })
	assert.deepEqual(lookups, [{ team: 3, lane: 2 }])
	assert.ok(lines.some(line => line.to.x === 225 && line.to.y === 0))
	assert.ok(lines.some(line => line.to.x === 225 && line.to.y === 225))
	assert.deepEqual(lines.at(-1).to, { x: 525, y: 225 })
	for (const line of lines) {
		assert.ok(
			line.from.x === line.to.x || line.from.y === line.to.y,
			"must not cut diagonally across a lane corner"
		)
	}
	for (const point of projections) {
		assert.equal(point.z, point.x / 10 + point.y / 5)
	}
})

test("upcoming turns stay readable and only the end fades to transparent", () => {
	const { lines } = preview({ target: bentRoute() })
	const secondCorner = lines.find(line => line.to.x === 225 && line.to.y === 225)
	assert.equal(lines[0].alpha, 180)
	assert.equal(secondCorner.alpha, 180)
	assert.equal(lines.at(-1).alpha, 0)
	for (let i = 1; i < lines.length; i++) {
		assert.ok(lines[i].alpha <= lines[i - 1].alpha)
	}
})

test("the route stays visible when the wave badge is off-screen", () => {
	const { lines } = preview({ target: bentRoute(), hideAnchor: true })
	assert.ok(lines.length > 0)
	assert.deepEqual(lines.at(-1).to, { x: 525, y: 225 })
})

test("unavailable routes and HUD-covered segments do not draw", () => {
	assert.deepEqual(preview().lines, [])
	assert.deepEqual(preview({ target: bentRoute(), coversHud: true }).lines, [])
})

test("a cyclic route with coincident corners terminates", () => {
	const target = { Position: { x: 0, y: 0 } }
	target.TargetPath = target
	assert.deepEqual(preview({ target }).lines, [])
})
