sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    'sap/m/MessageBox',
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, JSONModel, MessageBox) {
        "use strict";

        return Controller.extend("zuipr.controller.ManualPR", {
            onInit: function () {
                var oModel = new sap.ui.model.json.JSONModel();
                this._onBeforeDetailData = []
                oModel.loadData("/sap/bc/ui2/start_up").then(() => {
                    this._userid = oModel.oData.id;
                })
                this.getView().setModel(new JSONModel({results: []}), "PRDetDataModel"); 
                this.loadAllData();
            },
            loadAllData: async function(){
                await new Promise((resolve, reject)=>{
                    resolve(this.getHeaderConfig())
                });

                await new Promise((resolve, reject)=>{
                    resolve(this.getDynamicTableColumns())
                });
            },

            getHeaderConfig: async function () {
                var me = this;
                var oView = this.getView();
                var oModel = this.getOwnerComponent().getModel();
                var oJSONModel1 = new sap.ui.model.json.JSONModel();
                var oJSONModel2 = new sap.ui.model.json.JSONModel();

                //get header fields
                oModel.setHeaders({
                    sbu: 'VER',
                    type: 'MANUALPRHDR',
                });
                await new Promise((resolve, reject)=>{
                    oModel.read("/MANPRDYNAMICCOLSet", {
                        success: function (oData, oResponse) {
                            console.log(oData)
                            var visibleFields = {};
                            var editableFields ={};
                            //get only visible fields
                            for (var i = 0; i < oData.results.length; i++) {
                                visibleFields[oData.results[i].ColumnName] = oData.results[i].Visible;
                                editableFields[oData.results[i].ColumnName] = oData.results[i].Editable;
                            }
                            var JSONVisibleFieldsdata = JSON.stringify(visibleFields);
                            var JSONVisibleFieldsparse = JSON.parse(JSONVisibleFieldsdata);
                            oJSONModel1.setData(JSONVisibleFieldsparse);
                            oView.setModel(oJSONModel1, "VisibleFieldsData");


                            var JSONEditableFieldsdata = JSON.stringify(editableFields);
                            var JSONEditableFieldsparse = JSON.parse(JSONEditableFieldsdata);
                            oJSONModel2.setData(JSONEditableFieldsparse);
                            oView.setModel(oJSONModel2, "EditableFieldsData");
                            resolve();
                        },
                        error: function (err) { }
                    });
                })

            },
            getDynamicTableColumns: async function () {
                var me = this;

                //get dynamic columns based on saved layout or ZERP_CHECK
                var oJSONColumnsModel = new sap.ui.model.json.JSONModel();
                this.oJSONModel = new sap.ui.model.json.JSONModel();
                var oModel = this.getOwnerComponent().getModel('ZGW_3DERP_COMMON_SRV');
                
                // this._SBU = this.getView().byId("SmartFilterBar").getFilterData().SBU;  //get selected SBU
                this._sbu = 'VER'
                oModel.setHeaders({
                    sbu: 'VER',
                    type: 'MANUALPRDET',
                    tabName: 'ZDV_3DERP_PR'
                });
                await new Promise((resolve, reject)=>{
                    oModel.read("/ColumnsSet", {
                        success: function (oData, oResponse) {
                            console.log(oData)
                            oJSONColumnsModel.setData(oData);
                            me.oJSONModel.setData(oData);
                            me.getView().setModel(oJSONColumnsModel, "PRDetColModel");  //set the view model
                            me.setTableData('prDetTable')
                            resolve();
                        },
                        error: function (err) { }
                    });
                })
            },

            onPRDetAdd: async function(){
                var detailsItemArr = [];
                var detailsItemLastCnt = 0;
                var detailsItemObj = this._onBeforeDetailData;
                var newInsertField = [];

                detailsItemObj = detailsItemObj.length === undefined ? [] : detailsItemObj;

                for(var x = 0; x < detailsItemObj.length; x++){
                    detailsItemArr.push(detailsItemObj[x]);
                }
                detailsItemArr.sort(function(a, b){return b - a});
                detailsItemLastCnt = isNaN(Object.keys(detailsItemArr).pop()) ? 0 : Object.keys(detailsItemArr).pop();

                detailsItemLastCnt = String(parseInt(detailsItemLastCnt) + 1);

                for (var oDatas in detailsItemObj[0]) {
                    //get only editable fields
                    if(oDatas !== '__metadata')
                        newInsertField[oDatas] = "";
                }
                detailsItemObj.push(newInsertField);

                this.getView().getModel("PRDetDataModel").setProperty("/results", detailsItemObj);
                await this.setTableData('prDetTable');
                this.onRowEdit('prDetTable', 'PRDetColModel');
            },

            setTableData: async function(table){
                var me = this;

                //the selected dynamic columns
                var oDetColumnsModel = this.getView().getModel("PRDetColModel");
                var oDetDataModel = this.getView().getModel("PRDetDataModel");

                //the selected styles data
                var oDetColumnsData = oDetColumnsModel.getProperty('/results');
                var oDetData = oDetDataModel.getProperty('/results');

                var oModel = new JSONModel();
                oModel.setData({
                    columns: oDetColumnsData,
                    rows: oDetData
                });

                var oDetTable = this.getView().byId(table);
                oDetTable.setModel(oModel);

                //bind the dynamic column to the table
                oDetTable.bindColumns("/columns", function (index, context) {
                    var sColumnId = context.getObject().ColumnName;
                    var sColumnLabel = context.getObject().ColumnLabel;
                    var sColumnType = context.getObject().ColumnType;
                    var sColumnWidth = context.getObject().ColumnWidth;
                    var sColumnVisible = context.getObject().Visible;
                    var sColumnSorted = context.getObject().Sorted;
                    var sColumnSortOrder = context.getObject().SortOrder;
                    return new sap.ui.table.Column({
                         id: sColumnId,
                         label: sColumnLabel, //"{i18n>" + sColumnId + "}",
                         template: me.columnTemplate(sColumnId),
                         width: sColumnWidth + 'px',
                         sortProperty: sColumnId,
                         filterProperty: sColumnId,
                         autoResizable: true,
                         visible: sColumnVisible ,
                         sorted: sColumnSorted,
                         sortOrder: ((sColumnSorted === true) ? sColumnSortOrder : "Ascending" )
                    });
                });

                //bind the data to the table
                oDetTable.bindRows("/rows");
            },
            columnTemplate: function (sColumnId) {
                var oDetColumnTemplate;
                
                //different component based on field
                
                oDetColumnTemplate = new sap.m.Text({ text: "{" + sColumnId + "}", wrapping: false }); //default text

                if (sColumnId === "DELETED") {
                    //Manage button
                    oDetColumnTemplate = new sap.m.CheckBox({
                        selected: "{" + sColumnId + "}",
                        editable: false
                    });
                }
                return oDetColumnTemplate;
            },
            onRowEdit: function(table, model){
                var me = this;
                // this.getView().getModel(model).getData().results.forEach(item => item.Edited = false);
                var oTable = this.byId(table);

                var oColumnsModel = this.getView().getModel(model);
                var oColumnsData = oColumnsModel.getProperty('/results');
                
                oTable.getColumns().forEach((col, idx) => {
                    oColumnsData.filter(item => item.ColumnName === col.sId.split("-")[0])
                        .forEach(ci => {
                            var sColumnName = ci.ColumnName;
                            var sColumnType = ci.DataType;
                            if (ci.Editable) {
                                if (ci.ColumnName === "UNLIMITED") {
                                    col.setTemplate(new sap.m.CheckBox({
                                        selected: "{" + ci.ColumnName + "}",
                                        editable: true,
                                        // liveChange: this.onInputLiveChange.bind(this)
                                    }));
                                }else if (sColumnType === "STRING") {
                                    if(sColumnName === "CUSTSTYLE" || sColumnName === "CUSTSTYLEDESC" || sColumnName === "CPONO" || sColumnName === "CUSTCOLOR"
                                     || sColumnName === "CUSTSIZE" || sColumnName === "PRODUCTCD" || sColumnName === "PRODUCTGRP"){
                                        col.setTemplate(new sap.m.Input({
                                            // id: "ipt" + ci.name,
                                            type: "Text",
                                            value: "{path: '" + ci.ColumnName + "', mandatory: '"+ ci.Mandatory +"'}",
                                            maxLength: +ci.Length,
                                            showValueHelp: false,
                                            liveChange: this.onInputLiveChange.bind(this)
                                        }));
                                    }else{
                                        col.setTemplate(new sap.m.Input({
                                            // id: "ipt" + ci.name,
                                            type: "Text",
                                            value: "{path: '" + ci.ColumnName + "', mandatory: '"+ ci.Mandatory +"'}",
                                            maxLength: +ci.Length,
                                            showValueHelp: true,
                                            valueHelpRequest: this.handleValueHelp.bind(this),
                                            liveChange: this.onInputLiveChange.bind(this)
                                        }));
                                    }
                                }else if (sColumnType === "DATETIME"){
                                    col.setTemplate(new sap.m.DatePicker({
                                        // id: "ipt" + ci.name,
                                        value: "{path: '" + ci.ColumnName + "', mandatory: '"+ ci.Mandatory +"'}",
                                        displayFormat:"short",
                                        change:"handleChange",
                                    
                                        liveChange: this.onInputLiveChange.bind(this)
                                    }));
                                }else if (sColumnType === "NUMBER"){
                                    col.setTemplate(new sap.m.Input({
                                        // id: "ipt" + ci.name,
                                        type: sap.m.InputType.Number,
                                        value: "{path:'" + ci.ColumnName + "', mandatory: '"+ ci.Mandatory +"', type:'sap.ui.model.type.Decimal', formatOptions:{ minFractionDigits:" + null + ", maxFractionDigits:" + null + " }, constraints:{ precision:" + ci.Decimal + ", scale:" + null + " }}",
                                        
                                        maxLength: +ci.Length,
                                    
                                        liveChange: this.onNumberLiveChange.bind(this)
                                    }));
                                }
                            }
                        });
                });
            },
            onInputLiveChange: async function(oEvent){

            },
            onNumberLiveChange: async function(oEvent){

            },
            handleValueHelp: async function(oEvent){

            }

        });
    });
