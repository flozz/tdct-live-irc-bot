"use strict";

var Class = require("abitbol");
var rss = require("rss-parser");
var Q = require("q");

var baseUrl = "https://forum.ubuntu-fr.org/extern.php?action=feed&type=rss&tid=";

var UfrTopicReader = Class.$extend({

    __init__: function() {
        this.$data.lastGuid = null;
        this.$data.topicId = null;
    },

    getTopicId: function() {
        return this.$data.topicId;
    },

    setTopicId: function(topicId) {
        if (topicId != this.$data.topicId) {
            this.$data.lastGuid = null;
            this.$data.topicId = topicId;
            this.getNewPosts();
        }
    },

    getNewPosts: function() {
        var this_ = this;
        if (!this.$data.topicId) {
            return Q.Promise(function(resolve, reject) {
                resolve([]);
            });
        }
        return Q.nfcall(rss.parseURL, baseUrl + this.topicId)
            .then(function(parsed) {
                if (!parsed || !parsed.feed || !parsed.feed.entries) {
                    return [];
                }
                if (!this_.$data.lastGuid) {
                    this_.$data.lastGuid = parsed.feed.entries[0].link;
                    return [];
                } else {
                    var result = [];
                    for (var i = 0 ; i < parsed.feed.entries.length ; i++) {
                        if (parsed.feed.entries[i].link == this_.$data.lastGuid) {
                            break;
                        }
                        result.push({
                            author: parsed.feed.entries[i].author,          // FIXME parse
                            message: parsed.feed.entries[i].contentSnippet  // FIXME content, parse
                        });
                    }
                    this_.$data.lastGuid = parsed.feed.entries[0].link;
                    return result;
                }
            })
            .catch(function(error) {
                console.error("An error occured when retrieving the feed:", error);
                return [];
            });
    }

});


var test = new UfrTopicReader();
function loop() {
    test.getNewPosts().then(function(posts) {
        console.log(posts);
    });
    setTimeout(loop, 1000 * 60);
}
loop();


module.exports = UfrTopicReader;
