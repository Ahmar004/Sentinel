/* Sentinel wireframes - the only interactive behaviour in the set.
   Tab switching, so a tabbed surface can be reviewed without one file per panel.
   No routing, no data, no timers. Step-5 is a design review, not a build. */
(function () {
  'use strict';

  function selectTab(tablist, button) {
    var buttons = tablist.querySelectorAll('[role="tab"]');
    for (var i = 0; i < buttons.length; i++) {
      var isTarget = buttons[i] === button;
      buttons[i].setAttribute('aria-selected', isTarget ? 'true' : 'false');
      buttons[i].tabIndex = isTarget ? 0 : -1;
      var panel = document.getElementById(buttons[i].getAttribute('aria-controls'));
      if (panel) { panel.hidden = !isTarget; }
    }
  }

  function wireTablist(tablist) {
    var buttons = tablist.querySelectorAll('[role="tab"]');

    tablist.addEventListener('click', function (event) {
      var button = event.target.closest('[role="tab"]');
      if (button) { selectTab(tablist, button); }
    });

    /* Keyboard first: arrows move between tabs, matching the WAI-ARIA pattern. */
    tablist.addEventListener('keydown', function (event) {
      var step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
      if (!step) { return; }
      event.preventDefault();
      var list = Array.prototype.slice.call(buttons);
      var index = list.indexOf(document.activeElement);
      var next = list[(index + step + list.length) % list.length];
      selectTab(tablist, next);
      next.focus();
    });
  }

  document.querySelectorAll('[role="tablist"]').forEach(wireTablist);

  /* ---- Cell grid renderer ----------------------------------------------
     Draws the map grid from a fixed map string, so a frame carries a legible
     two-character-per-cell picture instead of hundreds of hand-written divs.
     The string is fixed, never generated, so every frame showing this moment
     of the canonical dataset draws exactly the same cells.

       char 1  state or band   o normal  w watch  e elevated  c critical
                               d not-enough-dwell  s stale  g gap  x off-grid
       char 2  density bucket  0 to 4, ignored for g and x                  */

  var STATE = {
    o: 'obs-observed band-normal',   w: 'obs-observed band-watch',
    e: 'obs-observed band-elevated', c: 'obs-observed band-critical',
    d: 'obs-dwell',                  s: 'obs-stale',
    g: 'obs-gap',                    x: 'off-grid'
  };

  function renderGrid(host) {
    var map = (host.getAttribute('data-map') || '').replace(/\s+/g, '');
    var cols = parseInt(host.getAttribute('data-cols'), 10) || 1;
    host.style.gridTemplateColumns = 'repeat(' + cols + ',1fr)';
    host.style.gridTemplateRows = 'repeat(' + (map.length / 2 / cols) + ',1fr)';

    var html = '';
    for (var i = 0; i < map.length; i += 2) {
      var key = map[i];
      var density = map[i + 1];
      if (key === 'x') { html += '<i class="gc off-grid"></i>'; continue; }
      var cls = 'gc ' + STATE[key];
      if (key !== 'g') { cls += ' d-' + density; }
      /* An arrow is drawn only where flow exists: observed and dwelling cells
         only, never stale, never gap (FR3.5). */
      var arrow = '';
      if ('owecd'.indexOf(key) > -1) {
        var deg = (i * 37) % 360;
        arrow = '<b class="arrow" style="width:' + (5 + Number(density) * 3) +
                'px;transform:rotate(' + deg + 'deg)"></b>';
      }
      var badge = key === 's' ? '<u class="age">' + (3 + (i % 7)) + 's</u>' : '';
      html += '<i class="' + cls + '">' + arrow + badge + '</i>';
    }
    host.innerHTML = html;
  }

  document.querySelectorAll('[data-map]').forEach(renderGrid);
})();
