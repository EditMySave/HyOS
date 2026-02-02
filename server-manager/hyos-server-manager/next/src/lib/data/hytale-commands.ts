export type ParamType =
  | "string"
  | "number"
  | "boolean"
  | "integer"
  | "double"
  | "player"
  | "world"
  | "position"
  | "item"
  | "block"
  | "blockType"
  | "gamemode"
  | "weather"
  | "enum";

export interface CommandParam {
  name: string;
  type: ParamType;
  required: boolean;
  description: string;
  examples?: string[];
  enumValues?: string[];
  default?: string;
}

export interface HytaleCommand {
  name: string;
  syntax: string;
  description: string;
  category: "admin" | "player" | "world" | "server";
  params?: CommandParam[];
}

export const HYTALE_COMMANDS: HytaleCommand[] = [
  {
    name: "help",
    syntax: "/help [command]",
    description: "Lists all commands or shows help for a specific command",
    category: "server",
  },
  {
    name: "give",
    syntax: "/give <item> [quantity] [metadata]",
    description: "Gives an item to the player",
    category: "player",
    params: [
      {
        name: "item",
        type: "item",
        required: true,
        description: "Item ID to give",
        examples: [
          "Armor Bronze Chest",
          "Rock_Stone",
          "Soil_Grass",
          "Tool_Pickaxe",
        ],
      },
      {
        name: "quantity",
        type: "integer",
        required: false,
        description: "Number of items (default: 1)",
        examples: ["1", "16", "64"],
      },
      {
        name: "metadata",
        type: "string",
        required: false,
        description: "JSON metadata for the item",
        examples: ['{"enchantment": "sharpness", "level": 3}'],
      },
    ],
  },
  {
    name: "time",
    syntax: "/time <set|pause|unpause|dilation> [value]",
    description: "Manage world time",
    category: "world",
  },
  {
    name: "time set",
    syntax: "/time set <0-24>",
    description: "Sets the world time to a specific hour",
    category: "world",
    params: [
      {
        name: "hour",
        type: "integer",
        required: true,
        description: "Hour of day (0-24)",
        examples: ["0", "6", "12", "18", "24"],
      },
    ],
  },
  {
    name: "time pause",
    syntax: "/time pause",
    description: "Pauses time progression",
    category: "world",
  },
  {
    name: "time unpause",
    syntax: "/time unpause",
    description: "Resumes time progression",
    category: "world",
  },
  {
    name: "time dilation",
    syntax: "/time dilation <0.01-4>",
    description: "Changes time dilation (speed of time)",
    category: "world",
    params: [
      {
        name: "value",
        type: "double",
        required: true,
        description: "Time dilation factor (0.01 to 4)",
        examples: ["0.5", "1.0", "2.0", "4.0"],
      },
    ],
  },
  {
    name: "time period day",
    syntax: "/time period day",
    description: "Sets time to day (6 AM)",
    category: "world",
  },
  {
    name: "time period night",
    syntax: "/time period night",
    description: "Sets time to night (8 PM)",
    category: "world",
  },
  {
    name: "time period midnight",
    syntax: "/time period midnight",
    description: "Sets time to midnight",
    category: "world",
  },
  {
    name: "time period midday",
    syntax: "/time period midday",
    description: "Sets time to midday (12 PM)",
    category: "world",
  },
  {
    name: "gamemode",
    syntax: "/gamemode [adventure|creative|a|c] [player]",
    description: "Changes player game mode",
    category: "player",
    params: [
      {
        name: "mode",
        type: "enum",
        required: false,
        description: "Game mode to set",
        enumValues: ["adventure", "creative", "a", "c"],
        examples: ["adventure", "creative", "a", "c"],
      },
      {
        name: "player",
        type: "player",
        required: false,
        description: "Target player (default: self)",
      },
    ],
  },
  {
    name: "gamemode toggle",
    syntax: "/gamemode toggle [player]",
    description: "Toggles between adventure and creative",
    category: "player",
    params: [
      {
        name: "player",
        type: "player",
        required: false,
        description: "Target player (default: self)",
      },
    ],
  },
  {
    name: "world",
    syntax: "/world <subcommand>",
    description: "Root command for world operations",
    category: "world",
  },
  {
    name: "world save",
    syntax: "/world save",
    description: "Saves the current world",
    category: "world",
  },
  {
    name: "world config",
    syntax: "/world config",
    description: "World configuration",
    category: "world",
  },
  {
    name: "world perf",
    syntax: "/world perf",
    description: "World performance info",
    category: "world",
  },
  {
    name: "world prune",
    syntax: "/world prune",
    description: "Prune world data",
    category: "world",
  },
  {
    name: "world setdefault",
    syntax: "/world setdefault [name]",
    description: "Set default world",
    category: "world",
    params: [
      {
        name: "name",
        type: "world",
        required: false,
        description: "World name to set as default",
      },
    ],
  },
  {
    name: "world settings",
    syntax: "/world settings.<key> [value]",
    description: "Get or set world settings",
    category: "world",
  },
  {
    name: "world settings pvp",
    syntax: "/world settings.pvp [true|false]",
    description: "Gets or sets PvP enabled state",
    category: "world",
    params: [
      {
        name: "value",
        type: "boolean",
        required: false,
        description: "Enable or disable PvP",
        examples: ["true", "false"],
      },
    ],
  },
  {
    name: "world settings gamemode",
    syntax: "/world settings.gamemode [mode]",
    description: "Gets or sets default game mode",
    category: "world",
    params: [
      {
        name: "mode",
        type: "gamemode",
        required: false,
        description: "Default game mode for the world",
        examples: ["survival", "creative", "adventure", "spectator"],
      },
    ],
  },
  {
    name: "world settings timepaused",
    syntax: "/world settings.timepaused [true|false]",
    description: "Pause or unpause world time",
    category: "world",
  },
  {
    name: "world settings creativemode",
    syntax: "/world settings.creativemode [true|false]",
    description: "Enable or disable creative mode for world",
    category: "world",
  },
  {
    name: "world settings ticking",
    syntax: "/world settings.ticking [true|false]",
    description: "Enable or disable world ticking",
    category: "world",
  },
  {
    name: "spawning",
    syntax: "/spawning <beacon|marker|stats|populate>",
    description: "Manage NPC spawning",
    category: "world",
  },
  {
    name: "spawning populate",
    syntax: "/spawning populate [environment]",
    description: "Repopulates NPCs in the world",
    category: "world",
    params: [
      {
        name: "environment",
        type: "string",
        required: false,
        description: "Environment to populate (default: all)",
      },
    ],
  },
  {
    name: "spawning stats",
    syntax: "/spawning stats [--verbose]",
    description: "Shows spawning statistics",
    category: "world",
  },
  {
    name: "meta",
    syntax: "/meta [entity|world]",
    description: "Retrieves meta information",
    category: "server",
  },
  {
    name: "meta chunk",
    syntax: "/meta chunk",
    description: "Prints MetaStore of current WorldChunk",
    category: "server",
  },
  {
    name: "meta dump",
    syntax: "/meta dump",
    description: "Dumps all registered commands to a file",
    category: "server",
  },
  {
    name: "ambience",
    syntax: "/ambience",
    description: "Manage ambience in worlds",
    category: "world",
  },
  {
    name: "assets",
    syntax: "/assets",
    description: "Commands related to assets",
    category: "server",
  },
  {
    name: "backup",
    syntax: "/backup",
    description: "Run a backup of the universe",
    category: "server",
  },
  {
    name: "block",
    syntax: "/block",
    description: "Block-related commands",
    category: "world",
  },
  {
    name: "blockset",
    syntax: "/blockset",
    description: "List block sets and contents",
    category: "world",
  },
  {
    name: "settimeandgohome",
    syntax: "/settimeandgohome <timeOfDay> [world]",
    description: "Set time of day and teleport to a world",
    category: "player",
    params: [
      {
        name: "timeOfDay",
        type: "integer",
        required: true,
        description: "Time of day in ticks",
        examples: ["0", "6000", "12000", "18000"],
      },
      {
        name: "world",
        type: "world",
        required: false,
        description: "Target world (default: Default)",
      },
    ],
  },
  {
    name: "list",
    syntax: "/list",
    description: "Lists players currently on the server",
    category: "server",
  },
];

export function getActiveParam(
  command: HytaleCommand,
  input: string
): { param: CommandParam; index: number } | null {
  if (!command.params?.length) return null;

  const trimmed = input.trim();
  if (!trimmed.startsWith("/")) return null;

  const tokens = trimmed.split(/\s+/);
  const cmdTokenCount = command.name.split(" ").length;
  const paramTokenCount = tokens.length - cmdTokenCount;

  const startingNew = input.endsWith(" ");
  const activeIndex = startingNew
    ? paramTokenCount
    : Math.max(0, paramTokenCount - 1);

  if (activeIndex >= 0 && activeIndex < command.params.length) {
    return { param: command.params[activeIndex], index: activeIndex };
  }
  return null;
}

const STORAGE_KEY = "hyos-recent-commands";
const MAX_RECENT = 10;

export function loadRecentCommands(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string").slice(0, MAX_RECENT)
      : [];
  } catch {
    return [];
  }
}

export function saveRecentCommands(commands: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(commands.slice(0, MAX_RECENT))
    );
  } catch {
    // ignore
  }
}
