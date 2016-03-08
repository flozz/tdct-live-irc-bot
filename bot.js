"use strict";

var MESSAGE_MAX_LENGTH = 1000;
var IGNORED_USERS = ["compteur-couche-tard"];

var path = require("path");

var irc = require("irc");
var nconf = require("nconf");
var _ = require("lodash");

var UfrTopicReader = require("./UfrTopicReader.js");

nconf.argv();
nconf.env();
nconf.file(path.join(__dirname, "config.json"));
nconf.defaults({
    server: "irc.freenode.net",
    channel: null,
    nickname: "TdCT-Live|beta",
    controlChar: "!",
    topicId: null
});

var topicReader = new UfrTopicReader();
if (nconf.get("topicId")) {
    topicReader.topicId = nconf.get("topicId");
}

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
        if (args.length === 0) {
            return "The topic id is " + topicReader.topicId;
        } else if (args.length == 1) {
            topicReader.topicId = args[0];
            nconf.set("topicId", args[0]);
            nconf.save();
            return "The topic id is now " + args[0];
        } else {
            return "Wrong arguments: " + args.join(" ");
        }
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

function topicLoop() {
    topicReader.getNewPosts()
        .then(function(posts) {
            for (var i = posts.length - 1 ; i >= 0 ; i--) {
                if (_.includes(IGNORED_USERS, posts[i].author)) {
                    continue;
                }
                client.say(nconf.get("channel"), _.padEnd("--- " + posts[i].author + " ", 40, "-"));
                if (posts[i].message.length <= MESSAGE_MAX_LENGTH) {
                    client.say(nconf.get("channel"), posts[i].message);
                } else {
                    client.say(nconf.get("channel"), posts[i].message.substring(0, MESSAGE_MAX_LENGTH));
                    client.say(nconf.get("channel"), "[...] " + posts[i].link);
                }
            }
            setTimeout(topicLoop, 60 * 1000);
        })
        .catch(function(error) {
            console.error(error);
        });
}

topicLoop();
