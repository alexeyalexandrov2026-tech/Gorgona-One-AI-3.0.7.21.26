import { getTicketNetworkCatalogue, buildTicketNetworkUrl } from './ticketnetwork.js';
import { TICKETNETWORK_AREAS } from './ticketnetworkLocation.js';

const GUID = '_gorgona';

// The markup and csctnCall contract come from the official Event Results
// builder. Run the supplier's scripts in an opaque sandboxed iframe, never in
// the site's React tree or its authenticated origin. No private API is used.
function facetTab(type, title, field) {
  return `<li id="tner-${type}-filter${GUID}" class="tner-${type}-filter tner-filter-tab">
    <a class="tner-filter-title tner-block" href="#"><span class="tner-filter-title-text">${title}</span></a>
    <div class="tner-filter-dropdown"><form id="tner-${type}-filters${GUID}" class="tner-filter-form tner-block">
      <ul id="tner-${field}${GUID}" data-filter="${type}" class="tner-${field} tner-filter-checkbox-group tner-filter-options tner-col-3"></ul>
      ${filterButtons(type)}
    </form></div></li>`;
}

function filterButtons(type) {
  return `<div class="tner-filter-control">
    <button form="tner-${type}-filters${GUID}" class="tner-clear-filters tner-filter-control-btn tner-btn" type="reset">Clear</button>
    <button form="tner-${type}-filters${GUID}" class="tner-apply-filters tner-filter-control-btn tner-btn" type="submit">Apply</button>
  </div>`;
}

export function buildTicketNetworkDocument(category, now = new Date()) {
  const catalogue = getTicketNetworkCatalogue(category);
  if (!catalogue) throw new Error('Unsupported TicketNetwork catalogue');
  const horizon = new Date(now);
  horizon.setUTCFullYear(horizon.getUTCFullYear() + 2);
  const categoryFilter = catalogue.paths.map(path => `startswith(path,'${path}')`).join(' or ');
  const baseFilters = `q=${encodeURIComponent(catalogue.query || '*')}&filter=_metadata/hasTickets eq true and date/date ge ${now.toISOString().slice(0, 10)} and date/date le ${horizon.toISOString().slice(0, 10)}`;
  const params = {
    page: 1, guid: GUID, container: `#tner-results${GUID}`,
    filters: baseFilters + TICKETNETWORK_AREAS[0].filter,
    specialFilters: `&categoryFilter=${categoryFilter}&includeFacets=true`,
    target: '_blank',
    // The runtime appends a TicketNetwork event URL here, exactly as the
    // builder does. HTTPS replaces the builder's legacy HTTP tracking URL.
    url: buildTicketNetworkUrl('https://www.ticketnetwork.com/', catalogue.sid).replace(/url=.*$/, 'url='),
    perPage: '10', state: 'abbr', country: '', pricing: '', count: ''
  };
  return `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="strict-origin-when-cross-origin">
<title>${catalogue.label.replace(/&/g, '&amp;')} · TicketNetwork</title>
<link rel="stylesheet" href="https://venuefiles.s3.amazonaws.com/css/csctn-results-v3.css">
<style>
  * { box-sizing: border-box; }
  [hidden] { display: none !important; }
  html, body { margin: 0; padding: 0; width: 100%; background: #f5f3ed; color: #25241f; }
  body { font: 14px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  a, button, input { -webkit-tap-highlight-color: transparent; }
  a:focus-visible, button:focus-visible, input:focus-visible { outline: 2px solid #887446; outline-offset: 3px; }
  .tner-container { font: inherit !important; color: #25241f !important; }
  .tner-container .tner-secondary { color: #646159 !important; }
  .tner-container .tner-block { border-radius: 0 !important; }
  .tner-container .tner-row { display: grid !important; grid-template-columns: 130px minmax(0, 1fr) auto; align-items: center; gap: 24px; position: relative; background: transparent !important; border: 0 !important; border-top: 1px solid #25241f26 !important; padding: 24px 12px !important; }
  .tner-container .tner-cell { width: auto !important; float: none !important; padding: 0 !important; }
  .tner-container .tner-full-date, .tner-container .tner-details { pointer-events: none; }
  .tner-container .tner-cta { position: relative; z-index: 1; text-align: right; }
  .tner-container .tner-name { font-size: 18px !important; font-weight: 500 !important; line-height: 1.4 !important; overflow-wrap: anywhere; }
  .tner-container .tner-location { margin-top: 5px; font-size: 13px !important; }
  .tner-container .tner-btn { background: #25241f !important; color: #fff !important; border-radius: 0 !important; font-family: inherit !important; font-size: 12px !important; font-weight: 500 !important; line-height: 1.5 !important; }
  .tner-container .tner-btn:hover { background: #514b3f !important; }
  .tner-container .tner-cta-btn { display: inline-flex !important; align-items: center; justify-content: center; width: auto !important; height: auto !important; min-width: 112px; padding: 12px 18px !important; min-height: 44px; }
  .tner-container .tner-cta-btn-text { display: inline !important; }
  .tner-container .tner-cta-btn-text:after { content: none !important; }
  .tner-container .tner-cta-btn:after { display: none !important; }
  .tner-container .tner-more { background: transparent !important; color: #25241f !important; padding: 18px !important; border: 1px solid #25241f40 !important; }
  .tner-container .tner-filter-title { background: transparent !important; border: 1px solid #25241f40 !important; min-height: 44px; }
  .tner-container .tner-filter-tab.hidden { display: block !important; }
  .widget-area { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 16px; margin: 0 0 20px; }
  .widget-area label { font-weight: 500; }
  .widget-area select { max-width: 100%; min-height: 44px; padding: 10px 32px 10px 12px; border: 1px solid #25241f66; border-radius: 0; background: transparent; color: inherit; font: inherit; }
  .widget-area p { flex-basis: 100%; margin: 0; color: #646159; font-size: 12px; }
  .tner-container .tner-filter-form { background: #fff !important; border: 1px solid #25241f26 !important; }
  .tner-container .tner-filter-tag { background: #e5e0d5 !important; color: #25241f !important; }
  .tner-container .tner-month-num, .tner-container .tner-month-full, .tner-container .tner-day-full, .tner-container .tner-year-full { display: none; }
  .tner-container .tner-year-abbr { display: inline; }
  .tner-container .tner-price, .tner-container .tner-ticket-count { display: none !important; }
  #widget-status { margin: 0; padding: 24px 0; color: #646159; }
  #widget-retry { min-height: 44px; margin: 0 0 24px; padding: 10px 20px; border: 1px solid #25241f; background: #25241f; color: white; font: inherit; cursor: pointer; }
  .widget-busy .tner-filters-container, .widget-busy .tner-more { pointer-events: none; opacity: .6; }
  @media (max-width: 600px) {
    .tner-container .tner-row { grid-template-columns: 64px minmax(0, 1fr); gap: 12px 14px; padding: 20px 0 !important; }
    .tner-container .tner-cta { grid-column: 2; justify-self: start; text-align: left; }
    .tner-container .tner-name { font-size: 16px !important; }
    .tner-container .tner-filter-title { font-size: 12px !important; }
    .tner-container .tner-cta-btn { padding: 10px 14px !important; }
  }
</style></head><body>
<p id="widget-status" role="status">Loading events from TicketNetwork…</p>
<button id="widget-retry" type="button" hidden>Try again</button>
<div id="tner-container${GUID}" class="tner-container" data-guid="${GUID}" hidden>
  <div class="widget-area">
    <label for="widget-area">Area</label>
    <select id="widget-area" aria-describedby="widget-area-help" disabled>${TICKETNETWORK_AREAS.map(area => `<option value="${area.value}">${area.label.replace(/&/g, '&amp;')}</option>`).join('')}</select>
    <p id="widget-area-help">Starts with Miami and nearby South Florida cities. Change area to explore elsewhere.</p>
  </div>
  <div id="tner-filters-container${GUID}" class="tner-filters-container">
    <input id="tner-filter-storage${GUID}" class="tner-filter-storage" hidden>
    <ul id="tner-filters${GUID}" class="tner-filters">
      <li id="tner-date-filter${GUID}" class="tner-date-filter tner-filter-tab">
        <a class="tner-filter-title tner-block" href="#"><span class="tner-filter-title-text">Dates</span></a>
        <div class="tner-filter-dropdown"><form id="tner-date-filters${GUID}" class="tner-date-filters tner-filter-form tner-block">
          <ul class="tner-filter-options tner-col-3">
            <li id="tner-date-filter-range${GUID}" class="tner-date-filter-range"><span class="tner-filter-heading">Date range</span><ul>
              <li class="tner-filter-item tner-date-option"><input id="tner-stored-date-start${GUID}" class="tner-stored-date-start tner-date-input tner-filter-option tner-solo-input" name="tner-date-filter-start" data-filter="date-start" placeholder="From" aria-label="From date"></li>
              <li class="tner-filter-item tner-date-option"><input id="tner-stored-date-end${GUID}" class="tner-stored-date-end tner-date-input tner-filter-option tner-solo-input" name="tner-date-filter-end" data-filter="date-end" placeholder="To" aria-label="To date"></li>
            </ul></li>
            <li id="tner-date-filter-day${GUID}" class="tner-date-filter-day"><span class="tner-filter-heading">Day of week</span><ul id="tner-date_weekday${GUID}" data-filter="date-day" class="tner-date_weekday tner-filter-checkbox-group"></ul></li>
            <li id="date-filter-time${GUID}" class="tner-date-filter-time"><span class="tner-filter-heading">Time of day</span><ul id="tner-time_of_day${GUID}" data-filter="date-time" class="tner-time_of_day tner-filter-checkbox-group"></ul></li>
          </ul>${filterButtons('date')}
        </form></div>
      </li>
      ${facetTab('performer', catalogue.group === 'sports' ? 'Teams' : 'Artists', 'performer_list')}
      ${facetTab('city', 'Cities', 'city_and_state')}
    </ul>
    <div id="tner-filter-spacer${GUID}" class="tner-filter-spacer"></div>
    <div id="tner-filter-tags-container${GUID}" class="tner-filter-tags-container"><ul id="tner-filter-tags${GUID}" class="tner-filter-tags"></ul></div>
  </div>
  <div id="tner-results${GUID}" class="tner-list-container">
    <input id="tner-call-storage${GUID}" class="tner-call-storage" hidden>
    <a class="tner-more" href="#"><span class="tner-more-text">Load more events</span></a>
  </div>
</div>
<script>
(function () {
  'use strict';
  var category = ${JSON.stringify(category)};
  var status = document.getElementById('widget-status');
  var container = document.getElementById('tner-container${GUID}');
  var results = document.getElementById('tner-results${GUID}');
  var area = document.getElementById('widget-area');
  var areas = ${JSON.stringify(TICKETNETWORK_AREAS)};
  var baseFilters = ${JSON.stringify(baseFilters)};
  var params = ${JSON.stringify(params)};
  var retry = document.getElementById('widget-retry');
  var deadline;
  var retryTimer;
  var lastRequest;
  var activeRequest;
  var requestId = 0;
  var runtimeReady = false;
  var phase = 'loading';
  var successfulSearch = '';
  var previous = '';
  function report(state) {
    var message = { type: 'gorgona-ticketnetwork', category: category, state: state, height: Math.max(120, Math.ceil(document.body.getBoundingClientRect().height) + 24) };
    var signature = JSON.stringify(message);
    if (signature !== previous) { previous = signature; parent.postMessage(message, '*'); }
  }
  function fail() {
    clearTimeout(deadline);
    phase = 'error';
    status.hidden = false;
    status.textContent = 'TicketNetwork is not responding. Try again here, or browse tickets using the link above.';
    retry.hidden = false;
    container.hidden = !runtimeReady;
    container.classList.remove('widget-busy');
    area.disabled = false;
    results.classList.add('loaded');
    report('error');
  }
  retry.addEventListener('click', function () {
    clearTimeout(retryTimer);
    if (runtimeReady && lastRequest) {
      window.jQuery.ajax(Object.assign({}, lastRequest, { gorgonaRetry: 0 }));
    } else {
      parent.postMessage({ type: 'gorgona-ticketnetwork-retry', category: category }, '*');
    }
  });
  function sync() {
    if (phase === 'ready') {
      clearTimeout(deadline);
      status.hidden = true;
      retry.hidden = true;
      container.hidden = false;
      area.disabled = false;
      container.classList.remove('widget-busy');
    }
    var empty = results.querySelector('.tner-no-results-text');
    var emptyText = 'No upcoming events match this area and your filters. Try different dates, teams or artists, or change the area.';
    if (empty && empty.textContent !== emptyText) empty.textContent = emptyText;
    container.querySelectorAll('a[target="_blank"]').forEach(function (link) {
      link.setAttribute('rel', 'noopener noreferrer sponsored');
      if (link.classList.contains('tner-row-link')) link.setAttribute('aria-label', link.parentElement.querySelector('.tner-name').textContent + ' — TicketNetwork');
      if (link.classList.contains('tner-cta-btn')) {
        link.setAttribute('aria-label', 'View tickets — ' + link.closest('.tner-row').querySelector('.tner-name').textContent);
        var label = link.querySelector('.tner-cta-btn-text');
        if (label.textContent !== 'View tickets') label.textContent = 'View tickets';
      }
    });
    report(phase);
  }
  // srcDoc can finish before the parent's React hydration. Answer a fresh
  // measurement request after its message listener is installed as well.
  window.addEventListener('message', function (event) {
    if (event.source === parent && event.data && event.data.type === 'gorgona-ticketnetwork-measure') {
      previous = '';
      sync();
    }
  });
  new MutationObserver(sync).observe(results, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  new ResizeObserver(sync).observe(document.body);
  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = src; script.onload = resolve; script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  // Loading the vendor runtime and waiting for its event request are separate
  // stages. A slow script must not consume the event request's whole timeout.
  deadline = setTimeout(fail, 45000);
  loadScript('https://ajax.googleapis.com/ajax/libs/jquery/3.5.1/jquery.min.js')
    .then(function () { return loadScript('https://www.ticketnetwork.com/e/csctn-results-v3.js'); })
    .then(function () {
      var attempts = 0;
      var ready = setInterval(function () {
        if (window.tnerLoaded === true) {
          clearInterval(ready);
          runtimeReady = true;
          container.hidden = false;
          // Observe only the official catalogue call. Unrelated vendor AJAX
          // errors must not hide inventory. Retry the exact failed page and
          // filters, without advancing pagination or duplicating rows.
          window.jQuery.ajaxPrefilter(function (options, original, xhr) {
            var url;
            try { url = new URL(options.url); } catch (_) { return; }
            if (url.origin !== 'https://www.tn-apis.com' || url.pathname !== '/catalog/v2/events/search') return;
            var id = ++requestId;
            var oldRequest = activeRequest;
            activeRequest = xhr;
            if (oldRequest) oldRequest.abort();
            clearTimeout(deadline);
            clearTimeout(retryTimer);
            lastRequest = Object.assign({}, original);
            options.timeout = 30000;
            url.searchParams.delete('page');
            var search = url.href;
            var list = results.querySelector('.tner-list');
            if (list) list.hidden = search !== successfulSearch;
            if (list && !list.hidden) results.classList.add('loaded');
            phase = 'loading';
            retry.hidden = true;
            status.hidden = false;
            status.textContent = 'Loading events from TicketNetwork…';
            container.classList.add('widget-busy');
            area.disabled = true;
            xhr.done(function () {
              if (id !== requestId) return;
              activeRequest = null;
              successfulSearch = search;
              phase = 'ready';
              var rendered = results.querySelector('.tner-list');
              if (rendered) rendered.hidden = false;
              sync();
            });
            xhr.fail(function (response, reason) {
              if (id !== requestId || reason === 'abort') return;
              activeRequest = null;
              console.warn('TicketNetwork catalogue request failed', { status: response.status, reason: reason });
              var attempt = original.gorgonaRetry || 0;
              if (attempt < 2 && (response.status === 0 || response.status >= 500 || reason === 'timeout')) {
                status.hidden = false;
                status.textContent = 'TicketNetwork is taking longer than usual. Retrying…';
                retryTimer = setTimeout(function () {
                  window.jQuery.ajax(Object.assign({}, original, { gorgonaRetry: attempt + 1 }));
                }, 2000 * (attempt + 1));
                report('loading');
              } else {
                fail();
              }
            });
          });
          window.initializeDatepickers('#tner-stored-date-start${GUID}', '#tner-stored-date-end${GUID}');
          area.addEventListener('change', function () {
            var selected = areas.find(function (item) { return item.value === area.value; });
            if (!selected) return;
            // Keep date and performer selections. A city from the previous
            // area must not silently exclude every result in the new area.
            var storage = document.getElementById('tner-filter-storage${GUID}');
            var filters = storage.value ? JSON.parse(decodeURIComponent(storage.value)) : {};
            delete filters.city;
            storage.value = encodeURIComponent(JSON.stringify(filters));
            container.querySelectorAll('[data-filterType="city"]').forEach(function (tag) { tag.remove(); });
            document.getElementById('tner-city-filter${GUID}').classList.remove('active', 'open');
            document.getElementById('tner-call-storage${GUID}').value = '';
            params.filters = baseFilters + selected.filter;
            params.page = 1;
            results.classList.remove('loaded');
            area.disabled = true;
            window.csctnCall(params, true);
          });
          window.csctnCall(params);
        } else if (++attempts >= 450) { clearInterval(ready); fail(); }
      }, 100);
    }).catch(fail);
})();
</script></body></html>`;
}
