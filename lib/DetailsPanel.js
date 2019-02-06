/* globals Prism */

/**
 * Prism: Lightweight, robust, elegant syntax highlighting
 * MIT license http://www.opensource.org/licenses/mit-license.php/
 * @author Lea Verou http://lea.verou.me
 */

// supply details (as html) when creating
Ext.define('Sch.examples.lib.DetailsPanel', {
    extend        : 'Ext.panel.Panel',
    xtype         : 'details',
    width         : 400,
    title         : 'Details',
    collapsible   : true,
    collapsed     : true,
    titleCollapse : true,
    bodyBorder    : true,
    bodyPadding   : 15,
    region        : 'east',
    split         : true,
    border        : false,
    scrollable    : true,
    cls           : 'ks-cmp',
    tpl           : '<pre data-src="{src}">{content}</pre>',

    // Ignore any Ext JS files loaded on demand
    filterRe : /extjs-/,

    /**
     * Use Ext.Loader, Ext.Ajax calls & script tags to determine which files to include in the details panel.
     */
    hookLoader : true,

    /**
     * Adds an option to open a directory to view files. Specifiy path.
     */
    showSrcDir : null,

    /**
     * App.js path. Set to null to not add
     */
    appJSPath : 'app.js',

    /**
     * Custom source to show for specified urls. Stores responseText for ajax requests.
     */
    urlDataMap : {},

    /**
     * Html to display in details panel. If unset, checks for a div with class details-text.
     */
    details : null,

    /**
     * Add note about running on webserver to details.
     */
    addWebServerNote : true,

    /**
     * Add link to kitchensink to details.
     */
    addKitchensinkLink : true,

    /**
     * Files not to include in details panel
     */
    skipFiles : ['../examples-shared.js', '../lib/prism.js'],

    /**
     * Extra files to include in combo.
     */
    extraFiles : [],

    initComponent : function () {
        var me = this;

        // if details unset, try to get from div.details-text
        if (!me.details) {
            var div = Ext.getBody().down('.details-text');
            if (div) me.details = div.getHtml();
        }

        // add note about running on webserver
        if (me.addWebServerNote) me.details += '<p>NOTE: For this example to work you have to run it in a web server context.</p>';

        // add link to kitchensink
        if (me.addKitchensinkLink) me.details +=
            '<a href="../kitchensink" style="color:inherit;font-weight:500"><div class="x-fa fa-info-circle" style="display: inline-block"></div> ' +
            'View more examples in our Kitchen Sink, click to open.</a>';

        // set details as html
        me.html = me.details;

        if (!me.files) me.files = [];

        if (me.showSrcDir) me.files.push('Source directory');

        Ext.Ajax.on('requestcomplete', me.onAjaxRequest, me);

        Ext.apply(me, {
            tbar : [
                //'->',
                'Select source:',
                {
                    xtype         : 'combo',
                    value         : 'Details',
                    flex          : 1,
                    editable      : false,
                    store         : Ext.create('Ext.data.Store', {
                        fields : ['path', 'title']
                    }),
                    displayField  : 'title',
                    valueField    : 'title',
                    triggerAction : 'all',
                    queryMode     : 'local',
                    listConfig    : {
                        cls : 'details-combo-list'
                    },
                    listeners     : {
                        select : me.onFileSelected,
                        scope  : me
                    },
                    tpl           : Ext.create('Ext.XTemplate',
                        '<ul class="x-list-plain"><tpl for=".">',
                        '<li role="option" class="x-boundlist-item detail-panel-file {[this.getGlyph(values)]}">{title}</li>',
                        '</tpl></ul>',

                        {
                            getGlyph : function (values) {
                                var path = values.title;

                                switch (true) {
                                    case /^Details$/.test(path):
                                        return 'x-fa fa-question';

                                    case /app\.js/.test(path):
                                        return 'x-fa fa-file-text-o';

                                    case /xml$/.test(path):
                                    case /data\//.test(path):
                                        return 'x-fa fa-table';

                                    case /controller/i.test(path):
                                        return 'x-fa fa-bolt';

                                    case /\/view\//.test(path):
                                        return 'x-fa fa-desktop';

                                    case /\/store\//.test(path):
                                    case /crud\//.test(path):
                                        return 'x-fa fa-database';

                                    case /\/model\//.test(path):
                                        return 'x-fa fa-cube';

                                    case /\/reader\//.test(path):
                                    case /\/writer\//.test(path):
                                        return 'x-fa fa-exchange';

                                    case /\/plugin\//.test(path):
                                        return 'x-fa fa-puzzle-piece';

                                    default:
                                        return 'x-fa fa-file-o';
                                }
                            }
                        }
                    )
                }
            ]
        });

        me.addCls('details-panel');

        me.callParent();

        me.store = me.down('combo').store;
        me.refreshDetails();

        var filterRe = me.filterRe;
        me.store.filterBy(function (rec) {
            return !filterRe.test(rec.get('title'));
        });
    },

    refreshDetails : function (options) {
        options = options || {};

        var me        = this,
            store     = me.store,
            skipFiles = options.skipFiles || me.skipFiles;

        // reset urlDataMap and files
        me.down('combo').bindStore(null);
        me.urlDataMap = {};
        me.files      = ['Details'].concat(me.extraFiles || []);

        if (me.hookLoader) {
            // always add app.js
            if (me.appJSPath) me.files.push(me.appJSPath);

            // remove skipped files
            var filteredFiles = Ext.Array.filter(Sch.loadedFiles, function (file) {
                return !Ext.Array.contains(skipFiles, file);//(file.indexOf('..') == -1);
            });

            // add LOD files to files
            me.files = Ext.Array.union(me.files, filteredFiles.sort());
        }

        // map to expected record format
        var fileRows = Ext.Array.map(me.files, me.makeRecordData);
        store.loadData(fileRows);

        me.down('combo').bindStore(store);
        me.down('combo').setValue('Details');

        me.update(me.details);
    },

    /**
     * Returns { title: file } except if the file is located outside examples root (../).
     * In that case it returns { title: filename (no path), path: file }.
     * @param file path incl. filename
     * @returns {*}
     */
    makeRecordData : function (file) {
        if (!Ext.isString(file) && file.title) return file; // might already have correct format

        // file in other path, hide first folder of path (../basic/app/test.js -> app/test.js)
        var results = /^\.\.\/[^\/]*[\/]*(.*)/g.exec(file);

        if (results) return {path : file, title : results[1]};

        return {title : file};
    },

    onAjaxRequest : function (owner, response, options) {
        var me    = this,
            store = me.store,
            url   = options.url.split('?')[0],
            data  = me.makeRecordData(url);

        // dont add html or css
        if (/html$/.test(url)) return;
        if (/css$/.test(url)) return;

        // store latest responseText for ajax requests (if not static xml)
        if (!/xml$/.test(url)) me.urlDataMap[data.title] = response.responseText;

        if (store.findExact('title', data.title) < 0) {
            store.add(data);
        }
    },

    onFileSelected : function (combo, r) {
        var me         = this,
            url        = r.data.path || r.data.title,
            storedData = me.urlDataMap[url];

        if (url == 'Details') {
            me.update(me.details);
        } else if (url == 'Source directory') {
            document.location = me.showSrcDir;
        } else if (Ext.isIE) { // Prism is unstable in IE8-11
            if (storedData) {
                me.update(storedData);
            } else {
                me.loadFileContents(url);
            }
        } else {
            if (storedData) {
                me.update({content : '<code>' + Prism.highlight(storedData, Prism.languages.json) + '</code>'});
            } else {
                me.update({src : url});
                Prism.fileHighlight();
            }
        }
    },

    loadFileContents : function (url) {
        Ext.Ajax.request({
            url     : url,
            success : function (response) {
                // handle displaying of XML files
                var content = Ext.String.htmlEncode(response.responseText);

                this.update({content : content});
            },
            scope   : this
        });
    }
}, function () {
    if (!window.Prism && !Ext.isIE) {
        Ext.Loader.loadScript('../lib/prism.js');
    }
});