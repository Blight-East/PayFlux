// PostHog cookieless analytics for payflux.dev
//
// Privacy posture:
//   - persistence: 'memory'    no cookies, no localStorage; distinct_id
//                              survives page navigation within a tab,
//                              resets on tab close.
//   - ip: false                no IP capture
//   - respect_dnt: true        respects Do Not Track header
//   - autocapture: true        fires $autocapture for clicks/form submits
//                              so funnels can be built without code edits
//
// Custom event:
//   - cta_clicked              fires on any element with [data-cta-id].
//                              Properties: cta_id, cta_location, cta_text, cta_href.

(function () {
    var POSTHOG_KEY = 'phc_ADQ5FzWb5y2JJtVEZaFWCdyDWH5hNjrbmMqhuGnVyWiC';
    var POSTHOG_HOST = 'https://us.i.posthog.com';
    var JOURNEY_KEY = 'pf_journey_id';
    var COOKIE_NAME = 'pf_journey';
    var COOKIE_MAX_AGE = 60 * 60 * 24 * 90;

    function resolveCookieDomain(hostname) {
        return hostname === 'payflux.dev' || hostname.slice(-12) === '.payflux.dev'
            ? '.payflux.dev'
            : null;
    }

    function readCookie(name) {
        var escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        var match = document.cookie.match(new RegExp('(?:^|; )' + escaped + '=([^;]*)'));
        return match ? decodeURIComponent(match[1]) : null;
    }

    function getJourneyId() {
        var id = null;
        try { id = window.localStorage && window.localStorage.getItem(JOURNEY_KEY); } catch (_) {}
        if (!id) {
            id = readCookie(COOKIE_NAME) || (window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : String(Date.now()) + '-' + Math.random().toString(16).slice(2));
            try { window.localStorage && window.localStorage.setItem(JOURNEY_KEY, id); } catch (_) {}
        }

        var domain = resolveCookieDomain(window.location.hostname);
        var domainAttr = domain ? '; domain=' + domain : '';
        document.cookie = COOKIE_NAME + '=' + encodeURIComponent(id) + '; path=/; max-age=' + COOKIE_MAX_AGE + '; SameSite=Lax' + domainAttr;
        return id;
    }

    function appendJourneyToAppLinks(journeyId) {
        var links = document.querySelectorAll('a[href*="app.payflux.dev"]');
        links.forEach(function (link) {
            try {
                var url = new URL(link.href);
                url.searchParams.set('journey_id', journeyId);
                link.href = url.toString();
            } catch (_) {}
        });
    }

    function inferCtaLocation(el) {
        if (el.dataset.ctaLocation) return el.dataset.ctaLocation;
        var id = el.dataset.ctaId || '';
        if (id.indexOf('hero') === 0) return 'hero';
        if (id.indexOf('header') === 0 || id.indexOf('sticky') === 0) return 'nav';
        if (id.indexOf('section6') === 0) return 'footer';
        if (el.closest && el.closest('footer')) return 'footer';
        return 'docs';
    }

    var journeyId = getJourneyId();
    appendJourneyToAppLinks(journeyId);

    !function (t, e) { var o, n, p, r; e.__SV || (window.posthog = e, e._i = [], e.init = function (i, s, a) { function g(t, e) { var o = e.split("."); 2 == o.length && (t = t[o[0]], e = o[1]), t[e] = function () { t.push([e].concat(Array.prototype.slice.call(arguments, 0))) } } (p = t.createElement("script")).type = "text/javascript", p.crossOrigin = "anonymous", p.async = !0, p.src = s.api_host.replace(".i.posthog.com", "-assets.i.posthog.com") + "/static/array.js", (r = t.getElementsByTagName("script")[0]).parentNode.insertBefore(p, r); var u = e; for (void 0 !== a ? u = e[a] = [] : a = "posthog", u.people = u.people || [], u.toString = function (t) { var e = "posthog"; return "posthog" !== a && (e += "." + a), t || (e += " (stub)"), e }, u.people.toString = function () { return u.toString(1) + ".people (stub)" }, o = "init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug".split(" "), n = 0; n < o.length; n++)g(u, o[n]); e._i.push([i, s, a]) }, e.__SV = 1) }(document, window.posthog || []);

    window.posthog.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        persistence: 'memory',
        capture_pageview: true,
        capture_pageleave: false,
        respect_dnt: true,
        ip: false,
        autocapture: true,
        property_blacklist: ['$ip', '$ip_address'],
        bootstrap: { distinctID: journeyId, isIdentifiedID: false },
        loaded: function (ph) {
            // Surface distinct_id for cross-domain handoff to app.payflux.dev
            try { window.__pf_distinct_id = ph.get_distinct_id(); } catch (_) {}
            try {
                console.log('[POSTHOG_FUNNEL_DEBUG] marketing_init', {
                    distinct_id: ph.get_distinct_id(),
                    journey_id: journeyId,
                    host: POSTHOG_HOST
                });
            } catch (_) {}
        }
    });

    // Custom CTA tracking — every element with data-cta-id fires cta_clicked
    document.addEventListener('click', function (e) {
        var el = e.target && e.target.closest && e.target.closest('[data-cta-id]');
        if (!el || !window.posthog || !window.posthog.capture) return;
        try {
            window.posthog.capture('cta_clicked', {
                cta_id: el.dataset.ctaId,
                cta_location: inferCtaLocation(el),
                cta_text: (el.textContent || '').trim().slice(0, 80),
                cta_href: el.getAttribute('href') || null
            });
            console.log('[POSTHOG_FUNNEL_DEBUG] marketing_capture', {
                event: 'cta_clicked',
                distinct_id: window.posthog.get_distinct_id ? window.posthog.get_distinct_id() : null,
                cta_location: inferCtaLocation(el)
            });
        } catch (_) {}
    });
})();
