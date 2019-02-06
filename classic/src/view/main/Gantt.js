 

Ext.onReady(function(){
     
 

    generateAndLoadData = function(datos){
        var me = ganttPanel;
        // because of the delay we can reach here after destroy
        if (me.destroyed) return;

        me.mask('Generando tareas... ');

        me.generateTimeout = Ext.defer(function () { 
            me.mask('Cargando data generada... '); 
            me.loadTimeout = Ext.defer(function () {
                me.suspendRefresh();  
                me.loadTaskData(datos);
                me.resumeRefresh();
                me.mask('Renderizando...'); 
                me.renderTimeout = Ext.defer(function () {
                    me.refreshViews();
                    me.unmask();
                }, 100);
            }, 100);
        }, 100);
    }




var ganttPanel = Ext.create('Gnt.panel.Gantt', {
        xtype:'maingant',
        height     : 700,
        width      : "100%", 
        renderTo   : document.body,
        
    title : 'My Gantt',
    requires : [
        'Sch.util.Date',
        'Sch.preset.Manager',
        'Gnt.column.Name',
        'Gnt.plugin.taskeditor.TaskEditor',
        'Gnt.plugin.TaskContextMenu',
        'Gnt.plugin.DependencyEditor',
        'Sch.plugin.TreeCellEditing'
    ],
    plugins : [
        // enables task editing by double clicking, displays a window with fields to edit
        'gantt_taskeditor',
        // enables double click dependency editing
        'gantt_dependencyeditor',
        // shows a context menu when right clicking a task
        'gantt_taskcontextmenu',
        // column editing
        'scheduler_treecellediting' 
    ],
  
    dependencyViewConfig     : {
        overCls : 'dependency-over'
    },
    rowHeight                : 35,

    // startDate and endDate determine the date interval visible in the gantt chart.
    // endDate is set in initComponent, because it is calculated from startDate.
    // when startDate and endDate are omitted, these dates will be determined by the loaded data
    // startDate                : new Date(2017, 0, 11),


    // give weekends a contrasting color
    highlightWeekends        : true,

    // enable setting PercentDone for a task by dragging a percentage handle
    enableProgressBarResize  : true,

    // allow creating/editing of dependencies by dragging with the mouse
    enableDependencyDragDrop : true,

    // change to true to allow user to resize static column area
    split                    : false,
    viewPreset : {
        timeColumnWidth : 100,
        name            : 'weekAndDayLetter',
        headerConfig    : {
            middle : {
                unit       : 'w',
                dateFormat : 'D d M Y'
            }
        }
    },

        taskStore : {
            type  : 'gantt_taskstore',
            proxy : {
                type : 'ajax',
                url  : 'data/tasks.json'
            }
        },

        dependencyStore : {
            type                   : 'gantt_dependencystore',
            allowedDependencyTypes : ['EndToStart'],
            autoLoad               : true,
            proxy                  : {
                type : 'ajax',
                url  : 'data/dependencies.json'
            }
        },
        columns : [
            {
                xtype       : 'namecolumn' ,
                width       : 350
            }
        ],    
        // tbar :[
        //     {
        //         text: 'Refrescar',
        //         iconCls: 'x-fa fa-plus-circle',
        //         handler: function () {   
        //             ganttPanel.update(); 
        //             ganttPanel.taskStore.sync();
        //             //ganttPanel.lockedGrid.getView().refresh();
        //         }
        //     },
        // ],
        header : {
            items : [{
                xtype : 'button',
                iconCls: 'x-fa fa-plus-circle',
                itemId: 'generateData',
                text  : 'Generate',
                handler: function () { 
                    var datosTmp = {};
                    // getAjax('data/tasks.json').then(function (content) {
                    //     return content;
                    // }).then(function (content) { 
                    //     datosTmp.task = Ext.JSON.decode(content); 

                    //     getAjax('data/tasks.json').then(function (content) {
                    //         datosTmp.dependencies = Ext.JSON.decode(content); 

                    //         generateAndLoadData(datosTmp); 
                    //     });
                    // }) 
                    getAjax('http://localhost:52832/api/Gantt/GetAllDataGet').then(function (content) {
                        console.log(response);
                    })
                }

            }]
        },
        loadTaskData : function (data) {
            
            var dependencyStore = this.getDependencyStore(),
                taskStore       = this.getTaskStore();
    
            // We generate data with same ids as before, so when we changing root, dependency store will be cleared
            // So first we should change root ant then load dependencies
            taskStore.setRoot({ expanded : true, children : data.tasks });
            dependencyStore.loadData(data.dependencies);
        },
    });
       

    ganttPanel.on('taskclick', function (ganttPanel, task) {
        alert("You've clicked on the task named " + task.getName());
    }); 
   
    function getAjax (url) {
        // The function passed to Ext.Promise() is called immediately to start
        // the asynchronous action.
        //
        return new Ext.Promise(function (resolve, reject) {
            Ext.Ajax.request({
                url: url,
                method: 'GET',
                cors: true,
                useDefaultXhrHeader: false,
                withCredentials: true,
                // params: {
                //     username: 'admin',
                //     password: 'admin'
                // }, 
                success: function (response) {
                    // Use the provided "resolve" method to deliver the result.
                    //
                    resolve(response.responseText);
                },
   
                failure: function (response) {
                    // Use the provided "reject" method to deliver error message.
                    //
                    reject(response);
                }
            });
        });
    }

    

});