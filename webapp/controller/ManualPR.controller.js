sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    'sap/m/MessageBox',
    "../js/Common",
    "sap/ui/core/ValueState",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/core/routing/History"
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, JSONModel, MessageBox, Common, ValueState, Filter, FilterOperator, History) {
        "use strict";

        var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({pattern : "MM/dd/yyyy" });
        var sapDateFormat = sap.ui.core.format.DateFormat.getDateInstance({pattern : "yyyy-MM-dd" });

        return Controller.extend("zuipr.controller.ManualPR", {
            onInit: function () {
                var that = this;
                var oModel = new sap.ui.model.json.JSONModel();
                this._validationErrors = []
                oModel.loadData("/sap/bc/ui2/start_up").then(() => {
                    this._userid = oModel.oData.id;
                })
                this.getView().setModel(new JSONModel({results: []}), "PRDetDataModel"); 


                //Initialize router
                var oComponent = this.getOwnerComponent();
                this._router = oComponent.getRouter();
                this._router.getRoute("ManualPR").attachPatternMatched(this._routePatternMatched, this);  

                this._tblIndex = null;
                this._purOrg = null;
                
            },

            _routePatternMatched: async function (oEvent) {
                Common.openLoadingDialog(this);
                this._sbu = oEvent.getParameter("arguments").SBU; //get SBU from route pattern
                //Load Data
                await this.loadAllData();
                Common.closeLoadingDialog(this);
            },
            loadAllData: async function(){
                await new Promise((resolve, reject)=>{
                    resolve(this.getHeaderConfig())
                });

                await new Promise((resolve, reject)=>{
                    resolve(this.getDynamicTableColumns())
                });

                await new Promise((resolve, reject)=>{
                    resolve(this.handleSuggestions())
                });
                this.setReqField();
            },

            setReqField() {
                // if (pType == "header") {
                var fields = ["feDOCTYP", "fePURGRP", "fePLANTCD", "feCUSTGRP", "feSALESGRP"];
                var label = "";
                fields.forEach(id => {
                    label = this.byId(id).getLabel().replace("*", "")
                    this.byId(id).setLabel("*" + label);
                    this.byId(id)._oLabel.addStyleClass("requiredField");
                    // if (pEditable) {
                    //     this.byId(id).setLabel("*" + this.byId(id).getLabel());
                    //     this.byId(id)._oLabel.addStyleClass("requiredField");
                    // } else {
                    //     this.byId(id).setLabel(this.byId(id).getLabel().replaceAll("*", ""));
                    //     this.byId(id)._oLabel.removeStyleClass("requiredField");
                    // }
                })
                // } else {
                //     var oTable = this.byId(pType + "Tab");

                //     oTable.getColumns().forEach((col, idx) => {
                //         if (col.getLabel().getText().includes("*")) {
                //             col.getLabel().setText(col.getLabel().getText().replaceAll("*", ""));
                //         }

                //         this._aColumns[pType].filter(item => item.label === col.getLabel().getText())
                //             .forEach(ci => {
                //                 if (ci.required) {
                //                     col.getLabel().removeStyleClass("requiredField");
                //                 }
                //             })
                //     })
                // }
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
                var docTypVal = this.getView().byId("DOCTYP").getValue();
                var purGrpVal = this.getView().byId("PURGRP").getValue();
                var purPlantVal = this.getView().byId("PLANTCD").getValue();
                var custGrpVal = this.getView().byId("CUSTGRP").getValue();
                var salesGrpVal = this.getView().byId("SALESGRP").getValue();
                
                if(docTypVal === "" || purGrpVal === "" || purPlantVal === "" || custGrpVal === "" || salesGrpVal === ""){
                    
                    if(docTypVal === ""){
                        this.getView().byId("DOCTYP").setValueState("Error");
                        this.getView().byId("DOCTYP").setValueStateText("Required Field");
                    }
                    if(purGrpVal === ""){
                        this.getView().byId("PURGRP").setValueState("Error");
                        this.getView().byId("PURGRP").setValueStateText("Required Field");
                    }
                    if(purPlantVal === ""){
                        this.getView().byId("PLANTCD").setValueState("Error");
                        this.getView().byId("PLANTCD").setValueStateText("Required Field");
                    }
                    if(custGrpVal === ""){
                        this.getView().byId("CUSTGRP").setValueState("Error");
                        this.getView().byId("CUSTGRP").setValueStateText("Required Field");
                    }
                    if(salesGrpVal === ""){
                        this.getView().byId("SALESGRP").setValueState("Error");
                        this.getView().byId("SALESGRP").setValueStateText("Required Field");
                    }
                    MessageBox.error("Above Field is Required!");
                    return;
                }

                this.byId("DOCTYP").setEnabled(false);
                this.byId("PURGRP").setEnabled(false);
                this.byId("PLANTCD").setEnabled(false);
                this.byId("CUSTGRP").setEnabled(false);
                this.byId("SALESGRP").setEnabled(false);

                var detailsItemArr = [];
                var detailsItemLastCnt = 0;
                var detailsItemObj = this.getView().getModel("PRDetDataModel").getData().results;
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
                newInsertField = {
                    DOCTYP: docTypVal,
                    PURGRP: purGrpVal,
                    PLANTCD: purPlantVal,
                    CUSTGRP: custGrpVal,
                    SALESGRP: salesGrpVal,
                }
                detailsItemObj.push(newInsertField);

                this.getView().getModel("PRDetDataModel").setProperty("/results", detailsItemObj);
                await this.setTableData('prDetTable');
                this.onRowEdit('prDetTable', 'PRDetColModel');
            },
            onPRDetPurge: async function(){
                var oTable;
                var aSelIndices;

                var oTmpSelectedIndices = [];
                var aDataRes = [];

                var aData;

                var chkData = this.getView().getModel("PRDetDataModel").getProperty("/results");

                oTable = this.byId("prDetTable");
                aSelIndices = oTable.getSelectedIndices();
                oTmpSelectedIndices = [];
                aData = this.getView().getModel("PRDetDataModel").getData().results;

                if(aSelIndices.length > 0) {
                    aSelIndices.forEach(item => {
                        oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
                    });
                    aSelIndices = oTmpSelectedIndices;

                    aSelIndices.forEach((item, index) => {
                        delete aData[item];
                    })

                    aData.forEach(item => {
                        aDataRes.push(item)
                    })

                    this.getView().getModel("PRDetDataModel").setProperty("/results", aDataRes);
                    await this.setTableData('prDetTable');

                    if(chkData.length >= 0){
                        this.byId("DOCTYP").setEnabled(true);
                        this.byId("PURGRP").setEnabled(true);
                        this.byId("PLANTCD").setEnabled(true);
                        this.byId("CUSTGRP").setEnabled(true);
                        this.byId("SALESGRP").setEnabled(true);
                    }
                    this.onRowEdit('prDetTable', 'PRDetColModel');
                }
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
                         id: 'prDetTable-' + sColumnId,
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
                    oColumnsData.filter(item => item.ColumnName === col.sId.split("-")[1])
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
                                    col.setTemplate(new sap.m.Input({
                                        id: "col-" + sColumnName,
                                        type: "Text",
                                        value: "{path: '" + ci.ColumnName + "', mandatory: '"+ ci.Mandatory +"'}",
                                        maxLength: +ci.Length,
                                        showValueHelp: true,
                                        valueHelpRequest: this.handleValueHelp.bind(this),
                                        liveChange: this.onInputLiveChange.bind(this)
                                    }));
                                }else if (sColumnType === "DATETIME"){
                                    col.setTemplate(new sap.m.DatePicker({
                                        id: "col-" + sColumnName,
                                        value: "{path: '" + ci.ColumnName + "', mandatory: '"+ ci.Mandatory +"'}",
                                        displayFormat:"short",
                                        change: this.onInputLiveChange.bind(this)
                                    }));
                                }else if (sColumnType === "NUMBER"){
                                    col.setTemplate(new sap.m.Input({
                                        id: "col-" + sColumnName,
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
                var me = this;
                if(oEvent.getSource().getParent().getId().includes("prDetTable")){
                    var oInput = oEvent.getSource();
                    var oCell = oInput.getParent();
                    var oRow = oCell.getBindingContext().getObject();
                    var sPath = oCell.getBindingContext().getPath();
                    this._tblIndex = sPath;
                }else{
                    this._tblIndex = null;
                }
                var tblIndex = this._tblIndex;
                var sRowPath = this._tblIndex == undefined ? null :"/results/"+ tblIndex.split("/")[2];
                var oModelFilter = this.getOwnerComponent().getModel('ZVB_3DERP_PRM_FILTERS_CDS');

                if(oEvent.getSource().getBindingInfo("value").mandatory){
                    if(oEvent.getParameters().value === ""){
                        oEvent.getSource().setValueState("Error");
                        oEvent.getSource().setValueStateText("Required Field");
                        this._validationErrors.push(oEvent.getSource().getId());
                    }else{
                        oEvent.getSource().setValueState("None");
                        this._validationErrors.forEach((item, index) => {
                            if (item === oEvent.getSource().getId()) {
                                this._validationErrors.splice(index, 1)
                            }
                        })
                    }
                }

                if(oEvent.getSource().getId().includes("MATNO")){
                    var matNo = oEvent.getParameters().value;
                    var oRow = this.getView().getModel("PRDetDataModel").getProperty(sRowPath);
                    await new Promise((resolve, reject) => { 
                        oModelFilter.read('/ZVB_3DERP_PR_MATNO_SH',{
                            success: async function (data, response) {
                                data.results.forEach(item=>{
                                    if(item.MATNO === matNo){
                                        oRow.MATNO = item.MATNO
                                        oRow.UOM = item.UOM
                                        oRow.SHORTTEXT = item.GMCDescen
                                        oRow.MATGRP = item.MatGrp
                                        oRow.MATTYP = item.MatTyp
                                    }else{
                                        oRow.MATNO = matNo
                                    }
                                })
                                await me.setTableData('prDetTable');
                                resolve(me.onRowEdit('prDetTable', 'PRDetColModel'));
                                resolve();
                            },
                            error: function (err) {
                                resolve();
                            }
                        });
                    });
                }else if(oEvent.getSource().getId().includes("VENDOR")){
                    this._purOrg = oEvent.getParameters().value;
                    var oRow = this.getView().getModel("PRDetDataModel").getProperty(sRowPath);
                    this._purOrg = oRow.PURORG;
                }else{
                    this._purOrg = null;
                }
            },
            onNumberLiveChange: async function(oEvent){

                if(oEvent.getSource().getBindingInfo("value").mandatory){
                    if(oEvent.getParameters().value === ""){
                        oEvent.getSource().setValueState("Error");
                        oEvent.getSource().setValueStateText("Required Field");
                        this._validationErrors.push(oEvent.getSource().getId());
                    }else{
                        oEvent.getSource().setValueState("None");
                        this._validationErrors.forEach((item, index) => {
                            if (item === oEvent.getSource().getId()) {
                                this._validationErrors.splice(index, 1)
                            }
                        })
                    }
                }
            },
            handleValueHelp: async function(oEvent){
                var that = this;
                var vSBU = this._sbu;
                var purPlantVal = this.getView().byId("PLANTCD").getValue();
                var bProceed = true;

               if(oEvent.getSource().getParent().getId().includes("prDetTable")){
                    var oInput = oEvent.getSource();
                    var oCell = oInput.getParent();
                    // var oRow = oCell.getBindingContext().getObject();
                    var sPath = oCell.getBindingContext().getPath();
                
                    this._tblIndex = sPath;

                    var sRowPath = this._tblIndex == undefined ? null :"/results/"+ this._tblIndex.split("/")[2];
                    var oRow = this.getView().getModel("PRDetDataModel").getProperty(sRowPath);
                    this._purOrg = oRow.PURORG;
               }else{
                    this._tblIndex = null;
                    this._purOrg = null;
               }

                var oModelFilter = this.getOwnerComponent().getModel('ZVB_3DERP_PRM_FILTERS_CDS');
                var oSource = oEvent.getSource();
                var fieldName = oSource.getBindingInfo("value").parts[0].path.replace("/", "");

                this._inputId = oSource.getId();
                this._inputValue = oSource.getValue();
                this._inputSource = oSource;

                var valueHelpObjects = [];
                var title = "";

                if(fieldName === 'DOCTYP'){
                    await new Promise((resolve, reject) => { 
                        oModelFilter.read('/ZVB_3DERP_PRDOCTYPE_SH',{
                            success: function (data, response) {
                                data.results.forEach(item=>{
                                    item.Item = item.DocType;
                                    item.Desc = item.Description;
                                })

                                valueHelpObjects = data.results;
                                title = "Document Type"
                                resolve();
                            },
                            error: function (err) {
                                resolve();
                            }
                        });
                    });
                }
                if(fieldName === 'PURGRP'){
                    await new Promise((resolve, reject) => { 
                        oModelFilter.read('/ZVB_3DERP_PURGRP_SH',{
                            success: function (data, response) {
                                data.results.forEach(item=>{
                                    item.Item = item.PurchGrp;
                                    item.Desc = item.Description;
                                })

                                valueHelpObjects = data.results;
                                title = "Purchasing Group"
                                resolve();
                            },
                            error: function (err) {
                                resolve();
                            }
                        });
                    });
                }
                if(fieldName === 'PLANTCD'){
                    await new Promise((resolve, reject) => { 
                        oModelFilter.read('/ZVB_3DERP_PR_PURPLANT_SH',{
                            success: function (data, response) {
                                var dataResult = [];
                                data.results.forEach(item=>{
                                    if(item.SBU === vSBU){
                                        item.Item = item.PurchPlant;
                                        item.Desc = item.Description;
                                        dataResult.push(item);
                                    }
                                })
                                valueHelpObjects = dataResult;
                                title = "Purchasing Plant"
                                resolve();
                            },
                            error: function (err) {
                                resolve();
                            }
                        });
                    });
                }
                if(fieldName === 'CUSTGRP'){
                    await new Promise((resolve, reject) => { 
                        oModelFilter.read('/ZVB_3DERP_PR_CUSTGRP_SH',{
                            success: function (data, response) {
                                data.results.forEach(item=>{
                                    item.Item = item.CUSTGRP;
                                    item.Desc = item.Description;
                                })

                                valueHelpObjects = data.results;
                                title = "Customer Group"
                                resolve();
                            },
                            error: function (err) {
                                resolve();
                            }
                        });
                    });
                }
                if(fieldName === 'SALESGRP'){
                    await new Promise((resolve, reject) => { 
                        oModelFilter.read('/ZVB_3DERP_PR_SALESGRP_SH',{
                            success: function (data, response) {
                                data.results.forEach(item=>{
                                    item.Item = item.SALESGRP;
                                    item.Desc = item.Description;
                                })

                                valueHelpObjects = data.results;
                                title = "Sales Group"
                                resolve();
                            },
                            error: function (err) {
                                resolve();
                            }
                        });
                    });
                }
                if(fieldName === 'MATNO'){
                    await new Promise((resolve, reject) => { 
                        oModelFilter.read('/ZVB_3DERP_PR_MATNO_SH',{
                            success: function (data, response) {
                                var dataResult = [];
                                data.results.forEach(item=>{
                                    if(item.SBU === vSBU){
                                        item.Item = item.MATNO;
                                        item.Desc = item.GMCDescen;
                                        dataResult.push(item);
                                    }
                                })
                                valueHelpObjects = dataResult;
                                title = "Material"
                                resolve();
                            },
                            error: function (err) {
                                resolve();
                            }
                        });
                    });
                }
                if(fieldName === 'BATCH'){
                    await new Promise((resolve, reject) => { 
                        oModelFilter.read('/ZVB_3DERP_PR_BATCH_SH',{
                            success: function (data, response) {
                                var dataResult = [];
                                data.results.forEach(item=>{
                                    if(item.BATCH !== ""){
                                        if(item.SBU === vSBU){
                                            item.Item = item.BATCH;
                                            item.Desc = item.Description;
                                            dataResult.push(item);
                                        }
                                        if(item.SBU == ""){
                                            item.SBU = vSBU
                                            item.Item = item.BATCH;
                                            item.Desc = item.Description;
                                            dataResult.push(item);
                                        }
                                    }
                                })
                                valueHelpObjects = dataResult;
                                title = "Batch"
                                resolve();
                            },
                            error: function (err) {
                                resolve();
                            }
                        });
                    });
                }
                if(fieldName === 'SEASONCD'){
                    await new Promise((resolve, reject) => { 
                        oModelFilter.read('/ZVB_3DERP_SEASON_SH',{
                            success: function (data, response) {
                                var dataResult = [];
                                data.results.forEach(item=>{
                                    if(item.SBU === vSBU){
                                        item.Item = item.SEASONCD;
                                        item.Desc = item.DESCRIPTION;
                                        dataResult.push(item);
                                    }
                                })
                                valueHelpObjects = dataResult;
                                title = "Season"
                                resolve();
                            },
                            error: function (err) {
                                resolve();
                            }
                        });
                    });
                }
                if(fieldName === 'PURORG'){
                    await new Promise((resolve, reject) => { 
                        oModelFilter.read('/ZVB_3DERP_PR_PURORG_SH',{
                            success: function (data, response) {
                                var dataResult = [];
                                data.results.forEach(item=>{
                                    if(item.PurchPlant === purPlantVal){
                                        item.Item = item.PURORG;
                                        dataResult.push(item);
                                    }
                                    // item.Desc = item.DESCRIPTION;
                                })
                                valueHelpObjects = dataResult;
                                title = "Purchasing Org."
                                resolve();
                            },
                            error: function (err) {
                                resolve();
                            }
                        });
                    });
                }
                if(fieldName === 'VENDOR'){
                    if(this._purOrg === null || this._purOrg === undefined || this._purOrg === ""){
                        bProceed = false;
                    }

                    if(bProceed){
                        await new Promise((resolve, reject) => { 
                            oModelFilter.read('/ZVB_3DERP_PR_VENDOR_SH',{
                                success: function (data, response) {
                                    var dataResult = [];
                                    data.results.forEach(item=>{
                                        while (item.VENDOR.length < 10) item.VENDOR = "0" + item.VENDOR;
                                        item.Item = item.VENDOR;
                                        item.Desc = item.Description;
                                    })

                                    valueHelpObjects = data.results;
                                    title = "Vendor"
                                    resolve();
                                },
                                error: function (err) {
                                    resolve();
                                }
                            });
                        });
                    }else{
                        MessageBox.error("Purchasing Org. is Required!");
                    }
                }
                if(bProceed){
                    var oVHModel = new JSONModel({
                        items: valueHelpObjects,
                        title: title
                    });  

                    // create value help dialog
                    if (!this._valueHelpDialog) {
                        this._valueHelpDialog = sap.ui.xmlfragment(
                            "zuipr.view.fragments.valuehelp.ValueHelpDialog",
                            that
                        );
                        
                        this._valueHelpDialog.setModel(oVHModel);
                        this.getView().addDependent(this._valueHelpDialog);
                    }
                    else {
                        this._valueHelpDialog.setModel(oVHModel);
                    }      
                    this._valueHelpDialog.open();   
                }
            },
            handleValueHelpClose: async function(oEvent){
                var me = this;

                // var prDetDataModel = this.getView().getModel('PRDetDataModel').getProperty('/results');
                var tblIndex = this._tblIndex;
                var sRowPath = this._tblIndex == undefined ? null :"/results/"+ tblIndex.split("/")[2];


                if (oEvent.sId === "confirm") {
                    var oSelectedItem = oEvent.getParameter("selectedItem");
    
                    if (oSelectedItem) {
                        this._inputSource.setValue(oSelectedItem.getTitle());
                        var oModelFilter = this.getOwnerComponent().getModel('ZVB_3DERP_PRM_FILTERS_CDS');

                        var oRow = this.getView().getModel("PRDetDataModel").getProperty(sRowPath);

                        if(this._inputSource.getId().includes("MATNO")){
                            Common.openLoadingDialog(me);
                            var matNo = oSelectedItem.getTitle();
                            await new Promise((resolve, reject) => { 
                                oModelFilter.read('/ZVB_3DERP_PR_MATNO_SH',{
                                    success: async function (data, response) {
                                        data.results.forEach(item=>{
                                            if(item.MATNO === matNo){
                                                oRow.UOM = item.UOM
                                                oRow.SHORTTEXT = item.GMCDescen
                                                oRow.MATGRP = item.MatGrp
                                                oRow.MATTYP = item.MatTyp
                                            }
                                        })
                                        await me.setTableData('prDetTable');
                                        resolve(me.onRowEdit('prDetTable', 'PRDetColModel'));
                                        resolve();
                                    },
                                    error: function (err) {
                                        resolve();
                                    }
                                });
                            });
                            Common.closeLoadingDialog(me);
                        }
    
                        // var sRowPath = this._inputSource.getBindingInfo("value").binding.oContext.sPath;
    
                        if (this._inputValue !== oSelectedItem.getTitle()) {                                
                            // this.getView().getModel("mainTab").setProperty(sRowPath + '/Edited', true);
    
                            this._bHeaderChanged = true;
                        }
                    }
    
                    this._inputSource.setValueState("None");
                }
                else if (oEvent.sId === "cancel") {
    
                }
            },
            handleValueHelpSearch: async function(oEvent){
                var sValue = oEvent.getParameter("value");

                var oFilter = new sap.ui.model.Filter({
                    filters: [
                        new sap.ui.model.Filter("Item", sap.ui.model.FilterOperator.Contains, sValue),
                        new sap.ui.model.Filter("Desc", sap.ui.model.FilterOperator.Contains, sValue)
                    ],
                    and: false
                });

                oEvent.getSource().getBinding("items").filter([oFilter]);
            },
            handleSuggestions: async function(){
                var me = this;
                var vSBU = this._sbu;
                var purPlantVal = this.getView().byId("PLANTCD").getValue();
                var bProceed = true;

                var oModelFilter = this.getOwnerComponent().getModel('ZVB_3DERP_PRM_FILTERS_CDS');

                var oJSONModel = new JSONModel();

                //'DOCTYP'
                await new Promise((resolve, reject) => { 
                    oModelFilter.read('/ZVB_3DERP_PRDOCTYPE_SH',{
                        success: function (data, response) {
                            data.results.forEach(item=>{
                                item.Item = item.DocType;
                                item.Desc = item.Description;
                            })
                            oJSONModel.setData(data.results)
                            
                            resolve(me.getView().setModel(oJSONModel, "docTypSource"));
                        },
                        error: function (err) {
                            resolve();
                        }
                    });
                });
                // 'PURGRP'
                oJSONModel = new JSONModel();
                await new Promise((resolve, reject) => { 
                    oModelFilter.read('/ZVB_3DERP_PURGRP_SH',{
                        success: function (data, response) {
                            data.results.forEach(item=>{
                                item.Item = item.PurchGrp;
                                item.Desc = item.Description;
                            })
                            oJSONModel.setData(data.results)
                            me.getView().setModel(oJSONModel, "purchGrpSource");
                            resolve();
                        },
                        error: function (err) {
                            resolve();
                        }
                    });
                });
                // 'PLANTCD'
                oJSONModel = new JSONModel();
                await new Promise((resolve, reject) => { 
                    oModelFilter.read('/ZVB_3DERP_PR_PURPLANT_SH',{
                        success: function (data, response) {
                            var dataResult = [];
                            data.results.forEach(item=>{
                                if(item.SBU === vSBU){
                                    item.Item = item.PurchPlant;
                                    item.Desc = item.Description;
                                    dataResult.push(item);
                                }
                            })
                            oJSONModel.setData(dataResult)
                            me.getView().setModel(oJSONModel, "purchPlantSource");
                            resolve();
                        },
                        error: function (err) {
                            resolve();
                        }
                    });
                });
                // 'CUSTGRP'
                oJSONModel = new JSONModel();
                await new Promise((resolve, reject) => { 
                    oModelFilter.read('/ZVB_3DERP_PR_CUSTGRP_SH',{
                        success: function (data, response) {
                            data.results.forEach(item=>{
                                item.Item = item.CUSTGRP;
                                item.Desc = item.Description;
                            })

                            oJSONModel.setData(data.results)
                            me.getView().setModel(oJSONModel, "custGrpSource");
                            resolve();
                        },
                        error: function (err) {
                            resolve();
                        }
                    });
                });
                // 'SALESGRP'
                oJSONModel = new JSONModel();
                await new Promise((resolve, reject) => { 
                    oModelFilter.read('/ZVB_3DERP_PR_SALESGRP_SH',{
                        success: function (data, response) {
                            data.results.forEach(item=>{
                                item.Item = item.SALESGRP;
                                item.Desc = item.Description;
                            })

                            oJSONModel.setData(data.results)
                            me.getView().setModel(oJSONModel, "salesGrpSource");
                            resolve();
                        },
                        error: function (err) {
                            resolve();
                        }
                    });
                });
                // // 'MATNO'
                // await new Promise((resolve, reject) => { 
                //     oModelFilter.read('/ZVB_3DERP_PR_MATNO_SH',{
                //         success: function (data, response) {
                //             var dataResult = [];
                //             data.results.forEach(item=>{
                //                 if(item.SBU === vSBU){
                //                     item.Item = item.MATNO;
                //                     item.Desc = item.GMCDescen;
                //                     dataResult.push(item);
                //                 }
                //             })
                //             valueHelpObjects = dataResult;
                //             title = "Material"
                //             resolve();
                //         },
                //         error: function (err) {
                //             resolve();
                //         }
                //     });
                // });
                // // 'BATCH'
                // await new Promise((resolve, reject) => { 
                //     oModelFilter.read('/ZVB_3DERP_PR_BATCH_SH',{
                //         success: function (data, response) {
                //             var dataResult = [];
                //             data.results.forEach(item=>{
                //                 if(item.SBU === vSBU){
                //                     item.Item = item.BATCH;
                //                     item.Desc = item.Description;
                //                     dataResult.push(item);
                //                 }
                //             })
                //             valueHelpObjects = data.results;
                //             title = "Batch"
                //             resolve();
                //         },
                //         error: function (err) {
                //             resolve();
                //         }
                //     });
                // });
                // //'SEASONCD'
                // await new Promise((resolve, reject) => { 
                //     oModelFilter.read('/ZVB_3DERP_SEASON_SH',{
                //         success: function (data, response) {
                //             var dataResult = [];
                //             data.results.forEach(item=>{
                //                 if(item.SBU === vSBU){
                //                     item.Item = item.SEASONCD;
                //                     item.Desc = item.DESCRIPTION;
                //                     dataResult.push(item);
                //                 }
                //             })
                //             valueHelpObjects = dataResult;
                //             title = "Season"
                //             resolve();
                //         },
                //         error: function (err) {
                //             resolve();
                //         }
                //     });
                // });
                // // 'PURORG'
                // await new Promise((resolve, reject) => { 
                //     oModelFilter.read('/ZVB_3DERP_PR_PURORG_SH',{
                //         success: function (data, response) {
                //             var dataResult = [];
                //             data.results.forEach(item=>{
                //                 if(item.PurchPlant === purPlantVal){
                //                     item.Item = item.PURORG;
                //                     dataResult.push(item);
                //                 }
                //                 // item.Desc = item.DESCRIPTION;
                //             })
                //             valueHelpObjects = dataResult;
                //             title = "Purchasing Org."
                //             resolve();
                //         },
                //         error: function (err) {
                //             resolve();
                //         }
                //     });
                // });
                // if(fieldName === 'VENDOR'){
                //     if(this._purOrg === null || this._purOrg === undefined || this._purOrg === ""){
                //         bProceed = false;
                //     }

                //     if(bProceed){
                //         await new Promise((resolve, reject) => { 
                //             oModelFilter.read('/ZVB_3DERP_PR_VENDOR_SH',{
                //                 success: function (data, response) {
                //                     var dataResult = [];
                //                     data.results.forEach(item=>{
                //                         while (item.VENDOR.length < 10) item.VENDOR = "0" + item.VENDOR;
                //                         item.Item = item.VENDOR;
                //                         item.Desc = item.Description;
                //                     })

                //                     valueHelpObjects = data.results;
                //                     title = "Vendor"
                //                     resolve();
                //                 },
                //                 error: function (err) {
                //                     resolve();
                //                 }
                //             });
                //         });
                //     }else{
                //         MessageBox.error("Purchasing Org. is Required!");
                //     }
                // }
            },
            // handleSuggest: function(oEvent) {
            //     var oSource = oEvent.getSource();
            //     var fieldName = oSource.getBindingInfo("value").parts[0].path.replace("/", "");

            //     console.log(fieldName);
            //     var sTerm = oEvent.getParameter("suggestValue");
            //     var aFilters = [];
            //     if (sTerm) {
            //         console.log(sTerm);
            //         aFilters.push(new Filter("DocType", sap.ui.model.FilterOperator.Contains, sTerm));
            //     }
            //     console.log(aFilters);
            //     console.log(oEvent.getSource().getBinding("suggestionItems"))
            //     oEvent.getSource().getBinding("suggestionItems").filter(aFilters);
            // },

            onSaveHeader: async function(){
                var docTypVal = this.getView().byId("DOCTYP").getValue();
                var purGrpVal = this.getView().byId("PURGRP").getValue();
                var purPlantVal = this.getView().byId("PLANTCD").getValue();
                var custGrpVal = this.getView().byId("CUSTGRP").getValue();
                var salesGrpVal = this.getView().byId("SALESGRP").getValue();

                if(docTypVal === "" || purGrpVal === "" || purPlantVal === "" || custGrpVal === "" || salesGrpVal === ""){
                    
                    if(docTypVal === ""){
                        this.getView().byId("DOCTYP").setValueState("Error");
                        this.getView().byId("DOCTYP").setValueStateText("Required Field");
                    }
                    if(purGrpVal === ""){
                        this.getView().byId("PURGRP").setValueState("Error");
                        this.getView().byId("PURGRP").setValueStateText("Required Field");
                    }
                    if(purPlantVal === ""){
                        this.getView().byId("PLANTCD").setValueState("Error");
                        this.getView().byId("PLANTCD").setValueStateText("Required Field");
                    }
                    if(custGrpVal === ""){
                        this.getView().byId("CUSTGRP").setValueState("Error");
                        this.getView().byId("CUSTGRP").setValueStateText("Required Field");
                    }
                    if(salesGrpVal === ""){
                        this.getView().byId("SALESGRP").setValueState("Error");
                        this.getView().byId("SALESGRP").setValueStateText("Required Field");
                    }
                    MessageBox.error("Below Field is Required!");
                    return;
                }

                var me = this;
                var oTable = this.byId("prDetTable");
                var oSelectedIndices = oTable.getBinding("rows").aIndices;
                var oTmpSelectedIndices = [];
                var aData = oTable.getModel().getData().rows;

                //Boolean to check if there is Validation Errors
                var boolProceed = true;

                //Init Validation Errors Object
                this._validationErrors = [];

                //PR Creation Error Type Variable
                var errTyp = "";

                oSelectedIndices.forEach(item => {
                    oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
                });
                oSelectedIndices = oTmpSelectedIndices;


                var aItems = oTable.getRows();
                var colCounter = 0;

                if(oSelectedIndices.length > 0){
                    // await new Promise((resolve, reject)=>{
                    //     for (var i = 0; i < aItems.length; i++) {
                    //         var oItem = aItems[i];
                    //         for (var index = 0; index < oSelectedIndices.length; index++) {
                    //             var item = oSelectedIndices[index];
                    //             colCounter++;
                    //             if(oItem.getIndex() === item){
                    //                 var aCells = oItem.getCells();
                    //                 for (var i = 0; i < aCells.length; i++) {
                    //                     colCounter++;
                    //                     var oCell = aCells[i];
                    //                     if (oCell.isA("sap.m.Input")) {
                    //                         if(oCell.getBindingInfo("value").mandatory === "true"){
                    //                             if(oCell.getValue() === ""){
                    //                                 oCell.setValueState(sap.ui.core.ValueState.Error);
                    //                                 me._validationErrors.push(oCell.getId());
                    //                             }else{
                    //                                 oCell.setValueState(sap.ui.core.ValueState.None);
                    //                                 me._validationErrors.forEach((item, index) => {
                    //                                     if (item === oCell.getId()) {
                    //                                         me._validationErrors.splice(index, 1)
                    //                                     }
                    //                                 })
                    //                             }   
                    //                         }else{
                    //                             oCell.setValueState(sap.ui.core.ValueState.None);
                    //                         }
                    //                     }else if (oCell.isA("sap.m.DatePicker")) {
                    //                         if(oCell.getBindingInfo("value").mandatory === "true"){
                    //                             if(oCell.getValue() === ""){
                    //                                 oCell.setValueState(sap.ui.core.ValueState.Error);
                    //                                 me._validationErrors.push(oCell.getId());
                    //                             }else{
                    //                                 oCell.setValueState(sap.ui.core.ValueState.None);
                    //                                 me._validationErrors.forEach((item, index) => {
                    //                                     if (item === oCell.getId()) {
                    //                                         me._validationErrors.splice(index, 1)
                    //                                     }
                    //                                 })
                    //                             }   
                    //                         }else{
                    //                             oCell.setValueState(sap.ui.core.ValueState.None);
                    //                         }
                    //                     }
                    //                 };
                    //             }
                                
                    //             if(oSelectedIndices.length === colCounter){
                    //                 resolve();
                    //             }
                    //         }
                    //     };
                    // });
                    aItems.forEach(function(oItem) {
                        oSelectedIndices.forEach((item, index) => {
                            if(oItem.getIndex() === item){
                                var aCells = oItem.getCells();
                                aCells.forEach(function(oCell) {
                                    if (oCell.isA("sap.m.Input")) {
                                        if(oCell.getBindingInfo("value").mandatory === "true"){
                                            if(oCell.getValue() === ""){
                                                oCell.setValueState(sap.ui.core.ValueState.Error);
                                                me._validationErrors.push(oCell.getId());
                                            }else{
                                                oCell.setValueState(sap.ui.core.ValueState.None);
                                                me._validationErrors.forEach((item, index) => {
                                                    if (item === oCell.getId()) {
                                                        me._validationErrors.splice(index, 1)
                                                    }
                                                })
                                            }   
                                        }
                                    }else if (oCell.isA("sap.m.DatePicker")) {
                                        if(oCell.getBindingInfo("value").mandatory === "true"){
                                            if(oCell.getValue() === ""){
                                                oCell.setValueState(sap.ui.core.ValueState.Error);
                                                me._validationErrors.push(oCell.getId());
                                            }else{
                                                oCell.setValueState(sap.ui.core.ValueState.None);
                                                me._validationErrors.forEach((item, index) => {
                                                    if (item === oCell.getId()) {
                                                        me._validationErrors.splice(index, 1)
                                                    }
                                                })
                                            }   
                                        }
                                    }
                                })
                            }
                        })
                    });
                }

                if(this._validationErrors.length > 0){
                    MessageBox.error("Required Fields not supplied!");
                    boolProceed = false;
                }

                if(boolProceed){
                    var oModel = this.getOwnerComponent().getModel();
                    oModel.setUseBatch(true);
                    oModel.setDeferredGroups(["insert"]);
                    var modelParameter = {
                        "groupId": "insert"
                    };
                    var rFcModel = this.getOwnerComponent().getModel('ZGW_3DERP_RFC_SRV');
                    var iCounter = 0;

                    var matNo = "";
                    var batch = "";
                    var hasError = false;
                    var hasZERPMatBatch = false;
                    var ZERPMatBatchParam = {}

                    var matTyp = ""
                    var noRangeCd = "";
                    var ZERPNorangeKeyParam = {};

                    var prCreateSetParamSet = {}
                    var prCreateSetParamMain = {}
                    var prCreateSetParam = []

                    var prItem = 0;

                    var prCreationMessage = "";

                    // oSelectedIndices.forEach(item => {
                    //     oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
                    // })
                    // oSelectedIndices = oTmpSelectedIndices;

                    if(oSelectedIndices.length > 0){
                        oSelectedIndices.forEach(async (item, index) => {
                            matNo = aData.at(item).MATNO;
                            batch = aData.at(item).BATCH;
                            matTyp = aData.at(item).MATTYP;
                            await new Promise((resolve, reject) => { 
                                oModel.read('/ZERP_MATBATCHSet',{
                                    urlParameters: {
                                        "$filter": "MATNO eq '" + matNo + "' and BATCH eq '" + batch + "'"
                                    },
                                    success: function (data, response) {
                                        if(data.results.length){
                                            hasZERPMatBatch = true;
                                        }
                                        resolve();
                                    },
                                    error: function (err) {
                                        hasError = true;
                                        resolve();
                                    }
                                });
                            });

                            if(!hasError){
                                if(!hasZERPMatBatch){
                                    ZERPMatBatchParam = {
                                        MATNO: matNo,
                                        BATCH: batch,
                                        IONO: batch
                                    }
                                    oModel.create("/ZERP_MATBATCHSet", ZERPMatBatchParam, modelParameter);
                                    await new Promise((resolve, reject) => { 
                                        oModel.submitChanges({
                                            groupId: "insert",
                                            success: function(oData, oResponse){
                                                //Success
                                                resolve();
                                            },error: function(error){
                                                MessageBox.error(error);
                                                resolve();
                                            }
                                        })
                                    });
                                }

                                await new Promise((resolve, reject) => {
                                    oModel.read('/ZERP_MATTYPSet',{
                                        urlParameters: {
                                            "$filter": "MATTYP eq '" + matTyp + "'"
                                        },
                                        success: function (data, response) {
                                            noRangeCd = data.results[0].BATCHSEQKY;
                                            resolve();
                                        },
                                        error: function (err) {
                                            hasError = true;
                                            resolve();
                                        }
                                    });
                                });

                                if(noRangeCd !== ""){
                                    var prItemInsert;
                                    prItem = prItem + 10
                                    ZERPNorangeKeyParam = {
                                        NORANGECD: noRangeCd,
                                        KEYCD: matNo + batch,
                                        CURRENTNO: "000"
                                    }
                                    oModel.create("/ZERP_NORANGEKEYSet", ZERPNorangeKeyParam, modelParameter);
                                    await new Promise((resolve, reject) => { 
                                        oModel.submitChanges({
                                            groupId: "insert",
                                            success: function(oData, oResponse){
                                                //Success
                                                resolve();
                                            },error: function(error){
                                                MessageBox.error(error);
                                                resolve();
                                            }
                                        })
                                    });
                                    prItemInsert = prItem;
                                    prItemInsert = String(parseInt(prItemInsert));
                                    while(prItemInsert.length < 5) prItemInsert = "0" + prItemInsert.toString();
                                    prCreateSetParam.push({
                                        Tblhdr:     "0000000001",
                                        PreqItem:   prItemInsert, 
                                        DocType:    aData.at(item).DOCTYP, 
                                        PurGroup:   aData.at(item).PURGRP, 
                                        PurchOrg:   aData.at(item).PURORG,
                                        Plant:      aData.at(item).PLANTCD, 
                                        Material:   matNo, 
                                        MatGrp:     aData.at(item).MATGRP, 
                                        Quantity:   aData.at(item).QUANTITY, 
                                        Unit:       aData.at(item).UOM, 
                                        DelivDate:  sapDateFormat.format(new Date(aData.at(item).DELDT)) + "T00:00:00",
                                        Batch:      batch
                                        // FixedVend:  aData.at(item).VENDOR
                                    })
                                }
                                await new Promise(async (resolve, reject) => { 
                                    iCounter++;
                                    if(oSelectedIndices.length === iCounter){
                                        Common.openLoadingDialog(this);
                                        prCreateSetParamSet = {
                                            iv_userid: "",
                                        }
                                        prCreateSetParamMain = prCreateSetParamSet;
                                        prCreateSetParamMain["N_PRHEADER"] = [{
                                            Tblhdr: "0000000001"
                                        }];
                                        prCreateSetParamMain["N_PRITEMS"] = prCreateSetParam;
                                        prCreateSetParamMain["N_PRITEMTEXT"] = [];
                                        prCreateSetParamMain["N_PRRETURN"] = [];
                                        
                                        await new Promise((resolve, reject)=>{
                                            rFcModel.create("/PRCreateSet", prCreateSetParamMain, {
                                                method: "POST",
                                                success: function(oData, oResponse){
                                                    prCreationMessage = oData.N_PRRETURN.results[0].Message;
                                                    errTyp = oData.N_PRRETURN.results[0].Type;
                                                    resolve();
                                                },error: function(error){
                                                    MessageBox.error("Error Occured while Creation of PR");
                                                    resolve()
                                                }
                                            })
                                        })
                                        Common.closeLoadingDialog(this);
                                        if(prCreationMessage !== ""){
                                            MessageBox.information(prCreationMessage);
                                        }

                                        if(errTyp === "I"){
                                            me.getView().byId("DOCTYP").setValue("");
                                            me.getView().byId("PRNO").setValue("");
                                            me.getView().byId("PURGRP").setValue("");
                                            me.getView().byId("PLANTCD").setValue("");
                                            me.getView().byId("CUSTGRP").setValue("");
                                            me.getView().byId("SALESGRP").setValue("");
                                            me.getView().byId("REQSTNR").setValue("");

                                            me.getView().getModel("PRDetDataModel").setProperty("/results", []);
                                            await me.setTableData('prDetTable')

                                            me.byId("DOCTYP").setEnabled(true);
                                            me.byId("PURGRP").setEnabled(true);
                                            me.byId("PLANTCD").setEnabled(true);
                                            me.byId("CUSTGRP").setEnabled(true);
                                            me.byId("SALESGRP").setEnabled(true);
                                        }
                                        resolve();
                                    }
                                    resolve();
                                });
                            }
                        })
                    }else{
                        MessageBox.error("No PR Details to Save.");
                    }
                }
            },

            cancelHeaderEdit: async function(){
                var actionSel;
                var bCompact = !!this.getView().$().closest(".sapUiSizeCompact").length;
                await new Promise((resolve, reject) => {
                    MessageBox.warning(
                        "Discard Changes?",
                        {
                            actions: ["Yes", "Cancel"],
                            styleClass: bCompact ? "sapUiSizeCompact" : "",
                            onClose: function(sAction) {
                                actionSel = sAction;
                                resolve(actionSel);
                            }
                        }
                    );
                });
                if(actionSel === "Yes"){
                    this.getView().byId("DOCTYP").setValue("");
                    this.getView().byId("PRNO").setValue("");
                    this.getView().byId("PURGRP").setValue("");
                    this.getView().byId("PLANTCD").setValue("");
                    this.getView().byId("CUSTGRP").setValue("");
                    this.getView().byId("SALESGRP").setValue("");
                    this.getView().byId("REQSTNR").setValue("");

                    this.getView().getModel("PRDetDataModel").setProperty("/results", []);
                    await this.setTableData('prDetTable')

                    this.byId("DOCTYP").setEnabled(true);
                    this.byId("PURGRP").setEnabled(true);
                    this.byId("PLANTCD").setEnabled(true);
                    this.byId("CUSTGRP").setEnabled(true);
                    this.byId("SALESGRP").setEnabled(true);

                    var oHistory = History.getInstance();
                    var sPreviousHash = oHistory.getPreviousHash();

                    if (sPreviousHash !== undefined) {
                        window.history.go(-1);
                    } else {
                        var oRouter = this.getOwnerComponent().getRouter();
                        oRouter.navTo("main", {}, true);
                    }
                }else{
                    MessageBox.Action.CLOSE
                }
            }

        });
    });
