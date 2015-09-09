/**
 * Created by Samuel Gratzl on 27.08.2014.
 */

function autoload(plugins, container) {
  var autoload = {};
  //load and execute the auto load plugins
  plugins.load(plugins.list('autoload')).then(function (plugins) {
    plugins.forEach(function (p) {
      autoload[p.desc.name] = p.factory(container);
    });
  });
  return autoload;
}

define(['jquery', 'd3', '../caleydo_core/main', '../caleydo_core/data', '../caleydo_core/plugin', '../caleydo_window/main', '../caleydo_core/multiform', '../caleydo_core/idtype', '../caleydo_core/range', '../caleydo_core/vis', '../caleydo_window/databrowser', '../wrapper_bootstrap_fontawesome/header'], function ($, d3, C, data, plugins, window, multiform, idtypes, ranges, vis, databrowser, header) {
  'use strict';
  var windows = $('<div>').css('position', 'absolute').appendTo('#main')[0];
  var singletons = autoload(plugins, $('#main')[0]);
  var appHeader = header.create(document.querySelector('body > div'), {
    app: 'Demo App'
  });
  /*var toolbar = new window.StaticToolBar($('#main')[0]);
  toolbar.builder.push(function (window, node) {
    multiform.addIconVisChooser(node, window.data('vis'));
  })*/
  databrowser.create(document.getElementById('databrowser'));

  var canvas = [];
  // use app here

  /*
   data.get('0').then(function (matrix) {
   var m = matrix;
   plugins.load(plugins.listVis(m)).then(function (visses) {
   var acc = 10;
   visses.forEach(function (plugin) {
   var w = window.create($body[0]);
   w.title = plugin.desc.name;
   w.pos = [20, acc];
   if (typeof plugin.desc.size === 'function') {
   w.contentSize = plugin.desc.size(m.dim);
   } else if (Array.isArray(plugin.desc.size)){
   w.contentSize = plugin.dec.size;
   } else {
   w.contentSize = [200, 200];
   }
   plugin.factory(m, w.node);
   var s = w.size;
   acc += s[1] + 10;
   });
   });
   var mw = window.create($body[0]);
   var multi = multiform.create(matrix, mw.node);
   mw.title = multi.act.name;
   mw.pos = [400, 10];
   mw.size = [300, 300];
   multi.on('change', function (event, new_) {
   mw.title = new_.name;
   mw.contentSize = multi.size;
   });
   });*/

  function removeLink(vis) {
    if (singletons.hasOwnProperty('caleydo_links')) {
      singletons['caleydo_links'].remove(vis);
    }
  }

  function addLink(vis) {
    if (singletons.hasOwnProperty('caleydo_links')) {
      singletons['caleydo_links'].push(vis);
    }
  }

  function updateLinks() {
    if (singletons.hasOwnProperty('caleydo_links')) {
      singletons['caleydo_links'].update();
    }
  }

  function addIt(m, operation, pos) {
    var mw = window.createVisWindow(windows, {
      closeable: true,
      animatedHeader: true,
      zcontrols: true,
      zoomAble: true
    });
    //toolbar.push(mw);
    var multiP;
    if (m.desc.type === 'vector' && m.valuetype.type === 'categorical') {
      multiP = m.groups().then(function (g) {
        return multiform.createGrid(m, ranges.list(g), mw.node, function (data, range) {
          return data.view(range);
        });
      });
    } else {
      multiP = Promise.resolve(multiform.create(m, mw.node));
    }
    multiP.then(function (multi) {
      multiform.addIconVisChooser(mw.toolbar.node, multi);
      mw.attachVis(multi, multi.asMetaData);
      mw.pos = pos ? [ pos.x, pos.y ] : [400, 50];
      var vis = mw.adapter(multi);
      mw.on('removed', function () {
        removeLink(vis);
        canvas.splice(C.indexOf(canvas, function (c) {
          return c.mw === mw;
        }), 1);

      });
      mw.on('drag_stop', updateLinks);
      mw.on('zoom', updateLinks);
      addLink(vis);
      var entry = {
        mw: mw,
        multi: multi
      };
      if (graph) {
        //prov_multi.attach(graph.addObject(entry.multi), graph);
      }
      canvas.push(entry);
      return entry;
    });
  }

  function persist() {
    return {
      canvas: canvas.map(function (e) {
        return {
          data : e.multi.data.persist(),
          multi: e.multi.persist(),
          mw: e.mw.persist()
        };
      }),
      idtypes: idtypes.persist()
    };
  }

  function restore(persisted) {
    canvas.forEach(function (e) {
      e.mw.close();
    });
    idtypes.restore(persisted.idtypes);
    return Promise.all(persisted.canvas.map(function (e) {
      return data.get(e.data).then(function (m) {
        var r = addIt(m);
        return Promise.all([r.mw.restore(e.mw), r.multi.restore(e.multi)]);
      });
    }));
  }

  databrowser.makeDropable(document.getElementById('main'), addIt);

  appHeader.addMainMenu('Clear Selections', function() {
    idtypes.clearSelection();
  });
  var persisted = [];
  appHeader.addMainMenu('Persist', function() {
    var r = persist();
    console.log(JSON.stringify(r, null, ' '));
    persisted.push(r);
    $restore.attr('disabled', null);
  });
  var $restore = d3.select(appHeader.addMainMenu('Restore', function() {
    if (persisted.length > 0) {
      restore(persisted.pop());
    }
    $restore.attr('disabled', persisted.length > 0 ? null : 'disable');
  }));
});