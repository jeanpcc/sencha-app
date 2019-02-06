/*
 * This file launches the application by asking Ext JS to create
 * and launch() the Application class.
 */
Ext.application({
    extend: 'MyGant.Application',

    name: 'MyGant',

    requires: [
        // This will automatically load all classes in the MyGant namespace
        // so that application classes do not need to require each other.
        'MyGant.*',
        //'MyGant.classic.src.view.gantt.Gantt' 
    ],
    launch : function() {
        Ext.QuickTips.init();

        Ext.create('Ext.Viewport', {
            layout : 'border',

            items : [
                Ext.create('MyGant.classic.src.view.main.Gantt', {
                    region : 'center'
                }), {
                    xtype : 'details'
                }
            ]
        });
    },
    
    // The name of the initial view to create.
    //mainView: 'MyGant.view.main.Main'
});

Ext.define('App.data.CrossOriginConnection', {
	extend: 'Ext.data.Connection',
	singleton: true,
	config: {
		autoAbort : false,
		useDefaultXhrHeader: false
	}
});