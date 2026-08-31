const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const filas = new Map();

const commands = [
  new SlashCommandBuilder()
    .setName("fila")
    .setDescription("Gerencia a fila de Free Fire")
    .addSubcommand(sub =>
      sub
        .setName("criar")
        .setDescription("Cria uma fila de Free Fire")
        .addStringOption(opt =>
          opt.setName("nome")
            .setDescription("Nome da fila")
            .setRequired(true)
        )
    ),

  new SlashCommandBuilder()
    .setName("fila-streamer")
    .setDescription("Gerencia uma fila de streamer")
    .addSubcommand(sub =>
      sub
        .setName("criar")
        .setDescription("Cria uma fila de streamer")
        .addStringOption(opt =>
          opt.setName("nome")
            .setDescription("Nome da fila")
            .setRequired(true)
        )
    )
].map(command => command.toJSON());

const rest = new REST({ version: "10" })
  .setToken(process.env.DISCORD_TOKEN);

client.once("ready", async () => {
  console.log(`Bot online como ${client.user.tag}`);

  try {
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );

    console.log("Comandos registrados!");
  } catch (error) {
    console.error(error);
  }
});

client.on("interactionCreate", async interaction => {

  if (interaction.isChatInputCommand()) {

    if (interaction.commandName === "fila") {

      if (interaction.options.getSubcommand() === "criar") {

        const nome = interaction.options.getString("nome");
        const id = `${interaction.guild.id}-${Date.now()}`;

        filas.set(id, {
          nome,
          tipo: "FF",
          jogadores: [],
          aberta: true
        });

        const embed = new EmbedBuilder()
          .setTitle(`🎮 Fila FF — ${nome}`)
          .setDescription(
            "Entre na fila usando os botões abaixo.\n\n" +
            "👥 Jogadores: **0**\n" +
            "🟢 Status: **ABERTA**"
          );

        const botoes = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`entrar_${id}`)
            .setLabel("Entrar na fila")
            .setEmoji("🎮")
            .setStyle(ButtonStyle.Success),

          new ButtonBuilder()
            .setCustomId(`sair_${id}`)
            .setLabel("Sair da fila")
            .setEmoji("🚪")
            .setStyle(ButtonStyle.Danger)
        );

        await interaction.reply({
          embeds: [embed],
          components: [botoes]
        });
      }
    }

    if (interaction.commandName === "fila-streamer") {

      if (interaction.options.getSubcommand() === "criar") {

        const nome = interaction.options.getString("nome");
        const id = `${interaction.guild.id}-${Date.now()}`;

        filas.set(id, {
          nome,
          tipo: "STREAMER",
          jogadores: [],
          aberta: true
        });

        const embed = new EmbedBuilder()
          .setTitle(`🎥 Fila Streamer — ${nome}`)
          .setDescription(
            "Fila exclusiva de streamer.\n\n" +
            "👥 Jogadores: **0**\n" +
            "🟢 Status: **ABERTA**"
          );

        const botoes = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`entrar_${id}`)
            .setLabel("Entrar na fila")
            .setEmoji("🎥")
            .setStyle(ButtonStyle.Success),

          new ButtonBuilder()
            .setCustomId(`sair_${id}`)
            .setLabel("Sair da fila")
            .setEmoji("🚪")
            .setStyle(ButtonStyle.Danger)
        );

        await interaction.reply({
          embeds: [embed],
          components: [botoes]
        });
      }
    }
  }

  if (interaction.isButton()) {

    const [acao, id] = interaction.customId.split("_");
    const fila = filas.get(id);

    if (!fila) {
      return interaction.reply({
        content: "❌ Essa fila não existe mais.",
        ephemeral: true
      });
    }

    if (acao === "entrar") {

      if (!fila.aberta) {
        return interaction.reply({
          content: "🔴 Essa fila está fechada.",
          ephemeral: true
        });
      }

      if (fila.jogadores.includes(interaction.user.id)) {
        return interaction.reply({
          content: "⚠️ Você já está nessa fila.",
          ephemeral: true
        });
      }

      fila.jogadores.push(interaction.user.id);

      return interaction.reply({
        content: `✅ ${interaction.user} entrou na fila **${fila.nome}**!`,
        ephemeral: false
      });
    }

    if (acao === "sair") {

      const index = fila.jogadores.indexOf(interaction.user.id);

      if (index === -1) {
        return interaction.reply({
          content: "⚠️ Você não está nessa fila.",
          ephemeral: true
        });
      }

      fila.jogadores.splice(index, 1);

      return interaction.reply({
        content: `🚪 ${interaction.user} saiu da fila **${fila.nome}**.`,
        ephemeral: false
      });
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
