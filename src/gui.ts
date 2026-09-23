import { surface } from "../render"
import { MenuManager } from "./menu"

/**
 * The chip a wave wears in the world, in dp at the slider's middle: the card the menu's own
 * panels wear - its glass, its hairline rim, its frost and its halo, whatever the theme set - washed
 * in the colour of the wave's faction, the art of its creep cut round and the count of creeps in
 * it. The slider scales the whole thing about {@link SIZE_BASE}.
 */
const HEIGHT = 34
/**
 * The corner, in dp: the menu's own card radius, which carries the theme's radius scale with it,
 * held to a pill so a wide radius on a low chip never turns its corners inside out.
 */
const RADIUS = Math.min(MenuSDK.HudCardRadius, HEIGHT / 2)
const PAD = 4
/**
 * The room the count keeps to the rim on its side, wider than {@link PAD}: the art sits flush in
 * its disc, and a count set as close to the rim as the disc is looked jammed against it.
 */
const PAD_TEXT = 11
const GAP = 8
const GLYPH = 27
const FONT = 16
const WEIGHT = MenuSDK.HudBold
/** The count written on its own, with no card under it: the size it is read at, in dp. */
const TEXT_ONLY_FONT = 24
/** How deep the glass is washed in the tint over the theme's own colour, out of 255. */
const TINT = 36
/** How dark the outline under a count is cut, 0 to 1: enough to hold on a lit wall, not a black rim. */
const OUTLINE = 0.5
/** The slider value the chip and the mark are drawn at 1:1 on; every notch is a twelfth either way. */
const SIZE_BASE = 4
const SIZE_STEP = 12

/** The minimap's names for a creep and for a siege creep, and the size the icon is drawn at 1:1. */
const MINIMAP_CREEP = "creep"
const MINIMAP_SIEGE = "siege"
const MINIMAP_ICON_SIZE = 260

/** The colour a wave is known by in the world: its faction's own green and red. */
const RadiantTint = new Color(96, 220, 120)
const DireTint = new Color(227, 61, 61)

export function TeamTint(team: Team) {
	return team === Team.Dire ? DireTint : RadiantTint
}

/** The scale the slider at `value` draws at, 1:1 at {@link SIZE_BASE}. */
function ScaleOf(value: number) {
	return (value + SIZE_STEP) / (SIZE_BASE + SIZE_STEP)
}

export class GUI {
	/**
	 * How many cards this frame has carved so far, over every wave. Cards carved by one and the
	 * same shader string share a decorator instance in RmlUi, so each one on the surface has to be
	 * handed a step of its own; the step is invisible.
	 */
	private static carved = 0
	private readonly box = new Rectangle()
	private readonly pos = new Vector2()
	private readonly size = new Vector2()

	/** A frame is starting: no card has been carved on the surface yet. */
	public static BeginFrame() {
		GUI.carved = 0
	}

	/**
	 * The chip over a wave: the card washed in the faction's colour, the creep's art cut round and
	 * the count, or the count on its own where the menu asks for that.
	 */
	public DrawWorld(
		anchor: Vector3,
		team: Team,
		glyph: string,
		count: number,
		menu: MenuManager
	) {
		// the card is laid out at the world scale, so the menu's own scale does not resize it
		MenuSDK.setHudWorldScale(ScaleOf(menu.World.Size.value))
		const w2s = RendererSDK.WorldToScreen(anchor)
		if (w2s === undefined || GUIInfo.Contains(w2s)) {
			return
		}
		const tint = MenuSDK.HudColors.readable(TeamTint(team)),
			text = count.toString()
		MenuSDK.SetActiveSurface(surface)
		try {
			if (menu.World.OnlyText.value) {
				this.countOnly(w2s, text, tint)
			} else {
				this.chip(w2s, glyph, text, tint)
			}
		} finally {
			MenuSDK.SetActiveSurface(undefined)
		}
	}
	/**
	 * The mark of a wave on the minimap: the game's own creep icon under `key`, in the menu's colour
	 * - the siege one where the wave carries a siege creep, scaled to the regular icon's size.
	 */
	public DrawMinimap(
		origin: Vector3,
		hasSiege: boolean,
		key: string,
		menu: MenuManager
	) {
		const icon = this.minimapIconOf(hasSiege)
		MinimapSDK.DrawIcon(
			icon,
			origin,
			MINIMAP_ICON_SIZE *
				ScaleOf(menu.Minimap.Size.value) *
				this.minimapIconScale(icon),
			menu.Minimap.ColorOf(hasSiege),
			0,
			`${key}_${icon}`
		)
	}
	/** The chip: the plate, the creep's art cut round at its left and the count at its right. */
	private chip(w2s: Vector2, glyph: string, text: string, tint: Color) {
		const height = MenuSDK.hudH(HEIGHT),
			pad = MenuSDK.hudW(PAD),
			padText = MenuSDK.hudW(PAD_TEXT),
			gap = MenuSDK.hudW(GAP),
			art = MenuSDK.hudH(GLYPH),
			// digits are measured as zeroes so a changing count does not make the chip breathe
			textW = MenuSDK.HudText.Width(text, FONT, WEIGHT),
			width = Math.round(pad + art + gap + textW + padText),
			x = Math.round(w2s.x - width / 2),
			y = Math.round(w2s.y - height / 2),
			centerY = y + height / 2
		this.plate(x, y, width, height, tint)
		// the art is the creep's portrait: cut round, it sits on the pill like a badge
		this.pos.SetVector(x + pad, Math.round(centerY - art / 2))
		this.size.SetVector(art, art)
		MenuSDK.HudCard.Image(
			glyph,
			this.pos,
			this.size,
			Color.WhiteReadonly,
			255,
			Math.round(art / 2),
			0,
			"cover"
		)
		// the count is read in plain white whatever the faction; its colour stays on the glass
		MenuSDK.HudText.Center(
			x + width - padText - textW,
			centerY,
			textW,
			text,
			FONT,
			Color.WhiteReadonly,
			WEIGHT,
			MenuSDK.EHudTextEffect.Outline,
			undefined,
			OUTLINE
		)
	}
	/** The count on its own, in the faction's colour, cut out against the world under it. */
	private countOnly(w2s: Vector2, text: string, tint: Color) {
		const textW = MenuSDK.HudText.Width(text, TEXT_ONLY_FONT, WEIGHT)
		MenuSDK.HudText.Center(
			Math.round(w2s.x - textW / 2),
			Math.round(w2s.y),
			textW,
			text,
			TEXT_ONLY_FONT,
			tint,
			WEIGHT,
			MenuSDK.EHudTextEffect.Outline,
			undefined,
			OUTLINE
		)
	}
	/**
	 * The plate under the chip: the menu's own card, so the glass, the rim, the blur and the halo are
	 * whatever the theme dresses its panels in, with the faction's colour washed over the glass.
	 */
	private plate(x: number, y: number, w: number, h: number, tint: Color) {
		const radius = MenuSDK.hudRadius(RADIUS)
		this.box.pos1.SetVector(x, y)
		this.box.pos2.SetVector(x + w, y + h)
		MenuSDK.HudCard.Frame(this.box, 255, RADIUS, GUI.carved++)
		MenuSDK.HudCard.Plate(x, y, w, h, radius, tint, MenuSDK.hudAlpha(TINT))
	}
	/** The siege icon where the game's atlas has one, the creep otherwise. */
	private minimapIconOf(hasSiege: boolean) {
		return hasSiege && MinimapSDK.GetIconSize(MINIMAP_SIEGE) !== undefined
			? MINIMAP_SIEGE
			: MINIMAP_CREEP
	}
	/** Compensates for the atlas dimensions while preserving the icon's aspect ratio. */
	private minimapIconScale(icon: string) {
		if (icon === MINIMAP_CREEP) {
			return 1
		}
		const regularSize = MinimapSDK.GetIconSize(MINIMAP_CREEP),
			iconSize = MinimapSDK.GetIconSize(icon)
		if (regularSize === undefined || iconSize === undefined) {
			return 1
		}
		const regularExtent = Math.max(regularSize.x, regularSize.y),
			iconExtent = Math.max(iconSize.x, iconSize.y)
		return regularExtent > 0 && iconExtent > 0 ? regularExtent / iconExtent : 1
	}
}
