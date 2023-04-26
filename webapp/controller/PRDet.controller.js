sap.ui.define([
    "sap/ui/core/mvc/Controller",
    'sap/ui/model/Filter',
    "../js/Common",
    // "../js/Utils",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    'jquery.sap.global',
    'sap/ui/core/routing/HashChanger'
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, Filter, Common, JSONModel, MessageBox, Utils, jQuery, HashChanger) {
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
                that.callCaptionsAPI();
                this._router.getRoute("PRDetail").attachPatternMatched(this._routePatternMatched, this);
                
                this._validationErrors = [];
                this._oDataOnEditValidate = [];
                this._getFieldResultsData = [];
                this._resultfields = {}

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
                await this.getHeaderData();
                await this.getHeaderConfig();
            },
            getHeaderData: async function () {
                var me = this;
                var prno = this._prno;
                var pritm = this._pritm;
                var oModel = this.getOwnerComponent().getModel();
                var oJSONModel = new sap.ui.model.json.JSONModel();
                var oView = this.getView();

                Common.openLoadingDialog(that);

                //read Style header data
                
                var entitySet = "/PRSet(PRNO='" + prno + "',PRITM='"+ pritm +"')"
                await new Promise((resolve, reject)=>{
                    oModel.read(entitySet, {
                        success: function (oData, oResponse) {
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
                            oView.setModel(oJSONModel, "headerData");
                            Common.closeLoadingDialog(that);
                            resolve();
                            // me.setChangeStatus(false);
                        },
                        error: function () {
                            Common.closeLoadingDialog(that);
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
                            console.log(oData)
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
                                        
                                        
                                        console.log(oEditableFields);
                                        console.log(oMandatoryFields);
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
                Common.openLoadingDialog(that);
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

                this._getFieldResultsData = [];
                this._resultfields = {};

                var resultsData = [];

                var message = "";

                await this.getFieldData("MatDataDetailForm");
                await this.getFieldData("QtyDtHeaderForm");
                await this.getFieldData("SupplyTypHeaderForm");
                await this.getFieldData("CustDataHeaderForm");

                this._getFieldResultsData = this._resultfields;
                resultsData = this._getFieldResultsData;

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
                            error: function() {
                                message = msgError
                                MessageBox.error(message);
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
                                // console.log(formFields[formIndex].getId())
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


           
        });
    });
