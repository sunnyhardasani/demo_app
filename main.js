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

require(['jquery', 'd3', '../caleydo_core/main', '../caleydo_core/data', '../caleydo_core/plugin', '../caleydo_window/main', '../caleydo_core/multiform', '../caleydo_core/idtype', '../caleydo_core/range', '../caleydo_provenance/selection', '../caleydo_core/vis', '../caleydo_provenance/multiform', '../caleydo_window/databrowser'], function ($, d3, C, data, plugins, window, multiform, idtypes, ranges, prov_sel, vis, prov_multi, databrowser) {
  'use strict';
  var windows = $('<div>').css('position', 'absolute').appendTo('#main')[0];
  var singletons = autoload(plugins, $('#main')[0]);
  var menu = $('<div>').css('position', 'fixed').prependTo('body')[0];
  /*var toolbar = new window.StaticToolBar($('#main')[0]);
  toolbar.builder.push(function (window, node) {
    multiform.addIconVisChooser(node, window.data('vis'));
  })*/
  databrowser.create(document.getElementById('databrowser'));

  var graph, graphvis;
  data.create({
    type: 'provenance_graph',
    name: 'Demo App',
    id: 'demo'
  }).then(function (graph_) {
    graph = graph_;
    var s = prov_sel.create(graph_, 'selected');

    canvas.forEach(function(entry) {
      //prov_multi.attach(graph.addObject(entry.multi), graph);
    });

    vis.list(graph)[0].load().then(function (plugin) {
      graphvis = plugin.factory(graph_, document.getElementById('provenancegraph'));
    })
  });

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

  function addIt(m) {
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
      multiP = C.resolved(multiform.create(m, mw.node));
    }
    multiP.then(function (multi) {
      multiform.addIconVisChooser(mw.toolbar.node, multi);
      mw.attachVis(multi, multi.asMetaData);
      mw.pos = [400, 50];
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
    persisted.canvas.forEach(function (e) {
      data.get(e.data).then(function (m) {
        var r = addIt(m);
        r.mw.restore(e.mw);
        r.multi.restore(e.multi);
      });
    });
    idtypes.restore(persisted.idtypes);
  }


  var b = d3.select(menu);
  b.append('span').text('Select Dataset: ');
  var $select = b.append('select').attr('class', 'dataselector');

  b.append('button').text('Clear Selections').on('click', function () {
    idtypes.clearSelection();
  });
  var persisted = [];
  b.append('button').text('Persist').on('click', function () {
    var r = persist();
    console.log(JSON.stringify(r, null, ' '));
    persisted.push(r);
    $restore.attr('disabled', null);
  });
  var $restore = b.append('button').text('Restore').attr('disabled', 'disabled').on('click', function () {
    if (persisted.length > 0) {
      restore(persisted.pop());
    }
    $restore.attr('disabled', persisted.length > 0 ? null : 'disable');
  });


  data.list().then(function (list) {
    //for all inhomogeneous add them as extra columns, too
    list = list.map(function (d) {
      return {
        key : d.desc.id,
        value : d,
        group : '_dataSets'
      };
    });
    list.forEach(function (entry) {
      if (entry.value.desc.type === 'table') {
        list.push.apply(list, entry.value.cols().map(function (col) {
          return {
            group: entry.value.desc.name,
            key: col.desc.name,
            value: col
          };
        }));
      }
    });
    list.unshift({group: '_dataSets'});
    var nest = d3.nest().key(function (d) {
      return d.group;
    }).entries(list);
    var $options = $select.selectAll('optgroup').data(nest);
    $options.enter().append('optgroup').attr('label', function (d) {
      return d.key;
    }).each(function (d) {
      var $op = d3.select(this).selectAll('option').data(d.values);
      $op.enter().append('option').text(function (d) {
        return d.value ? d.value.desc.name : '';
      });
    });
    $select.on('change', function () {
      var n = $select.node();
      var i = n.selectedIndex;
      if (i < 0) {
        return;
      }
      var op = n.options[i];
      var d = d3.select(op).data()[0];
      if (d && d.value) {
        addIt(d.value);
      }
      n.selectedIndex = 0;
    });
  });
});

/*require(['jquery', './caleydo-data', './caleydo-plugins', './caleydo-multiform' ], function ($, data, plugins, multiform) {
 'use strict';
 autoload(plugins);

 var $body = $('body');
 data.get('0').then(function (matrix) {
 var m = multiform.create(matrix, $body[0]);
 });
 });*/
