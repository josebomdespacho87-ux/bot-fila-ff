const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once("ready", function () {
  console.log("BOT ONLINE: " + client.user.tag);
});

client.on("interactionCreate", async function (interaction) {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "ping") {
    await interaction.reply("🏓 Pong! Bot funcionando!");
  }
});

client.login(process.env.DISCORD_TOKEN);
