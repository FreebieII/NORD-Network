const FS = require("fs");
const Net = require("net");
const { Webhook, MessageBuilder } = require("discord-webhook-node");
const Hook = new Webhook("WEBHOOK URL");
const DiscordJS = require("discord.js");

const DClient = new DiscordJS.Client({
    intents: [DiscordJS.Intents.FLAGS.GUILDS, DiscordJS.Intents.FLAGS.GUILD_MESSAGES]
});


DClient.on("ready", () => {
    console.log("Discord bot logged in.");
    Hook.setUsername("Router");
    Hook.setAvatar("https://www.nt-sat-elektronik.de/images/Computer_Hardware/Fritzbox-7490_02.jpg");
    const embed = new MessageBuilder()
    .addField("Client", "Discord Bot", true)
    .addField("Status", "Logged in.", true)
    .setColor("#A3BE8C")
    Hook.send(embed);
});
const connectedSockets = new Set();
const devices = JSON.parse(FS.readFileSync("devices.json"));
const Server = Net.createServer();
Server.listen(2345, "0.0.0.0");
console.log("Router listening.");
connectedSockets.broadcast = function(data) {
    for(let sock of this) {
        sock.write(data);
    }
}

Server.on("connection", function(sock) {
    console.log("[Unknown] > Tries to connect > #ADDRESS > " + sock.remoteAddress + ":" + sock.remotePort);
    sock.write("@auth");
    var closedSafely = false;
    var cleanname = "Unkown";
    var authtoken = "@NOT-SET";
    sock.on("data", function(bData) {
        var data = bData.toString();
        const pData = data.split(" ");
        cleanname = devices[0][pData[2]].cleanname;
        authtoken = devices[0][pData[2]].authtoken;
        if(pData[0] == "@auth-res") {
            if(pData.length >= 3) {
                if(pData[1] == authtoken) {
                    sock.write("@auth-succ");
                    console.log("[" + cleanname + "] > Identified and authenticated successfully.");
                    const embed = new MessageBuilder()
                    .addField("Client", cleanname, true)
                    .addField("Status", "Authenticated successfully.", true)
                    .setColor("#A3BE8C")
                    Hook.send(embed);
                    connectedSockets.add(sock);
                } else {
                    sock.write("@auth-fail");
                    console.log("[" + cleanname + "] > Identified but failed the authentication.");
                    const embed = new MessageBuilder()
                    .addField("Client", cleanname, true)
                    .addField("Status", "Authentication failed.", true)
                    .setColor("#BF616A")
                    Hook.send(embed);
                }
            } else {
                sock.write("@auth-fail-args");
                console.log("[Unknown] > Identified but failed the authentication due to too few arguments.");
                const embed = new MessageBuilder()
                .addField("Client", "Unkown", true)
                .addField("Status", "Authentication failed due to too few arguments.", true)
                .setColor("#BF616A")
                Hook.send(embed);
            }
        } else if(pData[0] == "@close-cb") {
            if(pData[1] == authtoken) {
                closedSafely = true;
                const embed = new MessageBuilder()
                .addField("Client", cleanname, true)
                .addField("Status", "Closed.", true)
                .setColor("#EBCB8B")
                Hook.send(embed);
            }
        }
    });

    sock.on("close", function(bdata) {
        if(!closedSafely) {
            const embed = new MessageBuilder()
            .addField("Client", cleanname, true)
            .addField("Status", "Closed (but not safely/registered).", true)
            .setColor("#BF616A")
            Hook.send(embed);
        }
    });

    DClient.on("messageCreate", (msg) => {
        var content = msg.content;
        var args = content.split(" ").slice(1);
        if(content.startsWith("!reauth")) {
            connectedSockets.broadcast(Buffer.from("@auth"), sock);
        } else if(content.startsWith("!close-rq all")) {
            connectedSockets.broadcast(Buffer.from("@close-rq"), sock);
        }
    });
});

process.on("uncaughtException", function(err) {
    console.log("Critical error occurred\n" + err.stack + "\nEND OF ERROR\n");
    const embed = new MessageBuilder()
    .addField("Client", "Router", true)
    .addField("Status", "Critical error occurred", true)
    .setDescription("`" + err.stack + "`")
    .setColor("#BF616A")
    Hook.send(embed);
});

DClient.login("BOT TOKEN");