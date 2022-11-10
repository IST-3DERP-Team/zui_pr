sap.ui.define(
    [
        "sap/ui/core/mvc/Controller",
        "sap/ui/model/json/JSONModel",
        "sap/m/MessageBox",
        "../js/Common",
        "zuipr/model/formatter",
        "sap/ui/model/Filter",
        "sap/ui/model/FilterOperator",
        "sap/ui/Device",
        'sap/ui/model/Sorter',
        "sap/ui/table/library",
        "sap/m/TablePersoController",
        "sap/ui/model/xml/XMLModel",
        "../control/DynamicTable"
    ],
    function(BaseController, JSONModel, MessageBox, Common, formatter, Filter, FilterOperator,Device, XMLModel) {
      "use strict";

      var that;
      var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({pattern : "MM/dd/yyyy" });
      var sapDateFormat = sap.ui.core.format.DateFormat.getDateInstance({pattern : "yyyy-MM-dd" });
      var _PRNO;
      var _PRITM;
  
      return BaseController.extend("zuipr.controller.Main", {
        onInit: function () {
            that = this;
            Common.openLoadingDialog(that);
            that.callCaptionsAPI();
            this.validationErrors = [];

            var oComponent = this.getOwnerComponent();
            this._router = oComponent.getRouter();
            this.setSmartFilterModel();

            this._Model = this.getOwnerComponent().getModel();
            this._i18n = this.getOwnerComponent().getModel("i18n").getResourceBundle();

            this._isEdited = false
            this._DiscardChangesDialog = null;
            this._oDataBeforeChange = {}
            this._sbuChange = false;
            this._initLoadTbl = true;
            this._smartFilterBar = this.getView().byId("SmartFilterBar");
            
            this.validationErrors = [];
            this.getView().setModel(new JSONModel({
                dataMode: 'NODATA',
                sbu: ""
            }), "ui");

            var oModel = this.getOwnerComponent().getModel("ZVB_3DERP_PR_FILTERS_CDS");
            oModel.read("/ZVB_3DERP_SBU_SH", {
                success: function (oData, oResponse) {
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
                        that.byId("btnTabLayout").setEnabled(false);
                        that.byId("btnView").setEnabled(false);
                    }
                },
                error: function (err) { }
            });
        },
        onAssignedFiltersChanged: function(oEvent){
            var oStatusText = this.getView().byId("statusText");
			if (oStatusText && this._smartFilterBar) {
				var sText = this._smartFilterBar.retrieveFiltersWithValuesAsText();

				oStatusText.setText(sText);
			}
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
        
        onSearch: async function(){
            var promiseResult;
            if(this.getView().getModel("ui").getData().dataMode === 'EDIT'){
                this.onCancelEdit();
            }else{
                this._oDataBeforeChange = {}
                Common.openLoadingDialog(that);
                promiseResult = new Promise((resolve, resject)=>{
                    setTimeout(() => {
                        resolve(this.getColumns("Search"));
                    }, 500);
                })
                await promiseResult;
                this.getView().getModel("ui").setProperty("/dataMode", 'READ');
                Common.closeLoadingDialog(that);
            }
            
        },

        getColumns(type) {
            var me = this;
            var vSBU = this.getView().byId("cboxSBU").getSelectedKey();
            //get dynamic columns based on saved layout or ZERP_CHECK
            var oJSONColumnsModel = new JSONModel();
            // this.oJSONModel = new JSONModel();

            //MessageBox Message
            var noLayoutMsg = this.getView().getModel("captionMsg").getData()["INFO_NO_LAYOUT"];

            var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
            oModel.setHeaders({
                sbu: vSBU,
                type: 'PRHDR',
                tabname: 'ZDV_3DERP_PR'
            });

            oModel.read("/ColumnsSet", {
                success: function (oData, oResponse) {
                    if(oData.results.length > 0){
                        oJSONColumnsModel.setData(oData);
                        // me.oJSONModel.setData(oData);
                        if(type === "Search"){
                            me.getView().setModel(oJSONColumnsModel, "Columns"); //set the view model\
                            Common.closeLoadingDialog(that)
                        }
                        me.getTableData(type);
                        
                        me.byId("btnNew").setEnabled(true);
                        me.byId("btnEdit").setEnabled(true);
                        me.byId("btnDelete").setEnabled(true);
                        me.byId("btnClose").setEnabled(true);
                        me.byId("btnSave").setEnabled(true);
                        me.byId("btnCancel").setEnabled(true);
                        me.byId("btnTabLayout").setEnabled(true);
                        me.byId("btnView").setEnabled(true);

                    }else{
                        me.getView().setModel(oJSONColumnsModel, "Columns");
                        me.getView().setModel(oJSONColumnsModel, "TableData");
                        me.getTableData("Error");
                        me.setTableData();
                        that.byId("btnNew").setEnabled(false);
                        that.byId("btnEdit").setEnabled(false);
                        that.byId("btnDelete").setEnabled(false);
                        that.byId("btnClose").setEnabled(false);
                        that.byId("btnSave").setEnabled(false);
                        that.byId("btnCancel").setEnabled(false);
                        that.byId("btnTabLayout").setEnabled(false);
                        that.byId("btnView").setEnabled(false);
                        MessageBox.error(noLayoutMsg);
                        that.getView().getModel("ui").setProperty("/dataMode", 'NODATA');
                    }
                },
                error: function (err) { 
                    MessageBox.error(noLayoutMsg);
                    that.getView().getModel("ui").setProperty("/dataMode", 'NODATA');
                }
            });
        },

        getTableData: function (type) {
            var me = this;
            var oModel = this.getOwnerComponent().getModel();

            //get styles data for the table
            var oJSONDataModel = new JSONModel();
            var aFilters = this.getView().byId("SmartFilterBar").getFilters();
            var oJSONDataModel = new JSONModel();                 
            // console.log(aFilters)
            if (aFilters.length > 0) {
                aFilters[0].aFilters.forEach(item => {
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

                    oData.results.forEach((item, index) => {
                        if (item.DELDT !== null)
                            item.DELDT = dateFormat.format(new Date(item.DELDT));
                    })
                    // oText.setText(oData.results.length + "");
                    oJSONDataModel.setData(oData);
                    me.getView().setModel(oJSONDataModel, "TableData");
                    if(type == "Search"){
                        me.setTableData("Search");
                    }
                    // me.setChangeStatus(false);
                },
                error: function (err) { }
            });
        },

        setTableData(type) {
            var me = this;

            //the selected dynamic columns
            var oColumnsModel = this.getView().getModel("Columns");
            var oDataModel = this.getView().getModel("TableData");

            // console.log(oColumnsModel)
            //the selected styles data
            var oColumnsData = oColumnsModel.getProperty('/results');
            var oData = oDataModel.getProperty('/results');
            
            // if(type == "Search"){
            //     oColumnsData.unshift({
            //         "ColumnName": "Manage",
            //         "ColumnLabel": "Manage",
            //         "ColumnType": "SEL",
            //         "ColumnWidth": "80",
            //         "Editable": false
            //     });
            // }
            

            //set the column and data model
            var oModel = new JSONModel();
            oModel.setData({
                columns: oColumnsData,
                rows: oData
            });
            var oDelegateKeyUp = {
                onkeyup: function(oEvent){
                    that.onkeyup(oEvent);
                },
                
                
                onsapenter : function(oEvent){
                    that.onSapEnter(oEvent);
                }
            };

            this.byId("styleDynTable").addEventDelegate(oDelegateKeyUp);

            var oTable = this.getView().byId("styleDynTable");
            oTable.setModel(oModel);
            //double click event
            oTable.attachBrowserEvent('dblclick',function(e){
                e.preventDefault();
                if(me.getView().getModel("ui").getData().dataMode === 'READ'){
                    me.goToDetail(); //navigate to detail page
                }
             });

            //bind the dynamic column to the table
            oTable.bindColumns("/columns", function (index, context) {
                var sColumnId = context.getObject().ColumnName;
                var sColumnLabel = context.getObject().ColumnLabel;
                var sColumnType = context.getObject().ColumnType;
                var sColumnVisible = context.getObject().Visible;
                var sColumnSorted = context.getObject().Sorted;
                var sColumnSortOrder = context.getObject().SortOrder;
                var sColumnWidth = context.getObject().ColumnWidth;
                // var sColumnToolTip = context.getObject().Tooltip;
                //alert(sColumnId.);
                // console.log(context.getObject())
                return new sap.ui.table.Column({
                    id: sColumnId,
                    label: sColumnLabel,
                    template: me.columnTemplate(sColumnId, sColumnType),
                    width: sColumnWidth + "px",
                    hAlign: me.columnAlign(sColumnId),
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

        onSapEnter(oEvent) {
            if(that.getView().getModel("ui").getData().dataMode === 'READ'){
                that.goToDetail(); //navigate to detail page
            }
        },

        onkeyup: function(oEvent){
            if ((oEvent.key === "ArrowUp" || oEvent.key === "ArrowDown") && oEvent.srcControl.sParentAggregationName === "rows"){
                var oTable = this.byId("styleDynTable");
                
                var sRowPath = this.byId(oEvent.srcControl.sId).oBindingContexts["undefined"].sPath;

                var index = sRowPath.split("/");
                
                oTable.setSelectedIndex(parseInt(index[2]));
            }
        },

        onSelectionChange: function(oEvent) {
            // var oTable = this.getView().byId("styleDynTable");
            // iSelectedIndex = oEvent.getSource().getSelectedIndex();
            // oTable.setSelectedIndex(iSelectedIndex);

            var sPath = oEvent.getParameter("rowContext").getPath();
            var oTable = this.getView().byId("styleDynTable");
            var model = oTable.getModel();

            // var index = sPath.split("/");
            // console.log(index[2]);
            // oTable.removeSelectionInterval(parseInt(index[2] - 1), parseInt(index[2] - 1));

            //get the selected  data from the model and set to variable PRNo/PRITM
            var data  = model.getProperty(sPath); 

            _PRNO = data['PRNO'];
            _PRITM = data['PRITM'];
        },

        columnTemplate: function (sColumnId, sColumnType) {
            var oColumnTemplate;
            // console.log(sColumnId);
            oColumnTemplate = new sap.m.Text({ text: "{" + sColumnId + "}", wrapping: false, tooltip: "{" + sColumnId + "}" }); //default text
            
            // if (sColumnType === "SEL") { 
            //     //Manage button
            //     oColumnTemplate = new sap.m.Button({
            //         text: "",
            //         icon: "sap-icon://detail-view",
            //         type: "Ghost",
            //         press: this.goToDetail,
            //         tooltip: "Manage this style"
            //     });
            //     oColumnTemplate.data("PRNO", "{}");
            // }

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

        columnAlign: function(sColumnId){
            var ocolumnAlign;

            if(sColumnId === "QUANTITY"){
                ocolumnAlign = "End";
            }else{
                ocolumnAlign = "Left";
            }

            return ocolumnAlign;

        },

        goToDetail: function (oEvent) {
            //var oButton = oEvent.getSource();
            var PRNo = _PRNO;//oButton.data("PRNO").PRNO; //get the styleno binded to manage button
            var PRItm = _PRITM;//oButton.data("PRNO").PRITM;
            
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

        onEditTbl: async function(){
            Common.openLoadingDialog(that);
            var bProceed = true;
            if(this.getView().getModel("ui").getData().dataMode === 'EDIT'){
                bProceed = false;
            }
            if(this.getView().getModel("ui").getData().dataMode === 'NODATA'){
                bProceed = false;
            }

            if(bProceed){
                var oModel = this.getOwnerComponent().getModel();
                var oEntitySet = "/PRSet";
                var me = this;

                var oTable = this.byId("styleDynTable");
                var aSelIndices = oTable.getSelectedIndices();
                var oTmpSelectedIndices = [];
                var aData = this._oDataBeforeChange.results != undefined? this._oDataBeforeChange.results : this.getView().getModel("TableData").getData().results;
                var aDataToEdit = [];
                var bDeleted = false, bWithMaterial = false;
                var iCounter = 0;
                var promiseResult;
                
                //MessageBox Message
                var msgAlreadyDeleted = this.getView().getModel("captionMsg").getData()["INFO_ALREADY_DELETED"];
                var msgNoDataToEdit = this.getView().getModel("captionMsg").getData()["INFO_NO_DATA_EDIT"];
                var msgAlreadyClosed = this.getView().getModel("captionMsg").getData()["INFO_ALREADY_CLOSED"];

                if (aSelIndices.length > 0) {
                    aSelIndices.forEach(item => {
                        oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
                    })

                    aSelIndices = oTmpSelectedIndices;
                    promiseResult = new Promise((resolve, reject)=>{
                        aSelIndices.forEach((item, index) => {
                            if (aData.at(item).DELETED === true) {
                                iCounter++;
                                bDeleted = true;
        
                                if (aSelIndices.length === iCounter) {
                                    MessageBox.information(msgAlreadyDeleted);
                                }
                            }else if(aData.at(item).CLOSED === true){
                                iCounter++;
                                if (aSelIndices.length === iCounter) {
                                    MessageBox.information(msgAlreadyClosed);
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
                                                MessageBox.information(msgNoDataToEdit);
                                                resolve();
                                            }
                                            else {
                                                me.byId("btnNew").setVisible(false);
                                                me.byId("btnEdit").setVisible(false);
                                                me.byId("btnDelete").setVisible(false);
                                                me.byId("btnClose").setVisible(false);
                                                me.byId("btnSave").setVisible(true);
                                                me.byId("btnCancel").setVisible(true);
                                                me.byId("btnTabLayout").setVisible(false);
                                                me.byId("btnView").setVisible(false);
        
        
                                                me._oDataBeforeChange = jQuery.extend(true, {}, me.getView().getModel("TableData").getData());
                                                
                                                me.getView().getModel("TableData").setProperty("/results", aDataToEdit);
                                                me.getColumns("Edit");
                                                me.setTableData();
                                                me.setRowEditMode("TableData");
                                
                                                me.getView().getModel("ui").setProperty("/dataMode", 'EDIT');
                                                me._isGMCEdited = false;
                                                resolve();
                                            }
                                        }                                    
                                    },
                                    error: function (err) {
                                        iCounter++;
                                        resolve();
                                    }
                                })
                            }
                        });
                    });
                    await promiseResult;
                }
                else {
                    // aDataToEdit = aData;
                    MessageBox.information(msgNoDataToEdit);
                }
            }
            Common.closeLoadingDialog(that);
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
                oColumnsData.filter(item => item.ColumnName === col.sId)
                    .forEach(ci => {
                        if (ci.Editable) {
                            if(ci.ColumnName === "MATNO"){
                                col.setTemplate(new sap.m.Input({
                                    // id: "ipt" + ci.name,
                                    type: "Text",
                                    value: "{path: '" + ci.ColumnName + "', mandatory: '"+ ci.Mandatory +"'}",
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
                                    liveChange: this.onInputLiveChange.bind(this)
                                }));
                            }
                            if(ci.ColumnName === "QUANTITY"){
                                col.setTemplate(new sap.m.Input({
                                    // id: "ipt" + ci.name,
                                    type: sap.m.InputType.Number,
                                    value: "{path:'" + ci.ColumnName + "', type:'sap.ui.model.type.Decimal', formatOptions:{ minFractionDigits:" + null + ", maxFractionDigits:" + null + " }, constraints:{ precision:" + ci.Decimal + ", scale:" + null + " }}",
                                    
                                    maxLength: +ci.Length,
                                   
                                    liveChange: this.onNumberLiveChange.bind(this)
                                }));
                            }
                            if(ci.ColumnName === "DELDT"){
                                col.setTemplate(new sap.m.DatePicker({
                                    // id: "ipt" + ci.name,
                                    value: "{path: '" + ci.ColumnName + "', mandatory: '"+ ci.Mandatory +"'}",
                                    displayFormat:"short",
                                    change:"handleChange",
                                   
                                    liveChange: this.onInputLiveChange.bind(this)
                                }));
                            }
                            if(ci.ColumnName === "BATCH"){
                                col.setTemplate(new sap.m.Input({
                                    // id: "ipt" + ci.name,
                                    type: "Text",
                                    value: "{path: '" + ci.ColumnName + "', mandatory: '"+ ci.Mandatory +"'}",
                                    maxLength: +ci.Length,
                                   
                                    liveChange: this.onInputLiveChange.bind(this)
                                }));
                            }
                            if(ci.ColumnName === "MATGRP"){
                                col.setTemplate(new sap.m.Input({
                                    // id: "ipt" + ci.name,
                                    type: "Text",
                                    value: "{path: '" + ci.ColumnName + "', mandatory: '"+ ci.Mandatory +"'}",
                                    maxLength: +ci.Length,
                                    showValueHelp: true,
                                    valueHelpRequest: this.handleValueHelp.bind(this),
                                    showSuggestion: true,
                                   
                                    liveChange: this.onInputLiveChange.bind(this)
                                }));
                            }
                            if(ci.ColumnName === "SHIPTOPLANT"){
                                col.setTemplate(new sap.m.Input({
                                    // id: "ipt" + ci.name,
                                    type: "Text",
                                    value: "{path: '" + ci.ColumnName + "', mandatory: '"+ ci.Mandatory +"'}",
                                    maxLength: +ci.Length,
                                    showValueHelp: true,
                                    valueHelpRequest: this.handleValueHelp.bind(this),
                                    showSuggestion: true,
                                    liveChange: this.onInputLiveChange.bind(this)
                                }));
                            }
                            if(ci.ColumnName === "PLANTCD"){
                                col.setTemplate(new sap.m.Input({
                                    // id: "ipt" + ci.name,
                                    type: "Text",
                                    value: "{path: '" + ci.ColumnName + "', mandatory: '"+ ci.Mandatory +"'}",
                                    maxLength: +ci.Length,
                                    showValueHelp: true,
                                    valueHelpRequest: this.handleValueHelp.bind(this),
                                    showSuggestion: true,
                                    liveChange: this.onInputLiveChange.bind(this)
                                }));
                            }
                            if(ci.ColumnName === "VENDOR"){
                                col.setTemplate(new sap.m.Input({
                                    // id: "ipt" + ci.name,
                                    type: "Text",
                                    value: "{path: '" + ci.ColumnName + "', mandatory: '"+ ci.Mandatory +"'}",
                                    maxLength: +ci.Length,
                                    showValueHelp: true,
                                    valueHelpRequest: this.handleValueHelp.bind(this),
                                    showSuggestion: true,
                                    liveChange: this.onInputLiveChange.bind(this)
                                }));
                            }
                            if(ci.ColumnName === "PURORG"){
                                col.setTemplate(new sap.m.Input({
                                    // id: "ipt" + ci.name,
                                    type: "Text",
                                    value: "{path: '" + ci.ColumnName + "', mandatory: '"+ ci.Mandatory +"'}",
                                    maxLength: +ci.Length,
                                   
                                    liveChange: this.onInputLiveChange.bind(this)
                                }));
                            }
                            if(ci.ColumnName === "TRCKNO"){
                                col.setTemplate(new sap.m.Input({
                                    // id: "ipt" + ci.name,
                                    type: "Text",
                                    value: "{path: '" + ci.ColumnName + "', mandatory: '"+ ci.Mandatory +"'}",
                                    maxLength: +ci.Length,
                                   
                                    liveChange: this.onInputLiveChange.bind(this)
                                }));
                            }
                            if(ci.ColumnName === "REQSTNR"){
                                col.setTemplate(new sap.m.Input({
                                    // id: "ipt" + ci.name,
                                    type: "Text",
                                    value: "{path: '" + ci.ColumnName + "', mandatory: '"+ ci.Mandatory +"'}",
                                    maxLength: +ci.Length,
                                   
                                    liveChange: this.onInputLiveChange.bind(this)
                                }));
                            }
                            if(ci.ColumnName === "SUPTYP"){
                                col.setTemplate(new sap.m.Input({
                                    // id: "ipt" + ci.name,
                                    type: "Text",
                                    value: "{path: '" + ci.ColumnName + "', mandatory: '"+ ci.Mandatory +"'}",
                                    maxLength: +ci.Length,
                                    showValueHelp: true,
                                    valueHelpRequest: this.handleValueHelp.bind(this),
                                    showSuggestion: true,
                                   
                                    liveChange: this.onInputLiveChange.bind(this)
                                }));
                            }
                            if(ci.ColumnName === "SALESGRP"){
                                col.setTemplate(new sap.m.Input({
                                    // id: "ipt" + ci.name,
                                    type: "Text",
                                    value: "{path: '" + ci.ColumnName + "', mandatory: '"+ ci.Mandatory +"'}",
                                    maxLength: +ci.Length,
                                   
                                    liveChange: this.onInputLiveChange.bind(this)
                                }));
                            }
                            if(ci.ColumnName === "CUSTGRP"){
                                col.setTemplate(new sap.m.Input({
                                    // id: "ipt" + ci.name,
                                    type: "Text",
                                    value: "{path: '" + ci.ColumnName + "', mandatory: '"+ ci.Mandatory +"'}",
                                    maxLength: +ci.Length,
                                   
                                    liveChange: this.onInputLiveChange.bind(this)
                                }));
                            }
                            if(ci.ColumnName === "SEASONCD"){
                                col.setTemplate(new sap.m.Input({
                                    // id: "ipt" + ci.name,
                                    type: "Text",
                                    value: "{path: '" + ci.ColumnName + "', mandatory: '"+ ci.Mandatory +"'}",
                                    maxLength: +ci.Length,
                                   
                                    liveChange: this.onInputLiveChange.bind(this)
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
            // console.log(oEvent.getSource().getBindingInfo("value").binding.oValue);
            // console.log(oEvent.getSource().getBindingInfo("value").mandatory);
            // console.log(oEvent.getParameters().value);
            // console.log(oEvent.getSource().getBindingInfo("value"));
            // console.log(oEvent.getSource());
            // console.log(oEvent.getParameters());

            if(oEvent.getSource().getBindingInfo("value").mandatory){
                if(oEvent.getParameters().value === ""){
                    oEvent.getSource().setValueState("Error");
                    oEvent.getSource().setValueStateText("Required Field");
                    this.validationErrors.push(oEvent.getSource().getId());
                }else{
                    oEvent.getSource().setValueState("None");
                    this.validationErrors.forEach((item, index) => {
                        if (item === oEvent.getSource().getId()) {
                            this.validationErrors.splice(index, 1)
                        }
                    })
                }
            }
            //if original value is equal to change value
            if(oEvent.getParameters().value === oEvent.getSource().getBindingInfo("value").binding.oValue){
                this._isEdited = false;
            }else{
                this._isEdited = true;
            }
        },
        onNumberLiveChange: function(oEvent){
            if(oEvent.getSource().getBindingInfo("value").mandatory){
                if(oEvent.getParameters().value === ""){
                    oEvent.getSource().setValueState("Error");
                    oEvent.getSource().setValueStateText("Required Field");
                    this.validationErrors.push(oEvent.getSource().getId());
                }else{
                    oEvent.getSource().setValueState("None");
                    this.validationErrors.forEach((item, index) => {
                        if (item === oEvent.getSource().getId()) {
                            this.validationErrors.splice(index, 1)
                        }
                    })
                }
            }

            if (oEvent.getParameters().value.split(".").length > 1) {
                if (oEvent.getParameters().value.split(".")[1].length > 3) {
                    // console.log("invalid");
                    oEvent.getSource().setValueState("Error");
                    oEvent.getSource().setValueStateText("Enter a number with a maximum of 3 decimal places.");
                    this.validationErrors.push(oEvent.getSource().getId());

                }else{
                    oEvent.getSource().setValueState("None");
                    this.validationErrors.forEach((item, index) => {
                        if (item === oEvent.getSource().getId()) {
                            this.validationErrors.splice(index, 1)
                        }
                    })
                }
            }else{
                oEvent.getSource().setValueState("None");
                this.validationErrors.forEach((item, index) => {
                    if (item === oEvent.getSource().getId()) {
                        this.validationErrors.splice(index, 1)
                    }
                })
            }
            //if original value is equal to change value
            if(oEvent.getParameters().value === oEvent.getSource().getBindingInfo("value").binding.oValue){
                this._isEdited = false;
            }else{
                this._isEdited = true;
            }
        },
        // onValueHelpLiveInputChange: function(oEvent) {
        //     if (this.validationErrors === undefined) this.validationErrors = [];

        //     var oSource = oEvent.getSource();
        //     var isInvalid = !oSource.getSelectedKey() && oSource.getValue().trim();
        //     oSource.setValueState(isInvalid ? "Error" : "None");

        //     var sRowPath = oSource.getBindingInfo("value").binding.oContext.sPath;
        //     var sModel = oSource.getBindingInfo("value").parts[0].path;

        //     // if (!oSource.getSelectedKey()) {
        //         oSource.getSuggestionItems().forEach(item => {
        //             // console.log(item.getProperty("key"), oSource.getValue().trim())
        //             if (item.getProperty("key") === oSource.getValue().trim()) {
        //                 isInvalid = false;
        //                 oSource.setValueState(isInvalid ? "Error" : "None");                            
                        
        //                 if (oSource.getBindingInfo("value").parts[0].path === 'MATTYP') {
        //                     var et = item.getBindingContext().sPath;
        //                     this.getView().getModel(sModel).setProperty(sRowPath + '/PROCESSCD', item.getBindingContext().getModel().oData[et.slice(1, et.length)].Processcd);
        //                 }
        //             }
        //         })
        //     // }

        //     if (isInvalid) this.validationErrors.push(oEvent.getSource().getId());
        //     else {
        //         this.validationErrors.forEach((item, index) => {
        //             if (item === oEvent.getSource().getId()) {
        //                 this.validationErrors.splice(index, 1)
        //             }
        //         })
        //     }

        //     // this.getView().getModel(sModel).setProperty(sRowPath + '/Edited', true);

        //     if (sModel === 'gmc') this._isGMCEdited = true;
        //     else if (sModel === 'attributes') this._isAttrEdited = true;
        //     // console.log(oSource.getBindingInfo("value").parts)
        // },
        handleValueHelp: function(oEvent) {
            var oModel = this.getOwnerComponent().getModel('ZVB_3DERP_PR_FILTERS_CDS');
            var oSource = oEvent.getSource();
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
                            ).setProperty("title", "Select Material Group");
                        
                            _this._valueHelpDialog.setModel(
                                new JSONModel({
                                    items: data.results,
                                    title: "Material Group"
                                })
                            )
                            _this.getView().addDependent(_this._valueHelpDialog);
                        }
                        else {
                            _this._valueHelpDialog.setModel(
                                new JSONModel({
                                    items: data.results,
                                    title: "Mat. Grp."
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
                            ).setProperty("title", "Select Ship-to Plant");
                        
                            _this._valueHelpDialog.setModel(
                                new JSONModel({
                                    items: data.results,
                                    title: "Ship-To Plant"
                                })
                            )
                            _this.getView().addDependent(_this._valueHelpDialog);
                        }
                        else {
                            _this._valueHelpDialog.setModel(
                                new JSONModel({
                                    items: data.results,
                                    title: "Ship-To Plant"
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
                            ).setProperty("title", "Select Plant");
                        
                            _this._valueHelpDialog.setModel(
                                new JSONModel({
                                    items: data.results,
                                    title: "Plant"
                                })
                            )
                            _this.getView().addDependent(_this._valueHelpDialog);
                        }
                        else {
                            _this._valueHelpDialog.setModel(
                                new JSONModel({
                                    items: data.results,
                                    title: "Plant"
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
                            ).setProperty("title", "Select Vendor");
                        
                            _this._valueHelpDialog.setModel(
                                new JSONModel({
                                    items: data.results,
                                    title: "Vendor"
                                })
                            )
                            _this.getView().addDependent(_this._valueHelpDialog);
                        }
                        else {
                            _this._valueHelpDialog.setModel(
                                new JSONModel({
                                    items: data.results,
                                    title: "Vendor"
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
                            ).setProperty("title", "Select Supply Type");
                        
                            _this._valueHelpDialog.setModel(
                                new JSONModel({
                                    items: data.results,
                                    title: "Supply Type"
                                })
                            )
                            _this.getView().addDependent(_this._valueHelpDialog);
                        }
                        else {
                            _this._valueHelpDialog.setModel(
                                new JSONModel({
                                    items: data.results,
                                    title: "Supply Type"
                                })
                            )
                        }

                        _this._valueHelpDialog.open();                        
                    },
                    error: function (err) { }
                })
            }
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
                if (oSelectedItem) {
                    this._inputSource.setValue(oSelectedItem.getTitle());

                    var sRowPath = this._inputSource.getBindingInfo("value").binding.oContext.sPath;
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
        searchGlobal: function(oEvent){
            if(this.getView().getModel("ui").getData().dataMode === 'NODATA'){
                return;
            }
            var oTable = oEvent.getSource().oParent.oParent;
            var sTable = oTable.getBindingInfo("rows");
            var sQuery = oEvent.getParameter("query");
            if (sTable === "gmc") {
                this.byId("searchFieldAttr").setProperty("value", "");
                this.byId("searchFieldMatl").setProperty("value", "");
            }

            this.exeGlobalSearch(sQuery);
        },
        exeGlobalSearch(query) {
            var oFilter = null;
            var aFilter = [];
            var oTable = this.byId("styleDynTable");
            var oColumnsModel = this.getView().getModel("Columns");
            var oColumnsData = oColumnsModel.getProperty('/results');
            
            if (query) {
                oTable.getColumns().forEach((col, idx) => {
                    var sDataType = oColumnsData.filter(item => item.ColumnName === col.sId)[0].ColumnName

                    if(sDataType != "DELETED" && sDataType != "CLOSED")
                        aFilter.push(new Filter(sDataType, FilterOperator.Contains, query));
                    else
                        aFilter.push(new Filter(sDataType, FilterOperator.EQ, query));
                })
                oFilter = new Filter(aFilter, false);
            }
            this.byId("styleDynTable").getBinding("rows").filter(oFilter, "Application");
        },
        onCancelEdit: async function() {
            var promiseResult;
            if (this._isEdited) {

                if (!this._DiscardChangesDialog) {
                    this._DiscardChangesDialog = sap.ui.xmlfragment("zuipr.view.dialog.DiscardChangesDialog", this);
                    this.getView().addDependent(this._DiscardChangesDialog);
                }
                
                this._DiscardChangesDialog.open();
            }
            else {
                Common.openLoadingDialog(that);
                this.byId("btnNew").setVisible(true);
                this.byId("btnEdit").setVisible(true);
                this.byId("btnDelete").setVisible(true);
                this.byId("btnClose").setVisible(true);
                this.byId("btnSave").setVisible(false);
                this.byId("btnCancel").setVisible(false);
                this.byId("btnTabLayout").setVisible(true);
                this.byId("btnView").setVisible(true);
                this.validationErrors = [];
                this.getView().getModel("TableData").setProperty("/", this._oDataBeforeChange);
                promiseResult = new Promise((resolve, reject)=>{
                    setTimeout(() => {
                        this.getColumns("Cancel");
                        this.setTableData();
                        resolve();
                    }, 500);
                });
                await promiseResult;
                if (this.getView().getModel("ui").getData().dataMode === 'NEW') this.setFilterAfterCreate();

                this.getView().getModel("ui").setProperty("/dataMode", 'READ');
                Common.closeLoadingDialog(that);
            }
        },
        onCloseDiscardChangesDialog: async function() {
            var promiseResult;
            if (this._isEdited) {
                Common.openLoadingDialog(that);
                this.byId("btnNew").setVisible(true);
                this.byId("btnEdit").setVisible(true);
                this.byId("btnDelete").setVisible(true);
                this.byId("btnClose").setVisible(true);
                this.byId("btnSave").setVisible(false);
                this.byId("btnCancel").setVisible(false);
                this.byId("btnTabLayout").setVisible(true);
                this.byId("btnView").setVisible(true);
                // this.onTableResize("Hdr","Min");
                // this.setRowReadMode("gmc");\
                this.getView().getModel("TableData").setProperty("/", this._oDataBeforeChange);
                promiseResult = new Promise((resolve, reject)=>{
                    setTimeout(() => {
                        this.getColumns("Discard");
                        this.setTableData();
                        resolve();
                    }, 500);
                });
                await promiseResult;
                Common.closeLoadingDialog(that);
            }
            this.validationErrors = [];
            this._DiscardChangesDialog.close();
            this.getView().getModel("ui").setProperty("/dataMode", 'READ');
            this._isEdited = false;
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
        onSaveEdit: async function(){
            if(this.getView().getModel("ui").getData().dataMode != 'EDIT'){
                return;
            }
            Common.openLoadingDialog(that);
            var me = this;
            var oTable = this.byId("styleDynTable");
            var oSelectedIndices = oTable.getBinding("rows").aIndices;
            var oTmpSelectedIndices = [];
            var aData = oTable.getModel().getData().rows;
            var oParamData = [];
            var oParam = {};
            var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");
            var message = "";
            var promiseResult;

            //MessageBox Message
            var msgError = this.getView().getModel("captionMsg").getData()["INFO_ERROR"];
            
            if (this.validationErrors.length != 0){
                MessageBox.error(msgError);
                return;
            }
            oSelectedIndices.forEach(item => {
                oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
            })

            oSelectedIndices = oTmpSelectedIndices;
            oSelectedIndices.forEach((item, index) => {
                if(aData.at(item).PRNO != "" || aData.at(item).PRNO != null){
                    while(aData.at(item).PRNO.length < 10) aData.at(item).PRNO = "0" + aData.at(item).PRNO;
                }
                oParamData.push({
                    PreqNo: aData.at(item).PRNO,
                    PreqItem: aData.at(item).PRITM,
                    Matno: aData.at(item).MATNO,
                    Uom: aData.at(item).UOM,
                    Quantity: aData.at(item).QUANTITY,
                    DelivDate: sapDateFormat.format(new Date(aData.at(item).DELDT)) + "T00:00:00",
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
            // console.log(oParamData)

            if (oParamData.length > 0) {
                oParam['N_ChangePRParam'] = oParamData;
                oParam['N_ChangePRReturn'] = [];
                promiseResult = new Promise((resolve, reject)=>{
                    setTimeout(() => {
                        resolve(
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
                                            message = message + "Error Occured in " + aData.at(item).PRNO + "\n"
                                        }
            
                                    })
                                    
                                    MessageBox.information(message);
                                    
                                },
                                error: function() {
                                    message = msgError
                                    MessageBox.error(message);
                                    return;
                                }
                            })
                        );
                    }, 500);
                });

                await promiseResult;
                var prModel = this.getOwnerComponent().getModel();
                var prEntitySet = "/PRSet";  

                // for (var i = 0; i < this._oDataBeforeChange.results.length; i++) {
                //     for(var x = 0; x < aData.length; x++){
                //         if (this._oDataBeforeChange.results[i].PRNO === aData.at(x).PRNO && this._oDataBeforeChange.results[i].PRITM === aData.at(x).PRITM) {
                //             this._oDataBeforeChange.results[i] = aData.at(x);
                //             break;
                //         }
                //     }
                    
                // }
                for(var x = 0; x < aData.length; x++){
                    promiseResult = new Promise((resolve, reject)=>{
                        setTimeout(() => {
                            if(aData.at(x).PRNO != "" || aData.at(x).PRNO != null){
                                while(aData.at(x).PRNO.length < 10) aData.at(x).PRNO = "0" + aData.at(x).PRNO;
                            }
                            resolve(
                                prModel.read(prEntitySet + "(PRNO='" + aData.at(x).PRNO + "',PRITM='"+ aData.at(x).PRITM +"')", {
                                    success: function (data, response) {
                                        data.DELDT = dateFormat.format(new Date(data.DELDT));
                                        for (var i = 0; i < me._oDataBeforeChange.results.length; i++) {
                                            if (me._oDataBeforeChange.results[i].PRNO === data.PRNO && me._oDataBeforeChange.results[i].PRITM === data.PRITM) {
                                                // console.log(me._oDataBeforeChange.results[i]);
                                                // console.log(data);
                                                me._oDataBeforeChange.results[i] = data;
                                                // console.log(me._oDataBeforeChange.results[i]);
                                                me.getView().getModel("TableData").setProperty("/", me._oDataBeforeChange);  
                                            }
                                        }              
                                    },
                                    error: function (err) {
                                    }
                                })
                            );
                        }, 500);
                        
                    });
                    
                    await promiseResult;
                }
                promiseResult = new Promise((resolve, reject)=>{
                    setTimeout(() => {
                        this.getColumns("Save");
                        this.setTableData(); 
                        resolve()
                    }, 500);
                });
                await promiseResult;
                
                Common.closeLoadingDialog(that);
                
                this.byId("btnNew").setVisible(true);
                this.byId("btnEdit").setVisible(true);
                this.byId("btnDelete").setVisible(true);
                this.byId("btnClose").setVisible(true);
                this.byId("btnSave").setVisible(false);
                this.byId("btnCancel").setVisible(false);
                this.byId("btnTabLayout").setVisible(true);
                that.byId("btnView").setVisible(true);
                this.validationErrors = [];
                this._isEdited = false;
                
                
                this.getView().getModel("ui").setProperty("/dataMode", 'READ');
            }
        },
        onDeletePR: async function(){
            var bProceed = true;
            Common.openLoadingDialog(that);
            if(this.getView().getModel("ui").getData().dataMode === 'EDIT'){
                bProceed = false;
            }
            if(this.getView().getModel("ui").getData().dataMode === 'NODATA'){
                bProceed = false;
            }

            if(bProceed){
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
                var promiseResult;

                //MessageBox Message
                var msgAlreadyDeleted = this.getView().getModel("captionMsg").getData()["INFO_ALREADY_DELETED"];
                var msgAlreadyClosed = this.getView().getModel("captionMsg").getData()["INFO_ALREADY_CLOSED"];
                var msgNoDataToDelete = this.getView().getModel("captionMsg").getData()["INFO_NO_DATA_DELETE"];
                var msgDeletedOrClosed = this.getView().getModel("captionMsg").getData()["INFO_DELETED_OR_CLOSED"];
                
                if(oSelectedIndices.length > 0){
                    oSelectedIndices.forEach(item => {
                        oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
                    })
        
                    oSelectedIndices = oTmpSelectedIndices;

                    await oSelectedIndices.forEach((item, index) => {
                        if(aData.at(item).DELETED === true){
                            
                            iCounter++;
                            if (oSelectedIndices.length === iCounter) {
                                MessageBox.information(msgAlreadyDeleted);
                            }
                        }else if(aData.at(item).CLOSED === true){
                            iCounter++;

                            if (oSelectedIndices.length === iCounter) {
                                MessageBox.information(msgAlreadyClosed);
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
                        promiseResult = new Promise((resolve, reject)=>{
                            setTimeout(() => {
                                oModel.create("/DelClosePRSet", oParam, {
                                    method: "POST",
                                    success: function(oResultDCPR, oResponse){
                                        // console.log(oResultDCPR)
                                        oSelectedIndices.forEach((item, index) => {
                                            
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
                                                message = message + "PR: "+aData.at(item).PRNO + "/" + aData.at(item).PRITM + " "+ msgDeletedOrClosed + "\n"
                                            }
                                        });
                                        
                                        MessageBox.information(message);
                                    }
                                });
                                resolve();
                            }, 500);
                        });
                        await promiseResult;
                    }
                    if (!isError){
                        await oSelectedIndices.forEach(item => {
                            if(this._oDataBeforeChange.results[item].DELETED != true && this._oDataBeforeChange.results[item].CLOSED != true){        
                                this._oDataBeforeChange.results[item].DELETED = true;
                            }
                        })
                        this.getView().getModel("TableData").setProperty("/", this._oDataBeforeChange);
                        promiseResult = new Promise((resolve, reject)=>{
                            setTimeout(() => {
                                this.getColumns("Delete");
                                resolve();
                            }, 500);
                        })
                        await promiseResult;
                        Common.closeLoadingDialog(that);
                        this.setTableData();
                    }
                }else{
                    MessageBox.information(msgNoDataToDelete);
                }
            }
            Common.closeLoadingDialog(that);
            
        },
        onClosePR: async function(){
            Common.openLoadingDialog(that);
            var bProceed = true;
            if(this.getView().getModel("ui").getData().dataMode === 'EDIT'){
                bProceed = false;
            }
            if(bProceed){
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
                var promiseResult;

                //MessageBox Message
                var msgAlreadyDeleted = this.getView().getModel("captionMsg").getData()["INFO_ALREADY_DELETED"];
                var msgAlreadyClosed = this.getView().getModel("captionMsg").getData()["INFO_ALREADY_CLOSED"];
                var msgNoDataToClose = this.getView().getModel("captionMsg").getData()["INFO_NO_DATA_CLOSE"];
                var msgDeletedOrClosed = this.getView().getModel("captionMsg").getData()["INFO_DELETED_OR_CLOSED"];

                if(oSelectedIndices.length > 0){
                    oSelectedIndices.forEach(item => {
                        oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
                    })
        
                    oSelectedIndices = oTmpSelectedIndices;

                    await oSelectedIndices.forEach((item, index) => {
                        if(aData.at(item).DELETED === true){
                            
                            iCounter++;
                            if (oSelectedIndices.length === iCounter) {
                                MessageBox.information(msgAlreadyDeleted);
                            }
                        }else if(aData.at(item).CLOSED === true){
                            iCounter++;
                            if (oSelectedIndices.length === iCounter) {
                                MessageBox.information(msgAlreadyClosed);
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
                        promiseResult = new Promise((resolve, reject)=>{
                            setTimeout(() => {
                                oModel.create("/DelClosePRSet", oParam, {
                                    method: "POST",
                                    success: function(oResultDCPR, oResponse){
                                        // console.log(oResultDCPR)
                                        oSelectedIndices.forEach((item, index) => {
                                            
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
                                                message = message + "PR: "+aData.at(item).PRNO + "/" + aData.at(item).PRITM + " "+ msgDeletedOrClosed + "\n"
                                            }
                                        });
                                        
                                        MessageBox.information(message);
                                    }
                                });
                                resolve();
                            }, 500);

                        });
                        await promiseResult;
                    }
                    if (!isError){
                        await oSelectedIndices.forEach(item => {
                            if(this._oDataBeforeChange.results[item].DELETED != true){        
                                this._oDataBeforeChange.results[item].CLOSED = true;
                            }

                        })
                        this.getView().getModel("TableData").setProperty("/", this._oDataBeforeChange);
                        promiseResult = new Promise((resolve, reject)=>{
                            setTimeout(() => {
                                this.getColumns("Close");
                                resolve();
                            }, 500);
                        })
                        await promiseResult;
                        Common.closeLoadingDialog(that);
                        this.setTableData();
                    }
                    
                }else{
                    MessageBox.information(msgNoDataToClose);
                }
            }
            Common.closeLoadingDialog(that);
        },

        onSaveTableLayout: function () {
            //saving of the layout of table
            var me = this;
            var ctr = 1;
            var oTable = this.getView().byId("styleDynTable");
            var oColumns = oTable.getColumns();
            var vSBU = this.getView().byId("cboxSBU").getSelectedKey();

            var oParam = {
                "SBU": vSBU,
                "TYPE": "PRHDR",
                "TABNAME": "ZDV_3DERP_PR",
                "TableLayoutToItems": []
            };
            
            //get information of columns, add to payload
            oColumns.forEach((column) => {
                oParam.TableLayoutToItems.push({
                    COLUMNNAME: column.sId,
                    ORDER: ctr.toString(),
                    SORTED: column.mProperties.sorted,
                    SORTORDER: column.mProperties.sortOrder,
                    SORTSEQ: "1",
                    VISIBLE: column.mProperties.visible,
                    WIDTH: column.mProperties.width.replace('rem','')
                });

                ctr++;
            });

            //call the layout save
            var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");

            oModel.create("/TableLayoutSet", oParam, {
                method: "POST",
                success: function(data, oResponse) {
                    sap.m.MessageBox.information("Layout saved.");
                    //Common.showMessage(me._i18n.getText('t6'));
                },
                error: function(err) {
                    sap.m.MessageBox.error(err);
                }
            });                
        },

        callCaptionsAPI: async function(){
            var oJSONModel = new JSONModel();
            var oDDTextParam = [];
            var oDDTextResult = [];
            var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");

            //SmartFilter Search Label
            oDDTextParam.push({CODE: "SEARCH"});
            oDDTextParam.push({CODE: "SBU"});
            oDDTextParam.push({CODE: "PRNO"});
            oDDTextParam.push({CODE: "DOCTYP"});
            oDDTextParam.push({CODE: "PLANTCD"});
            oDDTextParam.push({CODE: "SHIPTOPLANT"});
            oDDTextParam.push({CODE: "PURGRP"});
            oDDTextParam.push({CODE: "VENDOR"});
            oDDTextParam.push({CODE: "FTYSTYLE"});
            oDDTextParam.push({CODE: "MATGRP"});
            oDDTextParam.push({CODE: "MATTYP"});
            oDDTextParam.push({CODE: "IONO"});
            oDDTextParam.push({CODE: "BATCH"});

            //Button Label
            oDDTextParam.push({CODE: "NEW"});
            oDDTextParam.push({CODE: "EDIT"});
            oDDTextParam.push({CODE: "DELETE"});
            oDDTextParam.push({CODE: "CLOSE"});
            oDDTextParam.push({CODE: "SAVE"});
            oDDTextParam.push({CODE: "CANCEL"});
            oDDTextParam.push({CODE: "SAVELAYOUT"});

            //MessageBox
            oDDTextParam.push({CODE: "INFO_NO_LAYOUT"});
            oDDTextParam.push({CODE: "INFO_ALREADY_DELETED"});
            oDDTextParam.push({CODE: "INFO_ERROR"});
            oDDTextParam.push({CODE: "INFO_ALREADY_CLOSED"});
            oDDTextParam.push({CODE: "INFO_NO_RECORD_SELECT"});
            oDDTextParam.push({CODE: "INFO_NO_DATA_EDIT"});
            oDDTextParam.push({CODE: "INFO_NO_DATA_DELETE"});
            oDDTextParam.push({CODE: "INFO_NO_DATA_CLOSE"});
            oDDTextParam.push({CODE: "INFO_DELETED_OR_CLOSED"});

            await oModel.create("/CaptionMsgSet", { CaptionMsgItems: oDDTextParam  }, {
                method: "POST",
                success: function(oData, oResponse) {
                    oData.CaptionMsgItems.results.forEach(item=>{
                        oDDTextResult[item.CODE] = item.TEXT;
                    })
                    
                    // console.log(oDDTextResult)
                    oJSONModel.setData(oDDTextResult);
                    that.getView().setModel(oJSONModel, "captionMsg");
                },
                error: function(err) {
                    sap.m.MessageBox.error(err);
                }
            });
        }

      });
    }
  );
  