sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    'sap/m/MessageBox',
    "../js/Common",
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, JSONModel, MessageBox, Common) {
        "use strict";

        var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({pattern : "MM/dd/yyyy" });
        var sapDateFormat = sap.ui.core.format.DateFormat.getDateInstance({pattern : "yyyy-MM-dd" });

        return Controller.extend("zuipr.controller.ManualPR", {
            onInit: function () {
                var that = this;
                var oModel = new sap.ui.model.json.JSONModel();
                this._onBeforeDetailData = []
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
                var docTypVal = this.getView().byId("DOCTYP").getValue();
                var purGrpVal = this.getView().byId("PURGRP").getValue();
                var purPlantVal = this.getView().byId("PLANTCD").getValue();
                var custGrpVal = this.getView().byId("CUSTGRP").getValue();
                var salesGrpVal = this.getView().byId("SALESGRP").getValue();
                
                // if(docTypVal === "" && purGrpVal === "" && purPlantVal === "" && custGrpVal === "" && salesGrpVal === ""){
                //     MessageBox.error("Above Field is Required!");
                //     return
                // }

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
                    console.log(aDataRes)

                    this.getView().getModel("PRDetDataModel").setProperty("/results", aDataRes);
                    await this.setTableData('prDetTable');
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
                                            id: "col-" + sColumnName,
                                            type: "Text",
                                            value: "{path: '" + ci.ColumnName + "', mandatory: '"+ ci.Mandatory +"'}",
                                            maxLength: +ci.Length,
                                            showValueHelp: false,
                                            liveChange: this.onInputLiveChange.bind(this)
                                        }));
                                    }else{
                                        col.setTemplate(new sap.m.Input({
                                            id: "col-" + sColumnName,
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
                                        id: "col-" + sColumnName,
                                        value: "{path: '" + ci.ColumnName + "', mandatory: '"+ ci.Mandatory +"'}",
                                        displayFormat:"short",
                                        change:"handleChange",
                                    
                                        liveChange: this.onInputLiveChange.bind(this)
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
                console.log(oEvent.getSource().getId())
                if(oEvent.getSource().getId().includes("MATNO")){
                    var matNo = oEvent.getParameters().value;
                    var oRow = this.getView().getModel("PRDetDataModel").getProperty(sRowPath);
                    await new Promise((resolve, reject) => { 
                        oModelFilter.read('/ZVB_3DERP_PR_MATNO_SH',{
                            success: async function (data, response) {
                                console.log(data)
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

                console.log(fieldName)

                if(fieldName === 'DOCTYP'){
                    await new Promise((resolve, reject) => { 
                        oModelFilter.read('/ZVB_3DERP_PRDOCTYPE_SH',{
                            success: function (data, response) {
                                console.log(data)
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
                                console.log(data)
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
                                console.log(data)
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
                                console.log(data)
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
                                console.log(data)
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
                                    if(item.SBU === vSBU){
                                        item.Item = item.BATCH;
                                        item.Desc = item.Description;
                                        dataResult.push(item);
                                    }
                                })
                                valueHelpObjects = data.results;
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
                                console.log(dataResult)
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
                                    console.log(data)
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

            onSaveHeader: async function(){
                var me = this;
                var oTable = this.byId("prDetTable");
                var oSelectedIndices = oTable.getBinding("rows").aIndices;
                var oTmpSelectedIndices = [];
                var aData = oTable.getModel().getData().rows;

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

                oSelectedIndices.forEach(item => {
                    oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
                })
                oSelectedIndices = oTmpSelectedIndices;

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
                            // console.log(ZERPMatBatchParam);
                            oModel.create("/ZERP_MATBATCHSet", ZERPMatBatchParam, modelParameter);
                            await new Promise((resolve, reject) => { 
                                oModel.submitChanges({
                                    groupId: "insert",
                                    success: function(oData, oResponse){
                                        console.log(oData)
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
                                        console.log(oData)
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
                                resolve();
                            }
                            resolve();
                        });
                    }
                    

                })
            }

        });
    });
