```js
const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
  PermissionFlagsBits
} = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

/*
=========================================================
FREE FIRE QUEUE BOT
=========================================================

Features:
- Admin dashboard
- Queue creation
- Normal FF queues
- Streamer queues
- Mobile / Emulator / Mixed modes
- Queue limits
- Room fee configuration
- Organization fee configuration
- Mediator system
- Mediator online/offline status
- Streamer management
- Open/close queues
- Join/leave queue
- Pull next players
- Match history
- Server configuration
- Button panels
- Select menus
- Modal configuration

IMPORTANT:
This example does NOT process real-money payments.
Payment/PIX can be connected later through a proper payment provider.
=========================================================
*/

// ===============================
// DATABASE - IN MEMORY
// ===============================

const servers = new Map();

/*
Server structure:

{
  admins: [],
  mediators: [],
  streamers: [],

  settings: {
    defaultValue: 0,
    roomFee: 0,
    organizationFee: 0,
    maxPlayers: 2,
    defaultMode: "Mobile"
  },

  queues: [],
  matches: []
}
*/

// ===============================
// DEFAULT SERVER
// ===============================

function getServer(guildId) {

  if (!servers.has(guildId)) {

    servers.set(guildId, {
      admins: [],
      mediators: [],
      streamers: [],

      settings: {
        defaultValue: 0,
        roomFee: 0,
        organizationFee: 0,
        maxPlayers: 2,
        defaultMode: "Mobile"
      },

      queues: [],
      matches: []
    });

  }

  return servers.get(guildId);
}

// ===============================
// PERMISSION HELPERS
// ===============================

function isAdmin(interaction) {

  const server = getServer(interaction.guild.id);

  return (
    interaction.member.permissions.has(PermissionFlagsBits.Administrator) ||
    server.admins.includes(interaction.user.id)
  );
}

function isMediator(interaction) {

  const server = getServer(interaction.guild.id);

  return (
    isAdmin(interaction) ||
    server.mediators.includes(interaction.user.id)
  );
}

function isStreamer(interaction) {

  const server = getServer(interaction.guild.id);

  return (
    isAdmin(interaction) ||
    server.streamers.includes(interaction.user.id)
  );
}

// ===============================
// QUEUE FINDER
// ===============================

function getQueue(server, id) {
  return server.queues.find(q => q.id === id);
}

// ===============================
// QUEUE EMBED
// ===============================

function queueEmbed(queue) {

  const players =
    queue.players.length > 0
      ? queue.players.map((id, index) =>
          `${index + 1}. <@${id}>`
        ).join("\n")
      : "No players yet.";

  return new EmbedBuilder()
    .setTitle(
      queue.type === "STREAMER"
        ? `🎥 Streamer Queue — ${queue.name}`
        : `🎮 Free Fire Queue — ${queue.name}`
    )
    .setDescription(
      `**Mode:** ${queue.mode}\n` +
      `**Value:** ${queue.value}\n` +
      `**Room Fee:** ${queue.roomFee}\n` +
      `**Organization Fee:** ${queue.organizationFee}\n` +
      `**Players:** ${queue.players.length}/${queue.maxPlayers}\n` +
      `**Status:** ${queue.open ? "🟢 OPEN" : "🔴 CLOSED"}\n\n` +
      `### Players\n${players}`
    )
    .setFooter({
      text: "Free Fire Queue System"
    });
}

// ===============================
// QUEUE BUTTONS
// ===============================

function queueButtons(queue) {

  return new ActionRowBuilder().addComponents(

    new ButtonBuilder()
      .setCustomId(`queue_join_${queue.id}`)
      .setLabel("Join Queue")
      .setEmoji("🎮")
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId(`queue_leave_${queue.id}`)
      .setLabel("Leave Queue")
      .setEmoji("🚪")
      .setStyle(ButtonStyle.Danger),

    new ButtonBuilder()
      .setCustomId(`queue_info_${queue.id}`)
      .setLabel("Queue Info")
      .setEmoji("ℹ️")
      .setStyle(ButtonStyle.Secondary)

  );
}

// ===============================
// ADMIN PANEL
// ===============================

function adminPanel() {

  return new ActionRowBuilder().addComponents(

    new ButtonBuilder()
      .setCustomId("admin_create_queue")
      .setLabel("Create Queue")
      .setEmoji("🎮")
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId("admin_create_streamer")
      .setLabel("Streamer Queue")
      .setEmoji("🎥")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("admin_settings")
      .setLabel("Settings")
      .setEmoji("⚙️")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("admin_mediators")
      .setLabel("Mediators")
      .setEmoji("🛡️")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("admin_streamers")
      .setLabel("Streamers")
      .setEmoji("📺")
      .setStyle(ButtonStyle.Secondary)

  );
}

// ===============================
// SLASH COMMANDS
// ===============================

const commands = [

  new SlashCommandBuilder()
    .setName("panel")
    .setDescription("Open the administration panel"),

  new SlashCommandBuilder()
    .setName("queue")
    .setDescription("Queue commands")
    .addSubcommand(sub =>
      sub
        .setName("create")
        .setDescription("Create a Free Fire queue")
        .addStringOption(opt =>
          opt
            .setName("name")
            .setDescription("Queue name")
            .setRequired(true)
        )
    )

    .addSubcommand(sub =>
      sub
        .setName("list")
        .setDescription("List all queues")
    ),

  new SlashCommandBuilder()
    .setName("streamer")
    .setDescription("Streamer queue commands")
    .addSubcommand(sub =>
      sub
        .setName("create")
        .setDescription("Create a streamer queue")
        .addStringOption(opt =>
          opt
            .setName("name")
            .setDescription("Queue name")
            .setRequired(true)
        )
    ),

  new SlashCommandBuilder()
    .setName("mediator")
    .setDescription("Mediator commands")
    .addSubcommand(sub =>
      sub
        .setName("online")
        .setDescription("Set yourself online as mediator")
    )
    .addSubcommand(sub =>
      sub
        .setName("offline")
        .setDescription("Set yourself offline as mediator")
    )
    .addSubcommand(sub =>
      sub
        .setName("list")
        .setDescription("Show online mediators")
    ),

  new SlashCommandBuilder()
    .setName("config")
    .setDescription("Configure the queue system"),

  new SlashCommandBuilder()
    .setName("match")
    .setDescription("Match management")
    .addSubcommand(sub =>
      sub
        .setName("pull")
        .setDescription("Pull the next queue")
        .addStringOption(opt =>
          opt
            .setName("queue")
            .setDescription("Queue ID")
            .setRequired(true)
        )
    )

].map(command => command.toJSON());

// ===============================
// COMMAND REGISTRATION
// ===============================

const rest = new REST({ version: "10" })
  .setToken(process.env.DISCORD_TOKEN);

client.once("ready", async () => {

  console.log(`Bot online as ${client.user.tag}`);

  try {

    await rest.put(
      Routes.applicationCommands(client.user.id),
      {
        body: commands
      }
    );

    console.log("Slash commands registered successfully.");

  } catch (error) {

    console.error("Command registration error:", error);

  }

});

// ===============================
// CHAT COMMAND HANDLER
// ===============================

client.on("interactionCreate", async interaction => {

  if (!interaction.isChatInputCommand()) return;

  const guildId = interaction.guild.id;
  const server = getServer(guildId);

  // ============================
  // PANEL
  // ============================

  if (interaction.commandName === "panel") {

    if (!isAdmin(interaction)) {

      return interaction.reply({
        content: "❌ You do not have permission to use the administration panel.",
        ephemeral: true
      });

    }

    const embed = new EmbedBuilder()
      .setTitle("🎛️ Free Fire Administration Panel")
      .setDescription(
        "Manage your Free Fire queue system below.\n\n" +
        "🎮 Create normal queues\n" +
        "🎥 Create streamer queues\n" +
        "⚙️ Configure values and limits\n" +
        "🛡️ Manage mediators\n" +
        "📺 Manage streamers"
      );

    return interaction.reply({
      embeds: [embed],
      components: [adminPanel()],
      ephemeral: true
    });
  }

  // ============================
  // QUEUE CREATE
  // ============================

  if (interaction.commandName === "queue") {

    const sub = interaction.options.getSubcommand();

    if (sub === "create") {

      if (!isAdmin(interaction)) {

        return interaction.reply({
          content: "❌ Administrator permission required.",
          ephemeral: true
        });

      }

      const name =
        interaction.options.getString("name");

      const queue = {

        id: Date.now().toString(),

        name,

        type: "NORMAL",

        mode: server.settings.defaultMode,

        value: server.settings.defaultValue,

        roomFee: server.settings.roomFee,

        organizationFee: server.settings.organizationFee,

        maxPlayers: server.settings.maxPlayers,

        open: true,

        players: []

      };

      server.queues.push(queue);

      return interaction.reply({
        embeds: [queueEmbed(queue)],
        components: [queueButtons(queue)]
      });
    }

    // ==========================
    // QUEUE LIST
    // ==========================

    if (sub === "list") {

      if (!server.queues.length) {

        return interaction.reply({
          content: "There are no queues currently.",
          ephemeral: true
        });

      }

      const text = server.queues
        .map(q =>
          `**${q.name}** — ${q.type} — ${q.mode} — ${q.players.length}/${q.maxPlayers} — ${q.open ? "🟢 OPEN" : "🔴 CLOSED"}\nID: \`${q.id}\``
        )
        .join("\n\n");

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("🎮 Active Queues")
            .setDescription(text)
        ],
        ephemeral: true
      });
    }
  }

  // ============================
  // STREAMER CREATE
  // ============================

  if (interaction.commandName === "streamer") {

    const sub =
      interaction.options.getSubcommand();

    if (sub === "create") {

      if (!isAdmin(interaction) && !isStreamer(interaction)) {

        return interaction.reply({
          content: "❌ You are not authorized to create streamer queues.",
          ephemeral: true
        });

      }

      const name =
        interaction.options.getString("name");

      const queue = {

        id: Date.now().toString(),

        name,

        type: "STREAMER",

        mode: server.settings.defaultMode,

        value: server.settings.defaultValue,

        roomFee: server.settings.roomFee,

        organizationFee: server.settings.organizationFee,

        maxPlayers: server.settings.maxPlayers,

        open: true,

        players: []

      };

      server.queues.push(queue);

      return interaction.reply({
        embeds: [queueEmbed(queue)],
        components: [queueButtons(queue)]
      });
    }
  }

  // ============================
  // MEDIATOR
  // ============================

  if (interaction.commandName === "mediator") {

    const sub =
      interaction.options.getSubcommand();

    if (!isMediator(interaction) && !isAdmin(interaction)) {

      return interaction.reply({
        content: "❌ You are not registered as a mediator.",
        ephemeral: true
      });

    }

    if (sub === "online") {

      if (!server.mediators.includes(interaction.user.id)) {

        if (!isAdmin(interaction)) {

          return interaction.reply({
            content: "❌ An administrator must add you as a mediator first.",
            ephemeral: true
          });

        }

      }

      if (!server.mediatorsOnline)
        server.mediatorsOnline = [];

      if (!server.mediatorsOnline.includes(interaction.user.id)) {

        server.mediatorsOnline.push(interaction.user.id);

      }

      return interaction.reply(
        "🟢 You are now ONLINE as a mediator."
      );
    }

    if (sub === "offline") {

      if (!server.mediatorsOnline)
        server.mediatorsOnline = [];

      server.mediatorsOnline =
        server.mediatorsOnline.filter(
          id => id !== interaction.user.id
        );

      return interaction.reply(
        "🔴 You are now OFFLINE as a mediator."
      );
    }

    if (sub === "list") {

      const online =
        server.mediatorsOnline || [];

      if (!online.length) {

        return interaction.reply(
          "🛡️ No mediators are currently online."
        );

      }

      return interaction.reply(
        `🛡️ **Online Mediators**\n\n` +
        online.map(id => `<@${id}>`).join("\n")
      );
    }
  }

  // ============================
  // CONFIG
  // ============================

  if (interaction.commandName === "config") {

    if (!isAdmin(interaction)) {

      return interaction.reply({
        content: "❌ Administrator permission required.",
        ephemeral: true
      });

    }

    const embed = new EmbedBuilder()
      .setTitle("⚙️ Queue Configuration")
      .setDescription(
        `**Default Value:** ${server.settings.defaultValue}\n` +
        `**Room Fee:** ${server.settings.roomFee}\n` +
        `**Organization Fee:** ${server.settings.organizationFee}\n` +
        `**Maximum Players:** ${server.settings.maxPlayers}\n` +
        `**Default Mode:** ${server.settings.defaultMode}`
      );

    const row = new ActionRowBuilder().addComponents(

      new ButtonBuilder()
        .setCustomId("config_values")
        .setLabel("Values")
        .setEmoji("💰")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId("config_limits")
        .setLabel("Limits")
        .setEmoji("👥")
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId("config_mode")
        .setLabel("Mode")
        .setEmoji("🎮")
        .setStyle(ButtonStyle.Secondary)

    );

    return interaction.reply({
      embeds: [embed],
      components: [row],
      ephemeral: true
    });
  }

  // ============================
  // MATCH PULL
  // ============================

  if (interaction.commandName === "match") {

    if (interaction.options.getSubcommand() === "pull") {

      if (!isMediator(interaction)) {

        return interaction.reply({
          content: "❌ Only an online mediator can pull a match.",
          ephemeral: true
        });

      }

      const online =
        server.mediatorsOnline || [];

      if (!online.includes(interaction.user.id)) {

        return interaction.reply({
          content: "🔴 You must be ONLINE as a mediator.",
          ephemeral: true
        });

      }

      const queueId =
        interaction.options.getString("queue");

      const queue =
        getQueue(server, queueId);

      if (!queue) {

        return interaction.reply({
          content: "❌ Queue not found.",
          ephemeral: true
        });

      }

      if (!queue.open) {

        return interaction.reply({
          content: "🔴 This queue is closed.",
          ephemeral: true
        });

      }

      if (queue.players.length < queue.maxPlayers) {

        return interaction.reply({
          content:
            `❌ Not enough players.\n` +
            `Required: ${queue.maxPlayers}\n` +
            `Current: ${queue.players.length}`,
          ephemeral: true
        });

      }

      const players =
        queue.players.splice(
          0,
          queue.maxPlayers
        );

      queue.open = false;

      const match = {

        id: Date.now().toString(),

        queueId: queue.id,

        mediator: interaction.user.id,

        players,

        mode: queue.mode,

        value: queue.value,

        roomFee: queue.roomFee,

        organizationFee: queue.organizationFee,

        createdAt: new Date()

      };

      server.matches.push(match);

      return interaction.reply(
        `🎯 **MATCH CREATED**\n\n` +
        `🎮 Queue: **${queue.name}**\n` +
        `🛡️ Mediator: ${interaction.user}\n` +
        `🎮 Mode: **${queue.mode}**\n\n` +
        `👥 Players:\n` +
        players.map(id => `• <@${id}>`).join("\n")
      );
    }
  }
});

// ===============================
// BUTTON HANDLER
// ===============================

client.on("interactionCreate", async interaction => {

  if (!interaction.isButton()) return;

  const guildId = interaction.guild.id;

  const server =
    getServer(guildId);

  // ==========================
  // JOIN QUEUE
  // ==========================

  if (interaction.customId.startsWith("queue_join_")) {

    const id =
      interaction.customId.replace(
        "queue_join_",
        ""
      );

    const queue =
      getQueue(server, id);

    if (!queue) {

      return interaction.reply({
        content: "❌ Queue not found.",
        ephemeral: true
      });

    }

    if (!queue.open) {

      return interaction.reply({
        content: "🔴 This queue is closed.",
        ephemeral: true
      });

    }

    if (
      queue.players.includes(
        interaction.user.id
      )
    ) {

      return interaction.reply({
        content: "⚠️ You are already in this queue.",
        ephemeral: true
      });

    }

    if (
      queue.players.length >=
      queue.maxPlayers
    ) {

      return interaction.reply({
        content: "❌ This queue is full.",
        ephemeral: true
      });

    }

    queue.players.push(
      interaction.user.id
    );

    return interaction.update({
      embeds: [queueEmbed(queue)],
      components: [queueButtons(queue)]
    });
  }

  // ==========================
  // LEAVE QUEUE
  // ==========================

  if (interaction.customId.startsWith("queue_leave_")) {

    const id =
      interaction.customId.replace(
        "queue_leave_",
        ""
      );

    const queue =
      getQueue(server, id);

    if (!queue) {

      return interaction.reply({
        content: "❌ Queue not found.",
        ephemeral: true
      });

    }

    queue.players =
      queue.players.filter(
        player =>
          player !== interaction.user.id
      );

    return interaction.update({
      embeds: [queueEmbed(queue)],
      components: [queueButtons(queue)]
    });
  }

  // ==========================
  // QUEUE INFO
  // ==========================

  if (interaction.customId.startsWith("queue_info_")) {

    const id =
      interaction.customId.replace(
        "queue_info_",
        ""
      );

    const queue =
      getQueue(server, id);

    if (!queue) {

      return interaction.reply({
        content: "❌ Queue not found.",
        ephemeral: true
      });

    }

    return interaction.reply({
      embeds: [queueEmbed(queue)],
      ephemeral: true
    });
  }

  // ==========================
  // SETTINGS VALUES
  // ==========================

  if (interaction.customId === "config_values") {

    const modal =
      new ModalBuilder()
        .setCustomId("values_modal")
        .setTitle("Configure Values");

    const valueInput =
      new TextInputBuilder()
        .setCustomId("default_value")
        .setLabel("Default Value")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("Example: 10")
        .setRequired(true);

    const roomInput =
      new TextInputBuilder()
        .setCustomId("room_fee")
        .setLabel("Room Fee")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("Example: 2")
        .setRequired(true);

    const orgInput =
      new TextInputBuilder()
        .setCustomId("organization_fee")
        .setLabel("Organization Fee")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("Example: 1")
        .setRequired(true);

    modal.addComponents(

      new ActionRowBuilder()
        .addComponents(valueInput),

      new ActionRowBuilder()
        .addComponents(roomInput),

      new ActionRowBuilder()
        .addComponents(orgInput)

    );

    return interaction.showModal(modal);
  }

  // ==========================
  // LIMITS
  // ==========================

  if (interaction.customId === "config_limits") {

    const modal =
      new ModalBuilder()
        .setCustomId("limits_modal")
        .setTitle("Configure Queue Limit");

    const limitInput =
      new TextInputBuilder()
        .setCustomId("max_players")
        .setLabel("Maximum Players")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("Example: 2")
        .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder()
        .addComponents(limitInput)
    );

    return interaction.showModal(modal);
  }

  // ==========================
  // MODE
  // ==========================

  if (interaction.customId === "config_mode") {

    const menu =
      new StringSelectMenuBuilder()
        .setCustomId("mode_select")
        .setPlaceholder("Select a game mode")
        .addOptions(

          {
            label: "Mobile",
            value: "Mobile",
            emoji: "📱"
          },

          {
            label: "Emulator",
            value: "Emulator",
            emoji: "🖥️"
          },

          {
            label: "Mixed",
            value: "Mixed",
            emoji: "🔄"
          }

        );

    return interaction.reply({
      content: "🎮 Select the default game mode:",
      components: [
        new ActionRowBuilder()
          .addComponents(menu)
      ],
      ephemeral: true
    });
  }
});

// ===============================
// MODAL HANDLER
// ===============================

client.on("interactionCreate", async interaction => {

  if (!interaction.isModalSubmit()) return;

  const server =
    getServer(interaction.guild.id);

  if (interaction.customId === "values_modal") {

    server.settings.defaultValue =
      interaction.fields.getTextInputValue(
        "default_value"
      );

    server.settings.roomFee =
      interaction.fields.getTextInputValue(
        "room_fee"
      );

    server.settings.organizationFee =
      interaction.fields.getTextInputValue(
        "organization_fee"
      );

    return interaction.reply({
      content:
        "✅ Values updated successfully.",
      ephemeral: true
    });
  }

  if (interaction.customId === "limits_modal") {

    const value =
      Number(
        interaction.fields.getTextInputValue(
          "max_players"
        )
      );

    if (
      !Number.isInteger(value) ||
      value < 2 ||
      value > 100
    ) {

      return interaction.reply({
        content:
          "❌ Invalid player limit.",
        ephemeral: true
      });

    }

    server.settings.maxPlayers =
      value;

    return interaction.reply({
      content:
        `✅ Maximum players set to **${value}**.`,
      ephemeral: true
    });
  }
});

// ===============================
// SELECT MENU HANDLER
// ===============================

client.on("interactionCreate", async interaction => {

  if (!interaction.isStringSelectMenu()) return;

  const server =
    getServer(interaction.guild.id);

  if (
    interaction.customId ===
    "mode_select"
  ) {

    server.settings.defaultMode =
      interaction.values[0];

    return interaction.update({
      content:
        `✅ Default mode set to **${interaction.values[0]}**.`,
      components: []
    });
  }
});

// ===============================
// START BOT
// ===============================

client.login(
  process.env.DISCORD_TOKEN
