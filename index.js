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
  EmbedBuilder,
  PermissionFlagsBits,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder
} = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const database = new Map();

function getServer(guildId) {
  if (!database.has(guildId)) {
    database.set(guildId, {
      admins: [],
      mediators: [],
      onlineMediators: [],
      streamers: [],
      settings: {
        value: "0",
        roomFee: "0",
        organizationFee: "0",
        maxPlayers: 2,
        mode: "Mobile"
      },
      queues: [],
      matches: []
    });
  }

  return database.get(guildId);
}

function isAdmin(interaction) {
  const server = getServer(interaction.guild.id);

  return (
    interaction.member.permissions.has(
      PermissionFlagsBits.Administrator
    ) ||
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

function isOnlineMediator(interaction) {
  const server = getServer(interaction.guild.id);

  return server.onlineMediators.includes(
    interaction.user.id
  );
}

function findQueue(server, id) {
  return server.queues.find(function (queue) {
    return queue.id === id;
  });
}

function makeQueueEmbed(queue) {
  let players = "No players yet.";

  if (queue.players.length > 0) {
    players = queue.players
      .map(function (playerId, playerIndex) {
        return (
          String(playerIndex + 1) +
          ". <@" +
          playerId +
          ">"
        );
      })
      .join("\n");
  }

  let title = "🎮 Free Fire Queue - " + queue.name;

  if (queue.type === "STREAMER") {
    title = "🎥 Streamer Queue - " + queue.name;
  }

  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(
      "**Mode:** " +
        queue.mode +
        "\n" +
        "**Value:** " +
        queue.value +
        "\n" +
        "**Room Fee:** " +
        queue.roomFee +
        "\n" +
        "**Organization Fee:** " +
        queue.organizationFee +
        "\n" +
        "**Players:** " +
        queue.players.length +
        "/" +
        queue.maxPlayers +
        "\n" +
        "**Status:** " +
        (queue.open ? "🟢 OPEN" : "🔴 CLOSED") +
        "\n\n" +
        "**Players**\n" +
        players
    )
    .setFooter({
      text: "Free Fire Queue System"
    });
}

function makeQueueButtons(queue) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("join_" + queue.id)
      .setLabel("Join Queue")
      .setEmoji("🎮")
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId("leave_" + queue.id)
      .setLabel("Leave Queue")
      .setEmoji("🚪")
      .setStyle(ButtonStyle.Danger),

    new ButtonBuilder()
      .setCustomId("info_" + queue.id)
      .setLabel("Info")
      .setEmoji("ℹ️")
      .setStyle(ButtonStyle.Secondary)
  );
}

function makeAdminButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("create_queue")
      .setLabel("Create Queue")
      .setEmoji("🎮")
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId("create_streamer")
      .setLabel("Streamer Queue")
      .setEmoji("🎥")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("settings")
      .setLabel("Settings")
      .setEmoji("⚙️")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("mediators")
      .setLabel("Mediators")
      .setEmoji("🛡️")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("streamers")
      .setLabel("Streamers")
      .setEmoji("📺")
      .setStyle(ButtonStyle.Secondary)
  );
}

const commands = [
  new SlashCommandBuilder()
    .setName("panel")
    .setDescription("Open the administration panel"),

  new SlashCommandBuilder()
    .setName("queue")
    .setDescription("Free Fire queue commands")
    .addSubcommand(function (sub) {
      return sub
        .setName("create")
        .setDescription("Create a Free Fire queue")
        .addStringOption(function (option) {
          return option
            .setName("name")
            .setDescription("Queue name")
            .setRequired(true);
        });
    })
    .addSubcommand(function (sub) {
      return sub
        .setName("list")
        .setDescription("List all queues");
    }),

  new SlashCommandBuilder()
    .setName("streamer")
    .setDescription("Streamer queue commands")
    .addSubcommand(function (sub) {
      return sub
        .setName("create")
        .setDescription("Create a streamer queue")
        .addStringOption(function (option) {
          return option
            .setName("name")
            .setDescription("Queue name")
            .setRequired(true);
        });
    }),

  new SlashCommandBuilder()
    .setName("mediator")
    .setDescription("Mediator commands")
    .addSubcommand(function (sub) {
      return sub
        .setName("online")
        .setDescription("Go online as mediator");
    })
    .addSubcommand(function (sub) {
      return sub
        .setName("offline")
        .setDescription("Go offline as mediator");
    })
    .addSubcommand(function (sub) {
      return sub
        .setName("list")
        .setDescription("List online mediators");
    }),

  new SlashCommandBuilder()
    .setName("config")
    .setDescription("Configure the queue system"),

  new SlashCommandBuilder()
    .setName("match")
    .setDescription("Match commands")
    .addSubcommand(function (sub) {
      return sub
        .setName("pull")
        .setDescription("Pull players from a queue")
        .addStringOption(function (option) {
          return option
            .setName("queue")
            .setDescription("Queue ID")
            .setRequired(true);
        });
    })
].map(function (command) {
  return command.toJSON();
});

const rest = new REST({
  version: "10"
}).setToken(process.env.DISCORD_TOKEN);

client.once("ready", async function () {
  console.log(
    "Bot online as " + client.user.tag
  );

  try {
    await rest.put(
      Routes.applicationCommands(
        client.user.id
      ),
      {
        body: commands
      }
    );

    console.log(
      "Slash commands registered successfully."
    );
  } catch (error) {
    console.error(error);
  }
});

client.on(
  "interactionCreate",
  async function (interaction) {
    if (!interaction.isChatInputCommand()) {
      return;
    }

    const server = getServer(
      interaction.guild.id
    );

    if (
      interaction.commandName === "panel"
    ) {
      if (!isAdmin(interaction)) {
        return interaction.reply({
          content:
            "❌ Administrator permission required.",
          ephemeral: true
        });
      }

      const embed = new EmbedBuilder()
        .setTitle(
          "🎛️ Free Fire Administration Panel"
        )
        .setDescription(
          "Use the buttons below to manage the system.\n\n" +
            "🎮 Free Fire queues\n" +
            "🎥 Streamer queues\n" +
            "⚙️ Values and limits\n" +
            "🛡️ Mediators\n" +
            "📺 Streamers"
        );

      return interaction.reply({
        embeds: [embed],
        components: [makeAdminButtons()],
        ephemeral: true
      });
    }

    if (
      interaction.commandName === "queue"
    ) {
      const subcommand =
        interaction.options.getSubcommand();

      if (subcommand === "create") {
        if (!isAdmin(interaction)) {
          return interaction.reply({
            content:
              "❌ Administrator permission required.",
            ephemeral: true
          });
        }

        const name =
          interaction.options.getString(
            "name"
          );

        const queue = {
          id: String(Date.now()),
          name: name,
          type: "NORMAL",
          mode: server.settings.mode,
          value: server.settings.value,
          roomFee: server.settings.roomFee,
          organizationFee:
            server.settings.organizationFee,
          maxPlayers:
            server.settings.maxPlayers,
          open: true,
          players: []
        };

        server.queues.push(queue);

        return interaction.reply({
          embeds: [makeQueueEmbed(queue)],
          components: [
            makeQueueButtons(queue)
          ]
        });
      }

      if (subcommand === "list") {
        if (server.queues.length === 0) {
          return interaction.reply({
            content:
              "📭 There are no queues.",
            ephemeral: true
          });
        }

        const text = server.queues
          .map(function (queue) {
            return (
              "**" +
              queue.name +
              "**\n" +
              "Type: " +
              queue.type +
              "\n" +
              "Mode: " +
              queue.mode +
              "\n" +
              "Players: " +
              queue.players.length +
              "/" +
              queue.maxPlayers +
              "\n" +
              "ID: `" +
              queue.id +
              "`"
            );
          })
          .join("\n\n");

        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("🎮 Queue List")
              .setDescription(text)
          ],
          ephemeral: true
        });
      }
    }

    if (
      interaction.commandName ===
      "streamer"
    ) {
      if (
        interaction.options.getSubcommand() ===
        "create"
      ) {
        if (
          !isAdmin(interaction) &&
          !isStreamer(interaction)
        ) {
          return interaction.reply({
            content:
              "❌ You are not authorized.",
            ephemeral: true
          });
        }

        const name =
          interaction.options.getString(
            "name"
          );

        const queue = {
          id: String(Date.now()),
          name: name,
          type: "STREAMER",
          mode: server.settings.mode,
          value: server.settings.value,
          roomFee: server.settings.roomFee,
          organizationFee:
            server.settings.organizationFee,
          maxPlayers:
            server.settings.maxPlayers,
          open: true,
          players: []
        };

        server.queues.push(queue);

        return interaction.reply({
          embeds: [makeQueueEmbed(queue)],
          components: [
            makeQueueButtons(queue)
          ]
        });
      }
    }

    if (
      interaction.commandName ===
      "mediator"
    ) {
      const subcommand =
        interaction.options.getSubcommand();

      if (subcommand === "online") {
        if (!isMediator(interaction)) {
          return interaction.reply({
            content:
              "❌ You are not registered as a mediator.",
            ephemeral: true
          });
        }

        if (
          !server.onlineMediators.includes(
            interaction.user.id
          )
        ) {
          server.onlineMediators.push(
            interaction.user.id
          );
        }

        return interaction.reply(
          "🟢 You are now ONLINE as a mediator."
        );
      }

      if (subcommand === "offline") {
        server.onlineMediators =
          server.onlineMediators.filter(
            function (id) {
              return (
                id !== interaction.user.id
              );
            }
          );

        return interaction.reply(
          "🔴 You are now OFFLINE as a mediator."
        );
      }

      if (subcommand === "list") {
        if (
          server.onlineMediators.length ===
          0
        ) {
          return interaction.reply(
            "🛡️ No mediators are online."
          );
        }

        return interaction.reply(
          "🛡️ **Online Mediators**\n\n" +
            server.onlineMediators
              .map(function (id) {
                return "• <@" + id + ">";
              })
              .join("\n")
        );
      }
    }

    if (
      interaction.commandName ===
      "config"
    ) {
      if (!isAdmin(interaction)) {
        return interaction.reply({
          content:
            "❌ Administrator permission required.",
          ephemeral: true
        });
      }

      const embed = new EmbedBuilder()
        .setTitle("⚙️ Queue Configuration")
        .setDescription(
          "**Default Value:** " +
            server.settings.value +
            "\n" +
            "**Room Fee:** " +
            server.settings.roomFee +
            "\n" +
            "**Organization Fee:** " +
            server.settings.organizationFee +
            "\n" +
            "**Maximum Players:** " +
            server.settings.maxPlayers +
            "\n" +
            "**Default Mode:** " +
            server.settings.mode
        );

      const row =
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(
              "config_values"
            )
            .setLabel("Values")
            .setEmoji("💰")
            .setStyle(
              ButtonStyle.Primary
            ),

          new ButtonBuilder()
            .setCustomId(
              "config_limit"
            )
            .setLabel("Player Limit")
            .setEmoji("👥")
            .setStyle(
              ButtonStyle.Secondary
            ),

          new ButtonBuilder()
            .setCustomId(
              "config_mode"
            )
            .setLabel("Game Mode")
            .setEmoji("🎮")
            .setStyle(
              ButtonStyle.Secondary
            )
        );

      return interaction.reply({
        embeds: [embed],
        components: [row],
        ephemeral: true
      });
    }

    if (
      interaction.commandName ===
      "match"
    ) {
      if (
        interaction.options.getSubcommand() ===
        "pull"
      ) {
        if (!isMediator(interaction)) {
          return interaction.reply({
            content:
              "❌ Only registered mediators can pull matches.",
            ephemeral: true
          });
        }

        if (
          !isOnlineMediator(interaction)
        ) {
          return interaction.reply({
            content:
              "🔴 You must be ONLINE as a mediator.",
            ephemeral: true
          });
        }

        const queueId =
          interaction.options.getString(
            "queue"
          );

        const queue = findQueue(
          server,
          queueId
        );

        if (!queue) {
          return interaction.reply({
            content:
              "❌ Queue not found.",
            ephemeral: true
          });
        }

        if (
          queue.players.length <
          queue.maxPlayers
        ) {
          return interaction.reply({
            content:
              "❌ Not enough players in the queue.",
            ephemeral: true
          });
        }

        const players =
          queue.players.splice(
            0,
            queue.maxPlayers
          );

        queue.open = false;

        server.matches.push({
          id: String(Date.now()),
          queueId: queue.id,
          mediator:
            interaction.user.id,
          players: players
        });

        return interaction.reply(
          "🎯 **MATCH CREATED**\n\n" +
            "🎮 Queue: **" +
            queue.name +
            "**\n" +
            "🛡️ Mediator: " +
            interaction.user.toString() +
            "\n\n" +
            players
              .map(function (id) {
                return "• <@" + id + ">";
              })
              .join("\n")
        );
      }
    }
  }
);

client.on(
  "interactionCreate",
  async function (interaction) {
    if (!interaction.isButton()) {
      return;
    }

    const server = getServer(
      interaction.guild.id
    );

    const customId =
      interaction.customId;

    if (
      customId.startsWith("join_")
    ) {
      const id =
        customId.substring(5);

      const queue = findQueue(
        server,
        id
      );

      if (!queue) {
        return interaction.reply({
          content:
            "❌ Queue not found.",
          ephemeral: true
        });
      }

      if (!queue.open) {
        return interaction.reply({
          content:
            "🔴 This queue is closed.",
          ephemeral: true
        });
      }

      if (
        queue.players.includes(
          interaction.user.id
        )
      ) {
        return interaction.reply({
          content:
            "⚠️ You are already in this queue.",
          ephemeral: true
        });
      }

      if (
        queue.players.length >=
        queue.maxPlayers
      ) {
        return interaction.reply({
          content:
            "❌ This queue is full.",
          ephemeral: true
        });
      }

      queue.players.push(
        interaction.user.id
      );

      return interaction.update({
        embeds: [makeQueueEmbed(queue)],
        components: [
          makeQueueButtons(queue)
        ]
      });
    }

    if (
      customId.startsWith("leave_")
    ) {
      const id =
        customId.substring(6);

      const queue = findQueue(
        server,
        id
      );

      if (!queue) {
        return interaction.reply({
          content:
            "❌ Queue not found.",
          ephemeral: true
        });
      }

      queue.players =
        queue.players.filter(
          function (playerId) {
            return (
              playerId !==
              interaction.user.id
            );
          }
        );

      return interaction.update({
        embeds: [makeQueueEmbed(queue)],
        components: [
          makeQueueButtons(queue)
        ]
      });
    }

    if (
      customId.startsWith("info_")
    ) {
      const id =
        customId.substring(5);

      const queue = findQueue(
        server,
        id
      );

      if (!queue) {
        return interaction.reply({
          content:
            "❌ Queue not found.",
          ephemeral: true
        });
      }

      return interaction.reply({
        embeds: [makeQueueEmbed(queue)],
        ephemeral: true
      });
    }

    if (customId === "settings") {
      if (!isAdmin(interaction)) {
        return interaction.reply({
          content:
            "❌ Administrator permission required.",
          ephemeral: true
        });
      }

      return interaction.reply({
        content:
          "Use `/config` to configure values, limits and game mode.",
        ephemeral: true
      });
    }

    if (customId === "create_queue") {
      return interaction.reply({
        content:
          "Use `/queue create` to create a Free Fire queue.",
        ephemeral: true
      });
    }

    if (
      customId === "create_streamer"
    ) {
      return interaction.reply({
        content:
          "Use `/streamer create` to create a streamer queue.",
        ephemeral: true
      });
    }

    if (customId === "mediators") {
      return interaction.reply({
        content:
          "🛡️ Mediator management is available through the mediator commands.",
        ephemeral: true
      });
    }

    if (customId === "streamers") {
      return interaction.reply({
        content:
          "📺 Streamer management is available through streamer commands.",
        ephemeral: true
      });
    }

    if (customId === "config_values") {
      const modal =
        new ModalBuilder()
          .setCustomId(
            "values_modal"
          )
          .setTitle(
            "Configure Values"
          );

      const valueInput =
        new TextInputBuilder()
          .setCustomId(
            "value"
          )
          .setLabel(
            "Default Value"
          )
          .setPlaceholder(
            "Example: 10"
          )
          .setStyle(
            TextInputStyle.Short
          )
          .setRequired(true);

      const roomInput =
        new TextInputBuilder()
          .setCustomId(
            "room_fee"
          )
          .setLabel(
            "Room Fee"
          )
          .setPlaceholder(
            "Example: 2"
          )
          .setStyle(
            TextInputStyle.Short
          )
          .setRequired(true);

      const orgInput =
        new TextInputBuilder()
          .setCustomId(
            "organization_fee"
          )
          .setLabel(
            "Organization Fee"
          )
          .setPlaceholder(
            "Example: 1"
          )
          .setStyle(
            TextInputStyle.Short
          )
          .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          valueInput
        ),
        new ActionRowBuilder().addComponents(
          roomInput
        ),
        new ActionRowBuilder().addComponents(
          orgInput
        )
      );

      return interaction.showModal(
        modal
      );
    }

    if (customId === "config_limit") {
      const modal =
        new ModalBuilder()
          .setCustomId(
            "limit_modal"
          )
          .setTitle(
            "Player Limit"
          );

      const limitInput =
        new TextInputBuilder()
          .setCustomId(
            "limit"
          )
          .setLabel(
            "Maximum Players"
          )
          .setPlaceholder(
            "Example: 2"
          )
          .setStyle(
            TextInputStyle.Short
          )
          .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          limitInput
        )
      );

      return interaction.showModal(
        modal
      );
    }

    if (customId === "config_mode") {
      const menu =
        new StringSelectMenuBuilder()
          .setCustomId(
            "mode_select"
          )
          .setPlaceholder(
            "Select game mode"
          )
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
        content:
          "🎮 Select the default game mode:",
        components: [
          new ActionRowBuilder().addComponents(
            menu
          )
        ],
        ephemeral: true
      });
    }
  }
);

client.on(
  "interactionCreate",
  async function (interaction) {
    if (!interaction.isModalSubmit()) {
      return;
    }

    if (
      interaction.customId ===
      "values_modal"
    ) {
      const server = getServer(
        interaction.guild.id
      );

      server.settings.value =
        interaction.fields.getTextInputValue(
          "value"
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

    if (
      interaction.customId ===
      "limit_modal"
    ) {
      const server = getServer(
        interaction.guild.id
      );

      const limit = Number(
        interaction.fields.getTextInputValue(
          "limit"
        )
      );

      if (
        !Number.isInteger(limit) ||
        limit < 2 ||
        limit > 100
      ) {
        return interaction.reply({
          content:
            "❌ Invalid player limit.",
          ephemeral: true
        });
      }

      server.settings.maxPlayers =
        limit;

      return interaction.reply({
        content:
          "✅ Maximum players set to " +
          String(limit) +
          ".",
        ephemeral: true
      });
    }
  }
);

client.on(
  "interactionCreate",
  async function (interaction) {
    if (
      !interaction.isStringSelectMenu()
    ) {
      return;
    }

    if (
      interaction.customId ===
      "mode_select"
    ) {
      const server = getServer(
        interaction.guild.id
      );

      server.settings.mode =
        interaction.values[0];

      return interaction.update({
        content:
          "✅ Default mode set to " +
          interaction.values[0] +
          ".",
        components: []
      });
    }
  }
);

client.login(
  process.env.DISCORD_TOKEN
);
```
