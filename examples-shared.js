/*global RC, Siesta, Kanban, Sch, Gnt, UberGrid, Cal */
(function () {
    if (window.location.href.match(/^file:\/\/\//)) {
        alert('ERROR: You must run the examples in a web server (not using the file:/// protocol)');
    }

    window.__BRYNTUM_EXAMPLE = true;

    Ext.Loader.setConfig({
        enabled : true,
        paths   : {
            'Sch.locale'   : '../../packages/bryntum-gantt/src/Sch/locale',
            'Gnt.locale'   : '../../packages/bryntum-gantt/src/Gnt/locale',
            'Gnt.examples' : '..',
            'Sch.examples' : '..', // for DetailsPanel
            'Ext.ux'       : 'https://www.bryntum.com/examples/extjs-6.5.3/packages/ux/classic/src',
            'Robo'         : '../../packages/bryntum-gantt/src/Robo',
            'Sch'          : '../../packages/bryntum-gantt/src/Sch',
            'Gnt'          : '../../packages/bryntum-gantt/src/Gnt',
            'Cal'          : '../../../Calendar1.x/packages/bryntum-calendar/src/Cal',
            'interact'     : '../../../Calendar1.x/packages/bryntum-calendar/src/interact.js',
            'Kanban'       : '../../../TaskBoard2.x/packages/bryntum-taskboard/src/Kanban'
        }
    });

    // if "bundle" specified in query string we switch to the "bundle-mode"
    // when we:
    // 1) load gnt-all-debug.js
    // 2) do not provide paths for on-demand classes loading (except for classes that are always meant to be loaded on demand, like locales)
    // 3) can load few extra bundles provided via "bundles=" request parameter
    if (document.location.href.match(/\?.*bundle/g)) {

        // include gnt-all-debug
        var bundles = ['../../gnt-all-debug.js'],
            match;

        // and extra bundle urls from "bundles" parameter (if provided)
        if (match = window.location.href.match(/bundles=(.+)/)) {
            bundles = bundles.concat(match[1].split(','));
        }

        /* jshint ignore:start */
        Ext.Array.forEach(bundles, function (url) {
            document.write('<script src="' + url + '" type="text/javascript"></script>');
        });
        /* jshint ignore:end */
    }

    // override XTemplate to not hide exceptions
    Ext.XTemplate.override({ strict : true });

    // mute ARIA warnings
    Ext.ariaWarn         = Ext.emptyFn;
    Ext.enableAriaPanels = false;

    // override loadScripts to log LOD files
    var oldLoadScripts = Ext.Loader.loadScripts;

    window.Sch      = window.Sch || {};
    Sch.loadedFiles = [];

    Ext.require([
        // load before logging starts to avoid logging...
        'Sch.examples.lib.DetailsPanel'
    ]);

    Ext.Loader.loadScripts = function (params) {
        Sch.loadedFiles = Ext.Array.union(Sch.loadedFiles, params.url);

        return oldLoadScripts.apply(this, arguments);
    };
    // EOF override loadScripts to log LOD files



    var framed            = window.top !== window;
    var isOnline          = location.href.indexOf('bryntum.com') >= 0;
    var isRootCauseReplay = (function () {
        try {
            var a = window.top.location.href;
        } catch (e) {
            return true;
        }
        return false;
    })();

    if (isOnline && !framed) {
        // Analytics
        window._gaq = window._gaq || [];
        window._gaq.push([ '_setAccount', 'UA-11046863-1' ]);
        window._gaq.push([ '_setDomainName', 'none' ]);
        window._gaq.push([ '_setAllowLinker', true ]);
        window._gaq.push([ '_trackPageview' ]);

        var ga   = document.createElement('script');
        ga.type  = 'text/javascript';
        ga.async = true;
        ga.src   = ('https:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';
        var s    = document.getElementsByTagName('script')[ 0 ];
        s.parentNode.insertBefore(ga, s);
        // EOF analytics
    }

    if (isOnline || isRootCauseReplay) {
        var script = document.createElement('script');

        script.async       = true;
        script.crossOrigin = 'anonymous';
        script.src         = "https://app.therootcause.io/rootcause-full-extjs.js";
        script.addEventListener('load', startRootCause);

        document.head.appendChild(script);
    }


    function startRootCause() {
        if (!window.RC) {
            console.log('RootCause not initialized');
            return;
        }

        var suiteRe         = /\/examples\/([a-z]+)-for-extjs/,
            mainApplication = location.href.match(suiteRe) && location.href.match(suiteRe)[ 1 ] || 'unknown',
            recordVideo     = location.search.indexOf('video=1') >= 0;

        window.logger = new RC.Logger({
            captureScreenshot               : true,
            recordUserActions               : true,
            logAjaxRequests                 : true,
            saveCookies                     : true,
            applicationId                   : mainApplication,
            maxNbrLogs                      : isOnline ? 1 : 0,
            autoStart                       : isOnline,
            treatFailedAjaxAsError          : true,
            // enableArgumentsCapturing        : true,
            treatResourceLoadFailureAsError : true,
            showFeedbackButton              : isOnline && {
                nameFieldPlaceholder      : 'Your email'
            },
            recordSessionVideo              : recordVideo,
            showIconWhileRecording : {
                tooltip : 'NOTE: This session is being recorded for debugging purposes'
            },
            ignoreErrorMessageRe            : /Unexpected token var|script error/i,
            recorderConfig                  : {
                extractorConfig : {
                    ignoreClasses : [
                        'sch-dd-ref',
                        'sch-dirty'
                    ]
                }
            },
            ignoreFileRe                    : /ga\.js/,
            frameworkVersion                : (Ext.versions.extjs || Ext.versions.touch || {}).version,

            onBeforeLog : function (data) {
                var stack = data.stack;
                var tags  = {},
                    mainVersion;

                if (window.Kanban && Kanban.VERSION) tags.taskboard = Kanban.VERSION;
                if (window.Cal && Cal.VERSION) tags.calendar = Cal.VERSION;
                if (window.Gnt && window.Gnt.panel && Sch.VERSION) tags.gantt = Sch.VERSION;
                if (window.Sch && Sch.VERSION) tags.scheduler = Sch.VERSION;
                if (window.Siesta && Siesta.VERSION) tags.siesta = Siesta.VERSION;
                if (window.Robo && Robo.VERSION) tags.robo = Robo.VERSION;

                switch (mainApplication) {
                    case 'gantt':
                    case 'scheduler':
                        mainVersion = Sch.VERSION;
                        break;

                    case 'taskboard':
                        mainVersion = Kanban.VERSION;
                        break;

                    case 'siesta':
                        mainVersion = Siesta.VERSION;
                        break;

                    case 'calendar':
                        mainVersion = Cal.VERSION;
                        break;

                    case 'robo':
                        mainVersion = Robo.VERSION;
                        break;
                }

                // Detect and assign Kitchensink bugs to the correct app id
                if (stack && stack.match('\/kitchensink\/')) {
                    data.applicationId = 'a37e444595168872f99d108d6bda96a2e26e0284';
                }

                data.tags    = tags;
                data.version = mainVersion;

                // Ignore failed loads if tab is inactivated which causes resource loading to fail sometimes due to timeout
                if (data.isFailedAjax || data.isResourceLoadError) {
                    var windowIsOrWasHidden = document.visibilityState === 'hidden';
                    var logs                = data.logEntries || [];

                    if (!windowIsOrWasHidden) {
                        for (var i = 0; i < logs.length; i++) {
                            if (logs[ i ].type === 'visibility') {
                                windowIsOrWasHidden = true;
                                break;
                            }
                        }
                    }

                    return !windowIsOrWasHidden;
                }
            }
        });
    }
}());
