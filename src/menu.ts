import { CreepWaveIcons } from "./icons"

const NODE_NAME = "Creep waves"
/** The node the page stood under, and the name it had there, before it came out to the tab. */
const OLD_PARENT = "Maphack"
const OLD_NAME = "Creep waves tracker"

/** The chip a wave wears in the world. */
class WorldMenu {
	public readonly Tree: Menu.Node
	/** The count on its own, with no card under it and no art beside it. */
	public readonly OnlyText: Menu.Toggle
	public readonly Size: Menu.Slider

	constructor(node: Menu.Node) {
		this.Tree = node.AddNode(
			"World",
			CreepWaveIcons.World,
			"The chip over a wave in the fog:\nthe creep's art and the count"
		)
		this.Tree.SortNodes = false

		this.OnlyText = this.Tree.AddToggle(
			"Only text",
			false,
			"The count on its own,\nwithout the card and the creep's art"
		)
		this.OnlyText.IconPath = CreepWaveIcons.OnlyText

		// the chip is drawn 1:1 at the middle of the range; the old 0-50 size does not carry over
		this.Size = this.Tree.AddSlider(
			"Size in world",
			4,
			0,
			8,
			0,
			"Size of the chip drawn over a wave"
		)
		this.Size.IconPath = CreepWaveIcons.Size
	}
}

/** The icon a wave leaves on the minimap. */
class MinimapMenu {
	public readonly Tree: Menu.Node
	public readonly Size: Menu.Slider
	public readonly Color: Menu.ColorPicker
	/** Whether a wave with a siege creep in it is marked in a colour of its own, and which. */
	public readonly MarkSiege: Menu.Toggle
	public readonly SiegeColor: Menu.ColorPicker

	constructor(node: Menu.Node) {
		this.Tree = node.AddNode(
			"Minimap",
			CreepWaveIcons.Minimap,
			"The creep icon of a wave on the minimap"
		)
		this.Tree.SortNodes = false

		// the icon is drawn 1:1 at the middle of the range; the old 0-100 size does not carry over
		this.Size = this.Tree.AddSlider(
			"Size on minimap",
			4,
			0,
			8,
			0,
			"Size of the icon on the minimap"
		)
		this.Size.IconPath = CreepWaveIcons.Size

		this.Color = this.Tree.AddColorPicker(
			"Color",
			Color.Aqua,
			"The colour of the icon"
		)
		this.Color.IconPath = CreepWaveIcons.Color

		// the colour rides the switch's own row: off, every wave wears the colour above
		this.MarkSiege = this.Tree.AddToggle(
			"Mark siege waves",
			true,
			"A wave with a siege creep in it\nwears a colour of its own"
		)
		this.MarkSiege.IconPath = CreepWaveIcons.Siege
		this.SiegeColor = this.Tree.AddColorPicker("Siege color", new Color(255, 170, 60))
		this.MarkSiege.PairColors(this.SiegeColor)
	}

	/** The colour a wave is marked in: the siege one where it carries a siege creep and the row asks. */
	public ColorOf(hasSiege: boolean): Color {
		return hasSiege && this.MarkSiege.value
			? this.SiegeColor.SelectedColor
			: this.Color.SelectedColor
	}
}

export class MenuManager {
	public static Menu: MenuManager

	public readonly State: Menu.Toggle
	public readonly World: WorldMenu
	public readonly Minimap: MinimapMenu

	private readonly tree = Menu.AddEntry("Visual")
	private readonly node = this.tree.AddNode(
		NODE_NAME,
		CreepWaveIcons.Waves,
		"Enemy creep waves in the fog,\nover the lane and on the minimap"
	)

	constructor() {
		this.node.SortNodes = false
		// a config written while the page stood under "Maphack", under its old name, keeps
		// its values where the page stands now, and the rows renamed since keep theirs
		MenuSDK.AddConfigMigration(raw =>
			this.migrate(
				MenuManager.carryOver(MenuSDK.ConfigSubtreeOf(raw, this.tree.entry))
			)
		)
		this.node.entry.stored =
			MenuManager.carryOver(this.tree.entry.stored) ?? this.node.entry.stored
		this.migrate(this.node.entry.stored)

		// the script's own switch rides the top bar beside the breadcrumb and gates the page
		this.State = this.node.AddToggle("State", true)
		this.State.IconPath = CreepWaveIcons.State
		this.node.HeaderControl = this.State
		this.node.Gate = this.State

		this.World = new WorldMenu(this.node)
		this.Minimap = new MinimapMenu(this.node)

		MenuManager.Menu = this
	}

	/**
	 * Carries the page's rows out of the tree it used to stand in, under the name it used to
	 * have, over to where it stands now. Idempotent, as a config migration must be: a config
	 * already holding the page at its new place keeps what it has there, and the old key goes
	 * either way.
	 * @returns the rows at their new place, for a menu built after the config landed.
	 */
	private static carryOver(
		parent: Nullable<MenuSDK.ConfigObject>
	): Nullable<MenuSDK.ConfigObject> {
		if (parent === undefined) {
			return undefined
		}
		const existing = parent[NODE_NAME]
		if (existing !== undefined && MenuManager.objectOf(existing) === undefined) {
			return undefined
		}
		const oldParent = MenuManager.objectOf(parent[OLD_PARENT])
		const saved = MenuManager.objectOf(oldParent?.[OLD_NAME])
		if (oldParent !== undefined && saved !== undefined) {
			parent[NODE_NAME] ??= saved
			delete oldParent[OLD_NAME]
		}
		return MenuManager.objectOf(parent[NODE_NAME])
	}
	/** The rows a stored config keeps under a node, or nothing when the value is not a node. */
	private static objectOf(value: unknown): Nullable<MenuSDK.ConfigObject> {
		return typeof value === "object" && value !== null && !Array.isArray(value)
			? (value as MenuSDK.ConfigObject)
			: undefined
	}
	/** The sections and the rows renamed since the first release keep their saved values. */
	private migrate(stored: Nullable<MenuSDK.ConfigObject>) {
		if (stored === undefined) {
			return
		}
		MenuSDK.RenameStoredRow(stored, "Settings world", "World")
		MenuSDK.RenameStoredRow(stored, "Settings minimap", "Minimap")
	}
}
