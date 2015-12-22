"use strict";
var express = require('express');
var app = express();
var $request = require("request-promise");
var taskParser = require("./taskParser");
var session = require('express-session')
var assert = require("assert");

let envList = [
  "TASK_DEMO_SESSION_SECRET",
  "G_API_KEY",
  "G_CLIENT_ID",
  "G_CLIENT_SECRET"
];
for (let name of envList) {
  assert(process.env[name], name);
}

app.use(express.static('public'));

app.use(session({
  secret: process.env.TASK_DEMO_SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000*60*60*24
  }
}));

app.get('/', function (req, res) {
  let redirectURI = "http://demo.chronofeed.com:3000/tasks";
  let scope = "https://www.googleapis.com/auth/tasks";
  let uri = "https://accounts.google.com/o/oauth2/v2/auth?scope=" + encodeURIComponent(scope) + "&redirect_uri=" + encodeURIComponent(redirectURI) + "&response_type=code&client_id=" + process.env.G_CLIENT_ID;
  res.redirect(uri);
});

app.get("/tasks/", function (req, res, next) {
  if (req.query.code) {
    req.session.code = req.query.code;
    return res.redirect("/tasks/");
  }

  let p;
  if (req.session.access_token) {
    p = Promise.resolve(req.session.access_token);
  } else {
    let options = {
      uri: "https://www.googleapis.com/oauth2/v4/token",
      method: "POST",
      form: {
        code: req.session.code,
        client_id: process.env.G_CLIENT_ID,
        client_secret: process.env.G_CLIENT_SECRET,
        redirect_uri: "http://demo.chronofeed.com:3000/tasks",
        grant_type: "authorization_code"
      }
    };

    p = $request(options).then(function (body) {
      let obj = JSON.parse(body);
      req.session.access_token = obj.access_token;
      delete req.session.code;
      return req.session.access_token;
    });
  }

  let gtasks;
  p.then(function (access_token) {
    let options = {
      uri: "https://www.googleapis.com/tasks/v1/users/@me/lists?key=" + process.env.G_API_KEY,
      headers: {
        Authorization: "Bearer " + access_token
      }
    };
    return $request(options).then(function (body) {
      gtasks = JSON.parse(body);

      return Promise.all(gtasks.items.map(function (item) {
        let options = {
          uri: "https://www.googleapis.com/tasks/v1/lists/" + item.id + "/tasks?fields=etag%2Citems%2Ckind%2CnextPageToken&key=" + process.env.G_API_KEY,
          headers: {
            Authorization: "Bearer " + access_token
          }
        };
        return $request(options).then(function (body) {
          item.tasks = JSON.parse(body);
        });
      })).then(function (values) {
        let list = [];
        for (let taskList of gtasks.items) {
          let tree = taskParser.parse(taskList.tasks);
          let first = taskParser.getFirst(tree);
          list.push({
            title: taskList.title,
            first: first
          });
        }

        list.sort(function (a,b) {
          if (a.title < b.title) return -1;
          if (a.title > b.title) return 1;
          return 0;
        });

        let html = "<!DOCTYPE html>\n";
        html += "<html><head><title>Next Tasks</title></head><body><div><a href='https://mail.google.com/tasks/canvas?pli=1'>Google Tasks</a></div><h2>Next Tasks</h2><div id='main'></div>";
        html += "<script>\nvar TaskDemo = " + JSON.stringify({list:list}) + ";</script>";
        html += "<script src='https://code.jquery.com/jquery-2.1.4.min.js'></script>";
        html += "<script src='/scripts/demoUI.js'></script>";
        html += "</body></html>"
        res.send(html);
      });
    });
  }).catch (function (err) {
    console.log("err", err);
    next(err);
  });
});

var server = app.listen(3000, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);
});
