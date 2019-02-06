
var listindex = getParameterByName('ListIndex');
function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
    var regexS = "[\\?&]" + name + "=([^&#]*)";
    var regex = new RegExp(regexS);
    var results = regex.exec(window.location.search);
    if (results == null)
        return "";
    else
        return decodeURIComponent(results[1].replace(/\+/g, " "));
}

Ext.onReady(function () {
    Ext.QuickTips.init();
    App.init();
});

TaskPriority = {
    Low: 0,
    Normal: 1,
    High: 2
};

App = {

    // Initialize application
    init: function () {
        Ext.define("TaskModel", {
            extend: "Gnt.model.Task",

            // Some custom field definitions
            fields: [
                { name: 'Id', type: 'int', useNull: true },
                { name: 'StartDate', type: 'date', dateFormat: 'MS' },
                { name: 'EndDate', type: 'date', dateFormat: 'MS' },
                { name: 'Priority', defaultValue: 1 },
                { name: 'Contractor', type: 'string', defaultValue: '' },
                { name: 'Notes', type: 'string', defaultValue: '' },
                { name: 'FileDirRef', type: 'string', defaultValue: '' },

            // Override some NodeInterface defaults
                {name: 'index', type: 'int', persist: true },
                { name: 'expanded', type: 'bool', defaultValue: true, persist: false }
            ],

            addSubtask: function (subtask) {
                this.set('leaf', false);
                this.appendChild(subtask);
                if (!subtask.get('FileDirRef')) {
                    subtask.set('FileDirRef', this.data.FileDirRef + '/' + this.data.Name);
                }
                debugger;
                this.expand();
            }
        });

        var taskStore = Ext.create("Gnt.data.TaskStore", {
            model: 'TaskModel',
            pageSize: 1,
            proxy: {
                type: 'ajax',
                headers: { "Content-Type": 'application/json' },
                api: {
                    read: '../webservices/Tasks.asmx/Get',
                    create: '../webservices/Tasks.asmx/Create',
                    destroy: '../webservices/Tasks.asmx/Delete',
                    update: '../webservices/Tasks.asmx/Update'
                },
                writer: {
                    type: 'json',
                    root: 'jsonData',
                    encode: false,
                    allowSingle: false
                },
                reader: {
                    type: 'json',
                    root: function (o) {
                        if (o.d) {
                            return o.d;
                        } else {
                            return o.children;
                        }
                    }
                },
                extraParams: {
                    'listindex': listindex
                }
            }
        });

        var dependencyStore = Ext.create("Gnt.data.DependencyStore", {
            autoLoad: true,
            autoSync: true,
            proxy: {
                type: 'ajax',
                headers: { "Content-Type": 'application/json' },
                method: 'GET',
                reader: {
                    root: 'd',
                    type: 'json'
                },
                writer: {
                    root: 'jsonData',
                    type: 'json',
                    encode: false,
                    allowSingle: false
                },
                api: {
                    read: '../webservices/Dependencies.asmx/Get',
                    create: '../webservices/Dependencies.asmx/Create',
                    destroy: '../webservices/Dependencies.asmx/Delete'
                },
                extraParams: {
                    'listindex': listindex
                }
            }
        });

        var resourceStore = Ext.create("Gnt.data.ResourceStore", {
            model: 'Gnt.model.Resource'
        });

        var assignmentStore = Ext.create("Gnt.data.AssignmentStore", {
            autoLoad: true,
            autoSync: false, // uncomment for sending updates automatically to server  

            // Must pass a reference to resource store
            resourceStore: resourceStore,
            proxy: {
                type: 'ajax',
                headers: { "Content-Type": 'application/json' },
                method: 'GET',
                reader: {
                    type: 'json',
                    root: 'd.assignments'
                },
                writer: {
                    root: 'assignments',
                    type: 'json',
                    encode: false,
                    allowSingle: false
                },
                api: {
                    read: '../webservices/Resources.asmx/Get',
                    create: '../webservices/Resources.asmx/Create'
                },
                extraParams: {
                    'listindex': listindex
                }
            },
            listeners: {
                load: function () {
                    this.resourceStore.loadData(this.proxy.reader.jsonData.d.resources);
                }
            }
        });

        var assignmentEditor = Ext.create('Gnt.widget.AssignmentCellEditor', {
            assignmentStore: assignmentStore,
            resourceStore: resourceStore,
            fieldConfig: {
                gridConfig: {
                    listeners: {
                        afterrender: function (grid) {
                            var header = grid.headerCt;
                            header.items.last().hide(); // Hide unit column

                            grid.getSelectionModel().setSelectionMode('SINGLE');
                        }
                    }
                }
            }
        });

        var cellEditing = Ext.create('Sch.plugin.TreeCellEditing', {
            clicksToEdit: 1
        });

        Ext.define('ADUserStore', {
            extend: 'Ext.data.Model',
            autoLoad: true,
            fields: [
            { name: 'Id', type: 'int', useNull: true },
            { name: 'Name', type: 'string'}],
            proxy: {
                type: 'ajax',
                headers: { "Content-Type": 'application/json' },
                url: '../webservices/Resources.asmx/GetUsers',
                method: 'GET',
                reader: {
                    type: 'json',
                    root: 'd'
                }
            }
        });

        var userStore = Ext.create('Ext.data.Store', {
            model: 'ADUserStore'
        });


        var start = new Date(2012, 1, 1),
            end = Sch.util.Date.add(start, Sch.util.Date.MONTH, 24);

        var g = Ext.create("Gnt.panel.Gantt", {

            height: 500,
            width: 1110,
            renderTo: "second",
            leftLabelField: 'Name',
            weekendsAreWorkdays: true,
            loadMask: true,
            startDate: start,
            endDate: end,
            multiSelect: true,
            cascadeChanges: true,
            viewPreset: 'weekAndDayLetter',
            recalculateParents: true,
            lockedGridConfig: {
                width: 700
            },
            // Add some extra functionality
            plugins: [
                Ext.create("Gnt.plugin.TaskContextMenu", {
                    triggerEvent: 'itemcontextmenu'
                }),
                Ext.create('Sch.plugin.TreeCellEditing', {
                    clicksToEdit: 1
                })
            ],
            eventRenderer: function (task) {

                var prioCls;
                switch (task.get('Priority')) {
                    case TaskPriority.Low:
                        prioCls = 'sch-gantt-prio-low';
                        break;

                    case TaskPriority.Normal:
                        prioCls = 'sch-gantt-prio-normal';
                        break;

                    case TaskPriority.High:
                        prioCls = 'sch-gantt-prio-high';
                        break;
                }

                return {
                    cls: prioCls
                };
            },

            // Setup your static columns
            columns: [
               new Gnt.column.WBS({ width: 100 }),
               {
                   xtype: 'treecolumn',
                   header: 'Tasks',
                   dataIndex: 'Name',
                   width: 150,
                   field: new Ext.form.TextField()
               },
            //new Gnt.column.StartDate(),
            {
            xtype: 'startdatecolumn',
            width: 80,
            onTreeEdit: function (cellEditor, context) {
                var task = context.record;
                var value = context.value;
                var originalValue = context.originalValue;

                if (context.column == this) {
                    if (!value) {
                        task.setStartDate(null);
                    } else if (value - context.originalEditorValue !== 0) {
                        // Special treatment of milestone task dates
                        var endDate = task.getEndDate();

                        if (this.adjustMilestones && endDate && endDate - task.getStartDate() === 0 && originalValue - Ext.Date.clearTime(originalValue, true) === 0 && value - Ext.Date.clearTime(value, true) === 0) {
                            // the standard ExtJS date picker will only allow to choose the date, not time
                            // we set the time of the selected date to the earliest availability hour for that date
                            // in case the date has no availbility intervals we use the date itself
                            value = task.getCalendar().getCalendarDay(value).getAvailabilityEndFor(value) || value;
                        }

                        task.setStartDate(value, false, task.getTaskStore().skipWeekendsDuringDragDrop);
                    }
                }
            }
        },
        //Custom combox with autocomplete feature.
               {
               header: 'Users',
               dataIndex: 'Contractor',
               width: 200,
               field: {
                   xtype: 'combo',
                   emptyText: 'Select User',
                   store: userStore,
                   displayField: 'Name',
                   valueField: 'Name',
                   mode: 'remote',
                   autoSelect: false,
                   selectOnFocus: true,
                   hideTrigger: true,
                   typeAhead: true,
                   minChars: 1,
                   renderTo: document.body,
                   listeners: {
                       buffer: 50,
                       change: function () {
                           var store = this.store;
                           store.clearFilter();
                           store.filter({
                               property: 'Name',
                               anyMatch: true,
                               value: this.getValue()
                           });
                       }
                   }
               }
           }, 
        new Gnt.column.EndDate(), 
        new Gnt.column.Duration(), 
               {
               header: 'Notes',
               width: 400,
               bodyPadding: 10,
               dataIndex: 'Notes',
               field: {
                   xtype: 'textareafield',
                   grow: true
               }
               ///field: new Ext.form.TextArea()
           }
              ],

        taskStore: taskStore,
        dependencyStore: dependencyStore,
        tooltipTpl: new Ext.XTemplate(
                '<h4 class="tipHeader">{Name}</h4>',
                '<table class="taskTip">',
                    '<tr><td>Start:</td> <td align="right">{[Ext.Date.format(values.StartDate, "y-m-d")]}</td></tr>',
                    '<tr><td>End:</td> <td align="right">{[Ext.Date.format(values.EndDate, "y-m-d")]}</td></tr>',
                    '<tr><td>Progress:</td><td align="right">{PercentDone}%</td></tr>',
                '</table>'
            ).compile(),

        tbar: [
                {
                    text: 'Collapse all',
                    iconCls: 'icon-collapseall',
                    handler: function () {
                        g.collapseAll();
                    }
                },
                 {
                     text: 'Expand all',
                     iconCls: 'icon-expandall',
                     handler: function () {
                         g.expandAll();
                     }
                 },
                {
                    text: 'Zoom to fit',
                    iconCls: 'icon-zoomtofit',
                    handler: function () {
                        g.zoomToFit();
                    }
                },
                {
                    text: 'Add',
                    iconCls: 'icon-add',
                    handler: function () {
                        var newTask = new taskStore.model({
                            Name: 'New task',
                            leaf: true,
                            PercentDone: 0
                        });
                        taskStore.getRootNode().appendChild(newTask);
                    }
                },
                {
                    text: 'Save',
                    iconCls: 'icon-save',
                    handler: function () {
                        taskStore.sync();
                        g.lockedGrid.getView().refresh();
                    }
                },
                {
                    text: 'Delete',
                    iconCls: 'icon-delete',
                    handler: function () {
                        var me = this;
                        Ext.Msg.show({
                            title: 'Delete task?',
                            msg: 'Are you sure you want to delete selected tasks ?',
                            buttons: Ext.Msg.YESNO,
                            icon: Ext.Msg.QUESTION,
                            fn: function (button) {
                                if (button === 'yes') {
                                    var tasks = g.getSelectionModel().selected;
                                    g.taskStore.remove(tasks.items);
                                    taskStore.sync();
                                }
                            }
                        });
                    }
                }

            ],

        resourceStore: resourceStore,
        assignmentStore: assignmentStore,
        taskStore: taskStore,
        stripeRows: true
    });
}
};