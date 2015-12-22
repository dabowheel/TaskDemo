"use strict";

$(document).ready(function () {
  var taskListEl = $("<ul/>");
  for (var i = 0; i < TaskDemo.list.length; i++) {
    var taskList = TaskDemo.list[i];
    var first = taskList.first;
    var firstText;
    if (first) {
      firstText = first.title;
    } else {
      continue;
    }
    taskListEl.append("<li>" + taskList.title + " - " + firstText + "</li>");
  }
  taskListEl.appendTo("#main");
});