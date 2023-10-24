sap.ui.define([
    "sap/ui/core/mvc/Controller",
    'sap/ui/model/Filter',
    "../js/Common",
    // "../js/Utils",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "../js/TableValueHelp",
    'jquery.sap.global',
    'sap/ui/core/routing/HashChanger'
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, Filter, Common, JSONModel, MessageBox, TableValueHelp, jQuery, HashChanger) {
        "use strict";

        var that;
        var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({pattern : "MM/dd/yyyy" });
        var sapDateFormat = sap.ui.core.format.DateFormat.getDateInstance({pattern : "yyyy-MM-dd" });

        return Controller.extend("zuipr.controller.PRDet", {

            onInit: function () {
                that = this;
                
                //Initialize router
                var oComponent = this.getOwnerComponent();
                this._router = oComponent.getRouter();
                this.callCaptionsAPI();
                this.getView().setModel(new JSONModel(this.getOwnerComponent().getModel("CAPTION_MSGS_MODEL").getData().text), "ddtext");
                this._router.getRoute("PRDetail").attachPatternMatched(this._routePatternMatched, this);
                
                this._validationErrors = [];
                this._oDataOnEditValidate = [];
                this._getFieldResultsData = [];
                this._resultfields = {}

                this._tableValueHelp = TableValueHelp; 

            },
            _routePatternMatched: async function (oEvent) {
                this._sbu = oEvent.getParameter("arguments").SBU;
                this._prno = oEvent.getParameter("arguments").PRNO; //get Style from route pattern
                this._pritm = oEvent.getParameter("arguments").PRITM; //get SBU from route pattern
                
                // //Load header
                // this.getHeaderData(); //get header data

                // this.getColorsTable();

                // //Load value helps
                // Utils.getStyleSearchHelps(this);
                // Utils.getAttributesSearchHelps(this);
                // Utils.getProcessAttributes(this);

                // //Attachments
                // this.bindUploadCollection();
                // this.getView().getModel("FileModel").refresh();
                await this.loadAllData();
            },
            callCaptionsAPI: async function(){
                var oJSONModel = new JSONModel();
                var oDDTextParam = [];
                var oDDTextResult = [];
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
    
                //Detail IconTabFilter
                oDDTextParam.push({CODE: "MATDATA"});
                oDDTextParam.push({CODE: "QTYDT"});
                oDDTextParam.push({CODE: "SUPTYP"});
                oDDTextParam.push({CODE: "CUSTDATA"});

                //Header Top
                oDDTextParam.push({CODE: "CREATEDBY"});
                oDDTextParam.push({CODE: "CREATEDDT"});
                oDDTextParam.push({CODE: "HEADER"});
                oDDTextParam.push({CODE: "DETAILS"});
                //Header
                oDDTextParam.push({CODE: "PRNO"});
                oDDTextParam.push({CODE: "PRITM"});
                oDDTextParam.push({CODE: "MATNO"});
                oDDTextParam.push({CODE: "REQUISITIONER"});
                oDDTextParam.push({CODE: "REQDT"});
                oDDTextParam.push({CODE: "GMCDESCEN"});
                oDDTextParam.push({CODE: "ADDTLDESCEN"});
                //Material Data
                oDDTextParam.push({CODE: "SHORTTEXT"});
                oDDTextParam.push({CODE: "BATCH"});
                oDDTextParam.push({CODE: "MATGRP"});
                oDDTextParam.push({CODE: "MATTYP"});
                //Quantities/Dates
                oDDTextParam.push({CODE: "QUANTITY"});
                oDDTextParam.push({CODE: "ORDERQTY"});
                oDDTextParam.push({CODE: "OPENQTY"});
                oDDTextParam.push({CODE: "DELVDATE"});
                oDDTextParam.push({CODE: "REQDT"});
                oDDTextParam.push({CODE: "RELDT"});
                oDDTextParam.push({CODE: "DELETED"});
                oDDTextParam.push({CODE: "CLOSED"});
                //Supply Type
                oDDTextParam.push({CODE: "INFORECORD"});
                oDDTextParam.push({CODE: "VENDOR"});
                oDDTextParam.push({CODE: "PURORG"});
                //Customer Data
                oDDTextParam.push({CODE: "SUPTYP"});
                oDDTextParam.push({CODE: "SALESGRP"});
                oDDTextParam.push({CODE: "CUSTGRP"});
                oDDTextParam.push({CODE: "SEASON"});
                oDDTextParam.push({CODE: "CUSTSTYLE"});

                //MessageBox
                oDDTextParam.push({CODE: "INFO_REQUIRED_FIELD"});
                oDDTextParam.push({CODE: "INFO_ALREADY_DELETED"});
                oDDTextParam.push({CODE: "INFO_ERROR"});
                oDDTextParam.push({CODE: "INFO_LAYOUT_SAVE"});
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
                        
                        oJSONModel.setData(oDDTextResult);
                        that.getView().setModel(oJSONModel, "captionMsg");
                    },
                    error: function(err) {
                        sap.m.MessageBox.error(err);
                    }
                });
            },

            loadAllData: async function(){
                Common.openLoadingDialog(that);
                await this.getColumnProp();
                await this.getHeaderData();
                await this.getHeaderConfig();
                // await new Promise((resolve, reject)=>{
                //     resolve(this.handleSuggestions())
                // });
                Common.closeLoadingDialog(that);
            },
            getHeaderData: async function () {
                var me = this;
                var prno = this._prno;
                var pritm = this._pritm;
                var oModel = this.getOwnerComponent().getModel();
                var oJSONModel = new sap.ui.model.json.JSONModel();
                var oView = this.getView();

                //read Style header data
                
                var entitySet = "/PRSet(PRNO='" + prno + "',PRITM='"+ pritm +"')"
                await new Promise((resolve, reject)=>{
                    oModel.read(entitySet, {
                        success: async function (oData, oResponse) {
                            // var oldData = oData;
                            // me._headerData = JSON.parse(JSON.stringify(oData));
                            oData.DELETED = oData.DELETED === "" ? false : true;
                            if (oData.CHANGEDT !== null)
                                oData.CHANGEDT = dateFormat.format(oData.CHANGEDT);
    
                            if (oData.REQDT !== null)
                                oData.REQDT = dateFormat.format(oData.REQDT);
    
                            if (oData.DELDT !== null)
                                oData.DELDT = dateFormat.format(oData.DELDT);
    
                            if (oData.RELDT !== null)
                                oData.RELDT = dateFormat.format(oData.RELDT);
                            
                            oJSONModel.setData(oData);

                            
                            await me.onSuggestionItems(oData);

                            oView.setModel(oJSONModel, "headerData");
                            resolve();
                            // me.setChangeStatus(false);
                        },
                        error: function () {
                            resolve();
                        }
                    })
                })
                
            },

            getHeaderConfig: async function () {
                var me = this;
                var oView = this.getView();
                var oModel = this.getOwnerComponent().getModel();
                var oJSONModel1 = new sap.ui.model.json.JSONModel();
                var oJSONModel2 = new sap.ui.model.json.JSONModel();
                var oJSONModel3 = new sap.ui.model.json.JSONModel();

                //get header fields
                oModel.setHeaders({
                    sbu: 'VER',
                    type: 'PRHDR',
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

            getColumnProp: async function() {
                var sPath = jQuery.sap.getModulePath("zuipr", "/model/columns.json");
    
                var oModelColumns = new JSONModel();
                await oModelColumns.loadData(sPath);
                this._tblColumns = oModelColumns.getData();
                this._oModelColumns = oModelColumns.getData();
            },
    

            onClickEdit: async function(){
                var deleted = this.byId("DELETED").getSelected();
                var closed = this.byId("CLOSED").getSelected();
                //Initiate Edit Validation to Empty
                this._oDataOnEditValidate = []

                if(deleted === true){
                    MessageBox.information(this.getView().getModel("captionMsg").getData()["INFO_ALREADY_DELETED"]);
                    return;
                }
                if(closed === true){
                    MessageBox.information(this.getView().getModel("captionMsg").getData()["INFO_ALREADY_CLOSED"]);
                    return;
                }

                //check ZERP_CHECK to validate Mandatory and Editable Fields
                await this.chkZERP_CHECKvalidate();

                this.setReqField("MatDataDetailForm", "EditMode");
                this.setReqField("QtyDtHeaderForm", "EditMode");
                this.setReqField("SupplyTypHeaderForm", "EditMode");
                this.setReqField("CustDataHeaderForm", "EditMode");

                this.setFieldEditable("MatDataDetailForm", "EditMode");
                this.setFieldEditable("QtyDtHeaderForm", "EditMode");
                this.setFieldEditable("SupplyTypHeaderForm", "EditMode");
                this.setFieldEditable("CustDataHeaderForm", "EditMode");

                this.byId("editPRBtn").setVisible(false);
                this.byId("savePRBtn").setVisible(true);
                this.byId("cancelPRBtn").setVisible(true);
            },
            chkZERP_CHECKvalidate: async function(){
                var oView = this.getView();
                var me = this;
                var prNo = this._prno;
                var prItm = this._pritm;
                var oModel = this.getOwnerComponent().getModel();
                var vSBU = this._sbu;
                var oEditableFields = oView.getModel("EditableFieldsData").getProperty("/");
                var oMandatoryFields = oView.getModel("MandatoryFieldsData").getProperty("/");

                await new Promise((resolve, reject)=>{
                    oModel.read("/PRSet(PRNO='" + prNo + "',PRITM='"+ prItm +"')", {
                        success: async function (data, response) {
                            await new Promise((resolve, reject)=>{
                                oModel.read("/ZERP_CHECKSet", {
                                    urlParameters: {
                                        "$filter":"SBU eq '"+ vSBU +"' and FIELD1 eq '"+ data.DOCTYP +"'"
                                    },
                                    success: async function (data, response) {
                                        for(var index in data.results){
                                            for(var index2 in oEditableFields){
                                                if(data.results[index].FIELD2 === index2){
                                                    if(data.results[index].FIELD3 === "MD" || data.results[index].FIELD3 === "D"){
                                                        oEditableFields[index2] = false;
                                                    }
                                                }
                                            }
                                            for(var index3 in oMandatoryFields){
                                                if(data.results[index].FIELD2 === index3){
                                                    if(data.results[index].FIELD3 === "MU" || data.results[index].FIELD3 === "U" || data.results[index].FIELD3 === "R"){
                                                        oMandatoryFields[index3] = true;
                                                    }else if(data.results[index].FIELD3 === "OU"){
                                                        oMandatoryFields[index3] = false;
                                                    }
                                                }
                                            }
                                        }
                                        
                                        // var count = 0;
                                        // var indx = 0;
                                        // var strDocTyp = "";
                                        // var strObj = {}
                                        // data.results.forEach(async dataItem => {
                                        //     count++
                                        //     strDocTyp = dataItem.FIELD1;
                                        // })
                                        // strObj["DOCTYP"] = (strDocTyp);
                                        // strObj["results"] = data.results
                                        // me._oDataOnEditValidate.push(strObj)
                                        resolve();
                                    },
                                    error: function(error){
                                        resolve();
                                    }
                                });
                            })
                            resolve();
                        },
                        error: function (err) {
                            resolve();
                        }
                    });
                });


            },
            setReqField: async function(fieldName, status){
                var oView = this.getView();
                var formView = this.getView().byId(fieldName); //Form View
                var formContainers = formView.getFormContainers(); // Form Container
                var formElements = ""; //Form Elements
                var formFields = ""; // Form Field
                var formElementsIsVisible = false; //is Form Element Visible Boolean
                var fieldMandatory = ""; // Field Mandatory variable
                var fieldIsMandatory = false; // Is Field Mandatory Boolean
                var oMandatoryModel = oView.getModel("MandatoryFieldsData").getProperty("/");

                var fieldEditable = "";
                var fieldIsEditable = false; // is Field Editable Boolean
                var oEditableModel = oView.getModel("EditableFieldsData").getProperty("/");
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

                                fieldEditable = formFields[formIndex].getBindingInfo("value") === undefined ? "" : formFields[formIndex].getBindingInfo("value").editable;
                                fieldIsEditable = oEditableModel[fieldEditable] === undefined ? false : oEditableModel[fieldEditable]; //get the property Editable of Fields
                                if (fieldIsEditable) {
                                    if (fieldIsMandatory) {
                                        if(status === "EditMode"){
                                            label = formElements[elementIndex].getLabel().replace("*", "");
                                            formElements[elementIndex].setLabel("*" + label);
                                            formElements[elementIndex]._oLabel.addStyleClass("requiredField");
                                        }else{
                                            label = formElements[elementIndex].getLabel().replace("*", "");
                                            formElements[elementIndex].setLabel(label);
                                            formElements[elementIndex]._oLabel.removeStyleClass("requiredField");
                                        }
                                    }
                                }
                            }
                        }
                    }

                }
            },
            setFieldEditable: async function(fieldName, status){
                var oView = this.getView();
                var formView = this.getView().byId(fieldName); //Form View
                var formContainers = formView.getFormContainers(); // Form Container
                var formElements = ""; //Form Elements
                var formFields = ""; // Form Field
                var fieldEditable = "";
                var fieldIsEditable = false; // is Field Editable Boolean
                var oEditableModel = oView.getModel("EditableFieldsData").getProperty("/");
                
                //Form Validations
                //Iterate Form Containers
                for (var index in formContainers) {
                    formElements = formContainers[index].getFormElements(); //get Form Elements

                    //iterate Form Elements
                    for (var elementIndex in formElements) {
                        formFields = formElements[elementIndex].getFields(); //get FIelds in Form Element

                        //Iterate Fields
                        for (var formIndex in formFields) {
                            fieldEditable = formFields[formIndex].getBindingInfo("value") === undefined ? "" : formFields[formIndex].getBindingInfo("value").editable;
                            fieldIsEditable = oEditableModel[fieldEditable] === undefined ? false : oEditableModel[fieldEditable]; //get the property Editable of Fields
                            if (fieldIsEditable) {
                                if(status === "EditMode")
                                    formFields[formIndex].setEditable(true);
                                else
                                    formFields[formIndex].setEditable(false);
                            }
                        }
                    }

                }
            },
            onSaveEdit: async function(){
                var me = this;
                var prNo = this._prno;
                var prItm = this._pritm;
                //Init Validation Errors Object
                this._validationErrors = [];
                var oView = this.getView();
                var oRFCModel = this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");
                var oModel = this.getOwnerComponent().getModel();
                var oParamData = [];
                var oParam = {};
                var bProceed = true;

                // this._getFieldResultsData = [];
                // this._resultfields = {};
                var message = "";

                // await this.getFieldData("MatDataDetailForm");
                // await this.getFieldData("QtyDtHeaderForm");
                // await this.getFieldData("SupplyTypHeaderForm");
                // await this.getFieldData("CustDataHeaderForm");

                // this._getFieldResultsData = this._resultfields;
                // resultsData = this._getFieldResultsData;

                var resultsData = this.getView().getModel("headerData").getData();
                this.checkIfFieldIsNotEmpty("MatDataDetailForm");
                this.checkIfFieldIsNotEmpty("QtyDtHeaderForm");
                this.checkIfFieldIsNotEmpty("SupplyTypHeaderForm");
                this.checkIfFieldIsNotEmpty("CustDataHeaderForm");

                if (this._validationErrors.length > 0) {
                    // MessageBox.error(this.getView().getModel("captionMsg").getData()["INFO_FILL_REQUIRED_FIELDS"]);
                    MessageBox.error("Please Fill Required Fields!");
                    bProceed = false;
                }
                

                if(bProceed){
                    Common.openLoadingDialog(that);
                    await new Promise((resolve, reject)=>{
                        oModel.read("/PRSet(PRNO='" + prNo + "',PRITM='"+ prItm +"')", {
                            success: async function (data, response) {
                                oParamData.push({
                                    PreqNo: prNo,
                                    PreqItem: prItm,
                                    Matno: data.MATNO,
                                    Uom: data.UOM,
                                    Quantity: resultsData.QUANTITY,
                                    DelivDate: sapDateFormat.format(new Date(resultsData.DELDT)) + "T00:00:00",
                                    Batch: resultsData.BATCH,
                                    Plant: data.PLANTCD,
                                    Purgrp: data.PURGRP,
                                    Reqsnr: data.REQSTNR,
                                    DesVendor: resultsData.VENDOR,
                                    PurchOrg: resultsData.PURORG,
                                    Trackingno: data.TRCKNO,
                                    Supplytyp: resultsData.SUPTYP,
                                    InfoRec: resultsData.INFNR,
                                    Shiptoplant: data.SHIPTOPLANT,
                                    Seasoncd: resultsData.SEASON,
                                    ShortText: resultsData.SHORTTEXT,
                                    Callbapi: 'X'
                                })
                                resolve();
                            },
                            error: function (err) {
                                resolve();
                            }
                        });
                    });

                    if (oParamData.length > 0) {
                        oParam['N_ChangePRParam'] = oParamData;
                        oParam['N_ChangePRReturn'] = [];
                        await new Promise((resolve, reject)=>{
                            oRFCModel.create("/ChangePRSet", oParam, {
                                method: "POST",
                                success: function(oResultCPR, oResponse) {
                                    var oRetMsg = oResultCPR.N_ChangePRReturn.results.filter(fItem => fItem.PreqNo === prNo )//&& fItem.PreqItem === aData.at(item).PRITM);
        
                                    if (oRetMsg.length > 0) {
                                        if (oRetMsg[0].Type === 'S') {
                                            message = message + oRetMsg[0].Message + "\n"
                                        }else{
                                            message = message + oRetMsg[0].Message + "\n"
                                        }
                                    }
                                    else{
                                        message = message + "Error Occured in " + prNo + "\n"
                                    }
                                    resolve();
                                    
                                    MessageBox.information(message);
                                    
                                },
                                error: function(err) {
                                    var errorMsg;
                                    try {
                                        errorMsg = JSON.parse(err.responseText).error.message.value;
                                    } catch (err) {
                                        errorMsg = err.responseText;
                                    }

                                    //message = errorMsg
                                    MessageBox.error(errorMsg);
                                    resolve();
                                }
                            })
                        });

                        await this.loadAllData();
                        this.setReqField("MatDataDetailForm", "ReadMode");
                        this.setReqField("QtyDtHeaderForm", "ReadMode");
                        this.setReqField("SupplyTypHeaderForm", "ReadMode");
                        this.setReqField("CustDataHeaderForm", "ReadMode");

                        this.setFieldEditable("MatDataDetailForm", "ReadMode");
                        this.setFieldEditable("QtyDtHeaderForm", "ReadMode");
                        this.setFieldEditable("SupplyTypHeaderForm", "ReadMode");
                        this.setFieldEditable("CustDataHeaderForm", "ReadMode");

                        this.byId("editPRBtn").setVisible(true);
                        this.byId("savePRBtn").setVisible(false);
                        this.byId("cancelPRBtn").setVisible(false);

                    }
                    Common.closeLoadingDialog(that);
                }
                
            },

            checkIfFieldIsNotEmpty: function(fieldName){
                var me = this;
                var oView = this.getView();
                var formView = this.getView().byId(fieldName); //Form View
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
                                        } else {
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
            },
            getFieldData: async function(fieldName){
                var me = this;
                var oView = this.getView();
                var formView = this.getView().byId(fieldName); //Form View
                var formContainers = formView.getFormContainers(); // Form Container
                var formElements = ""; //Form Elements
                var formFields = ""; // Form Field
                
                //Form Validations
                //Iterate Form Containers
                for (var index in formContainers) {
                    formElements = formContainers[index].getFormElements(); //get Form Elements

                    //iterate Form Elements
                    for (var elementIndex in formElements) {
                        formFields = formElements[elementIndex].getFields(); //get FIelds in Form Element

                        //Iterate Fields
                        for (var formIndex in formFields) {
                            if(formFields[formIndex].isA("sap.m.Input")){
                                if(formFields[formIndex].getId().includes("SHORTTEXT")){
                                    this._resultfields.SHORTTEXT = formFields[formIndex].getValue();
                                }
                                if(formFields[formIndex].getId().includes("BATCH")){
                                    this._resultfields.BATCH = formFields[formIndex].getValue();
                                }
                                if(formFields[formIndex].getId().includes("MATGRP")){
                                    this._resultfields.MATGRP = formFields[formIndex].getValue();
                                }
                                if(formFields[formIndex].getId().includes("MATTYP")){
                                    this._resultfields.MATTYP = formFields[formIndex].getValue();
                                }

                                if(formFields[formIndex].getId().includes("QUANTITY")){
                                    this._resultfields.QUANTITY = formFields[formIndex].getValue();
                                }
                                if(formFields[formIndex].getId().includes("ORDERQTY")){
                                    this._resultfields.ORDERQTY = formFields[formIndex].getValue();
                                }
                                if(formFields[formIndex].getId().includes("OPENQTY")){
                                    this._resultfields.OPENQTY = formFields[formIndex].getValue();
                                }

                                if(formFields[formIndex].getId().includes("INFNR")){
                                    this._resultfields.INFNR = formFields[formIndex].getValue();
                                }
                                if(formFields[formIndex].getId().includes("VENDOR")){
                                    this._resultfields.VENDOR = formFields[formIndex].getValue();
                                }
                                if(formFields[formIndex].getId().includes("PURORG")){
                                    this._resultfields.PURORG = formFields[formIndex].getValue();
                                }

                                if(formFields[formIndex].getId().includes("SUPTYP")){
                                    this._resultfields.SUPTYP = formFields[formIndex].getValue();
                                }
                                if(formFields[formIndex].getId().includes("SALESGRP")){
                                    this._resultfields.SALESGRP = formFields[formIndex].getValue();
                                }
                                if(formFields[formIndex].getId().includes("CUSTGRP")){
                                    this._resultfields.CUSTGRP = formFields[formIndex].getValue();
                                }
                                if(formFields[formIndex].getId().includes("SEASON")){
                                    this._resultfields.SEASON = formFields[formIndex].getValue();
                                }
                                if(formFields[formIndex].getId().includes("CUSTSTYLE")){
                                    this._resultfields.CUSTSTYLE = formFields[formIndex].getValue();
                                }
                            }else if(formFields[formIndex].isA("sap.m.DatePicker")){
                                if(formFields[formIndex].getId().includes("DELDT")){
                                    this._resultfields.DELDT = formFields[formIndex].getValue();
                                }
                            }
                            //else if(formFields[formIndex].isA("sap.m.CheckBox")){
                            //     // console.log(formFields[formIndex].getId())
                            // }
                        }
                    }

                }
            },
            onCancelEdit: async function(){
                Common.openLoadingDialog(that);
                await this.loadAllData();
                this.setReqField("MatDataDetailForm", "ReadMode");
                this.setReqField("QtyDtHeaderForm", "ReadMode");
                this.setReqField("SupplyTypHeaderForm", "ReadMode");
                this.setReqField("CustDataHeaderForm", "ReadMode");

                this.setFieldEditable("MatDataDetailForm", "ReadMode");
                this.setFieldEditable("QtyDtHeaderForm", "ReadMode");
                this.setFieldEditable("SupplyTypHeaderForm", "ReadMode");
                this.setFieldEditable("CustDataHeaderForm", "ReadMode");

                this.byId("editPRBtn").setVisible(true);
                this.byId("savePRBtn").setVisible(false);
                this.byId("cancelPRBtn").setVisible(false);
                Common.closeLoadingDialog(that);
            },

            handleSuggestions: async function(){
                var me = this;
                var vSBU = this._sbu;
                var purPlantVal = this.getView().getModel("headerData").getData().PLANTCD;
                var bProceed = true;

                var oModelFilter = this.getOwnerComponent().getModel('ZVB_3DERP_PRM_FILTERS_CDS');

                var oJSONModel = new JSONModel();

                oJSONModel = new JSONModel();
                // 'PURORG'
                await new Promise((resolve, reject) => {
                    oModelFilter.read('/ZVB_3DERP_PR_PURORG_SH',{
                        success: function (data, response) {
                            var dataResult = [];
                            data.results.forEach(item=>{
                                if(item.PurchPlant === purPlantVal){
                                    item.Item = item.PURORG;
                                    item.Desc = item.Description;
                                    dataResult.push(item);
                                }
                                // item.Desc = item.DESCRIPTION;
                            })
                            oJSONModel.setData(dataResult)
                            me.getView().setModel(oJSONModel, "purchOrgSource");
                            resolve();
                        },
                        error: function (err) {
                            resolve();
                        }
                    });
                });
                // if(fieldName === 'VENDOR'){
                    var vPurOrg = this.getView().getModel("headerData").getData().PURORG;
                    if(vPurOrg === null || vPurOrg === undefined || vPurOrg === ""){
                        bProceed = false;
                    }

                   //if(bProceed){
                        oJSONModel = new JSONModel();
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

                                    oJSONModel.setData(dataResult)
                                    me.getView().setModel(oJSONModel, "vendorSource");
                                    resolve();
                                },
                                error: function (err) {
                                    resolve();
                                }
                            });
                        });
                    //}else{
                       //MessageBox.error("Purchasing Org. is Required!");
                   //}
                //}
                
                // 'SUPTYP'
                oJSONModel = new JSONModel();
                await new Promise((resolve, reject) => {
                    oModelFilter.read('/ZVB_3DERP_MPRSUPTYP_SH',{
                        success: function (data, response) {
                            data.results.forEach(item=>{
                                item.Item = item.SUPTYP;
                                item.Desc = item.Description;
                            })
                            oJSONModel.setData(data.results)
                            me.getView().setModel(oJSONModel, "supTypSource");
                            resolve();
                        },
                        error: function (err) {
                            resolve();
                        }
                    });
                });
            },
            onSuggestionItemSelected: async function(oEvent){
                var oSelectedItem = oEvent.getParameter("selectedItem");
                var sKey = oSelectedItem.getKey();
                var oSource = oEvent.getSource();
                var oModelFilter = this.getOwnerComponent().getModel('ZVB_3DERP_PRM_FILTERS_CDS');
                var me = this;
                var oJSONModel = new JSONModel();
               

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

                if(oEvent.getSource().getId().includes("PURORG")){
                    var vPurOrg = this.getView().getModel("headerData").getData().PURORG;
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

                                oJSONModel.setData(dataResult)
                                me.getView().setModel(oJSONModel, "vendorSource");
                                resolve();
                            },
                            error: function (err) {
                                resolve();
                            }
                        });
                    });
                }
            },

            onSuggestionItems: async function(oData){
                var me = this;
                var vSBU = this._sbu;

                var oModelFilter = this.getOwnerComponent().getModel('ZVB_3DERP_PR_FILTERS_CDS');
                var oModelFilter2 = this.getOwnerComponent().getModel('ZVB_3DERP_PRM_FILTERS_CDS');

                 //MATGRP
                await new Promise((resolve, reject) => {
                    oModelFilter.read('/ZVB_3DERP_MATGRP_SH',{
                        success: function (data, response) {
                            data.results.forEach(item=>{
                                item.MATGRP = item.MaterialGrp;
                                item.Item = item.MaterialGrp;
                                item.Desc = item.Description;
                            })

                            me.getView().setModel(new JSONModel(data.results),"onSuggMATGRP");
                            resolve();
                        },
                        error: function (err) {
                            resolve();
                        }
                    });
                });

                //BATCH
                await new Promise((resolve, reject) => {
                    oModelFilter2.read('/ZVB_3DERP_PR_BATCH_SH',{
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
                            me.getView().setModel(new JSONModel(dataResult),"onSuggBATCH");
                            resolve();
                        },
                        error: function (err) {
                            resolve();
                        }
                    });
                });

                var plantCd = oData.PLANTCD;//this.getView().getModel("headerData").getData().PLANTCD;
                var oModelData = {};
                //PURORG
                await new Promise((resolve, reject) => {
                    oModelFilter.read('/ZVB_3DERP_PR_PURORG_SH',{
                        success: function (data, response) {
                            oModelData = data.results.filter(item=> item.PurchPlant === plantCd )
                            oModelData.forEach(item=>{
                                item.Item = item.PURORG;
                                item.Desc = item.Description;
                            })


                            me.getView().setModel(new JSONModel(oModelData),"onSuggPURORG");
                            resolve();
                        },
                        error: function (err) {
                            resolve();
                        }
                    });
                });

                var purOrg= oData.PURORG;//this.getView().getModel("headerData").getData().PURORG;
                //VENDOR
                await new Promise((resolve, reject) => {
                    oModelFilter2.read('/ZVB_3DERP_PR_VENDOR_SH',{
                        success: function (data, response) {
                            oModelData = data.results.filter(item=> item.PURORG === purOrg)
                            oModelData.forEach(item=>{
                                while (item.VENDOR.length < 10) item.VENDOR = "0" + item.VENDOR;
                                item.Item = item.VENDOR;
                                item.Desc = item.Description;
                            })

                            me.getView().setModel(new JSONModel(oModelData),"onSuggVENDOR");
                            resolve();
                        },
                        error: function (err) {
                            resolve();
                        }
                    });
                });

                //SUPTYP
                await new Promise((resolve, reject) => {
                    oModelFilter.read('/ZVB_3DERP_SUPPTYP_SH',{
                        success: function (data, response) {
                            data.results.forEach(item=>{
                                item.Item = item.SupTyp;
                                item.Desc = item.ShortText;
                                item.SUPTYP = item.SupTyp;
                                item.DESCRIPTION = item.ShortText;
                            })

                            me.getView().setModel(new JSONModel(data.results),"onSuggSUPTYP");
                            resolve();
                        },
                        error: function (err) {
                            resolve();
                        }
                    });
                });
                //SALESGRP
                await new Promise((resolve, reject) => {
                    oModelFilter2.read('/ZVB_3DERP_PR_SALESGRP_SH',{
                        success: function (data, response) {
                            data.results.forEach(item=>{
                                item.SALESGRP = item.SALESGRP;
                                item.Item = item.SALESGRP;
                                item.Desc = item.Description;
                            })

                            me.getView().setModel(new JSONModel(data.results),"onSuggSALESGRP");
                            resolve();
                        },
                        error: function (err) {
                            resolve();
                        }
                    });
                });
                //CUSTGRP
                await new Promise((resolve, reject) => {
                    oModelFilter2.read('/ZVB_3DERP_PR_CUSTGRP_SH',{
                        success: function (data, response) {
                            data.results.forEach(item=>{
                                item.Item = item.CUSTGRP;
                                item.Desc = item.Description;
                            })

                            me.getView().setModel(new JSONModel(data.results),"onSuggCUSTGRP");
                            resolve();
                        },
                        error: function (err) {
                            resolve();
                        }
                    });
                });
                //SEASONCD
                await new Promise((resolve, reject) => {
                    oModelFilter2.read('/ZVB_3DERP_SEASON_SH',{
                        success: function (data, response) {
                            var dataResult = [];
                            data.results.forEach(item=>{
                                if(item.SBU === vSBU){
                                    item.Item = item.SEASONCD;
                                    item.Desc = item.DESCRIPTION;
                                    dataResult.push(item);
                                }
                            })
                            me.getView().setModel(new JSONModel(data.results),"onSuggSEASONCD");
                            resolve();
                        },
                        error: function (err) {
                            resolve();
                        }
                    });
                });
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

            handleFormValueHelp: function (oEvent) {
                TableValueHelp.handleFormValueHelp(oEvent, this);
            },

            //not used
            handleValueHelp: async function(oEvent){
                var me = this;
                var vSBU = this._sbu;
                var purPlantVal = this.getView().getModel("headerData").getData().PLANTCD;
                var bProceed = true;

                
                var oModelFilter = this.getOwnerComponent().getModel('ZVB_3DERP_PRM_FILTERS_CDS');
                var oSource = oEvent.getSource();
                var fieldName = oSource.getBindingInfo("value").parts[0].path.replace("/", "");

                this._inputId = oSource.getId();
                this._inputValue = oSource.getValue();
                this._inputSource = oSource;

                var valueHelpObjects = [];
                var title = "";

                
                if(fieldName === 'PURORG'){
                    await new Promise((resolve, reject) => {
                        oModelFilter.read('/ZVB_3DERP_PR_PURORG_SH',{
                            success: function (data, response) {
                                var dataResult = [];
                                data.results.forEach(item=>{
                                    if(item.PurchPlant === purPlantVal){
                                        item.Item = item.PURORG;
                                        item.Desc = item.Description;
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
                    var vPurOrg = this.getView().getModel("headerData").getData().PURORG;
                    if(vPurOrg === null || vPurOrg === undefined || vPurOrg === ""){
                        bProceed = false;
                    }

                    if(bProceed){
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
            //not used

            onInputLiveChangeSuggestion: async function(oEvent){
                var oSource = oEvent.getSource();
                var isInvalid = !oSource.getSelectedKey() && oSource.getValue().trim();
                var oMandatoryModel = this.getView().getModel("MandatoryFieldsData").getProperty("/");

                oSource.setValueState(isInvalid ? "Error" : "None");
                oSource.setValueStateText("Invalid Entry");

                if(oSource.getSuggestionItems().length > 0){
                    oSource.getSuggestionItems().forEach(item => {
                        if (item.getProperty("key") === oSource.getSelectedKey()) {
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
                    var sModel = oSource.getBindingInfo("value").parts[0].model;
                    var sPath = oSource.getBindingInfo("value").parts[0].path;
                    this.getView().getModel(sModel).setProperty(sPath, oSource.getSelectedKey());
    
                    this._validationErrors.forEach((item, index) => {
                        if (item === oEvent.getSource().getId()) {
                            this._validationErrors.splice(index, 1)
                        }
                    })
                }
            },

            onHeaderChange: function (oEvent) {
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
                //if original value is equal to change value
                if(oEvent.getParameters().value === oEvent.getSource().getBindingInfo("value").binding.oValue){
                    this._isEdited = false;
                }else{
                    this._isEdited = true;
                }
            },

           
        });
    });
