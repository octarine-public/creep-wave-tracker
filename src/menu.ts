import { Color, ImageData, Menu } from "github.com/octarine-public/wrapper/index"

const basePath = "github.com/octarine-public/creep-wave-tracker"
export const ScriptsFiles = basePath + "/scripts_files"

class SettingsWorld {
	public readonly Size: Menu.Slider
	public readonly OnlyText: Menu.Toggle

	private readonly tree: Menu.Node
	private readonly icon = ScriptsFiles + "/icons/world.svg"

	constructor(node: Menu.Node) {
		this.tree = node.AddNode("Settings world", this.icon)
		this.OnlyText = this.tree.AddToggle("Only text")
		this.Size = this.tree.AddSlider("Size", 0, 0, 50, 0, "Icon/text size")
	}
}

class SettingsMinimap {
	public readonly Size: Menu.Slider
	public readonly Type: Menu.Dropdown
	public readonly Color: Menu.ColorPicker
	public readonly SiegeColor: Menu.ColorPicker

	private readonly tree: Menu.Node
	private readonly icon = ScriptsFiles + "/icons/marker.svg"

	constructor(node: Menu.Node) {
		this.tree = node.AddNode("Settings minimap", this.icon)
		this.Type = this.tree.AddDropdown("Type", ["Text", "Icon"])
		this.Size = this.tree.AddSlider("Size", 0, 0, 100, 0, "Icon/text size")
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

	private readonly icon = ImageData.Icons.icon_svg_creep
	private readonly tree = Menu.AddEntry("Visual")
	private readonly node = this.tree.AddNode("Creep waves tracker", this.icon)

	constructor() {
		this.node.SortNodes = false
		this.State = this.node.AddToggle("State", true)
		this.World = new SettingsWorld(this.node)
		this.Minimap = new SettingsMinimap(this.node)
	}
}
