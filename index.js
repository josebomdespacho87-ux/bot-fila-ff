const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const commands = [
  new SlashCommandBuilder()
    .setName("fila")
    .setDescription("Mostra o painel da fila de Free Fire")
].map(command => command.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

client.once("ready", async () => {
  console.log(`Bot online como ${client.user.tag}`);

  try {
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );

    console.log("Comando /fila registrado!");
  } catch (error) {
    console.error(error);
  }
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "fila") {
    await interaction.reply({
      content: "🎮 **Painel de Fila FF**\n\n👥 Jogadores: 0\n💰 Valor: Não configurado\n\nUse `/fila` para acessar o painel.",
      ephemeral: false
    });
  }
});

client.login(process.env.DISCORD_TOKEN);
