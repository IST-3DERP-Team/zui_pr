sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    'sap/m/MessageBox',
    "../js/Common",
    "sap/ui/core/ValueState",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/core/routing/History",
    "../js/TableFilter",
	"../js/TableValueHelp",
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, JSONModel, MessageBox, Common, ValueState, Filter, FilterOperator, History, TableFilter, TableValueHelp) {
        "use strict";
        
        var that;
        var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({pattern : "MM/dd/yyyy" });
        var sapDateFormat = sap.ui.core.format.DateFormat.getDateInstance({pattern : "yyyy-MM-dd" });

        return Controller.extend("zuipr.controller.ManualPR", {
            onInit: function () {
                that = this;
                var _oModel = new sap.ui.model.json.JSONModel();
                this._validationErrors = []
                _oModel.loadData("/sap/bc/ui2/start_up").then(() => {
                    this._userid = _oModel.oData.id;
                })
                this.getView().setModel(new JSONModel({results: []}), "PRDetDataModel");
                this.getView().setModel(new JSONModel(), "headerData");
                
                //table Filter
                this._aColumns = {};
                this._tableFilter = TableFilter;
                this._colFilters = {};

                //table ValueHelp and ValueHelp
                this._tableValueHelp = TableValueHelp; 
			    this._tblColumns = {};


                //Initialize router
                var _oComponent = this.getOwnerComponent();
                this._router = _oComponent.getRouter();
                this._router.getRoute("ManualPR").attachPatternMatched(this._routePatternMatched, this);

                this._tblIndex = null;
                this._purOrg = null;
                this._suggestionPurPlantHasValue = false;

                //OnRow Edit Increment Count
                this._tblOnRowEditincCount = 0;
                this.callCaptionsAPI();

            },

            _routePatternMatched: async function (oEvent) {
                Common.openLoadingDialog(this);
                this._sbu = oEvent.getParameter("arguments").SBU; //get SBU from route pattern
                this.getView().setModel(new JSONModel(this.getOwnerComponent().getModel("CAPTION_MSGS_MODEL").getData().text), "ddtext");
                
                //disable Ship To Plant Details on load
                this.byId("SHIPTOPLANT").setEnabled(false);
                
                //Load Data
                await this.loadAllData();
                Common.closeLoadingDialog(this);
            },
            loadAllData: async function(){
                await this.getColumnProp();
                await this.getHeaderConfig();

                await this.getDynamicTableColumns();

                await this.onSuggestionItems();

                // await new Promise((resolve, reject)=>{
                //     resolve(this.handleSuggestions())
                // });
                this.setReqField();
            },

            // setReqField() {
            //     // if (pType == "header") {
            //     var fields = ["feDOCTYP", "fePURGRP", "fePLANTCD", "feCUSTGRP", "feSALESGRP"];
            //     var label = "";
            //     fields.forEach(id => {
            //         label = this.byId(id).getLabel().replace("*", "")
            //         this.byId(id).setLabel("*" + label);
            //         this.byId(id)._oLabel.addStyleClass("requiredField");
            //         // if (pEditable) {
            //         //     this.byId(id).setLabel("*" + this.byId(id).getLabel());
            //         //     this.byId(id)._oLabel.addStyleClass("requiredField");
            //         // } else {
            //         //     this.byId(id).setLabel(this.byId(id).getLabel().replaceAll("*", ""));
            //         //     this.byId(id)._oLabel.removeStyleClass("requiredField");
            //         // }
            //     })
            //     // } else {
            //     //     var oTable = this.byId(pType + "Tab");

            //     //     oTable.getColumns().forEach((col, idx) => {
            //     //         if (col.getLabel().getText().includes("*")) {
            //     //             col.getLabel().setText(col.getLabel().getText().replaceAll("*", ""));
            //     //         }

            //     //         this._aColumns[pType].filter(item => item.label === col.getLabel().getText())
            //     //             .forEach(ci => {
            //     //                 if (ci.required) {
            //     //                     col.getLabel().removeStyleClass("requiredField");
            //     //                 }
            //     //             })
            //     //     })
            //     // }
            // },

            handleFormValueHelp: function (oEvent) {
                TableValueHelp.handleFormValueHelp(oEvent, this);
            },

            formatValueHelp: function(sValue, sPath, sKey, sText, sFormat) {
                if(this.getView().getModel(sPath) !== undefined){
                    if(this.getView().getModel(sPath).getData().length > 0){
                        var oValue = this.getView().getModel(sPath).getData().filter(v => v[sKey] === sValue);
                        if (oValue && oValue.length > 0) {
                            if (sFormat === "Value") {
                                return oValue[0][sText];
                            }
                            else if (sFormat === "ValueKey") {
                                if(oValue[0][sText]===undefined)
                                    return "(" + sValue + ")";
                                else
                                    return oValue[0][sText] + " (" + sValue + ")";
                            }
                            else if (sFormat === "KeyValue") {
                                return sValue + " (" + oValue[0][sText] + ")";
                            }
                            else {
                                return sValue;
                            }
                        }
                        else return sValue;
                    }else return sValue;
                }
                
            },

            setReqField: function(){
                var me = this;
                var oView = this.getView();
                var formView = this.getView().byId("SalesDocHeaderForm1"); //Form View
                var formContainers = formView.getFormContainers(); // Form Container
                var formElements = ""; //Form Elements
                var formFields = ""; // Form Field
                var formElementsIsVisible = false; //is Form Element Visible Boolean
                var fieldIsEditable = false; // is Field Editable Boolean
                var fieldMandatory = ""; // Field Mandatory variable
                var fieldIsMandatory = false; // Is Field Mandatory Boolean
                var oMandatoryModel = oView.getModel("MandatoryFieldsData").getProperty("/");
                var label = "";
                //Form Validations
                //Iterate Form Containers
                for (var index in formContainers) {
                    formElements = formContainers[index].getFormElements(); //get Form Elements

                    //iterate Form Elements
                    for (var elementIndex in formElements) {
                        formElementsIsVisible = formElements[elementIndex].getProperty("visible"); //get the property Visible of Element
                        if (formElementsIsVisible) {
                            formFields = formElements[elementIndex].getFields(); //get FIelds in Form Element

                            //Iterate Fields
                            for (var formIndex in formFields) {
                                fieldMandatory = formFields[formIndex].getBindingInfo("value") === undefined ? "" : formFields[formIndex].getBindingInfo("value").mandatory;
                                fieldIsMandatory = oMandatoryModel[fieldMandatory] === undefined ? false : oMandatoryModel[fieldMandatory];

                                if (fieldIsMandatory) {
                                    label = formElements[elementIndex].getLabel().replace("*", "");
                                    formElements[elementIndex].setLabel("*" + label);
                                    formElements[elementIndex]._oLabel.addStyleClass("requiredField");
                                }
                            }
                        }
                    }

                }
            },

            getHeaderConfig: async function () {
                var me = this;
                var oView = this.getView();
                var oModel = this.getOwnerComponent().getModel();
                var oJSONModel1 = new JSONModel();
                var oJSONModel2 = new JSONModel();
                var oJSONModel3 = new JSONModel();

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
                            var mandatoryFields = {};
                            //get only visible fields
                            for (var i = 0; i < oData.results.length; i++) {
                                visibleFields[oData.results[i].ColumnName] = oData.results[i].Visible;
                                editableFields[oData.results[i].ColumnName] = oData.results[i].Editable;
                                mandatoryFields[oData.results[i].ColumnName] = oData.results[i].Mandatory;
                            }
                            var JSONVisibleFieldsdata = JSON.stringify(visibleFields);
                            var JSONVisibleFieldsparse = JSON.parse(JSONVisibleFieldsdata);
                            oJSONModel1.setData(JSONVisibleFieldsparse);
                            oView.setModel(oJSONModel1, "VisibleFieldsData");


                            var JSONEditableFieldsdata = JSON.stringify(editableFields);
                            var JSONEditableFieldsparse = JSON.parse(JSONEditableFieldsdata);
                            oJSONModel2.setData(JSONEditableFieldsparse);
                            oView.setModel(oJSONModel2, "EditableFieldsData");

                            var JSONMandatoryFieldsdata = JSON.stringify(mandatoryFields);
                            var JSONMandatoryFieldsparse = JSON.parse(JSONMandatoryFieldsdata);
                            oJSONModel3.setData(JSONMandatoryFieldsparse);
                            oView.setModel(oJSONModel3, "MandatoryFieldsData");
                            resolve();
                        },
                        error: function (err) {
                            MessageBox.error(me.getView().getModel("captionMsg").getData()["INFO_ERROR"]);
                            resolve();
                        }
                    });
                })

            },
            getDynamicTableColumns: async function () {
                var me = this;

                //get dynamic columns based on saved layout or ZERP_CHECK
                var oJSONColumnsModel = new JSONModel();
                this.oJSONModel = new JSONModel();
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
                            me._aColumns["prDetTable"] = oData.results;
                            oJSONColumnsModel.setData(oData);
                            me.oJSONModel.setData(oData);
                            me.getView().setModel(oJSONColumnsModel, "PRDetColModel");  //set the view model
                            me.setTableData('prDetTable')
                            resolve();
                        },
                        error: function (err) {
                            MessageBox.error(me.getView().getModel("captionMsg").getData()["INFO_ERROR"]);
                            resolve();
                        }
                    });
                })
            },

            onPRDetAdd: async function(){
                var me = this;
                var bProceed = true;

                var headerData = this.getView().getModel("headerData").getData();
                var docTypVal = headerData.DOCTYP;//this.getView().byId("DOCTYP").getValue();
                var purGrpVal = headerData.PURGRP;//this.getView().byId("PURGRP").getValue();
                var purPlantVal = headerData.PLANTCD;//this.getView().byId("PLANTCD").getValue();
                var custGrpVal = headerData.CUSTGRP;//this.getView().byId("CUSTGRP").getValue();
                var salesGrpVal = headerData.SALESGRP;//this.getView().byId("SALESGRP").getValue();
                var shipToPlant = headerData.SHIPTOPLANT;//this.getView().byId("SHIPTOPLANT").getValue();

                //Init Validation Errors Object
                this._validationErrors = [];
                var oView = this.getView();
                var formView = this.getView().byId("SalesDocHeaderForm1"); //Form View
                var formContainers = formView.getFormContainers(); // Form Container
                var formElements = ""; //Form Elements
                var formFields = ""; // Form Field
                var formElementsIsVisible = false; //is Form Element Visible Boolean
                var fieldIsEditable = false; // is Field Editable Boolean
                var fieldMandatory = ""; // Field Mandatory variable
                var fieldIsMandatory = false; // Is Field Mandatory Boolean
                var oMandatoryModel = oView.getModel("MandatoryFieldsData").getProperty("/");

                //Form Validations
                //Iterate Form Containers
                for (var index in formContainers) {
                    formElements = formContainers[index].getFormElements(); //get Form Elements

                    //iterate Form Elements
                    for (var elementIndex in formElements) {
                        formElementsIsVisible = formElements[elementIndex].getProperty("visible"); //get the property Visible of Element
                        if (formElementsIsVisible) {
                            formFields = formElements[elementIndex].getFields(); //get FIelds in Form Element

                            //Iterate Fields
                            for (var formIndex in formFields) {
                                fieldMandatory = formFields[formIndex].getBindingInfo("value") === undefined ? "" : formFields[formIndex].getBindingInfo("value").mandatory;

                                fieldIsMandatory = oMandatoryModel[fieldMandatory] === undefined ? false : oMandatoryModel[fieldMandatory];

                                if (fieldIsMandatory) {
                                    fieldIsEditable = formFields[formIndex].getProperty("editable"); //get the property Editable of Fields
                                    if (fieldIsEditable) {
                                        if (formFields[formIndex].getValue() === "" || formFields[formIndex].getValue() === null || formFields[formIndex].getValue() === undefined) {
                                            formFields[formIndex].setValueState("Error");
                                            formFields[formIndex].setValueStateText("Required Field!");
                                            me._validationErrors.push(formFields[formIndex].getId())
                                            bProceed = false;
                                        } else {
                                            if(formFields[formIndex].getSuggestionItems().length > 0){
                                                formFields[formIndex].getSuggestionItems().forEach(item => {
                                                    if (item.getProperty("key") === formFields[formIndex].getSelectedKey() || item.getProperty("key") === formFields[formIndex].getValue().trim()) {
                                                        formFields[formIndex].setValueState("None");
                                                        me._validationErrors.forEach((item, index) => {
                                                            if (item === formFields[formIndex].getId()) {
                                                                me._validationErrors.splice(index, 1)
                                                            }
                                                        })
                                                    }
                                                })
                                            }else{
                                                formFields[formIndex].setValueState("None");
                                                me._validationErrors.forEach((item, index) => {
                                                    if (item === formFields[formIndex].getId()) {
                                                        me._validationErrors.splice(index, 1)
                                                    }
                                                })
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                }

                if (this._validationErrors.length > 0) {
                    MessageBox.error(this.getView().getModel("captionMsg").getData()["INFO_FILL_REQUIRED_FIELDS"]);
                    bProceed = false;
                }
                
                if(bProceed){
                    //Set Header Inputs to "ENABLED: FALSE"
                    for (var index in formContainers) {
                        formElements = formContainers[index].getFormElements(); //get Form Elements

                        //iterate Form Elements
                        for (var elementIndex in formElements) {
                            formElementsIsVisible = formElements[elementIndex].getProperty("visible"); //get the property Visible of Element
                            if (formElementsIsVisible) {
                                formFields = formElements[elementIndex].getFields(); //get FIelds in Form Element

                                //Iterate Fields
                                for (var formIndex in formFields) {
                                    if(me._validationErrors.length === 0){
                                        formFields[formIndex].setEnabled(false);
                                    }
                                }
                            }
                        }

                    }
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
                        SHIPTOPLANT: shipToPlant,
                        DELDT:  dateFormat.format(new Date())
                    }
                    detailsItemObj.push(newInsertField);

                    this.getView().getModel("PRDetDataModel").setProperty("/results", detailsItemObj);
                    TableFilter.applyColFilters("prDetTable", me);
                    Common.openLoadingDialog(this);
                    await new Promise(async (resolve) => {
                        await this.onSuggestionItems_PurOrg();
                        this.setTableData('prDetTable');
                        await this.onRowEdit('prDetTable', 'PRDetColModel');
                        resolve();
                    });
                    Common.closeLoadingDialog(this);
                }
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
                    chkData = this.getView().getModel("PRDetDataModel").getProperty("/results");
                    this.setTableData('prDetTable');

                    if(chkData.length === 0){
                        // this.byId("DOCTYP").setEnabled(true);
                        // this.byId("PURGRP").setEnabled(true);
                        // this.byId("PLANTCD").setEnabled(true);
                        // this.byId("CUSTGRP").setEnabled(true);
                        // this.byId("SALESGRP").setEnabled(true);

                        //Init Validation Errors Object
                        this._validationErrors = [];
                        var oView = this.getView();
                        var formView = this.getView().byId("SalesDocHeaderForm1"); //Form View
                        var formContainers = formView.getFormContainers(); // Form Container
                        var formElements = ""; //Form Elements
                        var formFields = ""; // Form Field
                        var formElementsIsVisible = false; //is Form Element Visible Boolean
                        var fieldIsEditable = false; // is Field Editable Boolean

                        //Form Validations
                        //Iterate Form Containers
                        for (var index in formContainers) {
                            formElements = formContainers[index].getFormElements(); //get Form Elements

                            //iterate Form Elements
                            for (var elementIndex in formElements) {
                                formElementsIsVisible = formElements[elementIndex].getProperty("visible"); //get the property Visible of Element
                                if (formElementsIsVisible) {
                                    formFields = formElements[elementIndex].getFields(); //get FIelds in Form Element

                                    //Iterate Fields
                                    for (var formIndex in formFields) {
                                        fieldIsEditable = formFields[formIndex].getProperty("editable"); //get the property Editable of Fields
                                        if (fieldIsEditable) {
                                            formFields[formIndex].setEnabled(true);
                                        }
                                    }
                                }
                            }

                        }

                    }
                    Common.openLoadingDialog(this);
                    await new Promise(async (resolve)=>{
                        await this.onRowEdit('prDetTable', 'PRDetColModel');
                        resolve();
                    });
                    Common.closeLoadingDialog(this);
                }
            },
            setTableData: function(table){
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
                        label: new sap.m.Text({text: sColumnLabel}), //"{i18n>" + sColumnId + "}",
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

                //date/number sorting
                oDetTable.attachSort(function(oEvent) {
                    var sPath = oEvent.getParameter("column").getSortProperty();
                    var bDescending = false;
                    
                    //remove sort icon of currently sorted column
                    oDetTable.getColumns().forEach(col => {
                        if (col.getSorted()) {
                            col.setSorted(false);
                        }
                    })

                    oEvent.getParameter("column").setSorted(true); //sort icon initiator

                    if (oEvent.getParameter("sortOrder") === "Descending") {
                        bDescending = true;
                        oEvent.getParameter("column").setSortOrder("Descending") //sort icon Descending
                    }
                    else {
                        oEvent.getParameter("column").setSortOrder("Ascending") //sort icon Ascending
                    }

                    var oSorter = new sap.ui.model.Sorter(sPath, bDescending ); //sorter(columnData, If Ascending(false) or Descending(True))
                    var oColumn = columnsData.filter(fItem => fItem.ColumnName === oEvent.getParameter("column").getProperty("sortProperty"));
                    var columnType = oColumn[0].DataType;

                    if (columnType === "DATETIME") {
                        oSorter.fnCompare = function(a, b) {
                            // parse to Date object
                            var aDate = new Date(a);
                            var bDate = new Date(b);

                            if (bDate === null) { return -1; }
                            if (aDate === null) { return 1; }
                            if (aDate < bDate) { return -1; }
                            if (aDate > bDate) { return 1; }

                            return 0;
                        };
                    }
                    else if (columnType === "NUMBER") {
                        oSorter.fnCompare = function(a, b) {
                            // parse to Date object
                            var aNumber = +a;
                            var bNumber = +b;

                            if (bNumber === null) { return -1; }
                            if (aNumber === null) { return 1; }
                            if (aNumber < bNumber) { return -1; }
                            if (aNumber > bNumber) { return 1; }

                            return 0;
                        };
                    }
                    
                    oTable.getBinding('rows').sort(oSorter);
                    // prevent internal sorting by table
                    oEvent.preventDefault();
                });

                //bind the data to the table
                oDetTable.bindRows("/rows");
                
                TableFilter.updateColumnMenu(table, me);
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
            onRowEdit: async function(table, model){
                var me = this;
                // this.getView().getModel(model).getData().results.forEach(item => item.Edited = false);
                var oTable = this.byId(table);

                var oColumnsModel = this.getView().getModel(model);
                var oColumnsData = oColumnsModel.getProperty('/results');
                var count = 0;
                await new Promise((resolve, reject)=>{
                    oTable.getColumns().forEach((col, idx) => {
                        count++;
                        oColumnsData.filter(item => item.ColumnName === col.sId.split("-")[1])
                        .forEach(ci => {
                            me._tblOnRowEditincCount++;
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
                                    // col.setTemplate(new sap.m.Input({
                                    //     id: "col"+ me._tblOnRowEditincCount +"-" + sColumnName,
                                    //     type: "Text",
                                    //     value: "{path: '" + ci.ColumnName + "', mandatory: '"+ ci.Mandatory +"'}",
                                    //     maxLength: +ci.Length,
                                    //     showValueHelp: true,
                                    //     valueHelpRequest: this.handleValueHelp.bind(this),
                                    //     liveChange: this.onInputLiveChange.bind(this),
                                    //     showSuggestion: true,
                                    //     suggestionItemSelected: this.onSuggestionItemSelected.bind(this),
                                    //     suggestionItems: await this.onInputSuggestionItems(sColumnName)
                                    // }));
                                    if(sColumnName === "SHORTTEXT" || sColumnName === "UOM" || sColumnName === "MATGRP" || sColumnName === "MATTYP"){
                                        col.setTemplate(new sap.m.Input({
                                            id: "col"+ me._tblOnRowEditincCount +"-" + sColumnName,
                                            type: "Text",
                                            value: "{path: '" + ci.ColumnName + "', mandatory: '"+ ci.Mandatory +"'}",
                                            enabled: false,
                                            change: this.onInputLiveChange.bind(this)
                                        }));
                                    }else{
                                        col.setTemplate(new sap.m.Input({
                                            id: "col"+ me._tblOnRowEditincCount +"-" + sColumnName,
                                            type: "Text",
                                            value: {
                                                parts: [
                                                    { path: ci.ColumnName }, 
                                                    { value: "onSugg" + ci.ColumnName }, 
                                                    { value: 'Item' }, 
                                                    { value: 'Desc' }, 
                                                    { value: 'Other' }
                                                ],
                                                formatter: this.formatValueHelp.bind(this),
                                                mandatory: ci.Mandatory
                                            },
                                            // value: "{path: '" + ci.ColumnName + "', mandatory: '" + ci.Mandatory + "'}",
                                            // maxLength: +ci.Length,
                                            textFormatMode: 'Key',
                                            showValueHelp: true,
                                            valueHelpRequest: TableValueHelp.handleTableValueHelp.bind(this),//this.handleValueHelp.bind(this),
                                            showSuggestion: true,
                                            suggestionItems: {
                                                path: 'onSugg' + ci.ColumnName + '>/',
                                                length: 10000,
                                                template: new sap.ui.core.ListItem({
                                                    key: '{onSugg' + ci.ColumnName + '>Item}',
                                                    text: '{onSugg' + ci.ColumnName + '>Desc}',
                                                    additionalText: '{onSugg' + ci.ColumnName + '>Item}'
                                                }),
                                                templateShareable: false
                                            },
                                            maxSuggestionWidth: "160px",
                                            change: this.onInputLiveChangeSuggestion.bind(this)
                                        }));
                                    }
                                }else if (sColumnType === "DATETIME"){
                                    col.setTemplate(new sap.m.DatePicker({
                                        id: "col-" + sColumnName,
                                        value: "{path: '" + ci.ColumnName + "', mandatory: "+ ci.Mandatory +"}",
                                        displayFormat:"short",
                                        change: this.onInputLiveChange.bind(this)
                                    }));
                                }else if (sColumnType === "NUMBER"){
                                    col.setTemplate(new sap.m.Input({
                                        id: "col-" + sColumnName,
                                        type: sap.m.InputType.Number,
                                        value: "{path:'" + ci.ColumnName + "', mandatory: "+ ci.Mandatory +", type:'sap.ui.model.type.Decimal', formatOptions:{ minFractionDigits:" + null + ", maxFractionDigits:" + null + " }, constraints:{ precision:" + ci.Decimal + ", scale:" + null + " }}",
    
                                        maxLength: +ci.Length,
    
                                        liveChange: this.onNumberLiveChange.bind(this)
                                    }));
                                }
                            }
                        });
                    });

                    if(oTable.getColumns().length === count){
                        resolve();
                    }
                })
                
            },

            onInputSuggestionItems: async function(colName){
                var me = this;
                var vSBU = this._sbu;
                var purPlantVal = this.getView().byId("PLANTCD").getValue();

                var oModelFilter = this.getOwnerComponent().getModel('ZVB_3DERP_PRM_FILTERS_CDS');
                var oJSONModel = new JSONModel();

                var returnData; 

                if(colName === "SEASONCD"){
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
                                oJSONModel.setData(dataResult)

                                resolve(me.getView().setModel(oJSONModel, "mPRDetSEASONCD"));
                                // suggestionData = dataResult;
                            },
                            error: function (err) {
                                resolve();
                            }
                        });
                    });
                    returnData = {
                        path: 'mPRDetSEASONCD>/',
                        template: new sap.ui.core.Item({
                            key: "{mPRDetSEASONCD>Item}",
                            text: "{mPRDetSEASONCD>Item} - {mPRDetSEASONCD>Desc}"
                        }),
                        templateShareable: true 
                    }
                }

                if(colName === "PURORG"){
                    await new Promise((resolve, reject) => {
                        oModelFilter.read('/ZVB_3DERP_PR_PURORG_SH',{
                            success: function (data, response) {
                                var dataResult = [];
                                data.results.forEach(item=>{
                                    if(item.PurchPlant === purPlantVal){
                                        item.Item = item.PURORG;
                                        dataResult.push(item);
                                    }
                                })
                                oJSONModel.setData(dataResult)
                                resolve(me.getView().setModel(oJSONModel, "mPRDetPURORG"));
                            },
                            error: function (err) {
                                resolve();
                            }
                        });
                    });
                    returnData = {
                        path: 'mPRDetPURORG>/',
                        template: new sap.ui.core.Item({
                            key: "{mPRDetPURORG>Item}",
                            text: "{mPRDetPURORG>Item}"
                        }),
                        templateShareable: true 
                    }
                }

                if(colName === "SUPTYP"){
                    await new Promise((resolve, reject) => {
                        oModelFilter.read('/ZVB_3DERP_MPRSUPTYP_SH',{
                            success: function (data, response) {
                                data.results.forEach(item=>{
                                    item.Item = item.SUPTYP;
                                    item.Desc = item.Description;
                                })

                                oJSONModel.setData(data.results)
                                resolve(me.getView().setModel(oJSONModel, "mPRDetSUPTYP"));
                            },
                            error: function (err) {
                                resolve();
                            }
                        });
                    });
                    returnData = {
                        path: 'mPRDetSUPTYP>/',
                        template: new sap.ui.core.Item({
                            key: "{mPRDetSUPTYP>Item}",
                            text: "{mPRDetSUPTYP>Item} - {mPRDetSUPTYP>Desc}"
                        }),
                        templateShareable: true 
                    }
                }

                if(colName === "VENDOR"){
                    await new Promise((resolve, reject) => {
                        oModelFilter.read('/ZVB_3DERP_PR_VENDOR_SH',{
                            success: function (data, response) {
                                var dataResult = [];
                                data.results.forEach(item=>{
                                    while (item.VENDOR.length < 10) item.VENDOR = "0" + item.VENDOR;
                                    item.Item = item.VENDOR;
                                    item.Desc = item.Description;
                                })

                                oJSONModel.setData(data.results)
                                resolve(me.getView().setModel(oJSONModel, "mPRDetVENDOR"));
                            },
                            error: function (err) {
                                resolve();
                            }
                        });
                    });
                    returnData = {
                        path: 'mPRDetVENDOR>/',
                        template: new sap.ui.core.Item({
                            key: "{mPRDetVENDOR>Item}",
                            text: "{mPRDetVENDOR>Item} - {mPRDetVENDOR>Desc}"
                        }),
                        templateShareable: true 
                    }
                }

                if(colName === "BATCH"){
                    await new Promise((resolve, reject) => {
                        oModelFilter.read('/ZVB_3DERP_PR_BATCH_SH',{
                            success: function (data, response) {
                                var dataResult = [];
                                data.results.forEach(item=>{
                                    if(item.BATCH !== ""){
                                        if(item.SBU === vSBU){
                                            item.Item = item.BATCH;
                                            item.Desc = item.Description;
                                            item.Desc2 = item.OrderNo;
                                            dataResult.push(item);
                                        }
                                        if(item.SBU == ""){
                                            item.SBU = vSBU
                                            item.Item = item.BATCH;
                                            item.Desc = item.Description;
                                            item.Desc2 = item.OrderNo;
                                            dataResult.push(item);
                                        }
                                    }
                                })

                                oJSONModel.setData(data.results)
                                resolve(me.getView().setModel(oJSONModel, "mPRDetBATCH"));
                            },
                            error: function (err) {
                                resolve();
                            }
                        });
                    });
                    returnData = {
                        path: 'mPRDetBATCH>/',
                        template: new sap.ui.core.Item({
                            key: "{mPRDetBATCH>Item}",
                            text: "{mPRDetBATCH>Item} - {mPRDetBATCH>Desc}"
                        }),
                        templateShareable: true 
                    }
                }

                return returnData;
            },

            onInputLiveChangeSuggestion: async function(oEvent){
                var oSource = oEvent.getSource();
                var isInvalid = !oSource.getSelectedKey() && oSource.getValue().trim();
                var oMandatoryModel = this.getView().getModel("MandatoryFieldsData").getProperty("/");
                oSource.setValueState(isInvalid ? "Error" : "None");
                oSource.setValueStateText("Invalid Entry");
                if(oSource.getId().includes("PLANTCD")){
                    var oValue = this.getView().getModel("headerData").getData().PLANTCD;
                    if(oValue !== undefined || oValue !== "" || oValue !== null){
                        if(oSource.getSelectedKey() !== oValue){
                            var sModel = oSource.getBindingInfo("value").parts[0].model;
                            var sPath = oSource.getBindingInfo("value").parts[0].path;
                            this.getView().getModel(sModel).setProperty("/SHIPTOPLANT", "");
                        }
                        this.getView().byId("SHIPTOPLANT").setEnabled(true);
                    }
                    if(oEvent.getParameters().value === "") {
                        var sModel = oSource.getBindingInfo("value").parts[0].model;
                        var sPath = oSource.getBindingInfo("value").parts[0].path;
                        this.getView().getModel(sModel).setProperty("/SHIPTOPLANT", "");
                        this.getView().byId("SHIPTOPLANT").setEnabled(false);
                    }
                }


                if(oSource.getId().includes("VENDOR")){
                    var oSource = oEvent.getSource();
                    var sRowPath = oSource.oParent.getBindingContext().sPath;
                    var vPurOrg= oEvent.getSource().oParent.oParent.getModel().getProperty(sRowPath + "/PURORG");
                    if(vPurOrg === undefined || vPurOrg === "" || vPurOrg === null){
                        oEvent.getSource().setValue("");
                        MessageBox.error(this.getView().getModel("captionMsg").getData()["INFO_PURORG_REQUIRED"]);
                        isInvalid = false;
                    }

                    // var sRowPath = oSource.oParent.getBindingContext().sPath;
                    // var vPurOrg= oEvent.getSource().oParent.oParent.getModel().getProperty(sRowPath + "/PURORG");
                    // var oValue = this.getView().getModel("headerData").getData().PLANTCD;
                    // if(isInvalid !== undefined || isInvalid !== "" || isInvalid !== null){
                    //     if(oSource.getSelectedKey() !== oValue){
                    //         var sModel = oSource.getBindingInfo("value").parts[0].model;
                    //         var sPath = oSource.getBindingInfo("value").parts[0].path;
                    //         // this.getView().getModel("PRDetDataModel").setProperty(sRowPath + "/VENDOR", "");
                    //     }
                    //     // oSource.getId().includes("VENDOR").setEnabled(true);
                    // }
                    // if(oEvent.getParameters().value === "") {
                    //     var sModel = oSource.getBindingInfo("value").parts[0].model;
                    //     var sPath = oSource.getBindingInfo("value").parts[0].path;
                    //     this.getView().getModel("PRDetDataModel").setProperty(sRowPath + "/VENDOR", "");
                    //     // oSource.getId().includes("VENDOR").setEnabled(false);
                    // }
                }

                if(oSource.getSuggestionItems().length > 0){
                    oSource.getSuggestionItems().forEach(item => {
                        if (item.getProperty("key") === oSource.getSelectedKey() || item.getProperty("key") === oSource.getValue().trim()) {
                            isInvalid = false;
                            oSource.setValueState(isInvalid ? "Error" : "None");
                        }
                        if(oSource.getValue().trim() === item.getProperty("key")){

                            oSource.setSelectedKey(item.getProperty("key"));
                            isInvalid = false;
                            oSource.setValueState(isInvalid ? "Error" : "None");
                        }
                    })
                }else{
                    isInvalid = true;
                    oSource.setValueState(isInvalid ? "Error" : "None");
                    oSource.setValueStateText("Invalid Entry");
                }

                var fieldIsMandatory = oMandatoryModel[oEvent.getSource().getBindingInfo("value").mandatory] === undefined ? false : oMandatoryModel[oEvent.getSource().getBindingInfo("value").mandatory];
                if (fieldIsMandatory) {
                    if (oEvent.getParameters().value === "") {
                        isInvalid = true;
                        oSource.setValueState(isInvalid ? "Error" : "None");
                        oEvent.getSource().setValueStateText("Required Field");
                    }
                }
                if (isInvalid) {
                    this._validationErrors.push(oEvent.getSource().getId());
                }else {
                    if(oEvent.getSource().getParent().getId().includes("prDetTable")){
                        var oInput = oEvent.getSource();
                        var oCell = oInput.getParent();
                        // var oRow = oCell.getBindingContext().getObject();
                        var sPath = oCell.getBindingContext().getPath();
                        var sRowPath = sPath == undefined ? null :"/results/"+ sPath.split("/")[2];
    
                        var sCol = oSource.getBindingInfo("value").parts[0].path;
                        this.getView().getModel("PRDetDataModel").setProperty(sRowPath + "/" + sCol, oSource.getSelectedKey())

                        if(oSource.getId().includes("MATNO")){
                            await this.onInputLiveLoadMatNoTableInformation(oEvent);
                        }
                        if(oSource.getId().includes("PURORG")){
                            this.onSuggestionItems_Vendor(oEvent);
                        }
                    }else{
                        var sModel = oSource.getBindingInfo("value").parts[0].model;
                        var sPath = oSource.getBindingInfo("value").parts[0].path;
                        this.getView().getModel(sModel).setProperty(sPath, oSource.getSelectedKey());
                        if(oSource.getId().includes("PLANTCD")){
                            this.onSuggestionItems_ShipToPlant();
                        }
                    }
                    

                    this._validationErrors.forEach((item, index) => {
                        if (item === oEvent.getSource().getId()) {
                            this._validationErrors.splice(index, 1)
                        }
                    })
                }
            },

            onInputLiveLoadMatNoTableInformation: async function(oEvent){
                var me = this;
                var oTable = this.getView().byId('prDetTable');
                var oModelFilter = this.getOwnerComponent().getModel('ZVB_3DERP_PRM_FILTERS_CDS');
                var oInput = oEvent.getSource();
                var oCell = oInput.getParent();
                // var oRow = oCell.getBindingContext().getObject();
                var sPath = oCell.getBindingContext().getPath();
                var sRowPath = sPath == undefined ? null :"/results/"+ sPath.split("/")[2];
                var matNo = oEvent.getSource().getSelectedKey();

                Common.openLoadingDialog(this);
                await new Promise((resolve, reject) => {
                    oModelFilter.read('/ZVB_3DERP_PR_MATNO_SH',{
                        success: async function (data, response) {
                            data.results.forEach(async item=>{
                                if(item.MATNO === matNo){
                                    me.getView().getModel("PRDetDataModel").setProperty(sRowPath + '/MATNO',item.MATNO);
                                    me.getView().getModel("PRDetDataModel").setProperty(sRowPath + '/UOM',item.UOM);
                                    me.getView().getModel("PRDetDataModel").setProperty(sRowPath + '/SHORTTEXT',item.GMCDescen);
                                    me.getView().getModel("PRDetDataModel").setProperty(sRowPath + '/MATGRP',item.MatGrp);
                                    me.getView().getModel("PRDetDataModel").setProperty(sRowPath + '/MATTYP',item.MatTyp);
                                    // resolve();
                                }else{
                                    me.getView().getModel("PRDetDataModel").setProperty(sRowPath + '/MATNO',matNo);
                                }
                                resolve();
                            })
                        },
                        error: function (err) {
                            resolve();
                        }
                    });
                });
                // Rebind the table rows to reflect changes
                await oTable.getModel("PRDetDataModel").refresh(true);
                await oTable.unbindRows(); // Unbind rows
                await oTable.bindRows("/rows"); // Rebind rows
                Common.closeLoadingDialog(this);

                // Example: Move focus to another column
                var oRow = oInput.getParent(); // Assuming oRow is the row element
                var oCells = oRow.getCells(); // Assuming the cells in the row are accessible directly

                // Assuming you want to move the focus to the next cell in the same row
                var nextColumnIndex = oCells.indexOf(oInput) + 0; // Get the index of the next column
                if (nextColumnIndex < oCells.length) {
                    var oNextInput = oCells[nextColumnIndex]; // Access the next input element or desired UI control

                    // Move focus to the next input element in the same row
                    oNextInput.focus();
                }
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
                        oEvent.getSource().setValueStateText(me.getView().getModel("captionMsg").getData()["INFO_REQUIRED_FIELD"]);
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

                if(oEvent.getSource().getBindingInfo("value").mandatory){
                    if(oEvent.getParameters().value === ""){
                        oEvent.getSource().setValueState("Error");
                        oEvent.getSource().setValueStateText(me.getView().getModel("captionMsg").getData()["INFO_REQUIRED_FIELD"]);
                        this._validationErrors.push(oEvent.getSource().getId());
                    }else{
                        oEvent.getSource().setValueState("None");
                        this._validationErrors.forEach((item, index) => {
                            if (item === oEvent.getSource().getId()) {
                                this._validationErrors.splice(index, 1)
                            }
                        })
                    }
                }else if(!oEvent.getSource().getBindingInfo("value").mandatory){
                    oEvent.getSource().setValueState("None");
                    this._validationErrors.forEach((item, index) => {
                        if (item === oEvent.getSource().getId()) {
                            this._validationErrors.splice(index, 1)
                        }
                    })
                }
                
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

                if(oEvent.getSource().getId().includes("MATNO")){
                    var matNo = oEvent.getParameters().value;
                    var oRow = this.getView().getModel("PRDetDataModel").getProperty(sRowPath);
                    await new Promise((resolve, reject) => {
                        oModelFilter.read('/ZVB_3DERP_PR_MATNO_SH',{
                            success: async function (data, response) {
                                data.results.forEach(async item=>{
                                    if(item.MATNO === matNo){
                                        oRow.MATNO = item.MATNO
                                        oRow.UOM = item.UOM
                                        oRow.SHORTTEXT = item.GMCDescen
                                        oRow.MATGRP = item.MatGrp
                                        oRow.MATTYP = item.MatTyp
                                        
                                        me.setTableData('prDetTable');
                                        await me.onRowEdit('prDetTable', 'PRDetColModel');
                                        resolve();
                                    }else{
                                        oRow.MATNO = matNo
                                    }
                                })
                                resolve();
                            },
                            error: function (err) {
                                resolve();
                            }
                        });
                    });
                }else if(oEvent.getSource().getId().includes("BATCH")){
                    var batch = oEvent.getParameters().value;
                    var oRow = this.getView().getModel("PRDetDataModel").getProperty(sRowPath);
                    var vSBU = this._sbu;
                    // await new Promise((resolve, reject) => {
                    //     oModelFilter.read('/ZVB_3DERP_PR_BATCH_SH',{
                    //         success: async function (data, response) {
                    //             data.results.forEach(item=>{
                    //                 if(item.BATCH !== ""){
                    //                     if(item.SBU === vSBU){
                    //                         if(item.BATCH === batch){
                    //                             oRow.ORDERNO = item.OrderNo
                    //                         }else{
                    //                             oRow.ORDERNO = item.OrderNo
                    //                         }
                    //                     }else{
                    //                         oRow.BATCH = batch;
                    //                     }
                    //                     if(item.SBU == ""){
                    //                         oRow.ORDERNO = item.OrderNo
                    //                     }else{
                    //                         oRow.BATCH = batch;
                    //                     }
                    //                 }
                    //             });
                                
                    //             await me.setTableData('prDetTable');
                    //             await me.onRowEdit('prDetTable', 'PRDetColModel');
                    //             resolve();
                    //         },
                    //         error: function (err) {
                    //             resolve();
                    //         }
                    //     });
                    // });
                }else if(oEvent.getSource().getId().includes("VENDOR")){
                    // this._purOrg = oEvent.getParameters().value;
                    // var oRow = this.getView().getModel("PRDetDataModel").getProperty(sRowPath);
                    // this._purOrg = oRow.PURORG;
                    if(oEvent.getParameters().value.length < 10){
                        oEvent.getSource().setValueState("Error");
                        oEvent.getSource().setValueStateText("Invalid Vendor!");
                        me._validationErrors.push(oEvent.getSource().getId())
                    }else{
                        oEvent.getSource().setValueState("None");
                        me._validationErrors.forEach((item, index) => {
                            if (item === oEvent.getSource().getId()) {
                                me._validationErrors.splice(index, 1)
                            }
                        })
                    }
                    if(this._purOrg === "" || this._purOrg === undefined || this._purOrg === null){
                        MessageBox.error(this.getView().getModel("captionMsg").getData()["INFO_PURORG_REQUIRED"]);
                        var oSource = oEvent.getSource();
                        this._inputSource = oSource;
                        this._suggestionPurPlantHasValue = false;
                        this._inputSource.setValue("");
                        return;
                    }
                }else if(oEvent.getSource().getId().includes("SHIPTOPLANT")){
                    var plantCd = this.getView().byId("PLANTCD").getValue();
                    if(plantCd === "" || plantCd === null || plantCd === undefined){
                        this.getView().byId("PLANTCD").setValueState("Error");
                        this.getView().byId("PLANTCD").setValueStateText("Required Field!");
                        MessageBox.error("Please Select Purchasing Plant First!");
                        var oSource = oEvent.getSource();
                        this._inputSource = oSource;
                        this._suggestionPurPlantHasValue = false;
                        this._inputSource.setValue("");
                        return;
                    }else{
                        if(!this._suggestionPurPlantHasValue){
                            this._suggestionPurPlantHasValue = true;
                            var oJSONModel = new JSONModel();
                            var plantCd = this.getView().byId("PLANTCD").getValue();
                            
                            await new Promise((resolve, reject) => {
                                oModelFilter.read('/ZVB_3DERP_MPRSHIPTOPLNT_SH',{
                                    success: function (data, response) {
                                        var dataResult = [];
                                        data.results.forEach(item=>{
                                            if(plantCd === item.PurchPlant){
                                                item.Item = item.plantcd;
                                                item.Desc = item.Description;
                                                dataResult.push(item);
                                            }
                                        })
                                        
                                        oJSONModel.setData(dataResult)
                                        me.getView().setModel(oJSONModel, "shipToPlantSource");
                                        resolve();
                                    },
                                    error: function (err) {
                                        resolve();
                                    }
                                });
                            });
                        }
                    }
                }else if(oEvent.getSource().getId().includes("PLANTCD")){
                    this._suggestionPurPlantHasValue = false;
                    this.getView().byId("SHIPTOPLANT").setValue("");
                }else{
                    this._purOrg = null;
                }
            },
            onNumberLiveChange: async function(oEvent){
                var me = this
                if(oEvent.getSource().getBindingInfo("value").mandatory){
                    if(oEvent.getParameters().value === ""){
                        oEvent.getSource().setValueState("Error");
                        oEvent.getSource().setValueStateText(me.getView().getModel("captionMsg").getData()["INFO_REQUIRED_FIELD"]);
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

                if(oEvent.getSource().getBindingInfo("value").mandatory){
                    if(oEvent.getParameters().value === ""){
                        oEvent.getSource().setValueState("Error");
                        oEvent.getSource().setValueStateText(me.getView().getModel("captionMsg").getData()["INFO_REQUIRED_FIELD"]);
                        this._validationErrors.push(oEvent.getSource().getId());
                    }else{
                        oEvent.getSource().setValueState("None");
                        this._validationErrors.forEach((item, index) => {
                            if (item === oEvent.getSource().getId()) {
                                this._validationErrors.splice(index, 1)
                            }
                        })
                    }
                }else if(!oEvent.getSource().getBindingInfo("value").mandatory){
                    oEvent.getSource().setValueState("None");
                    this._validationErrors.forEach((item, index) => {
                        if (item === oEvent.getSource().getId()) {
                            this._validationErrors.splice(index, 1)
                        }
                    })
                }
            },

            //Not Used - Standards Applied
            onSuggestionItemSelected: async function(oEvent){
                var oSelectedItem = oEvent.getParameter("selectedItem");
                var sKey = oSelectedItem.getKey();
                var oSource = oEvent.getSource();

                if(oEvent.getSource().getId().includes("VENDOR")){
                    if(sKey.length < 10){
                        oEvent.getSource().setValueState("Error");
                        oEvent.getSource().setValueStateText("Invalid Vendor!");
                        me._validationErrors.push(oEvent.getSource().getId())
                    }else{
                        oEvent.getSource().setValueState("None");
                        me._validationErrors.forEach((item, index) => {
                            if (item === oEvent.getSource().getId()) {
                                me._validationErrors.splice(index, 1)
                            }
                        })
                    }
                }
                this._inputSource = oSource;
                this._inputSource.setValue(sKey);
                oSelectedItem.setText(sKey)
            },
            handleValueHelp: async function(oEvent){
                var me = this;
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
                        oModelFilter.read('/ZVB_3DERP_MPRDOCTYP_SH',{
                            success: function (data, response) {
                                data.results.forEach(item=>{
                                    item.Item = item.DocType;
                                    item.Desc = item.Description;
                                })

                                valueHelpObjects = data.results;
                                title = me.getView().getModel("captionMsg").getData()["DOCTYP"]
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
                                title = me.getView().getModel("captionMsg").getData()["PURCHGRP"]
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
                                title = me.getView().getModel("captionMsg").getData()["PURCHPLANT"]
                                resolve();
                            },
                            error: function (err) {
                                resolve();
                            }
                        });
                    });
                }
                if(fieldName === 'SHIPTOPLANT'){
                    var plantCd = this.getView().byId("PLANTCD").getValue();

                    if(plantCd === "" || plantCd === null || plantCd === undefined){
                        this.getView().byId("PLANTCD").setValueState("Error");
                        this.getView().byId("PLANTCD").setValueStateText("Required Field!");
                        MessageBox.error("Please Select Purchasing Plant First!");
                        return;
                    }else{
                        await new Promise((resolve, reject) => {
                            oModelFilter.read('/ZVB_3DERP_MPRSHIPTOPLNT_SH', {
                                success: function (data, response) {
                                    var dataResult = [];
                                    data.results.forEach(item => {
                                        if(plantCd === item.PurchPlant){
                                            item.Item = item.plantcd;
                                            item.Desc = item.Description;
                                            dataResult.push(item)
                                        }
                                    })

                                    valueHelpObjects = dataResult;
                                    title = me.getView().getModel("captionMsg").getData()["SHIPTOPLANT"]
                                    resolve();
                                },
                                error: function (err) {
                                    resolve();
                                }
                            });
                        });

                    }
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
                                title = me.getView().getModel("captionMsg").getData()["CUSTGRP"]
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
                                title = me.getView().getModel("captionMsg").getData()["SALESGRP"]
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
                                title = me.getView().getModel("captionMsg").getData()["MATNO"]
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
                                            item.Desc2 = item.OrderNo;
                                            dataResult.push(item);
                                        }
                                        if(item.SBU == ""){
                                            item.SBU = vSBU
                                            item.Item = item.BATCH;
                                            item.Desc = item.Description;
                                            item.Desc2 = item.OrderNo;
                                            dataResult.push(item);
                                        }
                                    }
                                })
                                valueHelpObjects = dataResult;
                                title = me.getView().getModel("captionMsg").getData()["BATCH"]
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
                                title = me.getView().getModel("captionMsg").getData()["SEASON"]
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
                                title = me.getView().getModel("captionMsg").getData()["PURORG"]
                                resolve();
                            },
                            error: function (err) {
                                resolve();
                            }
                        });
                    });
                }
                if(fieldName === 'SUPTYP'){
                    await new Promise((resolve, reject) => {
                        oModelFilter.read('/ZVB_3DERP_MPRSUPTYP_SH',{
                            success: function (data, response) {
                                data.results.forEach(item=>{
                                    item.Item = item.SUPTYP;
                                    item.Desc = item.Description;
                                })

                                valueHelpObjects = data.results;
                                title = me.getView().getModel("captionMsg").getData()["SUPTYP"]
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
                                        if(item.PURORG === me._purOrg){
                                            item.Item = item.VENDOR;
                                            item.Desc = item.Description;
                                            dataResult.push(item);
                                        }
                                    })

                                    valueHelpObjects = dataResult;
                                    title = me.getView().getModel("captionMsg").getData()["VENDOR"]
                                    resolve();
                                },
                                error: function (err) {
                                    resolve();
                                }
                            });
                        });
                    }else{
                        MessageBox.error(me.getView().getModel("captionMsg").getData()["INFO_PURORG_REQUIRED"]);
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
                            me
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
                var vSBU = this._sbu;

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
                                        me.setTableData('prDetTable');
                                        await me.onRowEdit('prDetTable', 'PRDetColModel');
                                        resolve();
                                    },
                                    error: function (err) {
                                        MessageBox.error(me.getView().getModel("captionMsg").getData()["INFO_ERROR"]);
                                        resolve();
                                    }
                                });
                            });
                            Common.closeLoadingDialog(me);
                        }

                        if(this._inputSource.getId().includes("BATCH")){
                            var batch = oSelectedItem.getTitle();
                            await new Promise((resolve, reject) => {
                                oModelFilter.read('/ZVB_3DERP_PR_BATCH_SH',{
                                    success: async function (data, response) {
                                        data.results.forEach(item=>{
                                            if(item.BATCH !== ""){
                                                if(item.SBU === vSBU){
                                                    if(item.BATCH === batch){
                                                        oRow.ORDERNO = item.OrderNo
                                                    }else{
                                                        oRow.ORDERNO = item.OrderNo
                                                    }
                                                }
                                                if(item.SBU == ""){
                                                    oRow.ORDERNO = item.OrderNo
                                                }
                                            }
                                        });
                                        me.setTableData('prDetTable');
                                        await me.onRowEdit('prDetTable', 'PRDetColModel');
                                        resolve();
                                    },
                                    error: function (err) {
                                        MessageBox.error(me.getView().getModel("captionMsg").getData()["INFO_ERROR"]);
                                        resolve();
                                    }
                                });
                            });
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
                    oModelFilter.read('/ZVB_3DERP_MPRDOCTYP_SH',{
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
                // 'SHIPTOPLANT'
                oJSONModel = new JSONModel();
                var plantCd = this.getView().byId("PLANTCD").getValue();
                await new Promise((resolve, reject) => {
                    oModelFilter.read('/ZVB_3DERP_MPRSHIPTOPLNT_SH',{
                        success: function (data, response) {
                            var dataResult = [];
                            data.results.forEach(item=>{
                                if(plantCd === item.PurchPlant){
                                    item.Item = item.plantcd;
                                    item.Desc = item.Description;
                                    dataResult.push(item);
                                }
                            })
                            
                            oJSONModel.setData(dataResult)
                            me.getView().setModel(oJSONModel, "shipToPlantSource");
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
            //Not Used - Standards Applied
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

            getColumnProp: async function() {
                var sPath = jQuery.sap.getModulePath("zuipr", "/model/columns.json");
    
                var oModelColumns = new JSONModel();
                await oModelColumns.loadData(sPath);
    
                this._tblColumns = oModelColumns.getData();
                this._oModelColumns = oModelColumns.getData();
            },

            onSuggestionItems: async function(){
                var me = this;
                var vSBU = this._sbu;
                var oModelFilter = this.getOwnerComponent().getModel('ZVB_3DERP_PRM_FILTERS_CDS');

                await new Promise((resolve, reject) => {
                    //'DOCTYP'
                    oModelFilter.read('/ZVB_3DERP_MPRDOCTYP_SH',{
                        success: function (data, response) {
                            data.results.forEach(item=>{
                                item.DOCTYP = item.DocType;
                                item.Item = item.DocType;
                                item.Desc = item.Description;
                            })

                            me.getView().setModel(new JSONModel(data.results), "onSuggDOCTYP")
                        },
                        error: function (err) {
                        }
                    });
                    // 'PURGRP'
                    oModelFilter.read('/ZVB_3DERP_PURGRP_SH',{
                        success: function (data, response) {
                            data.results.forEach(item=>{
                                item.PURGRP = item.PurchGrp;
                                item.Item = item.PurchGrp;
                                item.Desc = item.Description;
                                item.DESCRIPTION = item.Description;
                            })
                            me.getView().setModel(new JSONModel(data.results), "onSuggPURGRP")
                        },
                        error: function (err) {
                        }
                    });
                    // 'PLANTCD'
                    oModelFilter.read('/ZVB_3DERP_PR_PURPLANT_SH',{
                        success: function (data, response) {
                            var dataResult = [];
                            data.results.forEach(item=>{
                                if(item.SBU === vSBU){
                                    item.PLANTCD = item.PurchPlant;
                                    item.Item = item.PurchPlant;
                                    item.Desc = item.Description;
                                    dataResult.push(item);
                                }
                            })
                            me.getView().setModel(new JSONModel(dataResult), "onSuggPLANTCD")
                        },
                        error: function (err) {
                        }
                    });


                    // 'CUSTGRP'
                    oModelFilter.read('/ZVB_3DERP_PR_CUSTGRP_SH',{
                        success: function (data, response) {
                            data.results.forEach(item=>{
                                item.Item = item.CUSTGRP;
                                item.Desc = item.Description;
                            })
                            me.getView().setModel(new JSONModel(data.results), "onSuggCUSTGRP")
                        },
                        error: function (err) {
                        }
                    });

                    // 'SALESGRP'
                    oModelFilter.read('/ZVB_3DERP_PR_SALESGRP_SH',{
                        success: function (data, response) {
                            data.results.forEach(item=>{
                                item.Item = item.SALESGRP;
                                item.Desc = item.Description;
                            })
                            me.getView().setModel(new JSONModel(data.results), "onSuggSALESGRP")
                        },
                        error: function (err) {
                        }
                    });

                    //MATNO
                    oModelFilter.read('/ZVB_3DERP_PR_MATNO_SH',{
                        success: function (data, response) {
                            var dataResult = [];
                            data.results.forEach(item=>{
                                if(item.SBU === vSBU){
                                    item.Item = item.MATNO;
                                    item.Desc = item.GMCDescen;
                                    item.GMCDESCEN = item.GMCDescen;
                                    item.MATTYP = item.MatTyp;
                                    dataResult.push(item);
                                }
                            })
                            me.getView().setModel(new JSONModel(dataResult), "onSuggMATNO")
                        },
                        error: function (err) {
                        }
                    });

                    //BATCH
                    oModelFilter.read('/ZVB_3DERP_PR_BATCH_SH',{
                        success: function (data, response) {
                            var dataResult = [];
                            data.results.forEach(item=>{
                                if(item.BATCH !== ""){
                                    if(item.SBU === vSBU){
                                        item.Item = item.BATCH;
                                        item.Desc = item.Description;
                                        item.ORDERNO = item.OrderNo;
                                        dataResult.push(item);
                                    }
                                    if(item.SBU == ""){
                                        item.SBU = vSBU
                                        item.Item = item.BATCH;
                                        item.Desc = item.Description;
                                        item.ORDERNO = item.OrderNo;
                                        dataResult.push(item);
                                    }
                                }
                            })
                            me.getView().setModel(new JSONModel(dataResult), "onSuggBATCH")
                        },
                        error: function (err) {
                        }
                    });

                    //SEASONCD
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
                            me.getView().setModel(new JSONModel(dataResult), "onSuggSEASONCD")
                        },
                        error: function (err) {
                        }
                    });

                    //PURORG

                    //SUPTYP
                    oModelFilter.read('/ZVB_3DERP_MPRSUPTYP_SH',{
                        success: function (data, response) {
                            data.results.forEach(item=>{
                                item.Item = item.SUPTYP;
                                item.Desc = item.Description;
                            })
                            me.getView().setModel(new JSONModel(data.results), "onSuggSUPTYP");
                        },
                        error: function (err) {
                        }
                    });
                    resolve();
                });
                
            },

            onSuggestionItems_ShipToPlant: async function(){ 
                var me = this;
                var vSBU = this._sbu;
                var oModelFilter = this.getOwnerComponent().getModel('ZVB_3DERP_PRM_FILTERS_CDS');
                var plantCd = this.getView().getModel("headerData").getData().PLANTCD;
                // 'SHIPTOPLANT'
                await new Promise((resolve, reject) => {
                    oModelFilter.read('/ZVB_3DERP_MPRSHIPTOPLNT_SH',{
                        success: function (data, response) {
                            var dataResult = [];
                            data.results.forEach(item=>{
                                if(plantCd === item.PurchPlant){
                                    item.SHIPTOPLANT = item.plantcd;
                                    item.Item = item.plantcd;
                                    item.Desc = item.Description;
                                    dataResult.push(item);
                                }
                            })
                            me.getView().setModel(new JSONModel(dataResult), "onSuggSHIPTOPLANT")
                            resolve();
                        },
                        error: function (err) {
                            resolve();
                        }
                    });
                });

            },

            onSuggestionItems_PurOrg: async function(){
                var me = this;
                var oModelFilter = this.getOwnerComponent().getModel('ZVB_3DERP_PRM_FILTERS_CDS');
                var purPlantVal = this.getView().getModel("headerData").getData().PLANTCD;
                //PURORG
                await new Promise((resolve, reject) => {
                    oModelFilter.read('/ZVB_3DERP_PR_PURORG_SH',{
                        success: function (data, response) {
                            var dataResult = [];
                            data.results.forEach(item=>{
                                if(item.PurchPlant === purPlantVal){
                                    item.Item = item.PURORG;
                                    item.PURCHPLANT = item.PurchPlant;
                                    dataResult.push(item);
                                }
                                // item.Desc = item.DESCRIPTION;
                            })
                            me.getView().setModel(new JSONModel(dataResult), "onSuggPURORG");
                            resolve();
                        },
                        error: function (err) {
                            resolve();
                        }
                    });
                });
            },

            onSuggestionItems_Vendor: async function(oEvent){
                var me = this;
                var oSource = oEvent.getSource();
                var fieldName = oSource.getBindingInfo("value").parts[0].path.replace("/", "");
                var sRowPath = oSource.oParent.getBindingContext().sPath;
                var oModelFilter = this.getOwnerComponent().getModel('ZVB_3DERP_PRM_FILTERS_CDS');
                var vPurOrg= oEvent.getSource().oParent.oParent.getModel().getProperty(sRowPath + "/PURORG");

                //VENDOR
                await new Promise((resolve, reject) => {
                    oModelFilter.read('/ZVB_3DERP_PR_VENDOR_SH',{
                        success: function (data, response) {
                            var dataResult = [];
                            data.results.forEach(item=>{
                                while (item.VENDOR.length < 10) item.VENDOR = "0" + item.VENDOR;
                                if(item.PURORG === vPurOrg){
                                    item.Item = item.VENDOR;
                                    item.Desc = item.Description;
                                    dataResult.push(item);
                                }
                            })

                            me.getView().setModel(new JSONModel(dataResult), "onSuggVENDOR");
                            resolve();
                        },
                        error: function (err) {
                            resolve();
                        }
                    });
                });

                    // if(this._purOrg === null || this._purOrg === undefined || this._purOrg === ""){
                    //     bProceed = false;
                    // }

                    // if(bProceed){
                    //     await new Promise((resolve, reject) => {
                    //         oModelFilter.read('/ZVB_3DERP_PR_VENDOR_SH',{
                    //             success: function (data, response) {
                    //                 var dataResult = [];
                    //                 data.results.forEach(item=>{
                    //                     while (item.VENDOR.length < 10) item.VENDOR = "0" + item.VENDOR;
                    //                     if(item.PURORG === me._purOrg){
                    //                         item.Item = item.VENDOR;
                    //                         item.Desc = item.Description;
                    //                         dataResult.push(item);
                    //                     }
                    //                 })

                    //                 valueHelpObjects = dataResult;
                    //                 title = me.getView().getModel("captionMsg").getData()["VENDOR"]
                    //                 resolve();
                    //             },
                    //             error: function (err) {
                    //                 resolve();
                    //             }
                    //         });
                    //     });
                    // }else{
                    //     MessageBox.error(me.getView().getModel("captionMsg").getData()["INFO_PURORG_REQUIRED"]);
                    // }
            },

            onSaveHeader: async function(){
                var me = this;
                var oTable = this.byId("prDetTable");
                var oSelectedIndices = oTable.getBinding("rows").aIndices;
                var oTmpSelectedIndices = [];
                var aData = oTable.getModel().getData().rows;
                var vSBU = this._sbu;

                //Boolean to check if there is Validation Errors
                var boolProceed = true;

                //Init Validation Errors Object
                this._validationErrors = [];

                //PR Creation Error Type Variable
                var errTyp = "";

                var oView = this.getView();
                var formView = this.getView().byId("SalesDocHeaderForm1"); //Form View
                var formContainers = formView.getFormContainers(); // Form Container
                var formElements = ""; //Form Elements
                var formFields = ""; // Form Field
                var formElementsIsVisible = false; //is Form Element Visible Boolean
                var fieldIsEditable = false; // is Field Editable Boolean
                var fieldMandatory = ""; // Field Mandatory variable
                var fieldIsMandatory = false; // Is Field Mandatory Boolean
                var oMandatoryModel = oView.getModel("MandatoryFieldsData").getProperty("/");

                //Form Validations
                //Iterate Form Containers
                for (var index in formContainers) {
                    formElements = formContainers[index].getFormElements(); //get Form Elements

                    //iterate Form Elements
                    for (var elementIndex in formElements) {
                        formElementsIsVisible = formElements[elementIndex].getProperty("visible"); //get the property Visible of Element
                        if (formElementsIsVisible) {
                            formFields = formElements[elementIndex].getFields(); //get FIelds in Form Element

                            //Iterate Fields
                            for (var formIndex in formFields) {
                                fieldMandatory = formFields[formIndex].getBindingInfo("value") === undefined ? "" : formFields[formIndex].getBindingInfo("value").mandatory;

                                fieldIsMandatory = oMandatoryModel[fieldMandatory] === undefined ? false : oMandatoryModel[fieldMandatory];

                                if (fieldIsMandatory) {
                                    fieldIsEditable = formFields[formIndex].getProperty("editable"); //get the property Editable of Fields
                                    if (fieldIsEditable) {
                                        if (formFields[formIndex].getValue() === "" || formFields[formIndex].getValue() === null || formFields[formIndex].getValue() === undefined) {
                                            formFields[formIndex].setValueState("Error");
                                            formFields[formIndex].setValueStateText("Required Field!");
                                            me._validationErrors.push(formFields[formIndex].getId())
                                            boolProceed = false;
                                        } else {
                                            if(formFields[formIndex].getSuggestionItems().length > 0){
                                                formFields[formIndex].getSuggestionItems().forEach(item => {
                                                    if (item.getProperty("key") === formFields[formIndex].getSelectedKey() || item.getProperty("key") === formFields[formIndex].getValue().trim()) {
                                                        formFields[formIndex].setValueState("None");
                                                        me._validationErrors.forEach((item, index) => {
                                                            if (item === formFields[formIndex].getId()) {
                                                                me._validationErrors.splice(index, 1)
                                                            }
                                                        })
                                                    }
                                                })
                                            }else{
                                                formFields[formIndex].setValueState("None");
                                                me._validationErrors.forEach((item, index) => {
                                                    if (item === formFields[formIndex].getId()) {
                                                        me._validationErrors.splice(index, 1)
                                                    }
                                                })
                                            }
                                            
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                oSelectedIndices.forEach(item => {
                    oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
                });
                oSelectedIndices = oTmpSelectedIndices;


                var aItems = oTable.getRows();
                var colCounter = 0;

                if(oSelectedIndices.length > 0){
                    aItems.forEach(function(oItem) {
                        oSelectedIndices.forEach((item, index) => {
                            if(oItem.getIndex() === item){
                                var aCells = oItem.getCells();
                                aCells.forEach(function(oCell) {
                                    if (oCell.isA("sap.m.Input")) {
                                        if(oCell.getBindingInfo("value").mandatory){
                                            if(oCell.getValue() === ""){
                                                oCell.setValueState(sap.ui.core.ValueState.Error);
                                                me._validationErrors.push(oCell.getId());
                                            }else{

                                                if(oCell.getSuggestionItems().length > 0){
                                                    oCell.getSuggestionItems().forEach(item => {
                                                        if (item.getProperty("key") === oCell.getSelectedKey() || item.getProperty("key") === oCell.getValue().trim()) {
                                                            oCell.setValueState("None");
                                                            me._validationErrors.forEach((item, index) => {
                                                                if (item === oCell.getId()) {
                                                                    me._validationErrors.splice(index, 1)
                                                                }
                                                            })
                                                        }
                                                    })
                                                }else{
                                                    oCell.setValueState("None");
                                                    me._validationErrors.forEach((item, index) => {
                                                        if (item === oCell.getId()) {
                                                            me._validationErrors.splice(index, 1)
                                                        }
                                                    })
                                                }

                                                // oCell.setValueState(sap.ui.core.ValueState.None);
                                                // me._validationErrors.forEach((item, index) => {
                                                //     if (item === oCell.getId()) {
                                                //         me._validationErrors.splice(index, 1)
                                                //     }
                                                // })
                                            }
                                        }
                                    }else if (oCell.isA("sap.m.DatePicker")) {
                                        if(oCell.getBindingInfo("value").mandatory){
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
                    MessageBox.error(this.getView().getModel("captionMsg").getData()["INFO_FILL_REQUIRED_FIELDS"]);
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
                    var oModelFilter = this.getOwnerComponent().getModel('ZVB_3DERP_PRM_FILTERS_CDS');
                    var iCounter = 0;

                    var matNo, batch, custGrp, salesGrp, seasonCd = "";
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
                    var orderNohasValueCheck = false

                    var prCreationMessage = "";
                    var prCreateSetParamZERPPR = []; //Store PR Items from Table Set
                    var prCreatedPRNO = ""; //store created PR Number in CreatePRSet

                    // oSelectedIndices.forEach(item => {
                    //     oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
                    // })
                    // oSelectedIndices = oTmpSelectedIndices;
                    
                    Common.openLoadingDialog(this);
                    if(oSelectedIndices.length > 0){
                        for(var item in oSelectedIndices){
                        // oSelectedIndices.forEach(async (item, index) => {
                            matNo = aData.at(item).MATNO;
                            batch = aData.at(item).BATCH;
                            matTyp = aData.at(item).MATTYP;
                            custGrp = aData.at(item).CUSTGRP;
                            salesGrp = aData.at(item).SALESGRP;
                            seasonCd = aData.at(item).SEASONCD;
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
                                if(noRangeCd === ""){
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
                                }
                                await new Promise((resolve, reject) => {
                                    oModelFilter.read('/ZVB_3DERP_PR_BATCH_SH',{
                                        success: async function (data, response) {
                                            data.results.forEach(item2=>{
                                                if(item2.BATCH !== ""){
                                                    if(item2.SBU === vSBU){
                                                        if(item2.BATCH ===  aData.at(item).BATCH){
                                                            aData.at(item).ORDERNO = item2.OrderNo
                                                        }else{
                                                            aData.at(item).ORDERNO = item2.OrderNo
                                                        }
                                                    }

                                                    if(item.SBU == ""){
                                                        aData.at(item).ORDERNO = item2.OrderNo
                                                    }
                                                }
                                            });
                                            resolve();
                                        },
                                        error: function (err) {
                                            resolve();
                                        }
                                    });
                                });

                                if(aData.at(item).ORDERNO === "" || aData.at(item).ORDERNO === null || aData.at(item).ORDERNO === undefined){
                                    orderNohasValueCheck = false;
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
                                            Preq_Date:   sapDateFormat.format(new Date()) + "T00:00:00",
                                            // ShortText:  aData.at(item).SHORTTEXT,
                                            Material:   matNo,
                                            Plant:      aData.at(item).PLANTCD,
                                            MatGrp:     aData.at(item).MATGRP,
                                            Quantity:   aData.at(item).QUANTITY,
                                            Unit:       aData.at(item).UOM,
                                            DelivDate:  aData.at(item).DELDT !== undefined ? sapDateFormat.format(new Date(aData.at(item).DELDT)) + "T00:00:00": sapDateFormat.format(new Date()) + "T00:00:00",
                                            Batch:      batch,
                                            Des_Vendor:  aData.at(item).VENDOR,
                                            PurchOrg:   aData.at(item).PURORG,
                                        })
                                        prCreateSetParamZERPPR.push({
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
                                            DelivDate:  aData.at(item).DELDT !== undefined ? sapDateFormat.format(new Date(aData.at(item).DELDT)) + "T00:00:00": sapDateFormat.format(new Date()) + "T00:00:00",
                                            Batch:      batch,
                                            SupTyp:     aData.at(item).SUPTYP,
                                            SalesGrp:   aData.at(item).SALESGRP,
                                            CustGrp:    aData.at(item).CUSTGRP,
                                            ShipToPlant:aData.at(item).SHIPTOPLANT,
                                            SeasonCd:   aData.at(item).SEASONCD
    
                                            // FixedVend:  aData.at(item).VENDOR
                                        })
                                    }

                                    await new Promise(async (resolve, reject) => {
                                        iCounter++;
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
                                                    prCreationMessage = oData.N_PRRETURN.results[0].Message; //After CreatePRSet Message
                                                    prCreatedPRNO = oData.N_PRRETURN.results[0].MessageV1; //CreatedPRNo
                                                    errTyp = oData.N_PRRETURN.results[0].Type;
                                                    resolve();
                                                },error: function(error){
                                                    MessageBox.error(me.getView().getModel("captionMsg").getData()["INFO_CREATE_PR_ERROR"]);
                                                    resolve()
                                                }
                                            })
                                        })
                                        await me.extendToZERP_PR(prCreateSetParamZERPPR, errTyp, prCreatedPRNO);
                                        resolve();
                                    });
                                    prCreateSetParam = [];
                                    prCreateSetParamZERPPR = [];

                                }else{
                                    orderNohasValueCheck = true;
                                }
                                if(!hasZERPMatBatch){
                                    ZERPMatBatchParam = {
                                        MATNO: matNo,
                                        BATCH: batch,
                                        IONO: batch,
                                        CUSTGRP: custGrp,
                                        SALESGRP: salesGrp,
                                        SEASONCD: seasonCd
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

                                
                                if(orderNohasValueCheck){
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
                                            Preq_Date:   sapDateFormat.format(new Date()) + "T00:00:00",
                                            // ShortText:  aData.at(item).SHORTTEXT,
                                            Material:   matNo,
                                            Plant:      aData.at(item).PLANTCD,
                                            MatGrp:     aData.at(item).MATGRP,
                                            Quantity:   aData.at(item).QUANTITY,
                                            Unit:       aData.at(item).UOM,
                                            DelivDate:  aData.at(item).DELDT !== undefined ? sapDateFormat.format(new Date(aData.at(item).DELDT)) + "T00:00:00": sapDateFormat.format(new Date()) + "T00:00:00",
                                            Batch:      batch,
                                            Des_Vendor:  aData.at(item).VENDOR,
                                            PurchOrg:   aData.at(item).PURORG,
                                        })
                                        prCreateSetParamZERPPR.push({
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
                                            DelivDate:  aData.at(item).DELDT !== undefined ? sapDateFormat.format(new Date(aData.at(item).DELDT)) + "T00:00:00": sapDateFormat.format(new Date()) + "T00:00:00",
                                            Batch:      batch,
                                            SupTyp:     aData.at(item).SUPTYP,
                                            SalesGrp:   aData.at(item).SALESGRP,
                                            CustGrp:    aData.at(item).CUSTGRP,
                                            ShipToPlant:aData.at(item).SHIPTOPLANT,
                                            SeasonCd:   aData.at(item).SEASONCD

                                            // FixedVend:  aData.at(item).VENDOR
                                        })
                                    }
                                }
                                await new Promise(async (resolve, reject) => {
                                    iCounter++;
                                    if(oSelectedIndices.length === iCounter){
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
                                                    prCreationMessage = oData.N_PRRETURN.results[0].Message; //After CreatePRSet Message
                                                    prCreatedPRNO = oData.N_PRRETURN.results[0].MessageV1; //CreatedPRNo
                                                    errTyp = oData.N_PRRETURN.results[0].Type;
                                                    resolve();
                                                },error: function(error){
                                                    MessageBox.error(me.getView().getModel("captionMsg").getData()["INFO_CREATE_PR_ERROR"]);
                                                    resolve()
                                                }
                                            })
                                        })

                                        await me.extendToZERP_PR(prCreateSetParamZERPPR, errTyp, prCreatedPRNO);
                                        if(prCreationMessage !== ""){

                                            if(errTyp !== "I"){
                                                MessageBox.error(prCreationMessage);
                                            }
                                        }

                                        if(errTyp === "I"){
                                            var actionSel;
                                            var bCompact = !!me.getView().$().closest(".sapUiSizeCompact").length;
                                            await new Promise((resolve, reject) => {
                                                MessageBox.information(
                                                    prCreationMessage,
                                                    {
                                                        actions: [MessageBox.Action.OK],
                                                        styleClass: bCompact ? "sapUiSizeCompact" : "",
                                                        onClose: function(sAction) {
                                                            actionSel = sAction;
                                                            resolve(actionSel);
                                                        }
                                                    }
                                                );
                                            })
                                            if(actionSel === 'OK'){
                                                //Init Validation Errors Object
                                                this._validationErrors = [];
                                                var formView = this.getView().byId("SalesDocHeaderForm1"); //Form View
                                                var formContainers = formView.getFormContainers(); // Form Container
                                                var formElements = ""; //Form Elements
                                                var formFields = ""; // Form Field
                                                var formElementsIsVisible = false; //is Form Element Visible Boolean
                                                var fieldIsEditable = false; // is Field Editable Boolean

                                                //Form Validations
                                                //Iterate Form Containers
                                                for (var index in formContainers) {
                                                    formElements = formContainers[index].getFormElements(); //get Form Elements

                                                    //iterate Form Elements
                                                    for (var elementIndex in formElements) {
                                                        formElementsIsVisible = formElements[elementIndex].getProperty("visible"); //get the property Visible of Element
                                                        if (formElementsIsVisible) {
                                                            formFields = formElements[elementIndex].getFields(); //get FIelds in Form Element

                                                            //Iterate Fields
                                                            for (var formIndex in formFields) {
                                                                fieldIsEditable = formFields[formIndex].getProperty("editable"); //get the property Editable of Fields
                                                                if (fieldIsEditable) {
                                                                    formFields[formIndex].setValue("");
                                                                    formFields[formIndex].setEnabled(true);
                                                                }
                                                            }
                                                        }
                                                    }

                                                }
                                                // me.getView().byId("DOCTYP").setValue("");
                                                // me.getView().byId("PRNO").setValue("");
                                                // me.getView().byId("PURGRP").setValue("");
                                                // me.getView().byId("PLANTCD").setValue("");
                                                // me.getView().byId("CUSTGRP").setValue("");
                                                // me.getView().byId("SALESGRP").setValue("");
                                                // me.getView().byId("REQSTNR").setValue("");

                                                me.getView().getModel("PRDetDataModel").setProperty("/results", []);
                                                me.setTableData('prDetTable')

                                                var oHistory = History.getInstance();
                                                var sPreviousHash = oHistory.getPreviousHash();
                                                if (sPreviousHash !== undefined) {
                                                    var oRouter = this.getOwnerComponent().getRouter();
                                                    oRouter.attachRouteMatched(function(oEvent) {
                                                        // Check if the route matched is 'main'
                                                        if (oEvent.getParameter("name") === "main") {
                                                            // Access the 'main' controller and call the method 'yourMethod'
                                                            var oMainController = oEvent.getParameter("view").getController();
                                                            oMainController.onSearch(); // Replace 'yourMethod' with your actual method name
                                                        }
                                                    });
                                                    oRouter.navTo("main", {}, true);
                                                    // window.history.go(-1);
                                                } else {
                                                    var oRouter = this.getOwnerComponent().getRouter();
                                                    oRouter.attachRouteMatched(function(oEvent) {
                                                        // Check if the route matched is 'main'
                                                        if (oEvent.getParameter("name") === "main") {
                                                            // Access the 'main' controller and call the method 'yourMethod'
                                                            var oMainController = oEvent.getParameter("view").getController();
                                                            oMainController.onSearch(); // Replace 'yourMethod' with your actual method name
                                                        }
                                                    });
                                                    oRouter.navTo("main", {}, true);


                                                }

                                                // me.byId("DOCTYP").setEnabled(true);
                                                // me.byId("PURGRP").setEnabled(true);
                                                // me.byId("PLANTCD").setEnabled(true);
                                                // me.byId("CUSTGRP").setEnabled(true);
                                                // me.byId("SALESGRP").setEnabled(true);
                                            }
                                        }
                                        resolve();
                                    }
                                    resolve();
                                });
                            }
                        }
                    }else{
                        MessageBox.error(this.getView().getModel("captionMsg").getData()["INFO_NO_PR_TO_SAVE"]);
                    }
                    
                    Common.closeLoadingDialog(this);
                }
                
            },

            extendToZERP_PR: async function(PRItems, errTyp, PRNo){
                var oModel = this.getOwnerComponent().getModel();
                var oModel2 = this.getOwnerComponent().getModel();
                oModel2.setUseBatch(true);
                oModel2.setDeferredGroups(["insert"]);
                var modelParameter = {
                    "groupId": "insert"
                };

                var bProceed = false;
                var zerpPRParam = {}

                if(errTyp === "I"){
                    for(var items in PRItems){
                        await new Promise((resolve, reject)=>{
                            oModel.read("/PRSet(PRNO='" + PRNo + "',PRITM='"+ PRItems[items].PreqItem +"')", {
                                success: async function (data, response) {
                                    zerpPRParam = {
                                        PRNO:           PRNo,
                                        PRLN:           PRItems[items].PreqItem,
                                        SUPPLYTYP:      PRItems[items].SupTyp,
                                        SALESGRP:       PRItems[items].SalesGrp,
                                        CUSTGRP:        PRItems[items].CustGrp,
                                        SHIPTOPLANT:    PRItems[items].ShipToPlant,
                                        SEASONCD:       PRItems[items].SeasonCd
                                    };
                                    bProceed = true;
                                    resolve();
                                },
                                error: function (err) {
                                    zerpPRParam = {};
                                    bProceed = false;
                                    resolve();
                                }
                            })
                        });

                        if(bProceed){
                            oModel2.create("/ZERP_PRSet", zerpPRParam, modelParameter);
                            await new Promise((resolve, reject) => {
                                oModel2.submitChanges({
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

                    }

                }
            },

            cancelHeaderEdit: async function(){
                var me = this;
                var actionSel;
                var bCompact = !!this.getView().$().closest(".sapUiSizeCompact").length;
                await new Promise((resolve, reject) => {
                    MessageBox.warning(
                        me.getView().getModel("captionMsg").getData()["INFO_DISCARD_CHANGES"],
                        {
                            actions: [me.getView().getModel("captionMsg").getData()["YES"], me.getView().getModel("captionMsg").getData()["CANCEL"]],
                            styleClass: bCompact ? "sapUiSizeCompact" : "",
                            onClose: function(sAction) {
                                actionSel = sAction;
                                resolve(actionSel);
                            }
                        }
                    );
                });
                if(actionSel === this.getView().getModel("captionMsg").getData()["YES"]){
                    // this.getView().byId("DOCTYP").setValue("");
                    // this.getView().byId("PRNO").setValue("");
                    // this.getView().byId("PURGRP").setValue("");
                    // this.getView().byId("PLANTCD").setValue("");
                    // this.getView().byId("CUSTGRP").setValue("");
                    // this.getView().byId("SALESGRP").setValue("");
                    // this.getView().byId("REQSTNR").setValue("");


                    // this.byId("DOCTYP").setEnabled(true);
                    // this.byId("PURGRP").setEnabled(true);
                    // this.byId("PLANTCD").setEnabled(true);
                    // this.byId("CUSTGRP").setEnabled(true);
                    // this.byId("SALESGRP").setEnabled(true);

                    //Init Validation Errors Object
                    this._validationErrors = [];
                    var formView = this.getView().byId("SalesDocHeaderForm1"); //Form View
                    var formContainers = formView.getFormContainers(); // Form Container
                    var formElements = ""; //Form Elements
                    var formFields = ""; // Form Field
                    var formElementsIsVisible = false; //is Form Element Visible Boolean
                    var fieldIsEditable = false; // is Field Editable Boolean

                    //Form Validations
                    //Iterate Form Containers
                    for (var index in formContainers) {
                        formElements = formContainers[index].getFormElements(); //get Form Elements

                        //iterate Form Elements
                        for (var elementIndex in formElements) {
                            formElementsIsVisible = formElements[elementIndex].getProperty("visible"); //get the property Visible of Element
                            if (formElementsIsVisible) {
                                formFields = formElements[elementIndex].getFields(); //get FIelds in Form Element

                                //Iterate Fields
                                for (var formIndex in formFields) {
                                    fieldIsEditable = formFields[formIndex].getProperty("editable"); //get the property Editable of Fields
                                    if (fieldIsEditable) {
                                        formFields[formIndex].setValue("");
                                        formFields[formIndex].setEnabled(true);
                                    }
                                }
                            }
                        }

                    }

                    this.getView().getModel("PRDetDataModel").setProperty("/results", []);
                    this.setTableData('prDetTable')

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
            },

            callCaptionsAPI: async function(){
                var me = this;
                var oJSONModel = new JSONModel();
                var oDDTextParam = [];
                var oDDTextResult = [];
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");

                oDDTextParam.push({CODE: "CREATEPR"});
                oDDTextParam.push({CODE: "DETAILS"});
                oDDTextParam.push({CODE: "ADD"});
                oDDTextParam.push({CODE: "DELETE"});
                oDDTextParam.push({CODE: "SAVELAYOUT"});
                oDDTextParam.push({CODE: "INFO_LAYOUT_SAVE"});

                oDDTextParam.push({CODE: "HEADER"});
                oDDTextParam.push({CODE: "SAVE"});
                oDDTextParam.push({CODE: "CANCEL"});

                oDDTextParam.push({CODE: "PRNO"});
                oDDTextParam.push({CODE: "PURCHGRP"});
                oDDTextParam.push({CODE: "PURCHPLANT"});
                oDDTextParam.push({CODE: "SHIPTOPLANT"});
                oDDTextParam.push({CODE: "CUSTGRP"});
                oDDTextParam.push({CODE: "SALESGRP"});
                oDDTextParam.push({CODE: "REQUISITIONER"});


                oDDTextParam.push({CODE: "INFO_ERROR"});
                oDDTextParam.push({CODE: "INFO_CREATE_PR_ERROR"});
                oDDTextParam.push({CODE: "INFO_NO_PR_TO_SAVE"});
                oDDTextParam.push({CODE: "INFO_DISCARD_CHANGES"});
                oDDTextParam.push({CODE: "YES"});
                oDDTextParam.push({CODE: "NO"});

                oDDTextParam.push({CODE: "INFO_REQUIRED_FIELD"});
                oDDTextParam.push({CODE: "INFO_ABOVE_FIELD_REQ"});
                oDDTextParam.push({CODE: "INFO_BELOW_FIELD_REQ"});
                oDDTextParam.push({CODE: "INFO_FILL_REQUIRED_FIELDS"});
                oDDTextParam.push({CODE: "NO"});

                oDDTextParam.push({CODE: "DOCTYP"});
                oDDTextParam.push({CODE: "MATNO"});
                oDDTextParam.push({CODE: "BATCH"});
                oDDTextParam.push({CODE: "SEASON"});
                oDDTextParam.push({CODE: "PURORG"});
                oDDTextParam.push({CODE: "VENDOR"});

                oDDTextParam.push({CODE: "FLTRCRIT"});
                oDDTextParam.push({CODE: "OK"});
                oDDTextParam.push({CODE: "CANCEL"});
                oDDTextParam.push({CODE: "CLRFLTRS"});
                oDDTextParam.push({CODE: "REMOVEFLTR"});
                oDDTextParam.push({CODE: "VALUELIST"});
                oDDTextParam.push({CODE: "USERDEF"});
                oDDTextParam.push({CODE: "SEARCH"});

                oDDTextParam.push({CODE: "INFO_PURORG_REQUIRED"});
                oDDTextParam.push({CODE: "INFO_PLANT_REQUIRED"});
                oDDTextParam.push({CODE: "FULLSCREEN"});
                oDDTextParam.push({CODE: "EXITFULLSCREEN"});

                await oModel.create("/CaptionMsgSet", { CaptionMsgItems: oDDTextParam  }, {
                    method: "POST",
                    success: function(oData, oResponse) {
                        oData.CaptionMsgItems.results.forEach(item=>{
                            oDDTextResult[item.CODE] = item.TEXT;
                        })

                        oJSONModel.setData(oDDTextResult);
                        me.getView().setModel(oJSONModel, "captionMsg");
                        me.getOwnerComponent().getModel("CAPTION_MSGS_MODEL").setData({text: oDDTextResult});
                    },
                    error: function(err) {
                        sap.m.MessageBox.error(err);
                    }
                });
            },

            onSaveTableLayout: function () {
                //saving of the layout of table
                var me = this;
                var ctr = 1;
                var oTable = this.getView().byId("prDetTable");
                var oColumns = oTable.getColumns();
                var vSBU = this._sbu;

                var oParam = {
                    "SBU": vSBU,
                    "TYPE": "MANUALPRDET",
                    "TABNAME": "ZDV_3DERP_PR",
                    "TableLayoutToItems": []
                };

                //get information of columns, add to payload
                oColumns.forEach((column) => {
                    oParam.TableLayoutToItems.push({
                        COLUMNNAME: column.sId.split("-")[1],
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
                        sap.m.MessageBox.information(me.getView().getModel("captionMsg").getData()["INFO_LAYOUT_SAVE"]);
                        //Common.showMessage(me._i18n.getText('t6'));
                    },
                    error: function(err) {
                        sap.m.MessageBox.error(err);
                    }
                });
            },

            onTableResize: function(oEvent){
                var vFullScreen = oEvent.getSource().data("Max") === "1" ? true : false;
                var vTableTyp = oEvent.getSource().data("Type");
                if(vTableTyp === "Dtl"){
                    if(vFullScreen){
                        this.byId("headerPanel").setVisible(false);
                        this.byId("btnDetBtnFullScreen").setVisible(false);
                        this.byId("btnDetBtnExitFullScreen").setVisible(true);
                    }else{
                        this.byId("headerPanel").setVisible(true);
                        this.byId("btnDetBtnFullScreen").setVisible(true);
                        this.byId("btnDetBtnExitFullScreen").setVisible(false);
                    }
                }
            },
            
            //******************************************* */
            // Column Filtering
            //******************************************* */

            onColFilterClear: function(oEvent) {
                TableFilter.onColFilterClear(oEvent, this);
            },

            onColFilterCancel: function(oEvent) {
                TableFilter.onColFilterCancel(oEvent, this);
            },

            onColFilterConfirm: function(oEvent) {
                TableFilter.onColFilterConfirm(oEvent, this);
            },

            onFilterItemPress: function(oEvent) {
                TableFilter.onFilterItemPress(oEvent, this);
            },

            onFilterValuesSelectionChange: function(oEvent) {
                TableFilter.onFilterValuesSelectionChange(oEvent, this);
            },

            onSearchFilterValue: function(oEvent) {
                TableFilter.onSearchFilterValue(oEvent, this);
            },

            onCustomColFilterChange: function(oEvent) {
                TableFilter.onCustomColFilterChange(oEvent, this);
            },

            onSetUseColFilter: function(oEvent) {
                TableFilter.onSetUseColFilter(oEvent, this);
            },

            onRemoveColFilter: function(oEvent) {
                TableFilter.onRemoveColFilter(oEvent, this);
            },

            pad: Common.pad

        });
    });
