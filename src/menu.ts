import { Color, ImageData, Menu } from "github.com/octarine-public/wrapper/index"

class SettingsWorld {
	public readonly Size: Menu.Slider
	private readonly tree: Menu.Node

	constructor(node: Menu.Node) {
		this.tree = node.AddNode("Settings world")
		this.Size = this.tree.AddSlider("Size", 0, 0, 50)
	}
}

class SettingsMinimap {
	public readonly Size: Menu.Slider
	public readonly Type: Menu.Dropdown
	public readonly Color: Menu.ColorPicker
	public readonly SiegeColor: Menu.ColorPicker

	private readonly tree: Menu.Node

	constructor(node: Menu.Node) {
		this.tree = node.AddNode("Settings minimap")
		this.Type = this.tree.AddDropdown("Type", ["Icon", "Text"])
		this.Size = this.tree.AddSlider("Size", 0, 0, 100, 1, "Icon/text size")
		this.Color = this.tree.AddColorPicker("Color", Color.Aqua, "Icon/text color")
		this.SiegeColor = this.tree.AddColorPicker(
			"Siege color",
			Color.LightGray,
			"Siege icon color"
		)
	}
}

export class MenuManager {
	public readonly State: Menu.Toggle
	public readonly World: SettingsWorld
	public readonly Minimap: SettingsMinimap

	private readonly tree = Menu.AddEntry("Visual")
	private readonly node = this.tree.AddNode(
		"Creep Wave Tracker",
		ImageData.Icons.icon_svg_creep
	)

	constructor() {
		this.node.SortNodes = false
		this.State = this.node.AddToggle("State", true)

		this.World = new SettingsWorld(this.node)
		this.Minimap = new SettingsMinimap(this.node)
	}
}
