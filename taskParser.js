"use strict";

exports.parse = function (tasks) {
  let idMap = {};
  let parentMap = {};
  let root = {};

  for (let item of tasks.items) {
    idMap[item.id] = item;
  }

  for (let id in idMap) {
    let item = idMap[id];
    let parent = item.parent ? idMap[item.parent] : root;
    if (!parent.children) parent.children = [];
    parent.children.push(item);
  }

  for (let id in idMap) {
    let item = idMap[id];
    if (item.children) {
      item.children.sort(function (a,b) {
        if (a.position < b.position) return -1;
        if (a.position > b.position) return 1;
        return 0;
      });
    }
  }

  return root;
};

function getFirst(tree) {
  if (tree.children) {
    for (let item of tree.children) {
      let first = getFirst(item);
      if (first) return first;
    }
  }

  return tree.title && tree.status == "needsAction" ? tree : null;
}

exports.getFirst = getFirst;
