sap.ui.define(
    [
        "sap/ui/core/mvc/Controller",
        "sap/ui/model/json/JSONModel",
        "sap/m/MessageBox",
        "../js/Common",
        "zuipr/model/formatter",
        "sap/ui/model/Filter",
        "sap/ui/Device",
        "sap/ui/model/Filter",
        "sap/ui/model/FilterOperator",
        'sap/ui/model/Sorter',
        "sap/ui/table/library",
        "sap/m/TablePersoController",
        "sap/ui/model/xml/XMLModel",
        "../control/DynamicTable"
    ],
    function(BaseController, JSONModel, MessageBox, Common, formatter, Filter, FilterOperator, XMLModel, Device) {
      "use strict";

      var that;
      var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({pattern : "MM/dd/yyyy" });
      var sapDateFormat = sap.ui.core.format.DateFormat.getDateInstance({pattern : "yyyy-MM-dd" });
  
      return BaseController.extend("zuipr.controller.Main", {
        onInit: function () {
            that = this;
            Common.openLoadingDialog(that);
            var oComponent = this.getOwnerComponent();
            this._router = oComponent.getRouter();
            this.setSmartFilterModel();

            this._Model = this.getOwnerComponent().getModel();
            this._i18n = this.getOwnerComponent().getModel("i18n").getResourceBundle();

            // this.getColumns();
            this._isEdited = false
            this._DiscardChangesDialog = null;
            this._oDataBeforeChange = {}
            this._sbuChange = false;
            
            this.validationErrors = [];
            this.getView().setModel(new JSONModel({
                dataMode: 'READ',
                sbu: ""
            }), "ui");

            var oModel = this.getOwnerComponent().getModel("ZVB_3DERP_PR_FILTERS_CDS");
            oModel.read("/ZVB_3DERP_SBU_SH", {
                success: function (oData, oResponse) {
                    console.log(oData.results.length)
                    if (oData.results.length === 1) {
                         that.getView().getModel("ui").setProperty("/sbu", oData.results[0].SBU);
                    }
                    else {
                        Common.closeLoadingDialog(that);
                        that.byId("btnNew").setEnabled(false);
                        that.byId("btnEdit").setEnabled(false);
                        that.byId("btnDelete").setEnabled(false);
                        that.byId("btnClose").setEnabled(false);
                        that.byId("btnSave").setEnabled(false);
                        that.byId("btnCancel").setEnabled(false);
                        // that.byId("searchFieldMain").setEnabled(false);
                        // that.byId("btnAssign").setEnabled(false);
                        // that.byId("btnAssign").setEnabled(false);
                        // that.byId("btnUnassign").setEnabled(false);
                        // that.byId("btnCreatePO").setEnabled(false);
                        // that.byId("btnTabLayout").setEnabled(false);
                    }
                },
                error: function (err) { }
            });
        },
        onSBUChange: function(oEvent) {
            this._sbuChange = true;
        },
        setSmartFilterModel: function () {
            //Model StyleHeaderFilters is for the smartfilterbar
            var oModel = this.getOwnerComponent().getModel("ZVB_3DERP_PR_FILTERS_CDS");
            var oSmartFilter = this.getView().byId("SmartFilterBar");
            oSmartFilter.setModel(oModel);
        },
        
        onSearch(){
            Common.openLoadingDialog(that);

            var me = this;
            var oModel = this.getOwnerComponent().getModel();
            var aFilters = this.getView().byId("SmartFilterBar").getFilters();
            var oJSONDataModel = new JSONModel();                 
            // console.log(aFilters)
            if (aFilters.length > 0) {
                aFilters[0].aFilters.forEach(item => {
                    console.log(item)
                    if (item.sPath === 'PRNO') {
                        if (!isNaN(item.oValue1)) {
                            while (item.oValue1.length < 10) item.oValue1 = "0" + item.oValue1;
                        }
                    }
                })
            }
            oModel.read("/PRSet", { 
                filters: aFilters,
                success: function (oData, oResponse) {
                    console.log(oData)
                    
                    oData.results.forEach((item, index) => {
                        if (item.DELDT !== null)
                            item.DELDT = dateFormat.format(item.DELDT);
                    })
                    oJSONDataModel.setData(oData);
                    me.getView().setModel(oJSONDataModel, "TableData");
                    Common.closeLoadingDialog(that);
                    me.setEditTableData();
                    // me.setChangeStatus(false);
                },
                error: function (err) { 
                    console.log(err)
                    Common.closeLoadingDialog(that);
                }
            });
            
        },

        getColumns() {
            var me = this;
            Common.openLoadingDialog(that);

            //get dynamic columns based on saved layout or ZERP_CHECK
            var oJSONColumnsModel = new JSONModel();
            // this.oJSONModel = new JSONModel();

            var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
            console.log(oModel)
            oModel.setHeaders({
                sbu: 'VER',
                type: 'PRHDR',
                tabname: 'ZDV_3DERP_PR'
            });

            oModel.read("/ColumnsSet", {
                success: function (oData, oResponse) {
                    console.log(oData);
                    oJSONColumnsModel.setData(oData);
                    // me.oJSONModel.setData(oData);
                    console.log(oJSONColumnsModel)
                    me.getView().setModel(oJSONColumnsModel, "Columns"); //set the view model
                    me.getTableData();
                    Common.closeLoadingDialog(that);
                },
                error: function (err) { 
                    Common.closeLoadingDialog(that);
                }
            });
        },

        getEditColumns() {
            var me = this;

            //get dynamic columns based on saved layout or ZERP_CHECK
            var oJSONColumnsModel = new JSONModel();
            // this.oJSONModel = new JSONModel();

            var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
            console.log(oModel)
            oModel.setHeaders({
                sbu: 'VER',
                type: 'PRHDR',
                tabname: 'ZDV_3DERP_PR'
            });

            oModel.read("/ColumnsSet", {
                success: function (oData, oResponse) {
                    console.log(oData);
                    oJSONColumnsModel.setData(oData);
                    // me.oJSONModel.setData(oData);
                    console.log(oJSONColumnsModel)
                    me.getView().setModel(oJSONColumnsModel, "Columns"); //set the view model
                },
                error: function (err) { }
            });
        },

        getTableData: function () {
            var me = this;
            var oModel = this.getOwnerComponent().getModel();

            //get styles data for the table
            var oJSONDataModel = new JSONModel();
            // var aFilters = this.getView().byId("SmartFilterBar").getFilters();
            // var oText = this.getView().byId("StylesCount"); //for the count of selected styles
            // this.addDateFilters(aFilters); //date not automatically added to filters

            oModel.read("/PRSet", {
                // filters: aFilters,
                success: function (oData, oResponse) {

                    oData.results.forEach((item, index) => {
                        if (item.DELDT !== null)
                            item.DELDT = dateFormat.format(item.DELDT);
                    })
                    // oText.setText(oData.results.length + "");
                    oJSONDataModel.setData(oData);
                    me.getView().setModel(oJSONDataModel, "TableData");
                    me.setTableData();
                    // me.setChangeStatus(false);
                },
                error: function (err) { }
            });
        },

        setTableData: function () {
            var me = this;

            //the selected dynamic columns
            var oColumnsModel = this.getView().getModel("Columns");
            var oDataModel = this.getView().getModel("TableData");

            //the selected styles data
            var oColumnsData = oColumnsModel.getProperty('/results');
            var oData = oDataModel.getProperty('/results');
            
            oColumnsData.unshift({
                "ColumnName": "Manage",
                "ColumnLabel": "Manage",
                "ColumnType": "SEL",
                "Editable": false
            });

            //set the column and data model
            var oModel = new JSONModel();
            oModel.setData({
                columns: oColumnsData,
                rows: oData
            });

            var oTable = this.getView().byId("styleDynTable");
            oTable.setModel(oModel);

            //bind the dynamic column to the table
            oTable.bindColumns("/columns", function (index, context) {
                var sColumnId = context.getObject().ColumnName;
                var sColumnLabel = context.getObject().ColumnLabel;
                var sColumnType = context.getObject().ColumnType;
                var sColumnVisible = context.getObject().Visible;
                var sColumnSorted = context.getObject().Sorted;
                var sColumnSortOrder = context.getObject().SortOrder;
                // var sColumnToolTip = context.getObject().Tooltip;
                //alert(sColumnId.);
                console.log(sColumnId)
                return new sap.ui.table.Column({
                    id: sColumnId,
                    label: sColumnLabel,
                    template: me.columnTemplate(sColumnId, sColumnType),
                    width: me.getColumnSize(sColumnId, sColumnType),
                    sortProperty: sColumnId,
                    filterProperty: sColumnId,
                    autoResizable: true,
                    visible: sColumnVisible,
                    sorted: sColumnSorted,
                    sortOrder: ((sColumnSorted === true) ? sColumnSortOrder : "Ascending" )
                });
            });

            //bind the data to the table
            oTable.bindRows("/rows");
        },

        setEditTableData: function () {
            var me = this;

            //the selected dynamic columns
            var oColumnsModel = this.getView().getModel("Columns");
            var oDataModel = this.getView().getModel("TableData");

            //the selected styles data
            var oColumnsData = oColumnsModel.getProperty('/results');
            var oData = oDataModel.getProperty('/results');

            //set the column and data model
            var oModel = new JSONModel();
            oModel.setData({
                columns: oColumnsData,
                rows: oData
            });

            var oTable = this.getView().byId("styleDynTable");
            oTable.setModel(oModel);

            //bind the dynamic column to the table
            oTable.bindColumns("/columns", function (index, context) {
                var sColumnId = context.getObject().ColumnName;
                var sColumnLabel = context.getObject().ColumnLabel;
                var sColumnType = context.getObject().ColumnType;
                var sColumnVisible = context.getObject().Visible;
                var sColumnSorted = context.getObject().Sorted;
                var sColumnSortOrder = context.getObject().SortOrder;
                // var sColumnToolTip = context.getObject().Tooltip;
                //alert(sColumnId.);
                console.log(sColumnId)
                return new sap.ui.table.Column({
                    id: sColumnId,
                    label: sColumnLabel,
                    template: me.columnTemplate(sColumnId, sColumnType),
                    width: me.getColumnSize(sColumnId, sColumnType),
                    sortProperty: sColumnId,
                    filterProperty: sColumnId,
                    autoResizable: true,
                    visible: sColumnVisible,
                    sorted: sColumnSorted,
                    sortOrder: ((sColumnSorted === true) ? sColumnSortOrder : "Ascending" )
                });
            });

            //bind the data to the table
            oTable.bindRows("/rows");
        },

        columnTemplate: function (sColumnId, sColumnType) {
            var oColumnTemplate;

            oColumnTemplate = new sap.m.Text({ text: "{" + sColumnId + "}" }); //default text
            
            if (sColumnType === "SEL") { 
                //Manage button
                oColumnTemplate = new sap.m.Button({
                    text: "",
                    icon: "sap-icon://detail-view",
                    type: "Ghost",
                    press: this.goToDetail,
                    tooltip: "Manage this style"
                });
                oColumnTemplate.data("PRNO", "{}");
            }

            if (sColumnId === "DELETED") { 
                //Manage button
                oColumnTemplate = new sap.m.CheckBox({
                    selected: "{" + sColumnId + "}",
                    editable: false
                });
            }

            if (sColumnId === "CLOSED") { 
                //Manage button
                oColumnTemplate = new sap.m.CheckBox({
                    selected: "{" + sColumnId + "}",
                    editable: false
                });
                oColumnTemplate.data("PRNO", "{}");
            }

            return oColumnTemplate;
        },

        getColumnSize: function (sColumnId, sColumnType) {
            //column width of fields
            var mSize = '7rem';
            if(sColumnId === "DELDT"){
                var mSize = '20rem';
            }
            if(sColumnId === "MATNO"){
                var mSize = '15rem';
            }
            if(sColumnId === "GMCDESCEN"){
                var mSize = '20rem';
            }
            if(sColumnId === "GMCDESCZH"){
                var mSize = '20rem';
            }
            if(sColumnId === "SHORTTEXT"){
                var mSize = '20rem';
            }
            // if (sColumnType === "SEL") {
            //     mSize = '5rem';
            // } else if (sColumnType === "COPY") {
            //     mSize = '4rem';
            // } else if (sColumnId === "STYLECD") {
            //     mSize = '25rem';
            // } else if (sColumnId === "DESC1" || sColumnId === "PRODTYP") {
            //     mSize = '15rem';
            // }
            return mSize;
        },

        goToDetail: function (oEvent) {
            var oButton = oEvent.getSource();
            var PRNo = oButton.data("PRNO").PRNO; //get the styleno binded to manage button
            var PRItm = oButton.data("PRNO").PRITM;

            if(PRNo != "" || PRNo != null){
                while(PRNo.length < 10) PRNo = "0" + PRNo;
            }
            
            // that.setChangeStatus(false); //remove change flag
            that.navToDetail(PRNo, PRItm); //navigate to detail page
        },

        navToDetail: function (PRNo, PRItm) {
            //route to detail page
            that._router.navTo("PRDetail", {
                PRNO: PRNo,
                PRITM: PRItm
            });
        },

        onEditTbl: function(){
            var oModel = this.getOwnerComponent().getModel();
            var oEntitySet = "/PRSet";
            var me = this;

            var oTable = this.byId("styleDynTable");
            var aSelIndices = oTable.getSelectedIndices();
            var oTmpSelectedIndices = [];
            var aData = this.getView().getModel("TableData").getData().results;
            var aDataToEdit = [];
            var bDeleted = false, bWithMaterial = false;
            var iCounter = 0;
            
            if (aSelIndices.length > 0) {
                aSelIndices.forEach(item => {
                    oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
                })

                aSelIndices = oTmpSelectedIndices;

                aSelIndices.forEach((item, index) => {
                    if (aData.at(item).DELETED === true) {
                        iCounter++;
                        bDeleted = true;

                        if (aSelIndices.length === iCounter) {
                            MessageBox.information("Selected record(s) either has assigned material or deleted already, no record to edit.");
                        }
                    }
                    else {
                        var PRNo = aData.at(item).PRNO
                        var PRItm = aData.at(item).PRITM

                        if(PRNo != "" || PRNo != null){
                            while(PRNo.length < 10) PRNo = "0" + PRNo;
                        }
                        oModel.read(oEntitySet + "(PRNO='" + PRNo + "',PRITM='"+ PRItm +"')", {
                            success: function (data, response) {
                                iCounter++;
                                aDataToEdit.push(aData.at(item));

                                if (aSelIndices.length === iCounter) {
                                    if (aDataToEdit.length === 0) {
                                        MessageBox.information("Selected record(s) either has assigned material already or deleted, no record to edit.");
                                    }
                                    else {
                                        me.byId("btnNew").setVisible(false);
                                        me.byId("btnEdit").setVisible(false);
                                        me.byId("btnDelete").setVisible(false);
                                        me.byId("btnClose").setVisible(false);
                                        me.byId("btnSave").setVisible(true);
                                        me.byId("btnCancel").setVisible(true);


                                        me._oDataBeforeChange = jQuery.extend(true, {}, me.getView().getModel("TableData").getData());
                                        
                                        me.getView().getModel("TableData").setProperty("/results", aDataToEdit);
                                        me.getEditColumns();
                                        me.setEditTableData();
                                        me.setRowEditMode("TableData");
                        
                                        me.getView().getModel("ui").setProperty("/dataMode", 'EDIT');
                                        me._isGMCEdited = false;
                                    }
                                }                                    
                            },
                            error: function (err) {
                                iCounter++;
                            }
                        })
                    }
                })
            }
            else {
                // aDataToEdit = aData;
                MessageBox.information("No selected record(s) to edit.");
            }
            // aDataToEdit = aDataToEdit.filter(item => item.Deleted === false);
        },
        setRowEditMode(arg) {
            var me = this;
            this.getView().getModel(arg).getData().results.forEach(item => item.Edited = false);

            var oTable = this.byId("styleDynTable");

            var oColumnsModel = this.getView().getModel("Columns");
            var oColumnsData = oColumnsModel.getProperty('/results');

            var oDataModel = this.getView().getModel("TableData");
            var oData = oDataModel.getProperty('/results');
            var oModel = this.getOwnerComponent().getModel('ZVB_3DERP_PR_FILTERS_CDS');

            oTable.getColumns().forEach((col, idx) => {
                console.log(col)
                oColumnsData.filter(item => item.ColumnName === col.sId)
                    .forEach(ci => {
                        if (ci.Editable) {
                            if(ci.ColumnName === "MATNO"){
                                col.setTemplate(new sap.m.Input({
                                    // id: "ipt" + ci.name,
                                    type: "Text",
                                    value: "{" + ci.ColumnName + "}",
                                    maxLength: +ci.Length,
                                    showValueHelp: true,
                                    valueHelpRequest: this.handleValueHelp.bind(this),
                                    showSuggestion: true,
                                    // // maxSuggestionWidth: ci.valueHelp["suggestionItems"].additionalText !== undefined ? ci.valueHelp["suggestionItems"].maxSuggestionWidth : "1px",
                                    // suggestionItems: {
                                    //     path: '/PRSet', //ci.valueHelp.model + ">/items", //ci.valueHelp["suggestionItems"].path,
                                    //     length: 1000,
                                    //     template: new sap.ui.core.ListItem({
                                    //         key: "{PRNO}", //"{" + ci.valueHelp.model + ">" + ci.valueHelp["items"].value + "}",
                                    //         text: "{PRITM}", //"{" + ci.valueHelp.model + ">" + ci.valueHelp["items"].value + "}", //ci.valueHelp["suggestionItems"].text
                                    //         //additionalText: ci.valueHelp["suggestionItems"].additionalText !== undefined ? ci.valueHelp["suggestionItems"].additionalText : '',
                                    //     }),
                                    //     templateShareable: false
                                    // },
                                    // change: this.onValueHelpLiveInputChange.bind(this)
                                }));
                            }
                            if(ci.ColumnName === "QUANTITY"){
                                col.setTemplate(new sap.m.Input({
                                    // id: "ipt" + ci.name,
                                    type: sap.m.InputType.Number,
                                    value: "{path:'" + ci.ColumnName + "', type:'sap.ui.model.odata.type.Decimal', formatOptions:{ minFractionDigits:" + null + ", maxFractionDigits:" + null + " }, constraints:{ precision:" + ci.Decimal + ", scale:" + null + " }}",
                                    
                                    maxLength: +ci.Length,
                                    showValueHelp: true,
                                    valueHelpRequest: this.handleValueHelp.bind(this),
                                   
                                    // change: this.onValueHelpLiveInputChange.bind(this)
                                }));
                            }
                            if(ci.ColumnName === "DELDT"){
                                col.setTemplate(new sap.m.DatePicker({
                                    // id: "ipt" + ci.name,
                                    value: "{" + ci.ColumnName + "}",
                                    displayFormat:"short",
                                    change:"handleChange",
                                    class:"sapUiSmallMarginBottom"
                                   
                                    // change: this.onValueHelpLiveInputChange.bind(this)
                                }));
                            }
                            if(ci.ColumnName === "BATCH"){
                                col.setTemplate(new sap.m.Input({
                                    // id: "ipt" + ci.name,
                                    type: "Text",
                                    value: "{" + ci.ColumnName + "}",
                                    maxLength: +ci.Length,
                                   
                                    // change: this.onValueHelpLiveInputChange.bind(this)
                                }));
                            }
                            if(ci.ColumnName === "MATGRP"){
                                col.setTemplate(new sap.m.Input({
                                    // id: "ipt" + ci.name,
                                    type: "Text",
                                    value: "{" + ci.ColumnName + "}",
                                    maxLength: +ci.Length,
                                    showValueHelp: true,
                                    valueHelpRequest: this.handleValueHelp.bind(this),
                                    showSuggestion: true,
                                   
                                    // change: this.onValueHelpLiveInputChange.bind(this)
                                }));
                            }
                            if(ci.ColumnName === "SHIPTOPLANT"){
                                col.setTemplate(new sap.m.Input({
                                    // id: "ipt" + ci.name,
                                    type: "Text",
                                    value: "{" + ci.ColumnName + "}",
                                    maxLength: +ci.Length,
                                    showValueHelp: true,
                                    valueHelpRequest: this.handleValueHelp.bind(this),
                                    showSuggestion: true,
                                    // change: this.onValueHelpLiveInputChange.bind(this)
                                }));
                            }
                            if(ci.ColumnName === "PLANTCD"){
                                col.setTemplate(new sap.m.Input({
                                    // id: "ipt" + ci.name,
                                    type: "Text",
                                    value: "{" + ci.ColumnName + "}",
                                    maxLength: +ci.Length,
                                    showValueHelp: true,
                                    valueHelpRequest: this.handleValueHelp.bind(this),
                                    showSuggestion: true,
                                    // change: this.onValueHelpLiveInputChange.bind(this)
                                }));
                            }
                            if(ci.ColumnName === "VENDOR"){
                                col.setTemplate(new sap.m.Input({
                                    // id: "ipt" + ci.name,
                                    type: "Text",
                                    value: "{" + ci.ColumnName + "}",
                                    maxLength: +ci.Length,
                                    showValueHelp: true,
                                    valueHelpRequest: this.handleValueHelp.bind(this),
                                    showSuggestion: true,
                                    // change: this.onValueHelpLiveInputChange.bind(this)
                                }));
                            }
                            if(ci.ColumnName === "PURORG"){
                                col.setTemplate(new sap.m.Input({
                                    // id: "ipt" + ci.name,
                                    type: "Text",
                                    value: "{" + ci.ColumnName + "}",
                                    maxLength: +ci.Length,
                                   
                                    // change: this.onValueHelpLiveInputChange.bind(this)
                                }));
                            }
                            if(ci.ColumnName === "TRCKNO"){
                                col.setTemplate(new sap.m.Input({
                                    // id: "ipt" + ci.name,
                                    type: "Text",
                                    value: "{" + ci.ColumnName + "}",
                                    maxLength: +ci.Length,
                                   
                                    // change: this.onValueHelpLiveInputChange.bind(this)
                                }));
                            }
                            if(ci.ColumnName === "REQSTNR"){
                                col.setTemplate(new sap.m.Input({
                                    // id: "ipt" + ci.name,
                                    type: "Text",
                                    value: "{" + ci.ColumnName + "}",
                                    maxLength: +ci.Length,
                                   
                                    // change: this.onValueHelpLiveInputChange.bind(this)
                                }));
                            }
                            if(ci.ColumnName === "SUPTYP"){
                                col.setTemplate(new sap.m.Input({
                                    // id: "ipt" + ci.name,
                                    type: "Text",
                                    value: "{" + ci.ColumnName + "}",
                                    maxLength: +ci.Length,
                                    showValueHelp: true,
                                    valueHelpRequest: this.handleValueHelp.bind(this),
                                    showSuggestion: true,
                                   
                                    // change: this.onValueHelpLiveInputChange.bind(this)
                                }));
                            }
                            if(ci.ColumnName === "SALESGRP"){
                                col.setTemplate(new sap.m.Input({
                                    // id: "ipt" + ci.name,
                                    type: "Text",
                                    value: "{" + ci.ColumnName + "}",
                                    maxLength: +ci.Length,
                                   
                                    // change: this.onValueHelpLiveInputChange.bind(this)
                                }));
                            }
                            if(ci.ColumnName === "CUSTGRP"){
                                col.setTemplate(new sap.m.Input({
                                    // id: "ipt" + ci.name,
                                    type: "Text",
                                    value: "{" + ci.ColumnName + "}",
                                    maxLength: +ci.Length,
                                   
                                    // change: this.onValueHelpLiveInputChange.bind(this)
                                }));
                            }
                            if(ci.ColumnName === "SEASONCD"){
                                col.setTemplate(new sap.m.Input({
                                    // id: "ipt" + ci.name,
                                    type: "Text",
                                    value: "{" + ci.ColumnName + "}",
                                    maxLength: +ci.Length,
                                   
                                    // change: this.onValueHelpLiveInputChange.bind(this)
                                }));
                            }

                            // if (ci.valueHelp["show"]) {
                            //     // console.log("{" + ci.valueHelp["items"].value + "}")
                            //     // console.log(ci.valueHelp["suggestionItems"].text)
                            //     col.setTemplate(new sap.m.Input({
                            //         // id: "ipt" + ci.name,
                            //         type: "Text",
                            //         value: "{" + arg + ">" + ci.name + "}",
                            //         maxLength: +ci.maxLength,
                            //         showValueHelp: true,
                            //         valueHelpRequest: this.handleValueHelp.bind(this),
                            //         showSuggestion: true,
                            //         maxSuggestionWidth: ci.valueHelp["suggestionItems"].additionalText !== undefined ? ci.valueHelp["suggestionItems"].maxSuggestionWidth : "1px",
                            //         suggestionItems: {
                            //             path: ci.valueHelp["items"].path, //ci.valueHelp.model + ">/items", //ci.valueHelp["suggestionItems"].path,
                            //             length: 1000,
                            //             template: new sap.ui.core.ListItem({
                            //                 key: "{" + ci.valueHelp["items"].value + "}", //"{" + ci.valueHelp.model + ">" + ci.valueHelp["items"].value + "}",
                            //                 text: "{" + ci.valueHelp["items"].value + "}", //"{" + ci.valueHelp.model + ">" + ci.valueHelp["items"].value + "}", //ci.valueHelp["suggestionItems"].text
                            //                 additionalText: ci.valueHelp["suggestionItems"].additionalText !== undefined ? ci.valueHelp["suggestionItems"].additionalText : '',
                            //             }),
                            //             templateShareable: false
                            //         },
                            //         change: this.onValueHelpLiveInputChange.bind(this)
                            //     }));
                            // }
                            // else if (ci.type === "Edm.Decimal" || ci.type === "Edm.Double" || ci.type === "Edm.Float" || ci.type === "Edm.Int16" || ci.type === "Edm.Int32" || ci.type === "Edm.Int64" || ci.type === "Edm.SByte" || ci.type === "Edm.Single") {
                            //     col.setTemplate(new sap.m.Input({
                            //         type: sap.m.InputType.Number,
                            //         textAlign: sap.ui.core.TextAlign.Right,
                            //         value: "{path:'" + arg + ">" + ci.name + "', type:'sap.ui.model.odata.type.Decimal', formatOptions:{ minFractionDigits:" + ci.scale + ", maxFractionDigits:" + ci.scale + " }, constraints:{ precision:" + ci.precision + ", scale:" + ci.scale + " }}",
                            //         liveChange: this.onNumberLiveChange.bind(this)
                            //     }));
                            // }
                            // else {
                            //     if (ci.maxLength !== null) {
                            //         col.setTemplate(new sap.m.Input({
                            //             value: "{" + arg + ">" + ci.name + "}",
                            //             maxLength: +ci.maxLength,
                            //             liveChange: this.onInputLiveChange.bind(this)
                            //         }));
                            //     }
                            //     else {
                            //         col.setTemplate(new sap.m.Input({
                            //             value: "{" + arg + ">" + ci.name + "}",
                            //             liveChange: this.onInputLiveChange.bind(this)
                            //         }));
                            //     }
                            // }                                
                        }

                        if (ci.required) {
                            col.getLabel().addStyleClass("requiredField");
                        }
                    })
            })
        },
        onInputLiveChange: function(oEvent) {
            var oSource = oEvent.getSource();
            var sRowPath = oSource.getBindingInfo("value").binding.oContext.sPath;
            var sModel = oSource.getBindingInfo("value").parts[0].model;
            
            this.getView().getModel(sModel).setProperty(sRowPath + '/Edited', true);
            
            if (sModel === 'gmc') this._isGMCEdited = true;
            else this._isAttrEdited = true;
        },
        onValueHelpLiveInputChange: function(oEvent) {
            if (this.validationErrors === undefined) this.validationErrors = [];

            var oSource = oEvent.getSource();
            var isInvalid = !oSource.getSelectedKey() && oSource.getValue().trim();
            oSource.setValueState(isInvalid ? "Error" : "None");

            var sRowPath = oSource.getBindingInfo("value").binding.oContext.sPath;
            var sModel = oSource.getBindingInfo("value").parts[0].path;

            console.log(oSource.getSuggestionItems())
            console.log(oSource.getValue().trim())
            console.log(sRowPath)
            console.log(oSource.getBindingInfo("value"))
            // if (!oSource.getSelectedKey()) {
                oSource.getSuggestionItems().forEach(item => {
                    // console.log(item.getProperty("key"), oSource.getValue().trim())
                    if (item.getProperty("key") === oSource.getValue().trim()) {
                        isInvalid = false;
                        oSource.setValueState(isInvalid ? "Error" : "None");                            
                        
                        if (oSource.getBindingInfo("value").parts[0].path === 'MATTYP') {
                            var et = item.getBindingContext().sPath;
                            this.getView().getModel(sModel).setProperty(sRowPath + '/PROCESSCD', item.getBindingContext().getModel().oData[et.slice(1, et.length)].Processcd);
                        }
                    }
                })
            // }

            if (isInvalid) this.validationErrors.push(oEvent.getSource().getId());
            else {
                this.validationErrors.forEach((item, index) => {
                    if (item === oEvent.getSource().getId()) {
                        this.validationErrors.splice(index, 1)
                    }
                })
            }

            // this.getView().getModel(sModel).setProperty(sRowPath + '/Edited', true);

            if (sModel === 'gmc') this._isGMCEdited = true;
            else if (sModel === 'attributes') this._isAttrEdited = true;
            // console.log(oSource.getBindingInfo("value").parts)
        },
        handleValueHelp: function(oEvent) {
            var oModel = this.getOwnerComponent().getModel('ZVB_3DERP_PR_FILTERS_CDS');
            console.log(oModel)
            var oSource = oEvent.getSource();
            console.log(oSource)
            // var sEntity = oSource.getBindingInfo("suggestionItems").path;
            var sModel = oSource.getBindingInfo("value").parts[0].model;
            var _this = this;

            this._inputId = oSource.getId();
            this._inputValue = oSource.getValue();
            this._inputSource = oSource;

            this._inputField = oSource.getBindingInfo("value").parts[0].path;
            // console.log(this._inputId, this._inputValue, this._inputSource, this._inputField)
            // this.getView().setModel(oJSONModel, "materials");

            if (this._inputField === 'MATNO') {
                this._inputSourceCtx = oEvent.getSource().getBindingContext("class");
                // var _mattypcls = this._inputSourceCtx.getModel().getProperty(this._inputSourceCtx.getPath() + '/MATTYPCLS');

                oModel.read('/ZVB_3DERP_PRMATNO',{
                    success: function (data, response) {
                        data.results.forEach(item => {
                            item.VHTitle = item.MatNo;
                            item.VHDesc = item.GMCDesc;
                            item.VHDesc2 = null;
                            item.VHSelected = (item.MatNo === _this._inputValue);
                        });

                        data.results.sort((a,b) => (a.VHTitle > b.VHTitle ? 1 : -1));

                        // create value help dialog
                        if (!_this._valueHelpDialog) {
                            _this._valueHelpDialog = sap.ui.xmlfragment(
                                "zuipr.view.dialog.ValueHelpDialog",
                                _this
                            ).setProperty("title", "Select Material");
                        
                            _this._valueHelpDialog.setModel(
                                new JSONModel({
                                    items: data.results,
                                    title: "Material"
                                })
                            )
                            _this.getView().addDependent(_this._valueHelpDialog);
                        }
                        else {
                            _this._valueHelpDialog.setModel(
                                new JSONModel({
                                    items: data.results,
                                    title: "Material"
                                })
                            )
                        }

                        _this._valueHelpDialog.open();                        
                    },
                    error: function (err) { }
                })
            }
            if (this._inputField === 'MATGRP') {
                oModel.read('/ZVB_3DERP_MATGRP_SH',{
                    success: function (data, response) {
                        data.results.forEach(item => {
                            item.VHTitle = item.MaterialGrp;
                            item.VHDesc = null;
                            item.VHDesc2 = null;
                            item.VHSelected = (item.MaterialGrp === _this._inputValue);
                        });

                        data.results.sort((a,b) => (a.VHTitle > b.VHTitle ? 1 : -1));

                        // create value help dialog
                        if (!_this._valueHelpDialog) {
                            _this._valueHelpDialog = sap.ui.xmlfragment(
                                "zuipr.view.dialog.ValueHelpDialog",
                                _this
                            ).setProperty("title", "Select Material");
                        
                            _this._valueHelpDialog.setModel(
                                new JSONModel({
                                    items: data.results,
                                    title: "Material"
                                })
                            )
                            _this.getView().addDependent(_this._valueHelpDialog);
                        }
                        else {
                            _this._valueHelpDialog.setModel(
                                new JSONModel({
                                    items: data.results,
                                    title: "Material"
                                })
                            )
                        }

                        _this._valueHelpDialog.open();                        
                    },
                    error: function (err) { }
                })
            }
            if (this._inputField === 'SHIPTOPLANT') {
                oModel.read('/ZVB_3DERP_SHIPTOPLANT_SH',{
                    success: function (data, response) {
                        data.results.forEach(item => {
                            item.VHTitle = item.ShipToPlant;
                            item.VHDesc = null;
                            item.VHDesc2 = null;
                            item.VHSelected = (item.ShipToPlant === _this._inputValue);
                        });

                        data.results.sort((a,b) => (a.VHTitle > b.VHTitle ? 1 : -1));

                        // create value help dialog
                        if (!_this._valueHelpDialog) {
                            _this._valueHelpDialog = sap.ui.xmlfragment(
                                "zuipr.view.dialog.ValueHelpDialog",
                                _this
                            ).setProperty("title", "Select Material");
                        
                            _this._valueHelpDialog.setModel(
                                new JSONModel({
                                    items: data.results,
                                    title: "Material"
                                })
                            )
                            _this.getView().addDependent(_this._valueHelpDialog);
                        }
                        else {
                            _this._valueHelpDialog.setModel(
                                new JSONModel({
                                    items: data.results,
                                    title: "Material"
                                })
                            )
                        }

                        _this._valueHelpDialog.open();                        
                    },
                    error: function (err) { }
                })
            }
            if (this._inputField === 'PLANTCD') {
                oModel.read('/ZVB_3DERP_PURPLANT_SH',{
                    success: function (data, response) {
                        data.results.forEach(item => {
                            item.VHTitle = item.PurchPlant;
                            item.VHDesc = null;
                            item.VHDesc2 = null;
                            item.VHSelected = (item.PurchPlant === _this._inputValue);
                        });

                        data.results.sort((a,b) => (a.VHTitle > b.VHTitle ? 1 : -1));

                        // create value help dialog
                        if (!_this._valueHelpDialog) {
                            _this._valueHelpDialog = sap.ui.xmlfragment(
                                "zuipr.view.dialog.ValueHelpDialog",
                                _this
                            ).setProperty("title", "Select Material");
                        
                            _this._valueHelpDialog.setModel(
                                new JSONModel({
                                    items: data.results,
                                    title: "Material"
                                })
                            )
                            _this.getView().addDependent(_this._valueHelpDialog);
                        }
                        else {
                            _this._valueHelpDialog.setModel(
                                new JSONModel({
                                    items: data.results,
                                    title: "Material"
                                })
                            )
                        }

                        _this._valueHelpDialog.open();                        
                    },
                    error: function (err) { }
                })
            }
            if (this._inputField === 'VENDOR') {
                oModel.read('/ZVB_3DERP_VENDOR_SH',{
                    success: function (data, response) {
                        data.results.forEach(item => {
                            item.VHTitle = item.Vendor;
                            item.VHDesc = item.Description;
                            item.VHDesc2 = item.CountryCd;
                            item.VHSelected = (item.Vendor === _this._inputValue);
                        });

                        data.results.sort((a,b) => (a.VHTitle > b.VHTitle ? 1 : -1));

                        // create value help dialog
                        if (!_this._valueHelpDialog) {
                            _this._valueHelpDialog = sap.ui.xmlfragment(
                                "zuipr.view.dialog.ValueHelpDialog",
                                _this
                            ).setProperty("title", "Select Material");
                        
                            _this._valueHelpDialog.setModel(
                                new JSONModel({
                                    items: data.results,
                                    title: "Material"
                                })
                            )
                            _this.getView().addDependent(_this._valueHelpDialog);
                        }
                        else {
                            _this._valueHelpDialog.setModel(
                                new JSONModel({
                                    items: data.results,
                                    title: "Material"
                                })
                            )
                        }

                        _this._valueHelpDialog.open();                        
                    },
                    error: function (err) { }
                })
            }
            if (this._inputField === 'SUPTYP') {
                oModel.read('/ZVB_3DERP_SUPPTYP_SH',{
                    success: function (data, response) {
                        data.results.forEach(item => {
                            item.VHTitle = item.SupTyp;
                            item.VHDesc = item.ShortText;
                            item.VHDesc2 = null;
                            item.VHSelected = (item.SupTyp === _this._inputValue);
                        });

                        data.results.sort((a,b) => (a.VHTitle > b.VHTitle ? 1 : -1));

                        // create value help dialog
                        if (!_this._valueHelpDialog) {
                            _this._valueHelpDialog = sap.ui.xmlfragment(
                                "zuipr.view.dialog.ValueHelpDialog",
                                _this
                            ).setProperty("title", "Select Material");
                        
                            _this._valueHelpDialog.setModel(
                                new JSONModel({
                                    items: data.results,
                                    title: "Material"
                                })
                            )
                            _this.getView().addDependent(_this._valueHelpDialog);
                        }
                        else {
                            _this._valueHelpDialog.setModel(
                                new JSONModel({
                                    items: data.results,
                                    title: "Material"
                                })
                            )
                        }

                        _this._valueHelpDialog.open();                        
                    },
                    error: function (err) { }
                })
            }
            
            // else {
            //     var vCellPath = this._inputField;
            //     var vColProp = this._aColumns[sModel].filter(item => item.name === vCellPath);
            //     var vItemValue = vColProp[0].valueHelp.items.value;
            //     var vItemDesc = vColProp[0].valueHelp.items.text;
            //     var sEntity = vColProp[0].valueHelp.items.path;

            //     oModel.read(sEntity, {
            //         success: function (data, response) {
            //             data.results.forEach(item => {
            //                 item.VHTitle = item[vItemValue];
            //                 item.VHDesc = item[vItemDesc];
            //                 item.VHSelected = (item[vItemValue] === _this._inputValue);
            //             });
                        
            //             var oVHModel = new JSONModel({
            //                 items: data.results,
            //                 title: vColProp[0].label,
            //                 table: sModel
            //             });                            

            //             // create value help dialog
            //             if (!_this._valueHelpDialog) {
            //                 _this._valueHelpDialog = sap.ui.xmlfragment(
            //                     "zuigmc2.view.ValueHelpDialog",
            //                     _this
            //                 );
                            
            //                 // _this._valueHelpDialog.setModel(
            //                 //     new JSONModel({
            //                 //         items: data.results,
            //                 //         title: vColProp[0].label,
            //                 //         table: sModel
            //                 //     })
            //                 // )

            //                 _this._valueHelpDialog.setModel(oVHModel);
            //                 _this.getView().addDependent(_this._valueHelpDialog);
            //             }
            //             else {
            //                 _this._valueHelpDialog.setModel(oVHModel);
            //                 // _this._valueHelpDialog.setModel(
            //                 //     new JSONModel({
            //                 //         items: data.results,
            //                 //         title: vColProp[0].label,
            //                 //         table: sModel
            //                 //     })
            //                 // )
            //             }                            

            //             _this._valueHelpDialog.open();
            //         },
            //         error: function (err) { }
            //     })
            // }
        },
        handleValueHelpSearch : function (oEvent) {
            var sValue = oEvent.getParameter("value");

            var oFilter = new sap.ui.model.Filter({
                filters: [
                    new sap.ui.model.Filter("VHTitle", sap.ui.model.FilterOperator.Contains, sValue),
                    new sap.ui.model.Filter("VHDesc", sap.ui.model.FilterOperator.Contains, sValue)
                ],
                and: false
            });

            oEvent.getSource().getBinding("items").filter([oFilter]);
        },
        handleValueHelpClose : function (oEvent) {
            if (oEvent.sId === "confirm") {
                var oSelectedItem = oEvent.getParameter("selectedItem");
                var sTable = this._valueHelpDialog.getModel().getData().table;
                console.log(oSelectedItem)
                console.log(this._inputValue)
                console.log(oSelectedItem.getTitle())
                if (oSelectedItem) {
                    this._inputSource.setValue(oSelectedItem.getTitle());

                    var sRowPath = this._inputSource.getBindingInfo("value").binding.oContext.sPath;
                    console.log(sRowPath)
                    if (this._inputValue !== oSelectedItem.getTitle()) {                                
                        this.getView().getModel(sTable).setProperty(sRowPath + '/Edited', true);

                        this._isEdited = true;
                    }
                }

                this._inputSource.setValueState("None");
            }
            else if (oEvent.sId === "cancel") {
                // console.log(oEvent.getSource().getBinding("items"));
                // var source = oEvent.getSource().getBinding("items").oList;
                // var data = source.filter(item => item.VHSelected === true);
                // var value = "";

                // if (data.length > 0) {
                //     value = data[0].VHTitle;
                // }

                // this._inputSource.setValue(value);

                // if (this._inputValue !== value) {
                //     var data = this.byId("headerTable").getBinding("items").oList;                           
                //     data.filter(item => item[this.inputField] === oSelectedItem.getTitle()).forEach(e => e.Edited = true);
                // }
            }
        },
        onCancelEdit() {
            if (this._isEdited) {

                if (!this._DiscardChangesDialog) {
                    this._DiscardChangesDialog = sap.ui.xmlfragment("zuipr.view.dialog.DiscardChangesDialog", this);
                    this.getView().addDependent(this._DiscardChangesDialog);
                }
                
                this._DiscardChangesDialog.open();
            }
            else {
                this.byId("btnNew").setVisible(true);
                this.byId("btnEdit").setVisible(true);
                this.byId("btnDelete").setVisible(true);
                this.byId("btnClose").setVisible(true);
                this.byId("btnSave").setVisible(false);
                this.byId("btnCancel").setVisible(false);
                this.getView().getModel("TableData").setProperty("/", this._oDataBeforeChange);
                this.getEditColumns();
                this.setEditTableData();

                if (this.getView().getModel("ui").getData().dataMode === 'NEW') this.setFilterAfterCreate();

                this.getView().getModel("ui").setProperty("/dataMode", 'READ');
            }
        },
        onCloseDiscardChangesDialog() {
            if (this._isEdited) {
                this.byId("btnNew").setVisible(true);
                this.byId("btnEdit").setVisible(true);
                this.byId("btnDelete").setVisible(true);
                this.byId("btnClose").setVisible(true);
                this.byId("btnSave").setVisible(false);
                this.byId("btnCancel").setVisible(false);
                // this.onTableResize("Hdr","Min");
                // this.setRowReadMode("gmc");\
                this.getView().getModel("TableData").setProperty("/", this._oDataBeforeChange);
                this.getEditColumns();
                this.setEditTableData();
                this.getView().getModel("ui").setProperty("/dataMode", 'READ');
                this._isEdited = false;
            }
            this._DiscardChangesDialog.close();
        },
        onCancelDiscardChangesDialog() {
            // console.log(this._DiscardChangesgDialog)
            this._DiscardChangesDialog.close();
        },

        setFilterAfterCreate: function(oEvent) {
            if (this._aFiltersBeforeChange.length > 0) {
                var aFilter = [];
                var oFilter = null;
                var oTable = this.byId("styleDynTable");
                var oColumns = oTable.getColumns();
                // console.log(oColumns)
                this._aFiltersBeforeChange.forEach(item => {
                    aFilter.push(new Filter(item.sPath, this.getConnector(item.sOperator), item.oValue1));
                    oColumns.filter(fItem => fItem.getFilterProperty() === item.sPath)
                        .forEach(col => col.filter(item.oValue1))
                }) 
            }
        },
        getConnector(args) {
            var oConnector;

            switch (args) {
                case "EQ":
                    oConnector = sap.ui.model.FilterOperator.EQ
                    break;
                  case "Contains":
                    oConnector = sap.ui.model.FilterOperator.Contains
                    break;
                  default:
                    // code block
                    break;
            }

            return oConnector;
        },
        onSaveEdit(){
            Common.openLoadingDialog(that);
            var me = this;
            var oTable = this.byId("styleDynTable");
            var oSelectedIndices = oTable.getBinding("rows").aIndices;
            var oTmpSelectedIndices = [];
            var aData = oTable.getModel().getData().rows;
            var oParamData = [];
            var oParam = {};
            var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");
            var vSBU = 'VER';
            var message = "";
            
            oSelectedIndices.forEach(item => {
                oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
            })

            oSelectedIndices = oTmpSelectedIndices;
            oSelectedIndices.forEach((item, index) => {
                oParamData.push({
                    PreqNo: aData.at(item).PRNO,
                    PreqItem: aData.at(item).PRITM,
                    Matno: aData.at(item).MATNO,
                    Uom: aData.at(item).UOM,
                    Quantity: aData.at(item).QUANTITY,
                    DelivDate: sapDateFormat.format(new Date(aData.at(item).DELDT)),
                    Batch: aData.at(item).BATCH,
                    Plant: aData.at(item).PLANTCD,
                    Purgrp: aData.at(item).PURGRP,
                    Reqsnr: aData.at(item).REQSTNR,
                    DesVendor: aData.at(item).VENDOR,
                    PurchOrg: aData.at(item).PURORG,
                    Trackingno: aData.at(item).TRCKNO,
                    Supplytyp: aData.at(item).SUPTYP,
                    InfoRec: aData.at(item).INFNR,
                    Shiptoplant: aData.at(item).SHIPTOPLANT,
                    Seasoncd: aData.at(item).SEASONCD,
                    ShortText: aData.at(item).SHORTTEXT,
                    Callbapi: 'X'
                })
            })
            console.log(oParamData)

            if (oParamData.length > 0) {
                oParam['N_ChangePRParam'] = oParamData;
                oParam['N_ChangePRReturn'] = [];
                oModel.create("/ChangePRSet", oParam, {
                    method: "POST",
                    success: function(oResultCPR, oResponse) {
                        oSelectedIndices.forEach((item, index) => {
                            var oRetMsg = oResultCPR.N_ChangePRReturn.results.filter(fItem => fItem.PreqNo === aData.at(item).PRNO )//&& fItem.PreqItem === aData.at(item).PRITM);

                            if (oRetMsg.length > 0) {
                                if (oRetMsg[0].Type === 'S') {
                                    message = message + oRetMsg[0].Message + "\n"
                                }else{
                                    message = message + oRetMsg[0].Message + "\n"
                                }
                            }
                            else{
                                message = message + oRetMsg[0].Message + "\n"
                            }

                        })
                        
                        Common.closeLoadingDialog(that);
                        MessageBox.information(message);
                        
                    },
                    error: function() {
                        message = "Encountered Error during PR Update"
                        Common.closeLoadingDialog(that);
                        MessageBox.error(message);
                        return;
                    }
                })

                for (var i = 0; i < this._oDataBeforeChange.results.length; i++) {
                    for(var x = 0; x < aData.length; x++){
                        if (this._oDataBeforeChange.results[i].PRNO === aData.at(x).PRNO && this._oDataBeforeChange.results[i].PRITM === aData.at(x).PRITM) {
                            this._oDataBeforeChange.results[i] = aData.at(x);
                            break;
                        }
                    }
                    
                }
                this.byId("btnNew").setVisible(true);
                this.byId("btnEdit").setVisible(true);
                this.byId("btnDelete").setVisible(true);
                this.byId("btnClose").setVisible(true);
                this.byId("btnSave").setVisible(false);
                this.byId("btnCancel").setVisible(false);
                this.getView().getModel("TableData").setProperty("/", this._oDataBeforeChange);
                this.getEditColumns();
                this.setEditTableData();
                this.getView().getModel("ui").setProperty("/dataMode", 'READ');
            }
        },
        onDeletePR: async function(){
            this._oDataBeforeChange = jQuery.extend(true, {}, this.getView().getModel("TableData").getData());
            var oTable = this.byId("styleDynTable");
            var oSelectedIndices = oTable.getSelectedIndices();
            var oTmpSelectedIndices = [];
            var aData = oTable.getModel().getData().rows;
            var oParamData = [];
            var oParam = {};
            var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");
            var iCounter = 0;
            var message = "";
            var isError = false;
            
            if(oSelectedIndices.length > 0){
                oSelectedIndices.forEach(item => {
                    oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
                })
    
                oSelectedIndices = oTmpSelectedIndices;

                await oSelectedIndices.forEach((item, index) => {
                    if(aData.at(item).DELETED === true){
                        
                        iCounter++;
                        if (oSelectedIndices.length === iCounter) {
                            MessageBox.information("Selected Record Already Deleted");
                        }
                    }else if(aData.at(item).CLOSED === true){
                        iCounter++;

                        if (oSelectedIndices.length === iCounter) {
                            MessageBox.information("Selected Record is Already Closed");
                        }
                    }
                    else{
                        var PRNo = aData.at(item).PRNO
                        var PRItm = aData.at(item).PRITM
    
                        // if(PRNo != "" || PRNo != null){
                        //     while(PRNo.length < 10) PRNo = "0" + PRNo;
                        // }

                        oParamData.push({
                            PreqNo: PRNo,
                            PreqItem: PRItm,
                            DeleteInd: 'X',
                            CloseInd: ''
                        })
                    }
                })

                if (oParamData.length > 0) {
                    oParam['N_DelClosePRParam'] = oParamData;
                    oParam['N_DelClosePRReturn'] = [];
                    await oModel.create("/DelClosePRSet", oParam, {
                        method: "POST",
                        success: async function(oResultDCPR, oResponse){
                            console.log(oResultDCPR)
                            await oSelectedIndices.forEach((item, index) => {
                                
                                var oRetMsg = oResultDCPR.N_DelClosePRReturn.results.filter(fItem => fItem.PreqNo === aData.at(item).PRNO )//&& fItem.PreqItem === aData.at(item).PRITM);
                                if (oRetMsg.length > 0) {
                                    if (oRetMsg[0].Type === 'I') {
                                        message = message + oRetMsg[0].Message + "\n"
                                    }else{
                                        isError = true;
                                        message = message + oRetMsg[0].Message + "\n"
                                    }
                                }else{
                                    isError = true;
                                    message = message + "PR: "+aData.at(item).PRNO + "/" + aData.at(item).PRITM + " is Either Already Deleted or Closed" + "\n"
                                }
                            });
                            
                            MessageBox.information(message);
                        }
                    })
                }
                if (!isError){
                    await oSelectedIndices.forEach(item => {
                        if(this._oDataBeforeChange.results[item].DELETED != true && this._oDataBeforeChange.results[item].CLOSED != true){        
                            this._oDataBeforeChange.results[item].DELETED = true;
                        }
                    })
                    this.getView().getModel("TableData").setProperty("/", this._oDataBeforeChange);
                    this.getEditColumns();
                    this.setEditTableData();
                }
            }else{
                MessageBox.information("No selected record(s) to Delete.");
            }
            
            
        },
        onClosePR: async function(){
            this._oDataBeforeChange = jQuery.extend(true, {}, this.getView().getModel("TableData").getData());
            var oTable = this.byId("styleDynTable");
            var oSelectedIndices = oTable.getSelectedIndices();
            var oTmpSelectedIndices = [];
            var aData = oTable.getModel().getData().rows;
            var oParamData = [];
            var oParam = {};
            var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");
            var iCounter = 0;
            var message = "";
            var isError = false;

            if(oSelectedIndices.length > 0){
                oSelectedIndices.forEach(item => {
                    oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
                })
    
                oSelectedIndices = oTmpSelectedIndices;

                await oSelectedIndices.forEach((item, index) => {
                    if(aData.at(item).DELETED === true){
                        
                        iCounter++;
                        if (oSelectedIndices.length === iCounter) {
                            MessageBox.information("Selected Record is Marked as Deleted");
                        }
                    }else if(aData.at(item).CLOSED === true){
                        iCounter++;
                        if (oSelectedIndices.length === iCounter) {
                            MessageBox.information("Selected Record is Already Closed");
                        }
                    }
                    else{
                        var PRNo = aData.at(item).PRNO
                        var PRItm = aData.at(item).PRITM
    
                        // if(PRNo != "" || PRNo != null){
                        //     while(PRNo.length < 10) PRNo = "0" + PRNo;
                        // }

                        oParamData.push({
                            PreqNo: PRNo,
                            PreqItem: PRItm,
                            DeleteInd: '',
                            CloseInd: 'X'
                        })
                    }
                })
                if (oParamData.length > 0) {
                    oParam['N_DelClosePRParam'] = oParamData;
                    oParam['N_DelClosePRReturn'] = [];
                    await oModel.create("/DelClosePRSet", oParam, {
                        method: "POST",
                        success: async function(oResultDCPR, oResponse){
                            console.log(oResultDCPR)
                            await oSelectedIndices.forEach((item, index) => {
                                
                                var oRetMsg = oResultDCPR.N_DelClosePRReturn.results.filter(fItem => fItem.PreqNo === aData.at(item).PRNO )//&& fItem.PreqItem === aData.at(item).PRITM);
                                if (oRetMsg.length > 0) {
                                    if (oRetMsg[0].Type === 'I') {
                                        message = message + oRetMsg[0].Message + "\n"
                                    }else{
                                        isError = true;
                                        message = message + oRetMsg[0].Message + "\n"
                                    }
                                }else{
                                    isError = true;
                                    message = message + "PR: "+aData.at(item).PRNO + "/" + aData.at(item).PRITM + " is Either Already Closed or Deleted" + "\n"
                                }
                            });
                            
                            MessageBox.information(message);
                        }
                    })
                }
                if (!isError){
                    await oSelectedIndices.forEach(item => {
                        if(this._oDataBeforeChange.results[item].DELETED != true){        
                            this._oDataBeforeChange.results[item].CLOSED = true;
                        }

                    })
                    this.getView().getModel("TableData").setProperty("/", this._oDataBeforeChange);
                    this.getEditColumns();
                    this.setEditTableData();
                }
                
            }else{
                MessageBox.information("No selected record(s) to Close.");
            }
        },

      });
    }
  );
  