// PostHog cookieless analytics for payflux.dev
//
// Replace POSTHOG_KEY with your project's public key from
// https://app.posthog.com/project/settings (or eu.posthog.com if EU-hosted).
//
// If POSTHOG_KEY is empty, this file is a no-op — safe to commit
// before the project key is provisioned.
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
//                              Properties: cta_id, cta_text, cta_href.

(function () {
    var POSTHOG_KEY = '';
    var POSTHOG_HOST = 'https://eu.i.posthog.com';

    if (!POSTHOG_KEY) return;

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
        loaded: function (ph) {
            // Surface distinct_id for cross-domain handoff to app.payflux.dev
            try { window.__pf_distinct_id = ph.get_distinct_id(); } catch (_) {}
        }
    });

    // Custom CTA tracking — every element with data-cta-id fires cta_clicked
    document.addEventListener('click', function (e) {
        var el = e.target && e.target.closest && e.target.closest('[data-cta-id]');
        if (!el || !window.posthog || !window.posthog.capture) return;
        try {
            window.posthog.capture('cta_clicked', {
                cta_id: el.dataset.ctaId,
                cta_text: (el.textContent || '').trim().slice(0, 80),
                cta_href: el.getAttribute('href') || null
            });
        } catch (_) {}
    });
})();
