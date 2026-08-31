const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const commands = [
  new SlashCommandBuilder()
    .setName("fila")
    .setDescription("Mostra o painel da fila"),

  new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Testa se o bot está funcionando")
].map(function(command) {
  return command.toJSON();
});

client.once("ready", async function() {
  console.log("Bot online como " + client.user.tag);

  const rest = new REST({ version: "10" })
    .setToken(process.env.DISCORD_TOKEN);

  try {
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );

    console.log("Comandos registrados com sucesso!");
  } catch (error) {
    console.error("Erro ao registrar comandos:", error);
  }
});

client.on("interactionCreate", async function(interaction) {
  if (!interaction.isChatInputCommand()) {
    return;
  }

  if (interaction.commandName === "ping") {
    await interaction.reply("🏓 Pong! O bot está funcionando!");
    return;
  }

  if (interaction.commandName === "fila") {
    await interaction.reply(
      "🎮 PAINEL DE FILA FF\n\n" +
      "👥 Jogadores: 0\n" +
      "💰 Valor: Não configurado\n\n" +
      "Sistema online!"
    );
  }
});

client.login(process.env.DISCORD_TOKEN);
```
