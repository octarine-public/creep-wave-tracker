import { canvas } from "../render"
import { MenuManager, ScriptsFiles } from "./menu"

export class GUI {
	private static readonly iconArmor = ScriptsFiles + "/icons/shield-check.svg"
	private static readonly bgBad = ScriptsFiles + "/images/gradient_bad.png"
	private static readonly bgGood = ScriptsFiles + "/images/gradient_good.png"

	public DrawMinimap(
		menu: MenuManager,
		origin: Vector3,
		count: number = 0,
		hasSiege: boolean
	) {
		const size = (menu.Minimap.Size.value + 40) * 10
		switch (menu.Minimap.Type.SelectedID) {
			case 0:
				this.minimapText(menu, count, size, origin)
				break
			default:
				this.minimapIcon(menu, size, hasSiege, origin)
				break
		}
	}
	public DrawWorld(
		menu: MenuManager,
		origin: Vector3,
		countCreeps: number = 0,
		team: Team,
		hasSiege: boolean
	) {
		const position = this.GetRectangle(origin, menu)
		if (position === undefined) {
			return
		}
		if (menu.World.OnlyText.value) {
			this.countCreeps(position, countCreeps)
			return
		}
		this.background(position, team)
		this.iconShield(position, hasSiege)
		this.emoji(position, team)
		this.countCreeps(position, countCreeps)
	}
	protected GetRectangle(origin: Vector3, menu: MenuManager): Nullable<Rectangle> {
		const w2s = RendererSDK.WorldToScreen(origin)
		if (w2s === undefined || this.сontainsHUD(w2s)) {
			return
		}
		const size = menu.World.Size.value + 32
		const vecSize = GUIInfo.ScaleVector(size, size)
		const position = new Rectangle(w2s, w2s.Add(vecSize))
		position.x -= position.Width / 2
		position.y -= position.Height / 2
		return position
	}
	private iconShield(rec: Rectangle, hasSiege: boolean = false) {
		if (!hasSiege) {
			return
		}
		const position = rec.Clone()
		position.AddY(position.Height / 2)
		position.Width /= 2
		position.Height /= 2
		position.AddX(position.Width / 2)
		position.AddY(position.Width)
		canvas.Image(GUI.iconArmor, position.pos1, position.Size, { color: Color.Aqua })
	}
	private countCreeps(rec: Rectangle, count: number, onlyText: boolean = false) {
		if (onlyText) {
			canvas.TextIn(`${count}`, rec, {
				color: Color.White,
				size: rec.Height / 1.2 + 4
			})
			return
		}
		const position = rec.Clone()
		position.SubtractY(position.Height / 2)
		canvas.TextIn(`${count}`, position, {
			color: Color.White,
			size: position.Height / 2 + 4
		})
	}
	private emoji(rec: Rectangle, team: Team) {
		const position = rec.Clone(),
			frameIdx = (hrtime() / 100) | 0,
			path = `panorama/images/emoticons/${this.getEmojiName(team)}_png.vtex_c`
		canvas.Sprite(path, position.pos1, position.Size, frameIdx)
	}
	private background(rec: Rectangle, team: Team) {
		const position = rec.Clone()
		position.Width *= 1.3
		position.Height *= 1.3
		position.x -= position.Width / 8
		position.y -= position.Height / 8

		const color = team === Team.Radiant ? Color.Green : Color.Red,
			image = team === Team.Radiant ? GUI.bgGood : GUI.bgBad

		canvas.Image(image, position.pos1, position.Size, {
			color: Color.White.SetA(200),
			circle: true
		})
		canvas.Circle(position.pos1, position.Size, {
			color: Color.fromUint32(0),
			borderColor: color,
			borderWidth: 6
		})
	}
	private getEmojiName(team: Team) {
		return team === Team.Radiant ? "creepdance" : "creep_complain"
	}
	private minimapText(
		menu: MenuManager,
		count: number,
		size: number,
		position: Vector3,
		hasSiege: boolean = false
	) {
		const anyColor = menu.Minimap.Color.SelectedColor,
			siegeColor = menu.Minimap.SiegeColor.SelectedColor
		if (hasSiege) {
			MinimapSDK.DrawIcon("shield", position, size * 1.5, siegeColor)
		}
		const text = `${count}`
		if (count < 10) {
			MinimapSDK.DrawIcon(text, position, size, anyColor)
			return
		}
		const countArr = text.split("", count)
		MinimapSDK.DrawIcon(
			countArr[0],
			position.Clone().SubtractScalarX(size / 2),
			size,
			anyColor
		)
		MinimapSDK.DrawIcon(
			countArr[1],
			position.Clone().AddScalarX(size / 2),
			size,
			anyColor
		)
	}
	private minimapIcon(
		menu: MenuManager,
		size: number,
		hasSiege: boolean,
		position: Vector3
	) {
		const anyColor = menu.Minimap.Color.SelectedColor,
			siegeColor = menu.Minimap.SiegeColor.SelectedColor
		if (!hasSiege) {
			MinimapSDK.DrawIcon("siege", position, size * 2, anyColor)
			return
		}
		MinimapSDK.DrawIcon("shield", position, size / 1.5, siegeColor)
	}
	private сontainsHUD(position: Vector2): boolean {
		return (
			GUIInfo.ContainsShop(position) ||
			GUIInfo.ContainsMiniMap(position) ||
			GUIInfo.ContainsLowerHUD(position) ||
			GUIInfo.ContainsScoreboard(position)
		)
	}
}
