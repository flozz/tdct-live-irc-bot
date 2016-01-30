"use strict";

var irc = require("irc");
var nconf = require("nconf");
var _ = require("lodash");

nconf.argv();
nconf.env();
nconf.defaults({
    server: "irc.freenode.net",
    channel: null,
    nickname: "TdCT-Live|beta",
    controlChar: "!"
});

var commands = {

    echo: function(client, from, to, args) {
        return args.join(" ");
    },

    quit: function(client, from, to, args) {
        console.log("Disconnecting...");
        client.disconnect("!quit", function() {
            console.log("Disconnected. Program terminated.");
            process.exit(0);
        });
    },

    help: function(client, from, to, args) {
        var response = "Available commands: ";
        response += _.keys(commands).join(", ");
        return response;
    },

    topicid: function(client, from, to, args) {
        // TODO
    }

};

console.log("Starting TdCT-Live IRC Bot...");
console.log("Connecting to " + nconf.get("server") + " as " + nconf.get("nickname") + "...");

var client = new irc.Client(nconf.get("server"), nconf.get("nickname"), {
    userName: nconf.get("nickname"),
    realName: "TdcT-Live IRC Bot",
    channels: (nconf.get("channel")) ? [nconf.get("channel")] : [],
    autoRejoin: true,
    autoConnect: true,
    floodProtection: true,
    floodProtectionDelay: 1000,
    encoding: "utf-8"
});

client.addListener("registered", function(message) {
    console.log("Connected to " + message.server);
});

client.addListener("message", function(from, to, message) {
    if (!_.startsWith(message, nconf.get("controlChar"))) {
        return;
    }

    var data = message
        .trim()
        .replace(/\s+/g, " ")
        .substring(1)
        .split(" ");
    var command = data[0].toLowerCase();
    var args = data.splice(1);

    if (_.has(commands, command)) {
        var response = commands[command](client, from, to, args);
        if (response !== undefined) {
            client.say(to, response);
        }
    }
});
