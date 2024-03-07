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
        "sap/ui/core/routing/HashChanger",
        "sap/ui/model/xml/XMLModel",
        "../js/TableFilter",
        "../js/TableValueHelp",
        'sap/m/SearchField',
        'sap/ui/model/type/String',
        "../js/Utils",
    ],
    function(BaseController, JSONModel, MessageBox, Common, formatter, Filter, FilterOperator,Device, HashChanger, XMLModel, TableFilter, TableValueHelp, SearchField, typeString, Utils) {
      "use strict";

      var that;
      var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({pattern : "MM/dd/yyyy" });
      var sapDateFormat = sap.ui.core.format.DateFormat.getDateInstance({pattern : "yyyy-MM-dd" });
      var _promiseResult;
  
      return BaseController.extend("zuipr.controller.Main", {
        onInit: async function () {
            that = this;
            Common.openLoadingDialog(that);

            this.callCaptionsAPI(); //call captions function
            this.getView().setModel(new JSONModel(this.getOwnerComponent().getModel("CAPTION_MSGS_MODEL").getData().text), "ddtext");
            this._validationErrors = []; //store errors in field validations

            //router component - navigate to details
            var _oComponent = this.getOwnerComponent();
            this._router = _oComponent.getRouter();

            this.setSmartFilterModel();//set SmartFilter Model

            this._oModel = this.getOwnerComponent().getModel();
            // this._i18n = this.getOwnerComponent().getModel("i18n").getResourceBundle();

            this._isEdited = false
            this._DiscardChangesDialog = null;
            this._oDataBeforeChange = {}
            this._smartFilterBar = this.getView().byId("SmartFilterBar");

            //for word Searching Function
            this._isSearchGlobalHasValue = false;
            this._searchQuery = "";

            this._oDataOnEditValidate = [];
            this._oAssignVendorData = [];
            this._oLockData = [];
            
            this.getView().setModel(new JSONModel({
                dataMode: 'NODATA',
                sbu: "",
                prno: "",
                pritem: ""
            }), "ui");

            this.getView().setModel(new JSONModel({
                total: 0
            }), "counts");

            this._tableFullScreenRender = false;

            this._aColumns = {};
            this._tblColumns = {};
            this._tableFilter = TableFilter;
            this._colFilters = {};

            this._tableValueHelp = TableValueHelp; 

            this._columnLoadError = false; //Column Load Error Object - Determines/Store the boolean if Column has error.
            this._appAction = "" //global variable of Application Action if Display or Change
            await this.getAppAction(); //Get the Application actions if Display or Change in LTD

            if(this._appAction === "display"){
                this.byId("btnNew").setVisible(false);
                this.byId("btnEdit").setVisible(false);
                this.byId("btnDelete").setVisible(false);
                this.byId("btnClose").setVisible(false);
                this.byId("btnSave").setVisible(false);
                this.byId("btnCancel").setVisible(false);
                this.byId("btnTabLayout").setVisible(false);
                this.byId("btnView").setVisible(false);
                this.byId("_IDGenMenuButton3").setVisible(false);
            }


            var oModel = this.getOwnerComponent().getModel("ZVB_3DERP_PR_FILTERS_CDS");
            oModel.read("/ZVB_3DERP_SBU_SH", {
                success: function (oData, oResponse) {
                    if (oData.results.length === 1) {
                         that.getView().getModel("ui").setProperty("/sbu", oData.results[0].SBU);
                    }
                    else {
                        Common.closeLoadingDialog(that);
                        that.byId("btnPOList").setEnabled(false);
                        that.byId("btnRefresh").setEnabled(false);
                        that.byId("btnNew").setEnabled(false);
                        that.byId("btnEdit").setEnabled(false);
                        that.byId("btnDelete").setEnabled(false);
                        that.byId("btnClose").setEnabled(false);
                        that.byId("btnSave").setEnabled(false);
                        that.byId("btnCancel").setEnabled(false);
                        that.byId("btnTabLayout").setEnabled(false);
                        that.byId("btnView").setEnabled(false);
                        that.byId("btnFullScreen").setEnabled(false);
                        that.byId("_IDGenMenuButton3").setEnabled(false);
                    }
                },
                error: function (err) { }
            });
            this._oMultiInputMatTyp = this.getView().byId("multiInputMatTyp");
            this._oMultiInputMatTyp.addValidator(this._onMultiInputValidate.bind(this));

            this._oMultiInputSeasonCd = this.getView().byId("multiInputSeasonCd");
            this._oMultiInputSeasonCd.addValidator(this._onMultiInputValidate.bind(this));
        },
        getAppAction: async function(){
            if(sap.ushell.Container !==undefined){
                const fullHash = new HashChanger().getHash();
                const urlParsing = await sap.ushell.Container.getServiceAsync("URLParsing");
                const shellHash = urlParsing.parseShellHash(fullHash);
                const sAction = shellHash.action;
                this._appAction = sAction;
            }
        },

        onAssignedFiltersChanged: function(oEvent){
            var oStatusText = this.getView().byId("statusText");
			if (oStatusText && this._smartFilterBar) {
				var sText = this._smartFilterBar.retrieveFiltersWithValuesAsText();

				oStatusText.setText(sText);
			}
        },
        onSBUChange: async function(oEvent) {
            var vSBU = this.getView().byId("cboxSBU").getSelectedKey();
            this.getView().getModel("ui").setProperty("/sbu", vSBU);

            await this.getHeaderSearchValuesBasedonSBU();
        },
        setSmartFilterModel: function () {
            //Model StyleHeaderFilters is for the smartfilterbar
            var oModel = this.getOwnerComponent().getModel("ZVB_3DERP_PR_FILTERS_CDS");
            var oSmartFilter = this.getView().byId("SmartFilterBar");
            oSmartFilter.setModel(oModel);
        },

        onCustomSmartFilterValueHelp: function(oEvent) {
            var oSource = oEvent.getSource();
            var sModel = oSource.mBindingInfos.suggestionRows.model;
            var oCustomSmartFilterModel;
            var oSmartField = {};
            if (sModel == "materialTypeSrc") {
                oSmartField = {
                    idLabel: "Material Type",
                    idName: "MATTYP"
                }

                this.oColModel = new JSONModel({
                    "cols": [
                        {
                            "label": "Material Type",
                            "template": "MATTYP",
                            "width": "10rem",
                            "sortProperty": "MATTYP"
                        },
                        {
                            "label": "Description",
                            "template": "DESCRIPTION",
                            "sortProperty": "DESCRIPTION"
                        },
                    ]
                });

                oCustomSmartFilterModel = new JSONModel({
                    "title": "Material Type",
                    "key": "MATTYP"
                })
            }
            if(sModel == "seasonCodeSrc") {
                oSmartField = {
                    idLabel: "Season Code",
                    idName: "SEASONCD"
                }

                this.oColModel = new JSONModel({
                    "cols": [
                        {
                            "label": "Season Code",
                            "template": "SEASONCD",
                            "width": "10rem",
                            "sortProperty": "SEASONCD"
                        },
                        {
                            "label": "Description",
                            "template": "DESCRIPTION",
                            "sortProperty": "DESCRIPTION"
                        },
                    ]
                });

                oCustomSmartFilterModel = new JSONModel({
                    "title": "Season Code",
                    "key": "SEASONCD"
                })
            }
            var aCols = this.oColModel.getData().cols;
                this._oBasicSearchField = new SearchField({
                    showSearchButton: false
            });

            this._oCustomSmartFilterValueHelpDialog = sap.ui.xmlfragment("zuipr.view.fragments.valuehelp.SmartFilterValueHelpDialog", this);
            this.getView().addDependent(this._oCustomSmartFilterValueHelpDialog);

            this._oCustomSmartFilterValueHelpDialog.setModel(oCustomSmartFilterModel);

            this._oCustomSmartFilterValueHelpDialog.setRangeKeyFields([{
                label: oSmartField.idLabel,
                key: oSmartField.idName,
                type: "string",
                typeInstance: new typeString({}, {
                    maxLength: 4
                })
            }]);

            this._oCustomSmartFilterValueHelpDialog.getTableAsync().then(function (oTable) {
                oTable.setModel(this.getView().getModel(sModel));
                oTable.setModel(this.oColModel, "columns");
                if (oTable.bindRows) {
                    oTable.bindAggregation("rows", "/results");
                }

                if (oTable.bindItems) {
                    oTable.bindAggregation("items", "/results", function () {
                        return new ColumnListItem({
                            cells: aCols.map(function (column) {
                                return new Label({ text: "{" + column.template + "}" });
                            })
                        });
                    });
                }

                this._oCustomSmartFilterValueHelpDialog.update();
            }.bind(this));

            if (sModel == "materialTypeSrc") this._oCustomSmartFilterValueHelpDialog.setTokens(this._oMultiInputMatTyp.getTokens());
            if (sModel == "seasonCodeSrc") this._oCustomSmartFilterValueHelpDialog.setTokens(this._oMultiInputSeasonCd.getTokens());
            this._oCustomSmartFilterValueHelpDialog.open();
        },

        onCustomSmartFilterValueHelpOkPress: function (oEvent) {
            var aTokens = oEvent.getParameter("tokens");
                var oSource = oEvent.getSource();
                var sKey = Object.values(oSource.oModels)[0].oData.key;
                //var oObject = oArgs.suggestionObject.getBindingContext(oSmartField.model).getObject(),

                aTokens.forEach(item => {
                    item.mProperties.text = item.mProperties.key;
                })
                
                if (sKey == "MATTYP") this._oMultiInputMatTyp.setTokens(aTokens);
                this._oCustomSmartFilterValueHelpDialog.close();
                if (sKey == "SEASONCD") this._oMultiInputSeasonCd.setTokens(aTokens);
                this._oCustomSmartFilterValueHelpDialog.close();

        },
        onFilterBarSearch: function (oEvent) {
            var sSearchQuery = this._oBasicSearchField.getValue(),
                aSelectionSet = oEvent.getParameter("selectionSet");
            
            var aFilters = aSelectionSet.reduce(function (aResult, oControl) {

                var sKey = that._oCustomSmartFilterValueHelpDialog.getModel().oData.key;
                if (oControl.getValue()) {
                    aResult.push(new Filter({
                        path: sKey, //oControl.getName(),
                        operator: FilterOperator.Contains,
                        value1: oControl.getValue()
                    }));
                }

                return aResult;
            }, []);

            this._filterTable(new Filter({
                filters: aFilters,
                and: true
            }));
        },
        _filterTable: function (oFilter) {
            var oValueHelpDialog = this._oCustomSmartFilterValueHelpDialog;

            oValueHelpDialog.getTableAsync().then(function (oTable) {
                if (oTable.bindRows) {
                    oTable.getBinding("rows").filter(oFilter);
                }

                if (oTable.bindItems) {
                    oTable.getBinding("items").filter(oFilter);
                }

                oValueHelpDialog.update();
            });
        },
        _onMultiInputValidate: function(oArgs) {
            var oSmartField = {};

            if (oArgs.suggestionObject.sId.includes("multiInputMatTyp")) {
                oSmartField.model = "materialTypeSrc";
                oSmartField.id = "MATTYP";
                oSmartField.desc = "DESCRIPTION";
            }
            if (oArgs.suggestionObject.sId.includes("multiInputSeasonCd")) {
                oSmartField.model = "seasonCodeSrc";
                oSmartField.id = "SEASONCD";
                oSmartField.desc = "DESCRIPTION";
            }

            var aToken;
            if (oSmartField.model == "materialTypeSrc") aToken = this._oMultiInputMatTyp.getTokens();
            if (oSmartField.model == "seasonCodeSrc") aToken = this._oMultiInputSeasonCd.getTokens();

            if (oArgs.suggestionObject) {
                var oObject = oArgs.suggestionObject.getBindingContext(oSmartField.model).getObject(),
                    oToken = new Token();

                oToken.setKey(oObject[oSmartField.id]);
                //oToken.setText(oObject[oSmartField.desc] + " (" + oObject[oSmartField.id] + ")");
                oToken.setText(oObject[oSmartField.id]);
                aToken.push(oToken)

                if (oSmartField.model == "materialTypeSrc") {
                    this._oMultiInputMatTyp.setTokens(aToken);
                    this._oMultiInputMatTyp.setValueState("None");
                }
                if (oSmartField.model == "seasonCodeSrc") {
                    this._oMultiInputSeasonCd.setTokens(aToken);
                    this._oMultiInputSeasonCd.setValueState("None");
                }
            }else if (oArgs.text !== "") {
                if (oSmartField.model == "materialTypeSrc") {
                    this._oMultiInputMatTyp.setValueState("Error");
                }
                if (oSmartField.model == "seasonCodeSrc") {
                    this._oMultiInputSeasonCd.setValueState("Error");
                }
            }
            return null;
        },

        onCustomSmartFilterValueHelpChange: function(oEvent) {
            var oSource = oEvent.getSource();
            if (oSource.sId.includes("multiInputMatTyp")) {
                if (oEvent.getParameter("value") === "") this._oMultiInputMatTyp.setValueState("None");

                var aToken = this._oMultiInputMatTyp.getTokens();
                var aMatTypeList = [];

                aToken.forEach(item => {
                    aMatTypeList.push(item.mProperties.key);
                });

                if (aMatTypeList.length > 0){
                    if (oEvent.getParameter("value") === "") this._oMultiInputMatTyp.setValueState("None");
                }
            }
            if (oSource.sId.includes("multiInputSeasonCd")) {
                if (oEvent.getParameter("value") === "") this._oMultiInputSeasonCd.setValueState("None");

                var aToken = this._oMultiInputSeasonCd.getTokens();
                var aMatTypeList = [];

                aToken.forEach(item => {
                    aMatTypeList.push(item.mProperties.key);
                });

                if (aMatTypeList.length > 0){
                    if (oEvent.getParameter("value") === "") this._oMultiInputSeasonCd.setValueState("None");
                }
            }
        },

        onCustomSmartFilterValueHelpTokenUpdate(oEvent) {
            var oSource = oEvent.getSource();
            var oParameter = oEvent.getParameters();

            if (oParameter.type == "removed") {
                if (oSource.sId.includes("multiInputMatTyp")) {
                    var aToken = this._oMultiInputMatTyp.getTokens();
                    var aMatTypeList = [];

                    aToken.forEach(item => {
                        if (oParameter.removedTokens.filter(x => x.mProperties.key == item.mProperties.key).length == 0) {
                            aMatTypeList.push(item.mProperties.key);
                        }
                    });

                    if (aMatTypeList.length > 0){}
                } 
                if (oSource.sId.includes("multiInputSeasonCd")) {
                    var aToken = this._oMultiInputSeasonCd.getTokens();
                    var aMatTypeList = [];

                    aToken.forEach(item => {
                        if (oParameter.removedTokens.filter(x => x.mProperties.key == item.mProperties.key).length == 0) {
                            aMatTypeList.push(item.mProperties.key);
                        }
                    });

                    if (aMatTypeList.length > 0){}
                } 
            }
        },

        onRefreshMain: async function(){
            Common.openLoadingDialog(this);
            await this.getAllData();
            await this.getTableColumns();
            if(this._isSearchGlobalHasValue){
                if(this._searchQuery.length > 0)
                    this.exeGlobalSearch();
            }
            Common.closeLoadingDialog(this);
        },
        
        onSearch: async function(){
            if(this.getView().getModel("ui").getData().dataMode === 'EDIT'){
                this.onCancelEdit();
            }else{
                this._oDataBeforeChange = {}
                Common.openLoadingDialog(that);
                await this.getAllData();
                await this.onSuggestionItems();
                await this.getTableColumns();
                await this.getColumnProp();
                this.byId("btnPOList").setEnabled(true);
                this.byId("btnRefresh").setEnabled(true);
                this.byId("btnNew").setEnabled(true);
                this.byId("btnEdit").setEnabled(true);
                this.byId("btnDelete").setEnabled(true);
                this.byId("btnClose").setEnabled(true);
                this.byId("btnSave").setEnabled(true);
                this.byId("btnCancel").setEnabled(true);
                this.byId("btnTabLayout").setEnabled(true);
                this.byId("btnView").setEnabled(true);
                this.byId("btnFullScreen").setEnabled(true);
                this.byId("_IDGenMenuButton3").setEnabled(true);


                this.getView().getModel("ui").setProperty("/dataMode", 'READ');
                await this.getHeaderSearchValuesBasedonSBU();
                Common.closeLoadingDialog(that);
            }
            
        },

        getColumnProp: async function() {
            var sPath = jQuery.sap.getModulePath("zuipr", "/model/columns.json");

            var oModelColumns = new JSONModel();
            await oModelColumns.loadData(sPath);

            this._tblColumns = oModelColumns.getData();
            this._oModelColumns = oModelColumns.getData();
        },

        onSuggestionItems: async function(){
            var me = this;
            var vSBU = this.getView().byId("cboxSBU").getSelectedKey();

            var oModelFilter = this.getOwnerComponent().getModel('ZVB_3DERP_PR_FILTERS_CDS');
            var oModelFilter2 = this.getOwnerComponent().getModel('ZVB_3DERP_PRM_FILTERS_CDS');


            //UOM
            await new Promise((resolve, reject) => {
                this._oModel.read('/UOMvhSet', {
                    success: function (data, response) {
                        data.results.forEach(item => {
                            item.UOM = item.MSEHI;
                            item.Item = item.MSEHI;
                            item.Desc = item.MSEHL;
                        })
                        me.getView().setModel(new JSONModel(data.results),"onSuggORDERUOM");
                        resolve();
                    },
                    error: function (err) {
                        resolve();
                    }
                });
            });

            //MATNO
            await new Promise((resolve, reject) => {
                oModelFilter.read('/ZVB_3DERP_PRMATNO',{
                    success: function (data, response) {
                        data.results.forEach(item=>{
                            item.MATNO = item.MatNo;
                            item.Item = item.MatNo;
                            item.Desc = item.GMCDesc;
                            item.GMCDESCEN = item.GMCDesc;
                            item.BASEUOM = item.BaseUOM;
                        })
                        me.getView().setModel(new JSONModel(data.results),"onSuggMATNO");
                        resolve();
                    },
                    error: function (err) {
                        resolve();
                    }
                });
            });
            //MATGRP
            await new Promise((resolve, reject) => {
                oModelFilter.read('/ZVB_3DERP_MATGRP_SH',{
                    success: function (data, response) {
                        data.results.forEach(item=>{
                            item.MATGRP = item.MaterialGrp;
                            item.DESCRIPTION = item.Description;
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
            //SHIPTOPLANT
            await new Promise((resolve, reject) => {
                oModelFilter.read('/ZVB_3DERP_SHIPTOPLANT_SH',{
                    success: function (data, response) {
                        data.results.forEach(item=>{
                            item.SHIPTOPLANT = item.ShipToPlant;
                            item.Item = item.ShipToPlant;
                            item.Desc = item.DESCRIPTION;
                            item.DESC = item.DESCRIPTION;
                        })

                        me.getView().setModel(new JSONModel(data.results),"onSuggSHIPTOPLANT");
                        resolve();
                    },
                    error: function (err) {
                        resolve();
                    }
                });
            });
            //PLANTCD
            await new Promise((resolve, reject) => {
                oModelFilter.read('/ZVB_3DERP_PURPLANT_SH',{
                    success: function (data, response) {
                        data.results.forEach(item=>{
                            item.PLANTCD = item.PurchPlant;
                            item.Item = item.PurchPlant;
                            item.Desc = item.DESCRIPTION;
                            item.DESC = item.DESCRIPTION;
                        })

                        me.getView().setModel(new JSONModel(data.results),"onSuggPLANTCD");
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
            //PURGRP
            await new Promise((resolve, reject) => {
                oModelFilter2.read('/ZVB_3DERP_PURGRP_SH',{
                    success: function (data, response) {
                        data.results.forEach(item=>{
                            item.PURGRP = item.PurchGrp;
                            item.Item = item.PurchGrp;
                            item.Desc = item.Description;
                            item.DESCRIPTION = item.Description;
                        })

                        me.getView().setModel(new JSONModel(data.results),"onSuggPURGRP");
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

            //PURORG
            await new Promise((resolve, reject) => {
                oModelFilter.read('/ZVB_3DERP_PR_PURORG_SH',{
                    success: function (data, response) {
                        data.results.forEach(item=>{
                            item.Item = item.PURORG;
                            item.PURCHPLANT = item.PurchPlant;
                            item.Desc = item.Description;
                        })

                        me.getView().setModel(new JSONModel(data.results),"onSuggPURORG");
                        resolve();
                    },
                    error: function (err) {
                        resolve();
                    }
                });
            });
            //VENDOR
            await new Promise((resolve, reject) => {
                oModelFilter2.read('/ZVB_3DERP_PR_VENDOR_SH',{
                    success: function (data, response) {
                        data.results.forEach(item=>{
                            while (item.VENDOR.length < 10) item.VENDOR = "0" + item.VENDOR;
                            item.Item = item.VENDOR;
                            item.Desc = item.Description;
                        })

                        me.getView().setModel(new JSONModel(data.results),"onSuggVENDOR");
                        resolve();
                    },
                    error: function (err) {
                        resolve();
                    }
                });
            });
        },

        //Suggestion Items with Prerequisite and need to reinitialize
        onSuggestionItems_VENDOR_PURORG: async function(oEvent){
            var me = this;
            var oSource = oEvent.getSource();
            var oModelFilter = this.getOwnerComponent().getModel('ZVB_3DERP_PR_FILTERS_CDS');
            var oModelFilter2 = this.getOwnerComponent().getModel('ZVB_3DERP_PRM_FILTERS_CDS');
            var fieldName = oSource.getBindingInfo("value").parts[0].path.replace("/", "");
            var sRowPath = oSource.oParent.getBindingContext().sPath;
            let oModelData = {};
            
            if (fieldName === 'PURORG') {
                var vPlantCd = oEvent.getSource().oParent.oParent.getModel().getProperty(sRowPath + "/PLANTCD");
                await new Promise((resolve, reject) => {
                    oModelFilter.read('/ZVB_3DERP_PR_PURORG_SH',{
                        success: function (data, response) {
                            oModelData = data.results.filter(item=> item.PurchPlant === vPlantCd )
                            oModelData.forEach(item=>{
                                item.Item = item.PURORG;
                                item.PURCHPLANT = item.PurchPlant;
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
            }
            if (fieldName === 'VENDOR') {
                var vPurOrg= oEvent.getSource().oParent.oParent.getModel().getProperty(sRowPath + "/PURORG");
                await new Promise((resolve, reject) => {
                    oModelFilter2.read('/ZVB_3DERP_PR_VENDOR_SH',{
                        success: function (data, response) {
                            oModelData = data.results.filter(item=> item.PURORG === vPurOrg )
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
            }
        },

        getHeaderSearchValuesBasedonSBU: async function(){
            var me = this;
            var iCounter = 0;
            var itemResult = [];
            var vSBU = this.getView().getModel("ui").getData().sbu;
            var oModel = this.getOwnerComponent().getModel("ZVB_3DERP_PR_FILTERS_CDS");

            await new Promise((resolve, reject) => {
                oModel.read("/ZVB_3DERP_MATTYPE_SH", {
                    success: function (oData, oResponse) {
                        for(var item in oData.results){
                            iCounter++;
                            if(oData.results[item].SBU === vSBU){
                                oData.results[item].MATTYP = oData.results[item].MaterialType;
                                oData.results[item].DESCRIPTION = oData.results[item].Description;
                                itemResult.push(oData.results[item])
                            }
                            if(iCounter === oData.results.length){
                                var aData = new JSONModel({
                                    results: itemResult
                                });
                                me.getView().setModel(aData, "materialTypeSrc");
                                resolve();
                            }
                        }
                    },
                    error: function (err) { }
                });
            })

            itemResult = [];
            iCounter = 0;
            await new Promise((resolve, reject) => {
                oModel.read("/ZVB_3DERP_SEASON_SH", {
                    success: function (oData, oResponse) {
                        for(var item in oData.results){
                            iCounter++;
                            if(oData.results[item].SBU === vSBU){
                                itemResult.push(oData.results[item])
                            }
                            if(iCounter === oData.results.length){
                                var aData = new JSONModel({
                                    results: itemResult
                                });
                                me.getView().setModel(aData, "seasonCodeSrc");
                                resolve();
                            }
                        }
                    },
                    error: function (err) { }
                });
            })
        },

        getAllData: async function(){
            var me = this;

                return new Promise(async (resolve, reject)=>{
                    me.getView().setModel(new JSONModel({
                        results: []
                    }), "TableData");

                    resolve(await me.getPRData());
                });
        },

        getPRData: async function(){
            var oModel = this.getOwnerComponent().getModel();
            var me = this;
            var tblChange = this._tblChange;
            var oJSONModel = new sap.ui.model.json.JSONModel();
            var objectData = [];
            var aFilters = this.getView().byId("SmartFilterBar").getFilters();
            var aFiltersObj = [];
                

            var msgError = this.getView().getModel("captionMsg").getData()["INFO_ERROR"];

            var oSmartFilter = this.getView().byId("SmartFilterBar").getFilters();
            var aFilters = [],
                aFilter = [],
                aCustomFilter = [],
                aSmartFilter = [];

            if (oSmartFilter.length > 0)  {
                // aFilters = oSmartFilter[0].aFilters;
                oSmartFilter[0].aFilters.forEach(item => {
                    if(item.sPath === undefined){
                        if(item.aFilters[0].sPath === 'PRNO'){
                            if (!isNaN(item.aFilters[0].oValue1)) {
                                while (item.aFilters[0].oValue1.length < 10) item.aFilters[0].oValue1 = "0" + item.aFilters[0].oValue1;
                            }
                        }
                    }else if (item.sPath === 'PRNO') {
                        if (!isNaN(item.oValue1)) {
                            while (item.oValue1.length < 10) item.oValue1 = "0" + item.oValue1;
                        }
                    }


                    if(item.sPath === undefined){
                        if(item.aFilters[0].sPath === 'VENDOR'){
                            if (!isNaN(item.aFilters[0].oValue1)) {
                                while (item.aFilters[0].oValue1.length < 10) item.aFilters[0].oValue1 = "0" + item.aFilters[0].oValue1;
                            }
                        }
                    }else if (item.sPath === 'VENDOR') {
                        if (!isNaN(item.oValue1)) {
                            while (item.oValue1.length < 10) item.oValue1 = "0" + item.oValue1;
                        }
                    }



                    if (item.aFilters === undefined) {
                        aFilter.push(new Filter(item.sPath, item.sOperator, item.oValue1));
                    }
                    else {
                        aFilters.push(item);
                    }
                })

                if (aFilter.length > 0) { aFilters.push(new Filter(aFilter, false)); }
            }

            if (this.getView().byId("SmartFilterBar")) {
                var oCtrl = this.getView().byId("SmartFilterBar").determineControlByName("MATTYP");

                if (oCtrl) {
                    var aCustomFilter = [];

                    if (oCtrl.getTokens().length === 1) {
                        oCtrl.getTokens().map(function(oToken) {
                            aFilters.push(new Filter("MATTYP", FilterOperator.EQ, oToken.getKey()))
                        })
                    }
                    else if (oCtrl.getTokens().length > 1) {
                        oCtrl.getTokens().map(function(oToken) {
                            aCustomFilter.push(new Filter("MATTYP", FilterOperator.EQ, oToken.getKey()))
                        })

                        aFilters.push(new Filter(aCustomFilter));
                    }
                }

                var oCtrl = this.getView().byId("SmartFilterBar").determineControlByName("SEASONCD");

                if (oCtrl) {
                    var aCustomFilter = [];

                    if (oCtrl.getTokens().length === 1) {
                        oCtrl.getTokens().map(function(oToken) {
                            aFilters.push(new Filter("SEASONCD", FilterOperator.EQ, oToken.getKey()))
                        })
                    }
                    else if (oCtrl.getTokens().length > 1) {
                        oCtrl.getTokens().map(function(oToken) {
                            aCustomFilter.push(new Filter("SEASONCD", FilterOperator.EQ, oToken.getKey()))
                        })

                        aFilters.push(new Filter(aCustomFilter));
                    }
                }
            }
            aSmartFilter.push(new Filter(aFilters, true));
            return new Promise((resolve, reject)=>{
                oModel.read("/PRSet", {
                    filters: aSmartFilter,
                    success: function (data, response) {
                        if (data.results.length > 0) {
                            data.results.forEach((item, index) => {
                                item.DELETED = item.DELETED === "" ? false : true;
                                item.CREATEDDT = dateFormat.format(new Date(item.CREATEDDT));
                                item.UPDATEDDT = dateFormat.format(new Date(item.UPDATEDDT));
                                item.RELDT = dateFormat.format(new Date(item.RELDT));
                                item.REQDT = dateFormat.format(new Date(item.REQDT));
                                item.DELDT = dateFormat.format(new Date(item.DELDT));
                            })
                            
                            objectData.push(data.results);
                            objectData[0].sort((a,b) => (a.ITEM2 > b.ITEM2) ? 1 : ((b.ITEM2 > a.ITEM2) ? -1 : 0));
                            oJSONModel.setData(data);

                            me.getView().getModel("counts").setProperty("/total", data.results.length);
                        }
                        me.getView().setModel(oJSONModel, "TableData");
                        //Table Filter
                        TableFilter.applyColFilters("styleDynTable", me);
                        if(tblChange)
                            resolve(me.setTableColumnsData('PRHDR'));
                        resolve();
                    },
                    error: function (err) { 
                        MessageBox.error(msgError);
                        Common.closeLoadingDialog(that);
                    }
                });
            });
        },

        getTableColumns: async function(){
            _promiseResult = new Promise((resolve, reject)=>{
                resolve(this.getDynamicColumns('PRHDR', 'ZDV_3DERP_PR'));
            });
            await _promiseResult
        },
        getDynamicColumns: async function(model, dataSource) {
            var me = this;
            var modCode = model;
            var tabName = dataSource;
            //get dynamic columns based on saved layout or ZERP_CHECK
            var oJSONColumnsModel = new JSONModel();
            var vSBU = this.getView().byId("cboxSBU").getSelectedKey();
            // var vSBU = this.getView().getModel("ui").getData().sbu;

            var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");

            oModel.setHeaders({
                sbu: vSBU,
                type: modCode,
                tabname: tabName
            });
            return new Promise((resolve, reject) => {
                oModel.read("/ColumnsSet", {
                    success: async function (oData, oResponse) {
                        me._columnLoadError = false;
                        if (oData.results.length > 0) {
                            if(modCode === "PRHDR"){
                                me._aColumns["styleDynTable"] = oData.results;
                                oJSONColumnsModel.setData(oData.results);
                                me.getView().setModel(oJSONColumnsModel, "Columns");
                                me.setTableColumnsData(modCode);
                                resolve();
                            }
                            if(modCode === "PRPOLIST"){
                                me._aColumns["prPOListTbl"] = oData.results;
                                oJSONColumnsModel.setData(oData.results);
                                me.getView().setModel(oJSONColumnsModel, "POListCol");
                                me.setTableColumnsData(modCode);
                                resolve();
                            }
                            if(modCode === "INFRECLIST_PR"){
                                me._aColumns["GENINFORECTbl"] = oData.results;
                                oJSONColumnsModel.setData(oData.results);
                                me.getView().setModel(oJSONColumnsModel, "GENINFORECCol");
                                me.setTableColumnsData(modCode);
                                resolve();
                            }
                            if(modCode === "ASSIGNVENDORPR"){
                                me._aColumns["assignVendorTab"] = oData.results;
                                oJSONColumnsModel.setData(oData.results);
                                me.getView().setModel(oJSONColumnsModel, "ASSIGNVENDORPRCol");
                                me.setTableColumnsData(modCode);
                                resolve();
                            }
                        }else{
                            me._columnLoadError = true;
                            if(modCode === "PRHDR"){
                                me.getView().setModel(oJSONColumnsModel, "Columns");
                                me.setTableColumnsData(modCode);
                                resolve();
                            }
                            if(modCode === "PRPOLIST"){
                                me.getView().setModel(oJSONColumnsModel, "POListCol");
                                me.setTableColumnsData(modCode);
                                resolve();
                            }
                            if(modCode === "INFRECLIST_PR"){
                                me.getView().setModel(oJSONColumnsModel, "GENINFORECCol");
                                me.setTableColumnsData(modCode);
                                resolve();
                            }
                            if(modCode === "ASSIGNVENDORPR"){
                                me.getView().setModel(oJSONColumnsModel, "ASSIGNVENDORPRCol");
                                me.setTableColumnsData(modCode);
                                resolve();
                            }
                        }
                    },
                    error: function(){
                        me._columnLoadError = true;
                        if(modCode === "PRHDR"){
                            me.getView().setModel(oJSONColumnsModel, "Columns");
                            me.setTableColumnsData(modCode);
                            resolve();
                        }
                        if(modCode === "PRPOLIST"){
                            me.getView().setModel(oJSONColumnsModel, "POListCol");
                            me.setTableColumnsData(modCode);
                            resolve();
                        }
                        if(modCode === "INFRECLIST_PR"){
                            me.getView().setModel(oJSONColumnsModel, "GENINFORECCol");
                            me.setTableColumnsData(modCode);
                            resolve();
                        }
                        if(modCode === "ASSIGNVENDORPR"){
                            me.getView().setModel(oJSONColumnsModel, "ASSIGNVENDORPRCol");
                            me.setTableColumnsData(modCode);
                            resolve();
                        }
                    }
                });
            })
        },
        setTableColumnsData(modCode){
            var oColumnsModel;
            var oDataModel;

            var oColumnsData;
            var oData;
            if (modCode === 'PRHDR') {   
                oColumnsModel = this.getView().getModel("Columns");  
                oDataModel = this.getView().getModel("TableData"); 
                
                oColumnsData = oColumnsModel === undefined ? [] :oColumnsModel.getProperty('/');
                oData = oDataModel === undefined ? [] :oDataModel.getProperty('/results');
                
                if(this._columnLoadError){
                    oData = [];
                }                
                this.addColumns("styleDynTable", oColumnsData, oData, modCode);
            }else if(modCode === 'PRPOLIST'){
                oColumnsModel = this.getView().getModel("POListCol");  
                oDataModel = this.getView().getModel("PRPOListData"); 
                
                oColumnsData = oColumnsModel === undefined ? [] :oColumnsModel.getProperty('/');
                oData = oDataModel === undefined ? [] :oDataModel.getProperty('/results');
                
                if(this._columnLoadError){
                    oData = [];
                }
                this.addColumns("prPOListTbl", oColumnsData, oData, modCode);    
            }else if(modCode === 'INFRECLIST_PR'){
                oColumnsModel = this.getView().getModel("GENINFORECCol");  
                oDataModel = this.getView().getModel("GENINFORECData"); 
                
                oColumnsData = oColumnsModel === undefined ? [] :oColumnsModel.getProperty('/');
                oData = oDataModel === undefined ? [] :oDataModel.getProperty('/results');
                
                if(this._columnLoadError){
                    oData = [];
                }
                this.addColumns("GENINFORECTbl", oColumnsData, oData, modCode);    

            }else if(modCode === 'ASSIGNVENDORPR'){
                oColumnsModel = this.getView().getModel("ASSIGNVENDORPRCol");  
                oDataModel = this.getView().getModel("ASSIGNVENDORPRData"); 
                
                oColumnsData = oColumnsModel === undefined ? [] :oColumnsModel.getProperty('/');
                oData = oDataModel === undefined ? [] :oDataModel.getProperty('/results');
                
                if(this._columnLoadError){
                    oData = [];
                }
                this.addColumns("assignVendorTab", oColumnsData, oData, modCode);    

            }
        },
        addColumns: async function(table, columnsData, data, model) {
            var me = this;
            var oModel = new JSONModel();
            oModel.setData({
                columns: columnsData,
                rows: data
            });
            var oDelegateKeyUp = {
                onkeyup: function(oEvent){
                    that.onkeyup(oEvent);
                },
                
                
                onsapenter : function(oEvent){
                    that.onSapEnter(oEvent);
                }
            };

            this.getView().byId(table).addEventDelegate(oDelegateKeyUp);
            var oTable = this.getView().byId(table);
            oTable.setModel(oModel);
            
            //double click event
            oTable.attachBrowserEvent('dblclick',function(e){
                e.preventDefault();
                if(me.getView().getModel("ui").getData().dataMode === 'READ'){
                    me.goToDetail(); //navigate to detail page
                }
             });

            oTable.bindColumns("/columns", function (index, context) {
                var sColumnId = context.getObject().ColumnName;
                var sColumnLabel = context.getObject().ColumnLabel;
                var sColumnType = context.getObject().DataType;
                var sColumnVisible = context.getObject().Visible;
                var sColumnSorted = context.getObject().Sorted;
                var sColumnSortOrder = context.getObject().SortOrder;
                var sColumnWidth = context.getObject().ColumnWidth;
                
                if(table === "styleDynTable" && sColumnId === "INFORECORD"){
                    var oControl = new sap.m.Link({
                        text: "{" + sColumnId + "}",
                        wrapping: false, 
                        tooltip: "{" + sColumnId + "}",
                        press: function(oEvent) {
                            const vInfoRec = oEvent.oSource.mProperties.text
                            // const vRow = oEvent.oSource.getBindingInfo("text").binding.getContext().sPath;
                            // const vIONo =  oEvent.oSource.mProperties.text;
                            // const vStyleNo =  oTable.getModel().getProperty(vRow + "/STYLENO");
                            var oData = {
                                DOCTYPE: "INFORECORD",
                                IONO: vInfoRec
                            }
                            me.viewDoc(oData);
                        },
                    })
                    oControl.addStyleClass("hyperlink");

                    return new sap.ui.table.Column({
                        id: model+"-"+sColumnId,
                        label: new sap.m.Text({text: sColumnLabel}),
                        template: oControl,
                        width: sColumnWidth + "px",
                        hAlign: me.columnSize(sColumnId),
                        sortProperty: sColumnId,
                        filterProperty: sColumnId,
                        autoResizable: true,
                        visible: sColumnVisible,
                        sorted: sColumnSorted,
                        sortOrder: ((sColumnSorted === true) ? sColumnSortOrder : "Ascending" )
                    });
                }

                if (sColumnType === "STRING" || sColumnType === "DATETIME"|| sColumnType === "BOOLEAN") {
                    return new sap.ui.table.Column({
                        id: model + "-" + sColumnId,
                        label: new sap.m.Text({text: sColumnLabel}),
                        template: me.columnTemplate(sColumnId, sColumnType), //default text
                        width: sColumnWidth + "px",
                        hAlign: me.columnSize(sColumnId),
                        sortProperty: sColumnId,
                        filterProperty: sColumnId,
                        autoResizable: true,
                        visible: sColumnVisible,
                        sorted: sColumnSorted,
                        sortOrder: ((sColumnSorted === true) ? sColumnSortOrder : "Ascending" )
                    });
                }else if (sColumnType === "NUMBER") {
                    return new sap.ui.table.Column({
                        id: model + "-" + sColumnId,
                        label: new sap.m.Text({text: sColumnLabel}),
                        template: new sap.m.Text({ 
                            text: {
                                path: sColumnId,
                                columnType: sColumnType
                            },
                            wrapping: false, 
                            tooltip: "{" + sColumnId + "}" 
                        }), //default text
                        width: sColumnWidth + "px",
                        hAlign: "End",
                        sortProperty: sColumnId,
                        filterProperty: sColumnId,
                        autoResizable: true,
                        visible: sColumnVisible,
                        sorted: sColumnSorted,
                        sortOrder: ((sColumnSorted === true) ? sColumnSortOrder : "Ascending" )
                    });
                }

            });

            //date/number sorting
            oTable.attachSort(function(oEvent) {
                var sPath = oEvent.getParameter("column").getSortProperty();
                var bDescending = false;
                
                //remove sort icon of currently sorted column
                oTable.getColumns().forEach(col => {
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
            oTable.bindRows("/rows");
            TableFilter.updateColumnMenu(table, this);
        },
        columnTemplate: function(sColumnId, sColumnType){
            var me = this;
            var oColumnTemplate;

            oColumnTemplate = new sap.m.Text({ 
                text: {
                    path: sColumnId,
                    columnType: sColumnType
                }, 
                wrapping: false, 
                tooltip: "{" + sColumnId + "}" 
            }); //default text

            if(sColumnId === "MATNO" || sColumnId === "BATCH" || sColumnId === "MATGRP" || sColumnId === "SHIPTOPLANT" ||
                sColumnId === "PLANTCD" || sColumnId === "PURGRP" || sColumnId === "VENDOR" || sColumnId === "PURORG" || 
                sColumnId === "SUPTYP" || sColumnId === "SALESGRP" || sColumnId === "CUSTGRP" || sColumnId === "SEASONCD"
            ){
                var columnnName = sColumnId;
                oColumnTemplate.bindText({
                    parts: [  
                        { path: sColumnId }
                    ],  
                    formatter: function(sColumnId) {
                        var oValue = me.getView().getModel("onSugg"+ columnnName +"").getData().filter(v => v[columnnName] === sColumnId);
                        
                        if (oValue && oValue.length > 0) {
                            return sColumnId;
                            // return oValue[0].Desc + " (" + sColumnId + ")";
                        }
                        else return sColumnId;
                    }
                })
            }

            if (sColumnId === "DELETED") { 
                //Manage button
                oColumnTemplate = new sap.m.CheckBox({
                    selected: "{" + sColumnId + "}",
                    editable: false
                });
            }
            if (sColumnId === "DLVCOMPLETE") { 
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
            }

            return oColumnTemplate;
        },
        columnSize: function(sColumnId){
            var oColumnSize;
            if (sColumnId === "DELETED") { 
                //Manage button
                oColumnSize = "Center";
            }
            if (sColumnId === "CLOSED") { 
                //Manage button
                oColumnSize = "Center";
            }
            return oColumnSize;
        },

        viewDoc: function (oData){
            var vSBU = this.getView().byId("cboxSBU").getSelectedKey();;
            var oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation");

            if (oData.DOCTYPE === "INFORECORD") {
                var hash = "PurchasingInfoRecord-create?sap-ui-tech-hint=GUI";
            }
            oCrossAppNavigator.toExternal({
                target: {
                    shellHash: hash
                }
            });
        },

        onSapEnter(oEvent) {
            if(that.getView().getModel("ui").getData().dataMode === 'READ'){
                that.goToDetail(); //navigate to detail page
            }
        },

        onkeyup: async function(oEvent){
            var me = this;
            var promiseResult;
            if((oEvent.key === "ArrowUp" || oEvent.key === "ArrowDown") && oEvent.srcControl.sParentAggregationName === "rows"){
                var sRowPath = this.byId(oEvent.srcControl.sId).oBindingContexts["undefined"].sPath;
                sRowPath = "/results/"+ sRowPath.split("/")[2];
                var index = sRowPath.split("/");

                var oRow = this.getView().getModel("TableData").getProperty(sRowPath);
                var oTable = this.byId("styleDynTable");

                promiseResult = new Promise((resolve, reject)=>{
                    me._tblChange = true;
                    oTable.getRows().forEach(row => {
                        if(row.getBindingContext().sPath.replace("/rows/", "") === index[2]){
                            resolve(row.addStyleClass("activeRow"));
                        }else{
                            resolve(row.removeStyleClass("activeRow"));
                        }
                    });
                });
                await promiseResult;
                this.getView().getModel("ui").setProperty("/prno", oRow['PRNO']);
                this.getView().getModel("ui").setProperty("/pritem", oRow['PRITM']);

                this._tblChange = false;
            }
        },

        // onSelectionChange: function(oEvent) {
        //     // var oTable = this.getView().byId("styleDynTable");
        //     // iSelectedIndex = oEvent.getSource().getSelectedIndex();
        //     // oTable.setSelectedIndex(iSelectedIndex);

        //     var sPath = oEvent.getParameter("rowContext").getPath();
        //     var oTable = this.getView().byId("styleDynTable");
        //     var model = oTable.getModel();

        //     // var index = sPath.split("/");
        //     // console.log(index[2]);
        //     // oTable.removeSelectionInterval(parseInt(index[2] - 1), parseInt(index[2] - 1));

        //     //get the selected  data from the model and set to variable PRNo/PRITM
        //     var data  = model.getProperty(sPath); 

        //     _PRNO = data['PRNO'];
        //     _PRITM = data['PRITM'];
        // },
        onCellClick: async function(oEvent){
            var promiseResult;
            var sRowPath = oEvent.getParameters().rowBindingContext.sPath;
            sRowPath = "/results/"+ sRowPath.split("/")[2];
            var oRow = this.getView().getModel("TableData").getProperty(sRowPath);
            var oTable = this.byId("styleDynTable");

            promiseResult = new Promise((resolve, reject)=>{
                this._tblChange = true;
                oTable.getRows().forEach(row => {
                    if(row.getBindingContext().sPath.replace("/rows/", "") === sRowPath.split("/")[2]){
                        resolve(row.addStyleClass("activeRow"));
                    }else{
                        resolve(row.removeStyleClass("activeRow"));
                    }
                });
            });
            await promiseResult;
            
            this.getView().getModel("ui").setProperty("/prno", oRow['PRNO']);
            this.getView().getModel("ui").setProperty("/pritem", oRow['PRITM']);

            this._tblChange = false;
        },

        onRowChange: async function(oEvent){
            var me = this;
            var sPath = oEvent.getParameter("rowContext");
            sPath = "/results/" + sPath.getPath().split("/")[2];
            var selPath = this.byId(oEvent.getParameters().id).mProperties.selectedIndex;

            var oTable = this.getView().byId("styleDynTable");
            var model = oTable.getModel();

            var oRow = this.getView().getModel("TableData").getProperty(sPath)

            this.getView().getModel("ui").setProperty("/prno", oRow.PRNO);
            this.getView().getModel("ui").setProperty("/pritem", oRow.PRITM);

            await new Promise((resolve, reject) => {
                oTable.getRows().forEach(row => {
                    if (row.getBindingContext().sPath.replace("/rows/", "") === sPath.split("/")[2]) {
                        resolve(row.addStyleClass("activeRow"));
                        // oTable.setSelectedIndex(selPath);
                    } else {
                        resolve(row.removeStyleClass("activeRow"));
                    }
                });
            });

        },

        goToDetail: function (oEvent) {
            //var oButton = oEvent.getSource();
            var PRNo = this.getView().getModel("ui").getData().prno;//oButton.data("PRNO").PRNO; //get the styleno binded to manage button
            var PRItm = this.getView().getModel("ui").getData().pritem;//oButton.data("PRNO").PRITM;
            var vSbu = this.getView().byId("cboxSBU").getSelectedKey();
            if(PRNo != "" || PRNo != null){
                while(PRNo.length < 10) PRNo = "0" + PRNo;
            }
            
            // that.setChangeStatus(false); //remove change flag
            that.navToDetail(vSbu, PRNo, PRItm); //navigate to detail page
        },

        navToDetail: function (SBU, PRNo, PRItm) {
            //route to detail page
            that._router.navTo("PRDetail", {
                SBU: SBU,
                PRNO: PRNo,
                PRITM: PRItm
            });
        },

        onEditTbl: async function(){
            // Common.openLoadingDialog(that);
            var bProceed = true;
            if(this.getView().getModel("ui").getData().dataMode === 'EDIT'){
                bProceed = false;
            }
            if(this.getView().getModel("ui").getData().dataMode === 'NODATA'){
                bProceed = false;
            }
            if(this._appAction === "display"){
                bProceed = false;
            }

            if(bProceed){
                var oModel = this.getOwnerComponent().getModel();
                var oEntitySet = "/PRSet";
                var me = this;
                
                var vSBU = this.getView().byId("cboxSBU").getSelectedKey();

                var oTable = this.byId("styleDynTable");
                var aSelIndices = oTable.getSelectedIndices();
                var oTmpSelectedIndices = [];
                var aData = this.getView().getModel("TableData").getData().results;//this._oDataBeforeChange.results != undefined? this._oDataBeforeChange.results : this.getView().getModel("TableData").getData().results;
                var aDataToEdit = [];
                var bDeleted = false, bWithMaterial = false;
                var iCounter = 0;
                var promiseResult;
                this._oLockData = [];

                //MessageBox Message
                var msgAlreadyDeleted = this.getView().getModel("captionMsg").getData()["INFO_ALREADY_DELETED"];
                var msgNoDataToEdit = this.getView().getModel("captionMsg").getData()["INFO_NO_DATA_EDIT"];
                var msgAlreadyClosed = this.getView().getModel("captionMsg").getData()["INFO_ALREADY_CLOSED"];

                //Initiate Edit Validation to Empty
                this._oDataOnEditValidate = []

                if (aSelIndices.length > 0) {
                    aSelIndices.forEach(item => {
                        oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
                    })

                    aSelIndices = oTmpSelectedIndices;
                    for(var item of aSelIndices){
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
                            me._oLockData.push({
                                Prno: PRNo,
                                Prln: PRItm
                            });
                            await new Promise((resolve, reject)=>{
                                oModel.read(oEntitySet + "(PRNO='" + PRNo + "',PRITM='"+ PRItm +"')", {
                                    success: async function (data, response) {
                                        iCounter++;
                                        // await me.checkEditableFields(aData.at(item).DOCTYP, PRNo, PRItm);
                                        aDataToEdit.push(aData.at(item));
    
                                        await new Promise((resolve1, reject1)=>{
                                            oModel.read("/ZERP_CHECKSet", {
                                                urlParameters: {
                                                    "$filter":"SBU eq '"+ vSBU +"' and FIELD1 eq '"+ aData.at(item).DOCTYP +"'"
                                                },
                                                success: async function (data, response) {
                                                    var count = 0;
                                                    var indx = 0;
                                                    var strDocTyp = "";
                                                    var strObj = {}
                                                    data.results.forEach(async dataItem => {
                                                        count++
                                                        strDocTyp = dataItem.FIELD1;
                                                    })
                                                    strObj["DOCTYP"] = (strDocTyp);
                                                    strObj["results"] = data.results
                                                    me._oDataOnEditValidate.push(strObj)
                                                    // indx = parseInt(Object.keys(me._oDataOnEditValidate).pop());
                                                    // me._oDataOnEditValidate[indx].DOCTYP = strDocTyp;
                                                    resolve1();
                                                    // console.log((Object.keys(me._oDataOnEditValidate).pop()));
                                                    // me._oDataOnEditValidate[(Object.keys(me._oDataOnEditValidate).pop())].results[parseInt(Object.keys(me._oDataOnEditValidate[(Object.keys(me._oDataOnEditValidate).pop())].results).pop()) + 1] = {PRNO: PRNo};
                                                    // me._oDataOnEditValidate[(Object.keys(me._oDataOnEditValidate).pop())].results[parseInt(Object.keys(me._oDataOnEditValidate[(Object.keys(me._oDataOnEditValidate).pop())].results).pop()) + 2] = {PRITM: PRItm};
                                                    // me._oDataOnEditValidate.results[parseInt(Object.keys(me._oDataOnEditValidate.results).pop()) + 1].PRITM = PRItm
                                                },
                                                error: function(error){
                                                    resolve1();
                                                }
                                            });
                                        });
                                        resolve();
                                        
                                    },
                                    error: function (err) {
                                        iCounter++;
                                    }
                                });
                            });
                            if (aSelIndices.length === iCounter) {
                                if (aDataToEdit.length === 0) {
                                    MessageBox.information(msgNoDataToEdit);
                                }
                                else {
                                    if(await me.prLock(me)){
                                        Common.openLoadingDialog(me);
                                        me.byId("btnPOList").setVisible(false);
                                        me.byId("btnRefresh").setVisible(false);
                                        me.byId("btnNew").setVisible(false);
                                        me.byId("btnEdit").setVisible(false);
                                        me.byId("btnDelete").setVisible(false);
                                        me.byId("btnClose").setVisible(false);
                                        me.byId("btnSave").setVisible(true);
                                        me.byId("btnCancel").setVisible(true);
                                        me.byId("btnTabLayout").setVisible(false);
                                        me.byId("btnView").setVisible(false);
                                        me.byId("_IDGenMenuButton3").setVisible(false);

                                        me._oDataBeforeChange = jQuery.extend(true, {}, me.getView().getModel("TableData").getData());
                                        
                                        me.getView().getModel("TableData").setProperty("/results", aDataToEdit);
                                        await me.getDynamicColumns('PRHDR', 'ZDV_3DERP_PR')
                        
                                        me.getView().getModel("ui").setProperty("/dataMode", 'EDIT');
                                        
                                        me.setRowEditMode("styleDynTable");
                                        Common.closeLoadingDialog(me);
                                    }
                                }
                            }
                            
                        }
                    }
                }
                else {
                    // aDataToEdit = aData;
                    MessageBox.information(msgNoDataToEdit);
                }
            }
            // Common.closeLoadingDialog(that);
            // aDataToEdit = aDataToEdit.filter(item => item.Deleted === false);
        },
        setRowEditMode: function(sTableName){
            var me = this;
            // this.getView().getModel(model).getData().results.forEach(item => item.Edited = false);
            var oTable;

            var oColumnsModel;
            var oColumnsData;

            var oParamData;

            if(sTableName === "styleDynTable"){
                oTable = this.byId(sTableName);
                oColumnsModel = this.getView().getModel("Columns");
                oColumnsData = oColumnsModel.getProperty('/');
                //Filtering and get only distinct value
                oParamData = this._oDataOnEditValidate.filter((value, index, self) => self.findIndex(item => item.DOCTYP === value.DOCTYP) === index);
                oTable.getColumns().forEach((col, idx) => {
                    oColumnsData.filter(item => item.ColumnName === col.sId.split("-")[1])
                    .forEach(ci => {
                        var sColumnName = ci.ColumnName;
                        var sColumnType = ci.DataType;
                        if (ci.Editable) {
                            if (sColumnType === "STRING") {
                                if(sColumnName === "REQSTNR" || sColumnName === "TRCKNO"){
                                    col.setTemplate(new sap.m.Input({
                                        id: "col-" + sColumnName,
                                        type: "Text",
                                        value: "{path: '" + ci.ColumnName + "', mandatory: " + ci.Mandatory + "}",
                                        maxLength: +ci.Length,
                                        showValueHelp: false,
                                        liveChange: this.onInputLiveChange.bind(this)
                                    }));
                                }else if(sColumnName === "MATNO"){
                                    col.setTemplate(new sap.m.Input({
                                        id: "col-" + sColumnName,
                                        type: "Text",
                                        // maxLength: +ci.Length,
                                        // showValueHelp: true,
                                        // valueHelpRequest: this.handleValueHelp.bind(this),
                                        // showSuggestion: true,
                                        // liveChange: this.onInputLiveChange.bind(this),
                                        enabled: {
                                            path: "DOCTYP",
                                            formatter: function (DOCTYP) {
                                                var result = true; 
                                                oParamData.forEach(async (data)=>{
                                                    if(DOCTYP === data.DOCTYP){
                                                        for(var x = 0; x < data.results.length; x++){
                                                            var data1 = data.results[x];
                                                            if(ci.ColumnName === data1.FIELD2){
                                                                if(data1.FIELD3 == "D"){
                                                                    result = false;
                                                                }else if(data1.FIELD3 == "MD"){
                                                                    result = false;
                                                                }

                                                                if(data1.FIELD3 === "MU"){
                                                                    ci.Mandatory = true;
                                                                }else if(data1.FIELD3 === "OU"){
                                                                    ci.Mandatory = false;
                                                                }else if(data1.FIELD3 === "R"){
                                                                    ci.Mandatory = true;
                                                                }else if(data1.FIELD3 === "U"){
                                                                    ci.Mandatory = true;
                                                                }else{
                                                                    ci.Mandatory = false;
                                                                }
                                                            }
                                                        }
                                                    }
                                                });
                                                return result;
                                            }

                                        },
                                        // value: {
                                        //     path: ci.ColumnName, 
                                        //     mandatory: ci.Mandatory 
                                        // },
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
                                }else{
                                    col.setTemplate(new sap.m.Input({
                                        id: "col-" + sColumnName,
                                        type: "Text",
                                        // maxLength: +ci.Length,
                                        // showValueHelp: true,
                                        // valueHelpRequest: this.handleValueHelp.bind(this),
                                        // showSuggestion: true,
                                        // liveChange: this.onInputLiveChange.bind(this),
                                        enabled: {
                                            path: "DOCTYP",
                                            formatter: function (DOCTYP) {
                                                var result = true; 
                                                oParamData.forEach(async (data)=>{
                                                    if(DOCTYP === data.DOCTYP){
                                                        for(var x = 0; x < data.results.length; x++){
                                                            var data1 = data.results[x];
                                                            if(ci.ColumnName === data1.FIELD2){
                                                                if(data1.FIELD3 == "D"){
                                                                    result = false;
                                                                }else if(data1.FIELD3 == "MD"){
                                                                    result = false;
                                                                }

                                                                if(data1.FIELD3 === "MU"){
                                                                    ci.Mandatory = true;
                                                                }else if(data1.FIELD3 === "OU"){
                                                                    ci.Mandatory = false;
                                                                }else if(data1.FIELD3 === "R"){
                                                                    ci.Mandatory = true;
                                                                }else if(data1.FIELD3 === "U"){
                                                                    ci.Mandatory = true;
                                                                }else{
                                                                    ci.Mandatory = false;
                                                                }
                                                            }
                                                        }
                                                    }
                                                });
                                                return result;
                                            }

                                        },
                                        // value: {
                                        //     path: ci.ColumnName, 
                                        //     mandatory: ci.Mandatory 
                                        // },
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
                                    displayFormat:"short",
                                    change:"handleChange",
                                    
                                    // liveChange: this.onInputLiveChange.bind(this),
                                    enabled: {
                                        path: "DOCTYP",
                                        formatter: function (DOCTYP) {
                                            var result; 
                                            oParamData.forEach(async (data)=>{
                                                if(DOCTYP === data.DOCTYP){
                                                    for(var x = 0; x < data.results.length; x++){
                                                        var data1 = data.results[x];
                                                        if(ci.ColumnName === data1.FIELD2){
                                                            if(data1.FIELD3 == "D"){
                                                                result = false;
                                                            }else if(data1.FIELD3 == "MD"){
                                                                result = false;
                                                            }
                                                            
                                                            if(data1.FIELD3 === "MU"){
                                                                ci.Mandatory = true;
                                                            }else if(data1.FIELD3 === "OU"){
                                                                ci.Mandatory = false;
                                                            }else if(data1.FIELD3 === "R"){
                                                                ci.Mandatory = true;
                                                            }else if(data1.FIELD3 === "U"){
                                                                ci.Mandatory = true;
                                                            }else{
                                                                ci.Mandatory = false;
                                                            }
                                                        }
                                                    }
                                                }
                                            });
                                            return result;
                                        }
                                    },
                                    value: "{path: '" + ci.ColumnName + "', mandatory: '"+ ci.Mandatory +"'}",
                                }));
                            }else if (sColumnType === "NUMBER"){
                                col.setTemplate(new sap.m.Input({
                                    id: "col-" + sColumnName,
                                    type: sap.m.InputType.Number,
                                    value: "{path:'" + ci.ColumnName + "', mandatory: '"+ ci.Mandatory +"', type:'sap.ui.model.type.Decimal', formatOptions:{ minFractionDigits:" + null + ", maxFractionDigits:" + null + " }, constraints:{ precision:" + ci.Decimal + ", scale:" + null + " }}",

                                    maxLength: +ci.Length,

                                    liveChange: this.onNumberLiveChange.bind(this),
                                    enabled: {
                                        path: "DOCTYP",
                                        formatter: function (DOCTYP) {
                                            var result; 
                                            oParamData.forEach(async (data)=>{
                                                if(DOCTYP === data.DOCTYP){
                                                    for(var x = 0; x < data.results.length; x++){
                                                        var data1 = data.results[x];
                                                        if(ci.ColumnName === data1.FIELD2){
                                                            if(data1.FIELD3 == "D"){
                                                                result = false;
                                                            }else if(data1.FIELD3 == "MD"){
                                                                result = false;
                                                            }
                                                            if(data1.FIELD3 === "MU"){
                                                                ci.Mandatory = true;
                                                            }else if(data1.FIELD3 === "OU"){
                                                                ci.Mandatory = false;
                                                            }else if(data1.FIELD3 === "R"){
                                                                ci.Mandatory = true;
                                                            }else if(data1.FIELD3 === "U"){
                                                                ci.Mandatory = true;
                                                            }
                                                        }
                                                    }
                                                }
                                            });
                                            return result;
                                        }
                                    }

                                }));
                            }
                            if (ci.Mandatory) {
                                col.getLabel().addStyleClass("sapMLabelRequired");
                                col.getLabel().addStyleClass("requiredField");
                            }
                        }
                    })
                });
            }else if(sTableName === "GENINFORECTbl"){
                oTable = this.byId(sTableName);
                oColumnsModel = this.getView().getModel("GENINFORECCol");
                oColumnsData = oColumnsModel.getProperty('/');

                oTable.getColumns().forEach((col, idx) => {
                    oColumnsData.filter(item => item.ColumnName === col.sId.split("-")[1])
                    .forEach(ci => {
                        var sColumnName = ci.ColumnName;
                        var sColumnType = ci.DataType;
                        if (ci.Editable) {
                            if (sColumnType === "STRING") {
                                if(sColumnName === "SALESPERSON" || sColumnName === "TELNO"){
                                    col.setTemplate(new sap.m.Input({
                                        id: "col-" + sColumnName,
                                        type: "Text",
                                        value: "{path: '" + ci.ColumnName + "', mandatory: " + ci.Mandatory + "}",
                                        maxLength: +ci.Length,
                                        showValueHelp: false,
                                        liveChange: this.onInputLiveChange.bind(this)
                                    }));
                                }else{
                                    col.setTemplate(new sap.m.Input({
                                        id: "col-" + sColumnName,
                                        type: "Text",
                                        // value: "{path: '" + ci.ColumnName + "', mandatory: '"+ ci.Mandatory +"'}",
                                        // maxLength: +ci.Length,
                                        // liveChange: this.onInputLiveChange.bind(this)
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
                                    change:"handleChange",
                                
                                    liveChange: this.onInputLiveChange.bind(this)
                                }));
                            }else if (sColumnType === "NUMBER"){
                                if (sColumnName === "NUMERATOR") {
                                    col.setTemplate(new sap.m.Input({
                                        id: "col-" + sColumnName,
                                        type: sap.m.InputType.Number,
                                        value: "{path:'" + ci.ColumnName + "', mandatory: "+ ci.Mandatory +", type:'sap.ui.model.type.Decimal', formatOptions:{ minFractionDigits:" + null + ", maxFractionDigits:" + null + " }, constraints:{ precision:" + ci.Decimal + ", scale:" + null + " }}",
                                        maxLength: +ci.Length,
                                        liveChange: this.onNumberLiveChange.bind(this),
                                        enabled: {
                                            path: "hasNumerDenom",
                                            formatter: function (sPath) {
                                                var result = true; 
                                                if(sPath){
                                                    result = false;
                                                }else{
                                                    result = true;
                                                }
                                                return result;
                                            }

                                        },
                                    }));
                                }else if (sColumnName === "DENOMINATOR") {
                                    col.setTemplate(new sap.m.Input({
                                        id: "col-" + sColumnName,
                                        type: sap.m.InputType.Number,
                                        value: "{path:'" + ci.ColumnName + "', mandatory: "+ ci.Mandatory +", type:'sap.ui.model.type.Decimal', formatOptions:{ minFractionDigits:" + null + ", maxFractionDigits:" + null + " }, constraints:{ precision:" + ci.Decimal + ", scale:" + null + " }}",
                                        maxLength: +ci.Length,
                                        liveChange: this.onNumberLiveChange.bind(this),
                                        enabled: {
                                            path: "hasNumerDenom",
                                            formatter: function (sPath) {
                                                var result = true; 
                                                if(sPath){
                                                    result = false;
                                                }else{
                                                    result = true;
                                                }
                                                return result;
                                            }

                                        },
                                    }));
                                }else{

                                    col.setTemplate(new sap.m.Input({
                                        id: "col-" + sColumnName,
                                        type: sap.m.InputType.Number,
                                        value: "{path:'" + ci.ColumnName + "', mandatory: "+ ci.Mandatory +", type:'sap.ui.model.type.Decimal', formatOptions:{ minFractionDigits:" + null + ", maxFractionDigits:" + null + " }, constraints:{ precision:" + ci.Decimal + ", scale:" + null + " }}",
                                        maxLength: +ci.Length,
                                        liveChange: this.onNumberLiveChange.bind(this)
                                    }));
                                }
                                //     col.setTemplate(new sap.m.Input({
                                //         // id: "ipt" + ci.name,
                                //         type: sap.m.InputType.Number,
                                //         value: "{path:'" + ci.ColumnName + "', mandatory: '"+ ci.Mandatory +"', type:'sap.ui.model.type.Decimal', formatOptions:{ minFractionDigits:" + null + ", maxFractionDigits:" + null + " }, constraints:{ precision:" + ci.Decimal + ", scale:" + null + " }}",
                                        
                                //         maxLength: +ci.Length,
                                //         enabled: {
                                //             path: "NUMERATOR",
                                //             formatter: function (DOCTYP) {
                                //                 var result = true; 
                                //                 oParamData.forEach(async (data)=>{
                                //                     if(DOCTYP === data.DOCTYP){
                                //                         for(var x = 0; x < data.results.length; x++){
                                //                             var data1 = data.results[x];
                                //                             if(ci.ColumnName === data1.FIELD2){
                                //                                 if(data1.FIELD3 == "D"){
                                //                                     result = false;
                                //                                 }else if(data1.FIELD3 == "MD"){
                                //                                     result = false;
                                //                                 }

                                //                                 if(data1.FIELD3 === "MU"){
                                //                                     ci.Mandatory = true;
                                //                                 }else if(data1.FIELD3 === "OU"){
                                //                                     ci.Mandatory = false;
                                //                                 }else if(data1.FIELD3 === "R"){
                                //                                     ci.Mandatory = true;
                                //                                 }else if(data1.FIELD3 === "U"){
                                //                                     ci.Mandatory = true;
                                //                                 }
                                //                             }
                                //                         }
                                //                     }
                                //                 });
                                //                 return result;
                                //             }

                                //         },
                                    
                                //         liveChange: this.onNumberLiveChange.bind(this)
                                //     }));
                                // }
                            }
                        }
                    });
                });
            }
            
            
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

        onInputLiveChangeSuggestion: async function(oEvent){
            var oSource = oEvent.getSource();
            var isInvalid = !oSource.getSelectedKey() && oSource.getValue().trim();

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

            var fieldIsMandatory = oEvent.getSource().getBindingInfo("value").mandatory === undefined ? false : oEvent.getSource().getBindingInfo("value").mandatory;
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
                if(oEvent.getSource().getParent().getId().includes("styleDynTable")){
                    var oInput = oEvent.getSource();
                    var oCell = oInput.getParent();
                    // var oRow = oCell.getBindingContext().getObject();
                    var sPath = oCell.getBindingContext().getPath();
                    var sRowPath = sPath == undefined ? null :"/results/"+ sPath.split("/")[2];

                    var sCol = oSource.getBindingInfo("value").parts[0].path;
                    this.getView().getModel("TableData").setProperty(sRowPath + "/" + sCol, oSource.getSelectedKey())
                }else if(oEvent.getSource().getParent().getId().includes("GENINFORECTbl")){
                    
                    var oInput = oEvent.getSource();
                    var oCell = oInput.getParent();
                    // var oRow = oCell.getBindingContext().getObject();
                    var sPath = oCell.getBindingContext().getPath();
                    var sRowPath = sPath == undefined ? null :"/results/"+ sPath.split("/")[2];

                    var sCol = oSource.getBindingInfo("value").parts[0].path;
                    this.getView().getModel("GENINFORECData").setProperty(sRowPath + "/" + sCol, oSource.getSelectedKey())
                    
                    this.onGetNumeratorDenominator(oEvent);

                }else{
                    var sModel = oSource.getBindingInfo("value").parts[0].model;
                    var sPath = oSource.getBindingInfo("value").parts[0].path;
                    this.getView().getModel(sModel).setProperty(sPath, oSource.getSelectedKey());
                }

                this._validationErrors.forEach((item, index) => {
                    if (item === oEvent.getSource().getId()) {
                        this._validationErrors.splice(index, 1)
                    }
                })
            }

        },

        onGetNumeratorDenominator: async function(oEvent){
            var me = this;
            var oInput = oEvent.getSource();
            var oCell = oInput.getParent();
            var sPath = oCell.getBindingContext().getPath();
            var sRowPath = sPath == undefined ? null :"/results/"+ sPath.split("/")[2];
            var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");
            var oParam = {};

            Common.openLoadingDialog(this);

            this._validationErrors.forEach((item, index) => {
                if (item === oEvent.getSource().getId()) {
                    this._validationErrors.splice(index, 1)
                }
            })

            var numerator = 0;
            var denominator = 0;

            var uomFrom = this.getView().getModel("GENINFORECData").getProperty(sRowPath + '/BASEUOM');
            var uomTo = this.getView().getModel("GENINFORECData").getProperty(sRowPath + '/ORDERUOM');
            var matno = this.getView().getModel("GENINFORECData").getProperty(sRowPath + '/MATNO');

            oParam = {
                "matnr": matno,
                "uom_from": uomFrom,
                "uom_to": uomTo
            }

            await new Promise((resolve, reject)=>{
                oModel.create("/UOMConvert", oParam, {
                    method: "POST",
                    success: function(oData, oResponse) {
                        numerator = oData.numerator === "" ? 0 : oData.numerator;
                        denominator = oData.denominator === "" ? 0 : oData.denominator;
                        me.getView().getModel("GENINFORECData").setProperty(sRowPath + "/NUMERATOR", numerator);
                        me.getView().getModel("GENINFORECData").setProperty(sRowPath + "/DENOMINATOR", denominator);
                        resolve();
                    },
                    error: function(err) {
                        resolve();
                    }
                })
            });
            if(numerator > 0 || denominator > 0){
                me.getView().getModel("GENINFORECData").setProperty(sRowPath + "/hasNumerDenom", true);
            }

            this._validationErrors = [];
            await me.setTableColumnsData("INFRECLIST_PR");
            await me.setRowEditMode("GENINFORECTbl");
            Common.closeLoadingDialog(this);
            
            // var sUOMValue = "";


            // if(oSource.getId().includes("ORDERUOM")){
            //     var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");
            //     var oParamData = [];
            //     var oParam = {};
            //     var sModel = oSource.getBindingInfo("value").parts[0].model;
            //     var sPath = oSource.getBindingInfo("value").parts[0].path;
            //     //ZFM_ERP_UOMCONVERT
            //     console.log(this.getView().getModel("GENINFORECData").getData());

                
            //     oParam = {
            //         "matnr": "",
            //         "uom_from": "",
            //         "uom_to": ""
            //     }
            //     await new Promise((resolve, reject)=>{
            //         oModel.create("/UOMConvert", oParam, {
            //             method: "POST",
            //             success: function(oData, oResponse) {
                            
                            
            //             },
            //             error: function(err) {
            //                 resolve();
            //             }
            //         })
            //     });
                
            // }
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
        onNumberLiveChange: function(oEvent){
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

            if (oEvent.getParameters().value.split(".").length > 1) {
                if (oEvent.getParameters().value.split(".")[1].length > 3) {
                    // console.log("invalid");
                    oEvent.getSource().setValueState("Error");
                    oEvent.getSource().setValueStateText("Enter a number with a maximum of 3 decimal places.");
                    this._validationErrors.push(oEvent.getSource().getId());

                }else{
                    oEvent.getSource().setValueState("None");
                    this._validationErrors.forEach((item, index) => {
                        if (item === oEvent.getSource().getId()) {
                            this._validationErrors.splice(index, 1)
                        }
                    })
                }
            }else{
                oEvent.getSource().setValueState("None");
                this._validationErrors.forEach((item, index) => {
                    if (item === oEvent.getSource().getId()) {
                        this._validationErrors.splice(index, 1)
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

        //Not used
        handleValueHelp_old: function(oEvent) {
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
        handleValueHelp: async function(oEvent){
            var me = this;
            var vSBU = this.getView().byId("cboxSBU").getSelectedKey();
            // var purPlantVal = this.getView().byId("PLANTCD").getValue();

            var oModelFilter = this.getOwnerComponent().getModel('ZVB_3DERP_PR_FILTERS_CDS');
            var oModelFilter2 = this.getOwnerComponent().getModel('ZVB_3DERP_PRM_FILTERS_CDS');
            var oSource = oEvent.getSource();
            var bProceed = true;

            var fieldName = oSource.getBindingInfo("value").parts[0].path.replace("/", "");
            this._inputValue = oSource.getValue();
            this._inputSource = oSource;

            var valueHelpObjects = [];
            var title = "";
            var sRowPath = oSource.oParent.getBindingContext().sPath;
            let oModelData = {};

            if(fieldName === 'MATNO'){
                await new Promise((resolve, reject) => {
                    oModelFilter.read('/ZVB_3DERP_PRMATNO',{
                        success: function (data, response) {
                            data.results.forEach(item=>{
                                item.Item = item.MatNo;
                                item.Desc = item.GMCDesc;
                            })

                            valueHelpObjects = data.results;
                            title = me.getView().getModel("captionMsg").getData()["MATNO"]
                            resolve();
                        },
                        error: function (err) {
                            resolve();
                        }
                    });
                });
            }
            if (fieldName === 'MATGRP') {
                await new Promise((resolve, reject) => {
                    oModelFilter.read('/ZVB_3DERP_MATGRP_SH',{
                        success: function (data, response) {
                            data.results.forEach(item=>{
                                item.Item = item.MaterialGrp;
                                item.Desc = "";
                            })

                            valueHelpObjects = data.results;
                            title = "Mat. Grp."
                            resolve();
                        },
                        error: function (err) {
                            resolve();
                        }
                    });
                });
            }
            if (fieldName === 'SHIPTOPLANT') {
                await new Promise((resolve, reject) => {
                    oModelFilter.read('/ZVB_3DERP_SHIPTOPLANT_SH',{
                        success: function (data, response) {
                            data.results.forEach(item=>{
                                item.Item = item.ShipToPlant;
                                item.Desc = "";
                            })

                            valueHelpObjects = data.results;
                            title = "Ship-To Plant"
                            resolve();
                        },
                        error: function (err) {
                            resolve();
                        }
                    });
                });
            }
            if (fieldName === 'PLANTCD') {
                await new Promise((resolve, reject) => {
                    oModelFilter.read('/ZVB_3DERP_PURPLANT_SH',{
                        success: function (data, response) {
                            data.results.forEach(item=>{
                                item.Item = item.PurchPlant;
                                item.Desc = "";
                            })

                            valueHelpObjects = data.results;
                            title = "Plant"
                            resolve();
                        },
                        error: function (err) {
                            resolve();
                        }
                    });
                });
            }
            if (fieldName === 'PURORG') {
                var vPlantCd = oEvent.getSource().oParent.oParent.getModel().getProperty(sRowPath + "/PLANTCD");
                await new Promise((resolve, reject) => {
                    oModelFilter.read('/ZVB_3DERP_PR_PURORG_SH',{
                        success: function (data, response) {
                            oModelData = data.results.filter(item=> item.PurchPlant === vPlantCd )
                            oModelData.forEach(item=>{
                                item.Item = item.PURORG;
                                item.Desc = item.Description;
                            })
                             

                            valueHelpObjects = oModelData;// data.results
                            title = "Purch. Org"
                            resolve();
                        },
                        error: function (err) {
                            resolve();
                        }
                    });
                });
            }
            if (fieldName === 'VENDOR') {
                var vPurOrg= oEvent.getSource().oParent.oParent.getModel().getProperty(sRowPath + "/PURORG");
                await new Promise((resolve, reject) => {
                    oModelFilter2.read('/ZVB_3DERP_PR_VENDOR_SH',{
                        success: function (data, response) {
                            oModelData = data.results.filter(item=> item.PURORG === vPurOrg )
                            data.results.forEach(item=>{
                                item.Item = item.VENDOR;
                                item.Desc = item.Description;
                            })

                            valueHelpObjects = oModelData;// data.results
                            title = "Vendor"
                            resolve();
                        },
                        error: function (err) {
                            resolve();
                        }
                    });
                });
            }
            if (fieldName === 'SUPTYP') {
                await new Promise((resolve, reject) => {
                    oModelFilter.read('/ZVB_3DERP_SUPPTYP_SH',{
                        success: function (data, response) {
                            data.results.forEach(item=>{
                                item.Item = item.SupTyp;
                                item.Desc = item.ShortText;
                            })

                            valueHelpObjects = data.results;
                            title = "Supply Type"
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
            if(fieldName === 'PURGRP'){
                await new Promise((resolve, reject) => {
                    oModelFilter2.read('/ZVB_3DERP_PURGRP_SH',{
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
            if(fieldName === 'SALESGRP'){
                await new Promise((resolve, reject) => {
                    oModelFilter2.read('/ZVB_3DERP_PR_SALESGRP_SH',{
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
            if(fieldName === 'CUSTGRP'){
                await new Promise((resolve, reject) => {
                    oModelFilter2.read('/ZVB_3DERP_PR_CUSTGRP_SH',{
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
            if(fieldName === 'SEASONCD'){
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
        handleValueHelpSearch : function (oEvent) {
            // var sValue = oEvent.getParameter("value");

            // var oFilter = new sap.ui.model.Filter({
            //     filters: [
            //         new sap.ui.model.Filter("VHTitle", sap.ui.model.FilterOperator.Contains, sValue),
            //         new sap.ui.model.Filter("VHDesc", sap.ui.model.FilterOperator.Contains, sValue)
            //     ],
            //     and: false
            // });

            // oEvent.getSource().getBinding("items").filter([oFilter]);
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
        //Not used


        searchGlobal: function(oEvent){
            if(this.getView().getModel("ui").getData().dataMode === 'NODATA'){
                return;
            }
            var oTable = oEvent.getSource().oParent.oParent;
            var sTable = oTable.getBindingInfo("rows");
            this._searchQuery = oEvent.getParameter("query");
            if (sTable === "gmc") {
                this.byId("searchFieldAttr").setProperty("value", "");
                this.byId("searchFieldMatl").setProperty("value", "");
            }

            this.exeGlobalSearch();
        },
        exeGlobalSearch() {
            var oFilter = null;
            var aFilter = [];
            var oTable = this.byId("styleDynTable");
            var oColumnsModel = this.getView().getModel("Columns");
            var oColumnsData = oColumnsModel.getProperty('/');
            var query = this._searchQuery;

            if (query) {
                oTable.getColumns().forEach((col, idx) => {
                    var sDataType = oColumnsData.filter(item => item.ColumnName === col.sId.split("-")[1])[0].ColumnName

                    if(sDataType != "DELETED" && sDataType != "CLOSED")
                        aFilter.push(new Filter(sDataType, FilterOperator.Contains, query));
                    else
                        aFilter.push(new Filter(sDataType, FilterOperator.EQ, query));
                })
                oFilter = new Filter(aFilter, false);
                this._isSearchGlobalHasValue = true;
            }else{
                this._isSearchGlobalHasValue = false;
            }
            this.byId("styleDynTable").getBinding("rows").filter(oFilter, "Application");
        },
        onCancelEdit: async function() {
            if (this._isEdited) {

                if (!this._DiscardChangesDialog) {
                    this._DiscardChangesDialog = sap.ui.xmlfragment("zuipr.view.dialog.DiscardChangesDialog", this);
                    this.getView().addDependent(this._DiscardChangesDialog);
                }
                
                this._DiscardChangesDialog.open();
            }
            else {
                Common.openLoadingDialog(that);
                this.byId("btnPOList").setVisible(true);
                this.byId("btnRefresh").setVisible(true);
                this.byId("btnNew").setVisible(true);
                this.byId("btnEdit").setVisible(true);
                this.byId("btnDelete").setVisible(true);
                this.byId("btnClose").setVisible(true);
                this.byId("btnSave").setVisible(false);
                this.byId("btnCancel").setVisible(false);
                this.byId("btnTabLayout").setVisible(true);
                this.byId("btnView").setVisible(true);
                this.byId("_IDGenMenuButton3").setVisible(true);
                this._validationErrors = [];
                
                await this.prUnLock();
                await this.getAllData();
                await this.getDynamicColumns('PRHDR', 'ZDV_3DERP_PR');
                
                if (this.getView().getModel("ui").getData().dataMode === 'NEW') this.setFilterAfterCreate();

                this.getView().getModel("ui").setProperty("/dataMode", 'READ');
                Common.closeLoadingDialog(that);
            }
        },
        onCloseDiscardChangesDialog: async function() {
            if (this._isEdited) {
                Common.openLoadingDialog(that);
                this.byId("btnPOList").setVisible(true);
                this.byId("btnRefresh").setVisible(true);
                this.byId("btnNew").setVisible(true);
                this.byId("btnEdit").setVisible(true);
                this.byId("btnDelete").setVisible(true);
                this.byId("btnClose").setVisible(true);
                this.byId("btnSave").setVisible(false);
                this.byId("btnCancel").setVisible(false);
                this.byId("btnTabLayout").setVisible(true);
                this.byId("btnView").setVisible(true);

                await this.getAllData();
                await this.getDynamicColumns('PRHDR', 'ZDV_3DERP_PR');

                Common.closeLoadingDialog(that);
            }
            this._validationErrors = [];
            this._DiscardChangesDialog.close();
            this.getView().getModel("ui").setProperty("/dataMode", 'READ');
            this._isEdited = false;
        },
        onCancelDiscardChangesDialog() {
            this._DiscardChangesDialog.close();
        },

        setFilterAfterCreate: function(oEvent) {
            if (this._aFiltersBeforeChange.length > 0) {
                var aFilter = [];
                var oFilter = null;
                var oTable = this.byId("styleDynTable");
                var oColumns = oTable.getColumns();
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

            var bProceed = true;
            //MessageBox Message
            var msgError = this.getView().getModel("captionMsg").getData()["INFO_REQUIRED_FIELD"];

            var aItems = oTable.getRows();
            if(oSelectedIndices.length > 0){
                aItems.forEach(function(oItem) {
                    oSelectedIndices.forEach((item, index) => {
                        if(oItem.getIndex() === item){
                            var aCells = oItem.getCells();
                            aCells.forEach(function(oCell) {
                                if (oCell.isA("sap.m.Input")) {
                                    if(oCell.getBindingInfo("value").mandatory){
                                        if(oCell.mProperties.enabled){
                                            if(oCell.getValue() === ""){
                                                oCell.setValueState(sap.ui.core.ValueState.Error);
                                                oCell.setValueStateText(me.getView().getModel("captionMsg").getData()["INFO_REQUIRED_FIELD"]);
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
                                }else if (oCell.isA("sap.m.DatePicker")) {
                                    if(oCell.getBindingInfo("value").mandatory){
                                        if(oCell.mProperties.enabled){
                                            if(oCell.getValue() === ""){
                                                oCell.setValueState(sap.ui.core.ValueState.Error);
                                                oCell.setValueStateText(me.getView().getModel("captionMsg").getData()["INFO_REQUIRED_FIELD"]);
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
                                }
                            })
                        }
                    })
                });
            }

            if (this._validationErrors.length > 0){
                MessageBox.error("Please Fill Required Fields!");
                bProceed = false;
            }

            if(bProceed){
                
                Common.openLoadingDialog(this);
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

                if (oParamData.length > 0) {
                    oParam['N_ChangePRParam'] = oParamData;
                    oParam['N_ChangePRReturn'] = [];
                    promiseResult = new Promise((resolve, reject)=>{
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
                                    resolve();
        
                                })
                                
                                MessageBox.information(message);
                                
                            },
                            error: function(err) {
                                var errorMsg;
                                try {
                                    errorMsg = JSON.parse(err.responseText).error.message.value;
                                } catch (err) {
                                    errorMsg = err.responseText;
                                }
                                //message = msgError
                                MessageBox.error(errorMsg);
                                resolve();
                            }
                        })
                    });

                    await promiseResult;
                    await this.getAllData();
                    await this.getDynamicColumns('PRHDR', 'ZDV_3DERP_PR')
                    await this.prUnLock();
                    
                    
                    this.byId("btnPOList").setVisible(true);
                    this.byId("btnRefresh").setVisible(true);
                    this.byId("btnNew").setVisible(true);
                    this.byId("btnEdit").setVisible(true);
                    this.byId("btnDelete").setVisible(true);
                    this.byId("btnClose").setVisible(true);
                    this.byId("btnSave").setVisible(false);
                    this.byId("btnCancel").setVisible(false);
                    this.byId("btnTabLayout").setVisible(true);
                    this.byId("btnView").setVisible(true);
                    this.byId("_IDGenMenuButton3").setVisible(true);
                    this._validationErrors = [];
                    this._isEdited = false;
                    
                    
                    this.getView().getModel("ui").setProperty("/dataMode", 'READ');
                }
                
                Common.closeLoadingDialog(this);
            }
        },
        onDeletePR: async function(){
            var me = this;
            var bProceed = true;
            var message = "";
            if(this.getView().getModel("ui").getData().dataMode === 'EDIT'){
                bProceed = false;
            }
            if(this.getView().getModel("ui").getData().dataMode === 'NODATA'){
                bProceed = false;
            }
            if(this._appAction === "display"){
                bProceed = false;
            }

            if(bProceed){
                Common.openLoadingDialog(that);
                this._oDataBeforeChange = jQuery.extend(true, {}, this.getView().getModel("TableData").getData());
                var oTable = this.byId("styleDynTable");
                var oSelectedIndices = oTable.getSelectedIndices();
                var oTmpSelectedIndices = [];
                var aData = oTable.getModel().getData().rows;
                var oParamData = [];
                var oParam = {};
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");
                var iCounter = 0;
                var isError = false;
                var promiseResult;
                this._oLockData = [];

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

                    for(var item of oSelectedIndices){
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
        
                            if(PRNo != "" || PRNo != null){
                                while(PRNo.length < 10) PRNo = "0" + PRNo;
                            }
                            me._oLockData.push({
                                Prno: PRNo,
                                Prln: PRItm
                            });

                            oParamData.push({
                                PreqNo: PRNo,
                                PreqItem: PRItm,
                                DeleteInd: 'X',
                                CloseInd: ''
                            })
                        }
                    }

                    if(await me.prLock(me)){
                        if (oParamData.length > 0) {
                            oParam['N_DelClosePRParam'] = oParamData;
                            oParam['N_DelClosePRReturn'] = [];
                            promiseResult = new Promise((resolve, reject)=>{
                                oModel.create("/DelClosePRSet", oParam, {
                                    method: "POST",
                                    success: function(oResultDCPR, oResponse){
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
                                            resolve();
                                        });
                                    },error: function(err){
                                        message = message + "Error Encountered! Please try agian! \n"
                                        isError = true;
                                        resolve();
                                    }
                                });
                            });
                            await promiseResult;
                        }
                        if (!isError){
                            await this.getAllData();
                            await this.getDynamicColumns('PRHDR', 'ZDV_3DERP_PR')
                            await this.prUnLock();
                        }
                    }
                }else{
                    message = msgNoDataToDelete;
                }
                Common.closeLoadingDialog(that);
                if(message !== "")
                    MessageBox.information(message);
            }
            
            
        },
        onClosePR: async function(){
            var me = this;
            var bProceed = true;
            var message = "";
            if(this.getView().getModel("ui").getData().dataMode === 'EDIT'){
                bProceed = false;
            }
            if(bProceed){
                Common.openLoadingDialog(that);
                this._oDataBeforeChange = jQuery.extend(true, {}, this.getView().getModel("TableData").getData());
                var oTable = this.byId("styleDynTable");
                var oSelectedIndices = oTable.getSelectedIndices();
                var oTmpSelectedIndices = [];
                var aData = oTable.getModel().getData().rows;
                var oParamData = [];
                var oParam = {};
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");
                var iCounter = 0;
                var isError = false;
                var promiseResult;
                this._oLockData = [];

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

                    for(var item of oSelectedIndices){
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
        
                            if(PRNo != "" || PRNo != null){
                                while(PRNo.length < 10) PRNo = "0" + PRNo;
                            }

                            me._oLockData.push({
                                Prno: PRNo,
                                Prln: PRItm
                            });

                            oParamData.push({
                                PreqNo: PRNo,
                                PreqItem: PRItm,
                                DeleteInd: '',
                                CloseInd: 'X'
                            })
                        }
                    }
                    if(await me.prLock(me)){
                        if (oParamData.length > 0) {
                            oParam['N_DelClosePRParam'] = oParamData;
                            oParam['N_DelClosePRReturn'] = [];
                            promiseResult = new Promise((resolve, reject)=>{
                                oModel.create("/DelClosePRSet", oParam, {
                                    method: "POST",
                                    success: function(oResultDCPR, oResponse){
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
                                            resolve();
                                        });
                                    },error: function(err){
                                        message = message + "Error Encountered! Please try agian! \n"
                                        isError = true;
                                        resolve();
                                    }
                                });

                            });
                            await promiseResult;
                        }
                        if (!isError){
                            await this.getAllData();
                            await this.getDynamicColumns('PRHDR', 'ZDV_3DERP_PR')
                            await this.prUnLock();
                        }
                    }
                    
                }else{
                    message  = msgNoDataToClose;
                }
                Common.closeLoadingDialog(that);
                if(message !== "")
                    MessageBox.information(message);
            }

        },

        onCreateNewPR: async function(){
            var vSBU = this.getView().byId("cboxSBU").getSelectedKey();

            if(this.getView().getModel("ui").getData().dataMode === 'READ'){
                this._router.navTo("ManualPR", {
                    SBU: vSBU
                });
            }
        },

        onSaveTableLayout: function (table) {
            //saving of the layout of table
            var me = this;
            var ctr = 1;
            var oTable = this.getView().byId(table);
            var oColumns = oTable.getColumns();
            var vSBU = this.getView().byId("cboxSBU").getSelectedKey();
            var type;
            var tabName;

            if(table === "styleDynTable"){
                type = "PRHDR";
                tabName = "ZDV_3DERP_PR";
            }else if(table === "assignVendorTab"){
                type = "ASSIGNVENDORPR";
                tabName = "ZDV_PR_AVAUTO";
            }

            var oParam = {
                "SBU": vSBU,
                "TYPE": type,
                "TABNAME": tabName,
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
                },
                error: function(err) {
                    sap.m.MessageBox.error(me.getView().getModel("captionMsg").getData()["INFO_ERROR"]);
                }
            });                
        },

        onPOListView: async function(){
            var me = this;
            var prNo = this.getView().getModel("ui").getData().prno;
            var prItm = this.getView().getModel("ui").getData().pritem;

            var oModel = this.getOwnerComponent().getModel();

            var poListData = {};
            var oJSONModel = new JSONModel();
            var poListJSONModel = new JSONModel();

            await new Promise((resolve, reject)=>{
                oModel.read("/ZERP_POLISTSet",{ 
                    urlParameters: {
                        "$filter": "PRNO eq '" + prNo + "' and PRITM eq '"+ prItm +"'"
                        // "$filter": "VENDORCD eq '0003101604' and PURCHORG eq '1601' and PURCHGRP eq '601' and SHIPTOPLANT eq 'B601' and PURCHPLANT eq 'C600' and DOCTYP eq 'ZMRP'"
                    },
                    success: async function (oData, oResponse) {
                        oData.results.forEach(item=>{
                            item.DELETED = item.DELETED === "L" ? true : false;
                            item.VENDOR = item.VENDOR + " - " + item.VENDORNAME
                        })
                        poListData = {
                            Title: "PO List"
                        };
                        poListJSONModel.setData(poListData);

                        me.poListDialog = sap.ui.xmlfragment(me.getView().getId(), "zuipr.view.fragments.POList", me);
                        me.poListDialog.setModel(poListJSONModel);
                        me.getView().addDependent(me.poListDialog);

                        oJSONModel.setData(oData);
                        me.getView().setModel(oJSONModel, "PRPOListData");
                        TableFilter.applyColFilters("prPOListTbl", me);

                        await new Promise((resolve, reject)=>{
                            resolve(me.getDynamicColumns('PRPOLIST','ZDV_PRPOLIST'));
                        });
                        // await _promiseResult;

                        me.poListDialog.open();
                    },
                    error: function () {
                    }
                });
            })
        },

        onClosePOList: async function(){
            this.poListDialog.destroy(true);
        },

        showAssignVendorResult(arg) {
            // display pop-up for user selection
            this.prUnLock();
            var vRowCount = this._oAssignVendorData.length > 7 ? this._oAssignVendorData : 7;

            if (!this._AssignVendorResultDialog) {
                this._AssignVendorResultDialog = sap.ui.xmlfragment("zuipr.view.fragments.dialog.AssignVendorResultDialog", this);

                this._AssignVendorResultDialog.setModel(
                    new JSONModel({
                        items: this._oAssignVendorData,
                        rowCount: vRowCount
                    })
                )

                this.getView().addDependent(this._AssignVendorResultDialog);
            }
            else {
                this._AssignVendorResultDialog.getModel().setProperty("/items", this._oAssignVendorData);
                this._AssignVendorResultDialog.getModel().setProperty("/rowCount", vRowCount);
            }

            if (arg === "assign") this._AssignVendorResultDialog.setTitle("Assign Vendor Result");
            else if (arg === "unassign") this._AssignVendorResultDialog.setTitle("Undo Assignment Result");

            this._AssignVendorResultDialog.open();
        },
        onAssignVendorManualSave: async function(oEvent) {
            var me = this;
            var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");
            var oSource = oEvent.getSource();
            var oTable = oSource.oParent.getContent()[0];
            var oSelectedIndices = oTable.getSelectedIndices();
            var aData = oTable.getModel().getData().rows;
            var oParamData = [];
            var oParam = {};

            if (oSelectedIndices.length > 0) {
                oSelectedIndices.forEach((selItemIdx, index) => {
                    oParamData.push({
                        PR: aData.at(selItemIdx).PRNO + aData.at(selItemIdx).PRITM
                    })
                })
                
                if (oParamData.length !== oParamData.filter((value, index, self) => self.findIndex(item => item.PR === value.PR) === index).length) {
                    sap.m.MessageBox.information(me.getView().getModel("captionMsg").getData()["INFO_SEL1_PR_ONLY"]);
                }
                else {
                    oParamData = [];
                    oParam = {};

                    oSelectedIndices.forEach((selItemIdx, index) => {
                        oParamData.push({
                            PreqNo: aData.at(selItemIdx).PRNO,
                            PreqItem: aData.at(selItemIdx).PRITM,
                            Matno: aData.at(selItemIdx).MATNO,
                            Uom: aData.at(selItemIdx).UNIT,
                            Quantity: aData.at(selItemIdx).QTY,
                            DelivDate: sapDateFormat.format(new Date(aData.at(selItemIdx).DELVDATE)) + "T00:00:00",
                            Batch: aData.at(selItemIdx).IONUMBER,
                            Plant: aData.at(selItemIdx).PLANTCD,
                            Purgrp: aData.at(selItemIdx).PURGRP,
                            Reqsnr: aData.at(selItemIdx).REQUISITIONER,
                            DesVendor: aData.at(selItemIdx).Vendor,
                            PurchOrg: aData.at(selItemIdx).PURORG,
                            Trackingno: aData.at(selItemIdx).TRACKINGNO,
                            Supplytyp: aData.at(selItemIdx).SUPPLYTYPE,
                            InfoRec: aData.at(selItemIdx).INFORECORD,
                            Shiptoplant: aData.at(selItemIdx).SHIPTOPLANT,
                            Seasoncd: aData.at(selItemIdx).SEASON,
                            ShortText: aData.at(selItemIdx).SHORTTEXT,
                            Callbapi: 'X'
                        })
                    })

                    oParam['N_ChangePRParam'] = oParamData;
                    oParam['N_ChangePRReturn'] = [];
                    Common.openLoadingDialog(me);
                    await new Promise((resolve)=>{
                        oModel.create("/ChangePRSet", oParam, {
                            method: "POST",
                            success: async function(oResultCPR, oResponse) {
                                if (oResultCPR.N_ChangePRReturn.results.length > 0) {
                                    me._oAssignVendorData.forEach(item => {
                                        var oRetMsg = oResultCPR.N_ChangePRReturn.results.filter(fItem => fItem.PreqNo === item.PRNUMBER && fItem.PreqItem === item.PRITEMNO);
    
                                        if (oRetMsg.length === 0)
                                            oRetMsg = oResultCPR.N_ChangePRReturn.results.filter(fItem => fItem.PreqNo === item.PRNUMBER);
    
                                        if (oRetMsg.length > 0) {
                                            if (oRetMsg[0].Type === 'S') {
                                                oParamData.filter(fItem => fItem.PreqNo === item.PRNUMBER && fItem.PreqItem === item.PRITEMNO)
                                                    .forEach(row => {
                                                        if (item.VENDOR !== '' && item.VENDOR !== row.DesVendor) {
                                                            item.REMARKS = 'Vendor updated.';
                                                        }
                                                        else if (item.VENDOR === '' && item.VENDOR !== row.DesVendor) {
                                                            item.REMARKS = 'Vendor assigned.';
                                                        }
                                                        else if (item.PURCHORG !== '' && item.PURCHORG !== row.PurchOrg) {
                                                            item.REMARKS = 'Purchasing Org updated.';
                                                        }
                                                        else {
                                                            item.REMARKS = oRetMsg[0].Message;
                                                        }
    
                                                        item.VENDOR = row.DesVendor;
                                                        me._refresh = true;
                                                    })
                                            }
                                            else {
                                                item.REMARKS = oRetMsg[0].Message;
                                            }
                                        }
                                        else {
                                            item.REMARKS = 'No return message on PR change.';
                                        }
                                    });
                                }
    
                                me.showAssignVendorResult("assign");
                                await me.getAllData();
                                await me.getTableColumns();
                                if(me._isSearchGlobalHasValue){
                                    if(me._searchQuery.length > 0)
                                    me.exeGlobalSearch();
                                }
                                me._AssignVendorDialog.close();
                                me.prUnLock();
                                resolve();
                            },
                            error: function() {
                                me.prUnLock();
                                resolve();
                            }
                        }); 
                    });                  
                    Common.closeLoadingDialog(me);
                }
            }
            else {
                MessageBox.information(me.getView().getModel("captionMsg").getData()["INFO_NO_SEL_RECORD_TO_PROC"]);
            }
        },

        onAssignVendorManualCancel: async function(oEvent) {
            this._AssignVendorDialog.close();

            var oSource = oEvent.getSource();
            var oTable = oSource.oParent.getContent()[0];
            
            this._oAssignVendorData.forEach(item => {
                oTable.getModel().getData().rows.filter(fItem => fItem.PRNO === item.PRNUMBER && fItem.PRITM === item.PRITEMNO).forEach(rItem => item.REMARKS = "Assign vendor cancelled.");
            })

            Common.openLoadingDialog(this);
            await this.getAllData();
            await this.getTableColumns();
            if(this._isSearchGlobalHasValue){
                if(this._searchQuery.length > 0)
                this.exeGlobalSearch();
            }
            Common.closeLoadingDialog(this);

            this.showAssignVendorResult("assign");
        },

        onAssignVendorClose: async function(oEvent) {
            // if (this._refresh) { 
            //     // if (this.byId("mainTab").getBinding("rows").aFilters.length > 0) {
            //     //     this._aColFilters = this.byId("mainTab").getBinding("rows").aFilters;
            //     //     this.getOwnerComponent().getModel("COLUMN_FILTER_MODEL").setProperty("/items", this._aColFilters);
            //     // }

            //     // if (this.byId("mainTab").getBinding("rows").aSorters.length > 0) {
            //     //     this._aColSorters = this.byId("mainTab").getBinding("rows").aSorters;
            //     //     // this.getOwnerComponent().getModel("COLUMN_SORTER_MODEL").setProperty("/items", this._aColSorters);
            //     // }

            //     this.refreshTableData(); 
            // }

            Common.openLoadingDialog(this);
            await this.getAllData();
            await this.getTableColumns();
            if(this._isSearchGlobalHasValue){
                if(this._searchQuery.length > 0)
                this.exeGlobalSearch();
            }
            Common.closeLoadingDialog(this);

            this._AssignVendorResultDialog.close();
            
            if (this._AssignVendorDialog !== undefined) {
                var oTable = this.byId("assignVendorTab");
                oTable.clearSelection();
                this._AssignVendorDialog.close();
            }
        },

        onAssignVendorAuto: async function(){
            var me = this;
            this._oAssignVendorData = [];
            this._oLockData = [];
            this._refresh = false;

            var oTable = this.byId("styleDynTable");
            var oSelectedIndices = oTable.getSelectedIndices();
            var oTmpSelectedIndices = [];
            var aData = oTable.getModel().getData().rows;
            var oParamData = [];
            var oParam = {};
            var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");
            var vSBU = this.getView().getModel("ui").getData().sbu;
            var vMatTypExist = false;
            var wVendor = false;

            if (oSelectedIndices.length > 0) {
                this._oModel.read("/ZERP_CHECKSet", {
                    urlParameters: {
                        "$filter": "SBU eq '" + vSBU + "' and FIELD1 eq 'INFORECORD'"
                    },
                    success: async function (oDataCheck, oResponse) {
                        oSelectedIndices.forEach(item => {
                            oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
                        })

                        oSelectedIndices = oTmpSelectedIndices;
                        oSelectedIndices.forEach((item, index) => {
                            if (oDataCheck.results.length > 0) {
                                if (oDataCheck.results.filter(fItem => fItem.FIELD2 === aData.at(item).MATTYP).length === 0) {
                                    if (aData.at(item).VENDOR === "") {
                                         oParamData.push({
                                                Vendor: aData.at(item).VENDOR,
                                                Material: aData.at(item).MATNO,
                                                PurchOrg: aData.at(item).PURORG,
                                                PurGroup: '', //aData.at(item).PURCHGRP,
                                                Plant: ''
                                                // Plant: aData.at(item).PURCHPLANT
                                            })
                    
                                            me._oAssignVendorData.push({
                                                PRNUMBER: aData.at(item).PRNO,
                                                PRITEMNO: aData.at(item).PRITM,
                                                MATERIALNO: aData.at(item).MATNO,
                                                IONUMBER: aData.at(item).BATCH,
                                                QTY: aData.at(item).QUANTITY,
                                                UNIT: aData.at(item).UOM,
                                                VENDOR: aData.at(item).VENDOR,
                                                PURCHORG: aData.at(item).PURORG,
                                                PURCHPLANT: aData.at(item).PLANTCD,
                                                PURCHGRP: aData.at(item).PURGRP,
                                                REMARKS: ''
                                            })
    
                                            me._oLockData.push({
                                                Prno: aData.at(item).PRNO,
                                                Prln: aData.at(item).PRITM
                                            })
                                    }
                                    else { wVendor = true; }
                                }
                                else vMatTypExist = true;
                            }
                            else {
                                if (aData.at(item).VENDOR === "") {
                                }
                                else { wVendor = true; }
                            }
                        })

                        if (oParamData.length > 0) {

                            var bProceed = await me.prLock(me);
                            if (!bProceed) return;

                            oParamData = oParamData.filter((value, index, self) => self.findIndex(item => item.Vendor === value.Vendor && item.Material === value.Material && item.PurchOrg === value.PurchOrg) === index) ;
                            oParam['N_GetInfoRecMatParam'] = oParamData;
                            oParam['N_GetInfoRecReturn'] = [];

                            oModel.create("/GetInfoRecordSet", oParam, {
                                method: "POST",
                                success: async function(oResult, oResponse) {
                                    var oManualAssignVendorData = [];
                                    oParamData = [];
                                    oParam = {};

                                    oSelectedIndices.forEach(selItemIdx => {
                                        var returnData = jQuery.extend(true, [], oResult.N_GetInfoRecReturn.results);
                                        if (aData.at(selItemIdx).VENDOR !== '') returnData = returnData.filter(fItem => fItem.Vendor === aData.at(selItemIdx).VENDOR);
                                        if (aData.at(selItemIdx).MATNO !== '') returnData = returnData.filter(fItem => fItem.Material === aData.at(selItemIdx).MATNO);
                                        // if (aData.at(selItemIdx).PURCHPLANT !== '') returnData = returnData.filter(fItem => fItem.Plant === aData.at(selItemIdx).PURCHPLANT);
                                        // if (aData.at(selItemIdx).PURCHGRP !== '') returnData = returnData.filter(fItem => fItem.PurGroup === aData.at(selItemIdx).PURCHGRP);
                                        if (aData.at(selItemIdx).PURORG !== '') returnData = returnData.filter(fItem => fItem.PurchOrg === aData.at(selItemIdx).PURORG);
                                        
                                        if (returnData.length > 0) {
                                            if (returnData[0].RetType === 'E') {
                                                me._oAssignVendorData.filter(fItem => fItem.PRNUMBER === aData.at(selItemIdx).PRNO && fItem.PRITEMNO === aData.at(selItemIdx).PRITM)
                                                    .forEach(item => item.REMARKS = returnData[0].RetMessage);
                                            }
                                            else if (returnData.length === 1) {
                                                // call function module ZFM_ERP_CHANGE_PR
                                                oParamData.push({
                                                    PreqNo: aData.at(selItemIdx).PRNO,
                                                    PreqItem: aData.at(selItemIdx).PRITM,
                                                    Matno: aData.at(selItemIdx).MATNO,
                                                    Uom: aData.at(selItemIdx).UOM,
                                                    Quantity: aData.at(selItemIdx).QUANTITY,
                                                    DelivDate: sapDateFormat.format(new Date(aData.at(selItemIdx).DELDT)) + "T00:00:00",
                                                    Batch: aData.at(selItemIdx).BATCH,
                                                    Plant: aData.at(selItemIdx).PLANTCD,
                                                    Purgrp: returnData[0].PurGroup,
                                                    Reqsnr: aData.at(selItemIdx).REQSTNR,
                                                    DesVendor: returnData[0].Vendor,
                                                    PurchOrg: returnData[0].PurchOrg,
                                                    Trackingno: aData.at(selItemIdx).TRCKNO,
                                                    Supplytyp: aData.at(selItemIdx).SUPTYP,
                                                    InfoRec: returnData[0].InfoRec,
                                                    Shiptoplant: aData.at(selItemIdx).SHIPTOPLANT,
                                                    Seasoncd: aData.at(selItemIdx).SEASONCD,
                                                    ShortText: aData.at(selItemIdx).SHORTTEXT,
                                                    Callbapi: 'X'
                                                })                                        
                                            }
                                            else if (returnData.length > 1) {
                                                returnData.forEach(item => {
                                                    item.PRNO = aData.at(selItemIdx).PRNO;
                                                    item.PRITM = aData.at(selItemIdx).PRITM;
                                                    item.INFORECORD = item.InfoRec;
                                                    item.VENDOR = item.Vendor;
                                                    item.MATNO = aData.at(selItemIdx).MATNO;
                                                    item.PURORG = item.PurchOrg; // PURORG
                                                    item.PLANTCD = aData.at(selItemIdx).PLANTCD;
                                                    item.PURGRP = item.PurGroup; // PURGRP
                                                    item.CURRENCY = item.Currency;// CURRENCY
                                                    item.PRICE = item.NetPrice;// 
                                                    item.PRICEUNIT = item.PriceUnit;// PRICEUNIT
                                                    item.UNIT = aData.at(selItemIdx).UOM;
                                                    item.CONVNUM = item.ConvNum1
                                                    item.CONVDEN = item.ConvDen1
                                                    item.TAXCODE = item.TaxCode
                                                    item.INCO1 = item.Incoterms1
                                                    item.INCO2 = item.Incoterms2
                                                    item.QTY = aData.at(selItemIdx).QUANTITY;
                                                    item.DELVDATE = aData.at(selItemIdx).DELDT;
                                                    item.IONUMBER = aData.at(selItemIdx).BATCH;
                                                    item.REQUISITIONER = aData.at(selItemIdx).REQSTNR;
                                                    item.TRACKINGNO = aData.at(selItemIdx).TRCKNO;
                                                    item.SUPPLYTYPE = aData.at(selItemIdx).SUPTYP;
                                                    item.SHIPTOPLANT = aData.at(selItemIdx).SHIPTOPLANT;
                                                    item.SEASON = aData.at(selItemIdx).SEASONCD;
                                                    item.SHORTTEXT = aData.at(selItemIdx).SHORTTEXT;

                                                    var oVendor = me.getView().getModel("onSuggVENDOR").getData().filter(fItem => fItem.VENDOR === item.Vendor);
                                                    if (oVendor.length > 0) { 
                                                        item.VENDORNAME = oVendor[0].Description;
                                                        item.VENDOR = oVendor[0].Description + " (" + item.Vendor + ")";
                                                    }
                                                    else { 
                                                        item.VENDORNAME = "";
                                                        item.VENDOR = item.Vendor;
                                                    }
        
                                                    oManualAssignVendorData.push(item);
                                                });
                                            }
                                        }
                                        else {
                                            me._oAssignVendorData.filter(fItem => fItem.PRNUMBER === aData.at(selItemIdx).PRNUMBER && fItem.PRITEMNO === aData.at(selItemIdx).PRITEMNO)
                                                .forEach(item => item.REMARKS = 'No matching info record retrieve.');
                                        }
                                    })

                                    // Call change PR function module
                                    if (oParamData.length > 0) {
                                        oParam['N_ChangePRParam'] = oParamData;
                                        oParam['N_ChangePRReturn'] = [];

                                        Common.openLoadingDialog(me);
                                        await new Promise((resolve)=>{
                                            oModel.create("/ChangePRSet", oParam, {
                                                method: "POST",
                                                success: function(oResultCPR, oResponse) {
                                                    if (oResultCPR.N_ChangePRReturn.results.length > 0) {
                                                        me._oAssignVendorData.forEach(async item => {
                                                            var oRetMsg = oResultCPR.N_ChangePRReturn.results.filter(fItem => fItem.PreqNo === item.PRNUMBER);
    
                                                            if (oRetMsg.length > 0) {
                                                                if (oRetMsg[0].Type === 'S') {
                                                                    oParamData.filter(fItem => fItem.PreqNo === item.PRNUMBER && fItem.PreqItem === item.PRITEMNO)
                                                                        .forEach(row => {
                                                                            if (item.VENDOR !== '' && item.VENDOR !== row.DesVendor) {
                                                                                item.REMARKS = 'Vendor updated.';
                                                                                item.VENDOR = row.DesVendor;
                                                                            }
                                                                            else if (item.VENDOR === '' && item.VENDOR !== row.DesVendor) {
                                                                                item.REMARKS = 'Vendor assigned.';
                                                                                item.VENDOR = row.DesVendor;
                                                                            }
                                                                            else if (item.PURCHORG !== '' && item.PURCHORG !== row.PurchOrg) {
                                                                                item.REMARKS = 'Purchasing Org updated.';
                                                                            }
                                                                            else {
                                                                                item.REMARKS = oRetMsg[0].Message;
                                                                            }
                                                                        })
                                                                        await me.getAllData();
                                                                        await me.getTableColumns();
                                                                        if(me._isSearchGlobalHasValue){
                                                                            if(me._searchQuery.length > 0)
                                                                            me.exeGlobalSearch();
                                                                        }
                                                                        me._refresh = true;
                                                                }
                                                                else {
                                                                    item.REMARKS = oRetMsg[0].Message;
                                                                }
                                                            }
                                                            else {
                                                                item.REMARKS = 'No return message on PR change.';
                                                            }
                                                        })
                                                    }
                                                    resolve();
                                                },
                                                error: function() {
                                                    // alert("Error");
                                                    resolve();
                                                }
                                            });
                                        });
                                        Common.closeLoadingDialog(me);

                                        // MessageBox.information(res.RetMsgSet.results[0].Message);
                                        if (oManualAssignVendorData.length > 0) {
                                            // display pop-up for user selection
                                            if (!me._AssignVendorDialog) {
                                                me._AssignVendorDialog = sap.ui.xmlfragment("zuipr.view.fragments.dialog.AssignVendorDialog", me);

                                                me._AssignVendorDialog.setModel(
                                                    new JSONModel({
                                                        // items: oManualAssignVendorData,
                                                        rowCount: oManualAssignVendorData.length > 6 ? oManualAssignVendorData.length : 6
                                                    })
                                                )

                                                me.getView().addDependent(me._AssignVendorDialog);

                                                me.getView().setModel(new JSONModel({results:oManualAssignVendorData}), "ASSIGNVENDORPRData");
                                                TableFilter.applyColFilters("assignVendorTab", me);

                                                await new Promise((resolve, reject)=>{
                                                    resolve(me.getDynamicColumns('ASSIGNVENDORPR','ZDV_PR_AVAUTO'));
                                                });
                                            }
                                            else {
                                                me.getView().setModel(new JSONModel({results:oManualAssignVendorData}), "ASSIGNVENDORPRData");
                                                await new Promise((resolve, reject)=>{
                                                    resolve(me.getDynamicColumns('ASSIGNVENDORPR','ZDV_PR_AVAUTO'));
                                                });
                                            }

                                            me._AssignVendorDialog.open();
                                        }
                                        else {
                                            me.showAssignVendorResult("assign");
                                            me.prUnLock();
                                        }
                                    }
                                    else if (oManualAssignVendorData.length > 0) {
                                        // display pop-up for user selection
                                        if (!me._AssignVendorDialog) {
                                            me._AssignVendorDialog = sap.ui.xmlfragment(me.getView().getId(), "zuipr.view.fragments.dialog.AssignVendorDialog", me);
        
                                            me._AssignVendorDialog.setModel(
                                                new JSONModel({
                                                    // items: oManualAssignVendorData,
                                                    rowCount: oManualAssignVendorData.length > 6 ? oManualAssignVendorData.length : 6
                                                })
                                            )
                                            
                                            me.getView().addDependent(me._AssignVendorDialog);

                                            me.getView().setModel(new JSONModel({results:oManualAssignVendorData}), "ASSIGNVENDORPRData");
                                            TableFilter.applyColFilters("assignVendorTab", me);

                                            await new Promise((resolve, reject)=>{
                                                resolve(me.getDynamicColumns('ASSIGNVENDORPR','ZDV_PR_AVAUTO'));
                                            });
                                        }
                                        else {
                                            // me._AssignVendorDialog.getModel().setProperty("/items", oManualAssignVendorData);
                                            // me._AssignVendorDialog.getModel().setProperty("/rowCount", oManualAssignVendorData.length > 6 ? oManualAssignVendorData.length : 6);
                                            me.getView().setModel(new JSONModel({results:oManualAssignVendorData}), "ASSIGNVENDORPRData");
                                            await new Promise((resolve, reject)=>{
                                                resolve(me.getDynamicColumns('ASSIGNVENDORPR','ZDV_PR_AVAUTO'));
                                            });
                                        }

                                        me._AssignVendorDialog.open();
                                    }
                                    else {
                                        me.showAssignVendorResult("assign");
                                        me.prUnLock();
                                    }
                                },
                                error: function() {
                                    me.prUnLock();
                                }
                            }); 

                        }else {
                            if (vMatTypExist) {
                                MessageBox.information(me.getView().getModel("captionMsg").getData()["INFO_INVALID_SEL_MATTYP"]);
                            }
                            else if (wVendor) {
                                MessageBox.information(me.getView().getModel("captionMsg").getData()["INFO_VENDOR_ALREADY_ASSIGNED"]);
                            }
                            else {
                                MessageBox.information(me.getView().getModel("captionMsg").getData()["INFO_NO_RECORD_TO_PROC"]);
                            }
                        }
                    },
                    error: function (err) {
                    }
                });
            }else{
                Common.closeLoadingDialog(me);
                MessageBox.information(me.getView().getModel("captionMsg").getData()["INFO_NO_RECORD_TO_PROC"]);
            }
        },

        //Assign Vendor
        onAssignVendor: async function(){
            var me = this;
            this._oAssignVendorData = [];
            this._oLockData = [];
            this._refresh = false;

            var oTable = this.byId("styleDynTable");
            var oSelectedIndices = oTable.getSelectedIndices();
            var oTmpSelectedIndices = [];
            var aData = oTable.getModel().getData().rows;
            var vSBU = this.getView().getModel("ui").getData().sbu;
            var vMatTypExist = true, vInvalid = false;

            if (oSelectedIndices.length > 0) {
                oSelectedIndices.forEach(item => {
                    oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
                })

                oSelectedIndices = oTmpSelectedIndices;

                oSelectedIndices.forEach(async (item, index) => {
                    if (vInvalid || !vMatTypExist) return;

                    if (aData.at(item).VENDOR !== "" || aData.at(item).PURCHORG === "") vInvalid = true;
                    me._oAssignVendorData.push({
                        PRNUMBER: aData.at(item).PRNO,
                        PRITEMNO: aData.at(item).PRITM,
                        MATERIALNO: aData.at(item).MATNO,
                        IONUMBER: aData.at(item).IONO,
                        QTY: aData.at(item).QUANTITY,
                        DELVDATE: aData.at(item).DELDT,
                        UNIT: aData.at(item).UOM,
                        PURCHORG: aData.at(item).PURORG,
                        PURCHPLANT: aData.at(item).PLANTCD,
                        PURCHGRP: aData.at(item).PURGRP,
                        REQUISITIONER: aData.at(item).REQSTNR,
                        TRACKINGNO: aData.at(item).TRCKNO,
                        SUPPLYTYPE: aData.at(item).SUPTYP,
                        SHIPTOPLANT: aData.at(item).SHIPTOPLANT,
                        SEASON: aData.at(item).SEASONCD,
                        SHORTTEXT: aData.at(item).SHORTTEXT,
                        VENDOR: "",
                        EDITED: false,
                        REMARKS: ""
                    })
                    me._oLockData.push({
                        Prno: aData.at(item).PRNO,
                        Prln: aData.at(item).PRITM
                    })
                    if (vInvalid) {
                        sap.m.MessageBox.information(me.getView().getModel("captionMsg").getData()["INFO_INVALID_SEL_MANUALASSIGNVENDOR"]);
                        Common.closeLoadingDialog(me);
                    }
                    else {
                        Common.openLoadingDialog(me);

                        var bProceed = await me.prLock(me);
                        if (!bProceed) return;

                        Common.closeLoadingDialog(me);
                        me.showManualVendorAssignment(); 
                    }
                })
                
            }
        },

        showManualVendorAssignment: function(){
            var me = this;
            this._bAssignVendorManualChanged = false;
            this._validationErrors = [];
            var oData = jQuery.extend(true, [], this._oAssignVendorData);
            oData = oData.filter((value, index, self) => self.findIndex(item => item.MATERIALNO === value.MATERIALNO && item.PURCHORG === value.PURCHORG) === index);

            oData.forEach(item => {
                item.VENDOR = "";
                item.VENDORNAME = "";
                item.CURR = "";
                item.PAYTERMS = "";
                item.INCO1 = "";
                item.INCO2 = "";
                item.EDITED = false;
            })

            var vRowCount = oData.length.length > 10 ? oData.length : 10;

            if (!me._AssignVendorManualDialog) {
                me._AssignVendorManualDialog = sap.ui.xmlfragment("zuipr.view.fragments.dialog.AssignVendorManualDialog", me);
                
                me._AssignVendorManualDialog.setModel(
                    new JSONModel({
                        rows: oData,
                        rowCount: vRowCount
                    })
                )

                me.getView().addDependent(me._AssignVendorManualDialog);

                var oTableEventDelegate = {
                    onkeyup: function (oEvent) {
                        me.onKeyUp(oEvent);
                    },

                    // onAfterRendering: function (oEvent) {
                    //     var oControl = oEvent.srcControl;
                    //     var sTabId = oControl.sId.split("--")[oControl.sId.split("--").length - 1];

                    //     if (sTabId.substr(sTabId.length - 3) === "Tab") me._tableRendered = sTabId;
                    //     else me._tableRendered = "";

                    //     me.onAfterTableRendering();
                    // }
                };

                sap.ui.getCore().byId("assignVendorManualTab").addEventDelegate(oTableEventDelegate);
            }
            else {
                me._AssignVendorManualDialog.getModel().setProperty("/rows", oData);
                me._AssignVendorManualDialog.getModel().setProperty("/rowCount", vRowCount);
            }

            me._AssignVendorManualDialog.setTitle(me.getView().getModel("captionMsg").getData()["MANUALASSIGNVENDOR"]);
            me._AssignVendorManualDialog.open();
            sap.ui.getCore().byId("assignVendorManualTab").focus();
        },

        beforeOpenAVM: async function(){
            var me = this;
            var oVendorSource = {};
            var oTable = sap.ui.getCore().byId("assignVendorManualTab");

            this._AssignVendorManualDialog.getModel().getData().rows.forEach((item, index) => {
                var vMatNo = item.MATERIALNO;

                this._oModel.read('/AssignVendorManuallySet', {
                    urlParameters: {
                        "$filter": "EKORG eq '" + item.PURCHORG + "'"
                    },
                    success: function (oData, oResponse) {
                        oData.results.sort((a,b) => (a.LIFNR > b.LIFNR ? 1 : -1));
                        oVendorSource[vMatNo] = oData.results;                            

                        oTable.getRows()[index].getCells()[1].bindAggregation("suggestionItems", {
                            path: "vendor>/" + vMatNo,
                            length: 10000,
                            template: new sap.ui.core.ListItem({
                                key: "{vendor>LIFNR}",
                                text: "{vendor>LIFNR}",
                                additionalText: "{vendor>NAME1}"
                            })
                        });

                        oTable.getRows()[index].getCells()[1].setValueState("None");

                        if (me._AssignVendorManualDialog.getModel().getData().rows.length === (index + 1)) {
                            me.getView().setModel(new JSONModel(oVendorSource), "vendor");
                        }
                    },
                    error: function (err) { }
                })
            })
        },
        onManualAV: async function(){
            if (this._validationErrors.length === 0) {
                var oTable = sap.ui.getCore().byId("assignVendorManualTab");
                var oSelectedIndices = oTable.getSelectedIndices();
                var oTmpSelectedIndices = [];
                var aData = this._AssignVendorManualDialog.getModel().getData().rows;
                var bProceed = true;
                var oParamData = [];
                var oParam = {};
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");  
                var me = this;

                if (oSelectedIndices.length === 0) {
                    if (aData.filter(fItem => fItem.VENDOR === "").length === 0) {
                        Common.openLoadingDialog(me);
                        this._oAssignVendorData.forEach((item, index) => {
                            var sVendor = aData.filter(fItem => fItem.MATERIALNO === item.MATERIALNO && fItem.PURCHORG === item.PURCHORG)[0].VENDOR;

                            oParamData.push({
                                PreqNo: item.PRNUMBER,
                                PreqItem: item.PRITEMNO,
                                Matno: item.MATERIALNO,
                                Uom: item.UNIT,
                                Quantity: item.QTY,
                                DelivDate: sapDateFormat.format(new Date(item.DELVDATE)) + "T00:00:00",
                                Batch: item.IONUMBER,
                                Plant: item.PURCHPLANT,
                                Purgrp: item.PURCHGRP,
                                Reqsnr: item.REQUISITIONER,
                                DesVendor: sVendor,
                                PurchOrg: item.PURCHORG,
                                Trackingno: item.TRACKINGNO,
                                Supplytyp: item.SUPPLYTYPE,
                                InfoRec: "",
                                Shiptoplant: item.SHIPTOPLANT,
                                Seasoncd: item.SEASON,
                                ShortText: item.SHORTTEXT,
                                Callbapi: 'X'
                            })
                        });

                        oParam['N_ChangePRParam'] = oParamData;
                        oParam['N_ChangePRReturn'] = [];

                        await new Promise((resolve) => {
                            oModel.create("/ChangePRSet", oParam, {
                                method: "POST",
                                success: async function(oResultCPR, oResponse) {
                                    if (oResultCPR.N_ChangePRReturn.results.length > 0) {
                                        me._oAssignVendorData.forEach(item => {
                                            var oRetMsg = oResultCPR.N_ChangePRReturn.results.filter(fItem => fItem.PreqNo === item.PRNUMBER && fItem.PreqItem === item.PRITEMNO);
    
                                            if (oRetMsg.length === 0)
                                                oRetMsg = oResultCPR.N_ChangePRReturn.results.filter(fItem => fItem.PreqNo === item.PRNUMBER);
    
                                            if (oRetMsg.length > 0) {
                                                if (oRetMsg[0].Type === 'S') {
                                                    oParamData.filter(fItem => fItem.PreqNo === item.PRNUMBER && fItem.PreqItem === item.PRITEMNO)
                                                        .forEach(row => {
                                                            if (item.VENDOR !== '' && item.VENDOR !== row.DesVendor) {
                                                                item.REMARKS = 'Vendor updated.';
                                                            }
                                                            else if (item.VENDOR === '' && item.VENDOR !== row.DesVendor) {
                                                                item.REMARKS = 'Vendor assigned.';
                                                            }
                                                            else if (item.PURCHORG !== '' && item.PURCHORG !== row.PurchOrg) {
                                                                item.REMARKS = 'Purchasing Org updated.';
                                                            }
                                                            else {
                                                                item.REMARKS = oRetMsg[0].Message;
                                                            }
    
                                                            item.VENDOR = row.DesVendor;
                                                            me._refresh = true;
                                                        })
                                                }
                                                else {
                                                    item.REMARKS = oRetMsg[0].Message;
                                                }
                                            }
                                            else {
                                                item.REMARKS = 'No return message on PR change.';
                                            }
                                        })
                                    }
    
                                    me.showAssignVendorResult("manual");
                                    me._AssignVendorManualDialog.close();
                                    await me.getAllData();
                                    await me.getTableColumns();
                                    if(me._isSearchGlobalHasValue){
                                        if(me._searchQuery.length > 0)
                                        me.exeGlobalSearch();
                                    }
                                    resolve();
                                },
                                error: function() {
                                    me.prUnLock();
                                    resolve();
                                }
                            }); 
                        })
                        Common.closeLoadingDialog(me);
                    }
                    else {
                        MessageBox.information(this.getView().getModel("captionMsg").getData()["INFO_INPUT_REQD_FIELDS"])
                    }
                }else{
                    oSelectedIndices.forEach(item => {
                        oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
                    });

                    oSelectedIndices = oTmpSelectedIndices;

                    oSelectedIndices.forEach((item, index) => {
                        if (aData.at(item).VENDOR === "") bProceed = false;
                    });

                    if (bProceed) {
                        Common.openLoadingDialog(me);
                        oSelectedIndices.forEach(async (item, index) => {
                            this._oAssignVendorData.filter(fItem => fItem.MATERIALNO === aData.at(item).MATERIALNO && fItem.PURCHORG === aData.at(item).PURCHORG)
                            .forEach(oItem => {
                                oParamData.push({
                                    PreqNo: oItem.PRNUMBER,
                                    PreqItem: oItem.PRITEMNO,
                                    Matno: oItem.MATERIALNO,
                                    Uom: oItem.UNIT,
                                    Quantity: oItem.QTY,
                                    DelivDate: sapDateFormat.format(new Date(oItem.DELVDATE)) + "T00:00:00",
                                    Batch: oItem.IONUMBER,
                                    Plant: oItem.PURCHPLANT,
                                    Purgrp: oItem.PURCHGRP,
                                    Reqsnr: oItem.REQUISITIONER,
                                    DesVendor: aData.at(item).VENDOR,
                                    PurchOrg: oItem.PURCHORG,
                                    Trackingno: oItem.TRACKINGNO,
                                    Supplytyp: oItem.SUPPLYTYPE,
                                    InfoRec: "",
                                    Shiptoplant: oItem.SHIPTOPLANT,
                                    Seasoncd: oItem.SEASON,
                                    ShortText: oItem.SHORTTEXT,
                                    Callbapi: 'X'
                                })

                                oItem.REMARKS = "Process";
                            })

                            
                            oParam['N_ChangePRParam'] = oParamData;
                            oParam['N_ChangePRReturn'] = [];

                            await new Promise((resolve)=>{
                                oModel.create("/ChangePRSet", oParam, {
                                    method: "POST",
                                    success: async function(oResultCPR, oResponse) {
                                        if (oResultCPR.N_ChangePRReturn.results.length > 0) {
                                            me._oAssignVendorData.forEach(item => {
                                                var oRetMsg = oResultCPR.N_ChangePRReturn.results.filter(fItem => fItem.PreqNo === item.PRNUMBER && fItem.PreqItem === item.PRITEMNO);
        
                                                if (oRetMsg.length === 0)
                                                    oRetMsg = oResultCPR.N_ChangePRReturn.results.filter(fItem => fItem.PreqNo === item.PRNUMBER);
        
                                                if (oRetMsg.length > 0) {
                                                    if (oRetMsg[0].Type === 'S') {
                                                        oParamData.filter(fItem => fItem.PreqNo === item.PRNUMBER && fItem.PreqItem === item.PRITEMNO)
                                                            .forEach(row => {
                                                                if (item.VENDOR !== '' && item.VENDOR !== row.DesVendor) {
                                                                    item.REMARKS = 'Vendor updated.';
                                                                }
                                                                else if (item.VENDOR === '' && item.VENDOR !== row.DesVendor) {
                                                                    item.REMARKS = 'Vendor assigned.';
                                                                }
                                                                else if (item.PURCHORG !== '' && item.PURCHORG !== row.PurchOrg) {
                                                                    item.REMARKS = 'Purchasing Org updated.';
                                                                }
                                                                else {
                                                                    item.REMARKS = oRetMsg[0].Message;
                                                                }
        
                                                                item.VENDOR = row.DesVendor;
                                                                me._refresh = true;
                                                            })
                                                    }
                                                    else {
                                                        item.REMARKS = oRetMsg[0].Message;
                                                    }
                                                }
                                                else {
                                                    if (item.REMARKS === "Process") {
                                                        item.REMARKS = 'No return message on PR change.';
                                                    }
                                                    else {
                                                        item.REMARKS = 'Skip, manual assign not process.';
                                                    }
                                                }
                                            })
                                        }
        
                                        me.showAssignVendorResult("manual");
                                        me._AssignVendorManualDialog.close();
                                        await me.getAllData();
                                        await me.getTableColumns();
                                        if(me._isSearchGlobalHasValue){
                                            if(me._searchQuery.length > 0)
                                            me.exeGlobalSearch();
                                        }
                                        resolve();
                                    },
                                    error: function() {
                                        me.prUnLock();
                                        resolve();
                                    }
                                });
                            });
                        })

                        Common.closeLoadingDialog(me);
                    }
                }
            }else {
                MessageBox.information(this.getView().getModel("captionMsg").getData()["INFO_CHECK_INVALID_ENTRIES"]);
            }
        },
        onCancelAVM: async function(){
            var oData = {
                Text: this.getView().getModel("captionMsg").getData()["CONFIRM_CANCEL_ASSIGNVENDOR"]
            }

            if (!this._ConfirmDialog) {
                this._ConfirmDialog = sap.ui.xmlfragment("zuipr.view.fragments.dialog.ConfirmDialog", this);

                this._ConfirmDialog.setModel(new JSONModel(oData));
                this.getView().addDependent(this._ConfirmDialog);
            }
            else this._ConfirmDialog.setModel(new JSONModel(oData));
                
            this._ConfirmDialog.open();
        },
        onCloseConfirmDialog: function(oEvent) {
            this._ConfirmDialog.close();
            this._AssignVendorManualDialog.close();
            this.prUnLock();
        },  
        onCancelConfirmDialog: function(oEvent) {   
            this._ConfirmDialog.close();
        },

        handleStaticValueHelp: function(oEvent) {
            var oSource = oEvent.getSource();

            this._inputId = oSource.getId();
            this._inputValue = oSource.getValue();
            this._inputSource = oSource;
            this._inputField = oSource.getBindingInfo("value").parts[0].path;

            var sRowPath = oSource.getBindingInfo("value").binding.oContext.sPath;
            var vMatNo = this._AssignVendorManualDialog.getModel().getProperty(sRowPath + "/MATERIALNO");                
            this.getView().setModel(new JSONModel(this.getView().getModel("vendor").getData()[vMatNo]), "vendors");

            TableValueHelp.handleStaticTableValueHelp(oEvent, this);
        },
        onStaticValueHelpInputChange: function(oEvent) {
            var oSource = oEvent.getSource();
            var isInvalid = !oSource.getSelectedKey() && oSource.getValue().trim();
            var sPath = oSource.getBindingInfo("value").parts[0].path;
            var sRowPath = oSource.oParent.getBindingContext().sPath;

            oSource.setValueState(isInvalid ? "Error" : "None");

            oSource.getSuggestionItems().forEach(item => {
                if (item.getProperty("key") === oSource.getValue().trim()) {
                    isInvalid = false;
                    oSource.setValueState(isInvalid ? "Error" : "None");
                }
            })

            oSource.getSuggestionItems().forEach(item => {
                if (item.getProperty("key") === oSource.getValue().trim()) {
                    isInvalid = false;
                    oSource.setValueState(isInvalid ? "Error" : "None");
                }
            })

            if (isInvalid) { 
                this._validationErrors.push(oEvent.getSource().getId());

                this._AssignVendorManualDialog.getModel().setProperty(sRowPath + '/VENDORNAME', "");
                this._AssignVendorManualDialog.getModel().setProperty(sRowPath + '/CURR', "");
                this._AssignVendorManualDialog.getModel().setProperty(sRowPath + '/PAYTERMS', "");
                this._AssignVendorManualDialog.getModel().setProperty(sRowPath + '/INCO1', "");
                this._AssignVendorManualDialog.getModel().setProperty(sRowPath + '/INCO2', "");
            }
            else {
                this._AssignVendorManualDialog.getModel().setProperty(sPath, oSource.getSelectedKey());

                if (oSource.getSelectedKey() === "") {
                    this._AssignVendorManualDialog.getModel().setProperty(sRowPath + '/VENDORNAME', "");
                    this._AssignVendorManualDialog.getModel().setProperty(sRowPath + '/CURR', "");
                    this._AssignVendorManualDialog.getModel().setProperty(sRowPath + '/PAYTERMS', "");
                    this._AssignVendorManualDialog.getModel().setProperty(sRowPath + '/INCO1', "");
                    this._AssignVendorManualDialog.getModel().setProperty(sRowPath + '/INCO2', "");
                }
                else {
                    var vMatNo = this._AssignVendorManualDialog.getModel().getProperty(sRowPath + "/MATERIALNO");
                    var oVendor = this.getView().getModel("vendor").getData()[vMatNo].filter(fItem => fItem.LIFNR === oSource.getSelectedKey());
                    
                    this._AssignVendorManualDialog.getModel().setProperty(sRowPath + '/VENDORNAME', oVendor[0].NAME1);                           
                    this._AssignVendorManualDialog.getModel().setProperty(sRowPath + '/CURR', oVendor[0].WAERS);
                    this._AssignVendorManualDialog.getModel().setProperty(sRowPath + '/PAYTERMS', oVendor[0].ZTERM);                           
                    this._AssignVendorManualDialog.getModel().setProperty(sRowPath + '/INCO1', oVendor[0].INCO1);
                    this._AssignVendorManualDialog.getModel().setProperty(sRowPath + '/INCO2', oVendor[0].INCO2);
                }

                this._validationErrors.forEach((item, index) => {
                    if (item === oEvent.getSource().getId()) {
                        this._validationErrors.splice(index, 1)
                    }
                })
            }
        },
        onUndoAssignVendor: async function(){
            this._oAssignVendorData = [];
            this._oLockData = [];
            this._refresh = false;

            var me = this;
            var oTable = this.byId("styleDynTable");
            var oSelectedIndices = oTable.getSelectedIndices();
            var oTmpSelectedIndices = [];
            var aData = oTable.getModel().getData().rows;
            var oParamData = [];
            var oParam = {};
            var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");

            if (oSelectedIndices.length > 0) {
                oSelectedIndices.forEach(item => {
                    oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
                })

                oSelectedIndices = oTmpSelectedIndices;

                oSelectedIndices.forEach((selItemIdx, index) => {
                    if (aData.at(selItemIdx).VENDOR !== '') {
                        oParamData.push({
                            PreqNo: aData.at(selItemIdx).PRNO,
                            PreqItem: aData.at(selItemIdx).PRITM,
                            Matno: aData.at(selItemIdx).MATNO,
                            Uom: aData.at(selItemIdx).UOM,
                            Quantity: aData.at(selItemIdx).QUANTITY,
                            DelivDate: sapDateFormat.format(new Date(aData.at(selItemIdx).DELDT)) + "T00:00:00",
                            Batch: aData.at(selItemIdx).BATCH,
                            Plant: aData.at(selItemIdx).PLANTCD,
                            Purgrp: aData.at(selItemIdx).PURGRP,
                            Reqsnr: aData.at(selItemIdx).REQSTNR,
                            DesVendor: '',
                            PurchOrg: aData.at(selItemIdx).PURORG,
                            Trackingno: aData.at(selItemIdx).TRCKNO,
                            Supplytyp: aData.at(selItemIdx).SUPTYP,
                            InfoRec: '',
                            Shiptoplant: aData.at(selItemIdx).SHIPTOPLANT,
                            Seasoncd: aData.at(selItemIdx).SEASONCD,
                            ShortText: aData.at(selItemIdx).SHORTTEXT,
                            Callbapi: 'X'
                        })

                        this._oAssignVendorData.push({
                            PRNUMBER: aData.at(selItemIdx).PRNO,
                            PRITEMNO: aData.at(selItemIdx).PRITM,
                            MATERIALNO: aData.at(selItemIdx).MATNO,
                            IONUMBER: aData.at(selItemIdx).IONO,
                            QTY: aData.at(selItemIdx).QUANTITY,
                            UNIT: aData.at(selItemIdx).UOM,
                            VENDOR: aData.at(selItemIdx).VENDOR,
                            PURCHORG: aData.at(selItemIdx).PURORG,
                            PURCHPLANT: aData.at(selItemIdx).PLANTCD,
                            PURCHGRP: aData.at(selItemIdx).PURGRP,
                            REMARKS: ''
                        })

                        this._oLockData.push({
                            Prno: aData.at(selItemIdx).PRNO,
                            Prln: aData.at(selItemIdx).PRITM
                        })
                    }
                })

                if (oParamData.length > 0) {
                    Common.openLoadingDialog(me);
                    var bProceed = await this.prLock(this);
                    if (!bProceed) return;

                    oParam['N_ChangePRParam'] = oParamData;
                    oParam['N_ChangePRReturn'] = [];

                    await new Promise((resolve)=>{
                        oModel.create("/ChangePRSet", oParam, {
                            method: "POST",
                            success: async function(oResultCPR, oResponse) {

                                if (oResultCPR.N_ChangePRReturn.results.length > 0) {
                                    me._oAssignVendorData.forEach(item => {
                                        var oRetMsg = oResultCPR.N_ChangePRReturn.results.filter(fItem => fItem.PreqNo === item.PRNUMBER);

                                        if (oRetMsg.length > 0) {
                                            item.REMARKS = oRetMsg[0].Message;
                                        }
                                        else {
                                            item.REMARKS = 'No return message on PR change.';
                                        }

                                        me._refresh = true;
                                    })
                                }
                                await me.getAllData();
                                await me.getTableColumns();
                                if(me._isSearchGlobalHasValue){
                                    if(me._searchQuery.length > 0)
                                    me.exeGlobalSearch();
                                }

                                me.showAssignVendorResult("unassign");
                                resolve();
                            },
                            error: function() {
                                // alert("Error");
                                resolve();
                            }
                        });
                    })
                    
                    Common.closeLoadingDialog(me);
                }else {
                    MessageBox.information(me.getView().getModel("captionMsg").getData()["INFO_NO_VENDOR"]);
                }
            }else {
                MessageBox.information(me.getView().getModel("captionMsg").getData()["INFO_NO_SEL_RECORD_TO_PROC"]);
            }
        },
        onCreateInfoRecord: async function(){
            var me = this;
            var aSelectedItems = [];
            var oView = this.getView();
            var oJSONModel = new JSONModel();
            var ioToProcess = [];
            var oTable = this.byId("styleDynTable");
            var oSelectedIndices = oTable.getSelectedIndices();
            var oTmpSelectedIndices = [];
            var aData = oTable.getModel().getData().rows;
            var iCounter = 0;

            var currentDate = new Date();

            if (oSelectedIndices.length > 0) {
                oSelectedIndices.forEach(item => {
                    oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
                })

                oSelectedIndices = oTmpSelectedIndices;
                // oSelectedIndices.forEach(async (item, index) => {
                for(var item of oSelectedIndices){
                    iCounter++;
                    if (aData.at(item).DELETED === true) {
                        if (oSelectedIndices.length === iCounter) {
                            MessageBox.information(this.getView().getModel("captionMsg").getData()["INFO_ALREADY_DELETED"]);
                        }
                    }else if(aData.at(item).CLOSED === true){
                        if (oSelectedIndices.length === iCounter) {
                            MessageBox.information(this.getView().getModel("captionMsg").getData()["INFO_ALREADY_CLOSED"]);
                        }
                    }else if(aData.at(item).VENDOR === "" || aData.at(item).VENDOR === null || aData.at(item).VENDOR === undefined){
                        if (oSelectedIndices.length === iCounter) {
                            MessageBox.information(this.getView().getModel("captionMsg").getData()["INFO_VENDOR_REQUIRED"]);
                        }
                    }else{
                        me._oLockData.push({
                            Prno: aData.at(item).PRNO,
                            Prln: aData.at(item).PRITM
                        });
                        if(await me.prLock(me)){
                            await new Promise((resolve)=>{
                                this._oModel.read('/INFOREC_PRSet', {
                                    urlParameters: {
                                        "$filter": "PRNO eq '" + aData.at(item).PRNO + "' and PRITM eq '" + aData.at(item).PRITM + "'"
                                    },
                                    success: function (oData, response) {
                                        if(oData.results.length > 0){
                                            oData.results.forEach(item => {
                                                //SET DATAB (VALID FROM) AS CURRENT DATE
                                                item.DATAB = item.DATAB === "0000-00-00" || item.DATAB === "    -  -  " ? "" : dateFormat.format(new Date(currentDate));
                                                //SET DATBI (VALID TO) AS '9999-12-31'
                                                item.DATBI = item.DATBI === "0000-00-00" || item.DATBI === "    -  -  " ? "" : dateFormat.format(new Date('9999-12-31'));
                                                item.hasNumerDenom = false;
                                            })
                                            aSelectedItems.push(oData.results[0]);
                                        }
                                        resolve();
                                    },
                                    error: function (err) {
                                        resolve();
                                    }
                                })
                            })
                        }
                    }
                }

                if(aSelectedItems.length > 0){
                    if (!me._INFORECDialog) {
                        me._INFORECDialog = sap.ui.xmlfragment(me.getView().getId(), "zuipr.view.fragments.CrtInfoRec", me);
                        me.getView().addDependent(me._INFORECDialog);

                        oJSONModel.setData({results: aSelectedItems});
                        oView.setModel(oJSONModel, "GENINFORECData");

                        await me.getDynamicColumns('INFRECLIST_PR','ZDV_PR_INFOREC');
                        me.setRowEditMode("GENINFORECTbl");
                        me._INFORECDialog.open();
                    }
                }else{
                    MessageBox.information(this.getView().getModel("captionMsg").getData()["INFO_NO_DATA_TO_PROCESS"]);
                }

                // if(ioToProcess.length > 0){
                //     if (!me._INFORECDialog) {
                //         me._INFORECDialog = sap.ui.xmlfragment(me.getView().getId(), "zuipr.view.fragments.CrtInfoRec", me);
                //         me.getView().addDependent(me._INFORECDialog);

                //         var sPath = jQuery.sap.getModulePath("zuipr", "/model/columns.json");

                //         var oModelColumns = new JSONModel();
                //         await oModelColumns.loadData(sPath);

                //         var oColumns = oModelColumns.getData();
                //         me._oModelColumns = oModelColumns.getData();
                        
                //         // var oTable = sap.ui.getCore().byId("GENINFORECTbl");
                //         // oTable.setModel(new JSONModel({
                //         //     columns: [],
                //         //     rows: []
                //         // })); 

                //         oJSONModel.setData({results: ioToProcess});
                //         oView.setModel(oJSONModel, "toProcessInfoRecData");

                //         await me.getDynamicColumns('INFRECLIST','ZDV_IOINFREC');
                //         me._INFORECDialog.open();
                //         // sap.ui.getCore().byId("GENINFORECTbl").getModel().setProperty("/rows", me.getView().getModel("GENINFORECCol").getData());
                //         // sap.ui.getCore().byId("GENINFORECTbl").bindRows("/rows");
                        
                        
                //     }
                // }else{
                //     MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_NO_DATA_TO_PROCESS"]);
                // }
            }

            
        },
        onfragmentCreateInfoRec: async function(){
            var me = this;
            var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");
            var vSBU = this.getView().getModel("ui").getData().sbu;
            var oTable = this.byId("GENINFORECTbl");
            var oSelectedIndices = oTable.getBinding("rows").aIndices;
            var oParam = {};
            var oInput = [];
            var boolProceed = true;

            var aItems = oTable.getRows();

            if(oSelectedIndices.length > 0){
                aItems.forEach(function(oItem) {
                    oSelectedIndices.forEach((item, index) => {
                        if(oItem.getIndex() === item){
                            var aCells = oItem.getCells();
                            aCells.forEach(function(oCell) {
                                if (oCell.isA("sap.m.Input")) {
                                    if(oCell.getBindingInfo("value").mandatory){
                                        if(oCell.mProperties.enabled){
                                            if(oCell.getValue() === ""){
                                                oCell.setValueState(sap.ui.core.ValueState.Error);
                                                oCell.setValueStateText(me.getView().getModel("captionMsg").getData()["INFO_REQUIRED_FIELD"]);
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
                                    }
                                }else if (oCell.isA("sap.m.DatePicker")) {
                                    if(oCell.getBindingInfo("value").mandatory){
                                        if(oCell.mProperties.enabled){
                                            if(oCell.getValue() === ""){
                                                oCell.setValueState(sap.ui.core.ValueState.Error);
                                                oCell.setValueStateText(me.getView().getModel("captionMsg").getData()["INFO_REQUIRED_FIELD"]);
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
                var infnrData = this.byId("GENINFORECTbl").getModel().getData().rows;

                var aItems = oTable.getRows();

                infnrData.forEach(item => {
                    oInput.push({
                        Ekorg: item.PURORG,                                 //PURCHASING ORG
                        Lifnr: item.VENDOR,                                 //VENDOR CD
                        Matnr: item.MATNO,                                  //MATERIAL NO
                        Verkf: item.SALESPERSON,                            //SALES PERSON
                        Telf1: item.TELNO,                                  //TELEPHONE NO
                        Meins: item.BASEUOM,                                //BASE UNIT
                        Bstme: item.ORDERUOM,                               //ORDER UNIT
                        Umren: item.NUMERATOR,                              //NUMERATOR
                        Umrez: item.DENOMINATOR,                            //DENOMINATOR
                        Ekgrp: item.PURGRP,                                 //PURCHASING GROUP
                        Norbm: "1",                                         //PURCHASE ORDER REQD QTY
                        Webre: true,                                        // GR BASED IV
                        Datab: me.formatDateToYYYYMMDD(new Date(item.DATAB)) + "T00:00:00",  //VALID FROM DATE
                        Datbi: me.formatDateToYYYYMMDD(new Date(item.DATBI)) + "T00:00:00",  //VALID TO DATE
                        Netpr: item.UNITPRICE,                              //NET PRICE
                        Waers: item.CURRENCY,                               //CURRENCYCD
                        Peinh: item.PRICEUNIT,                              //PRICE UNIT
                        Meins2: "",                                         //UNIT OF MEASURE OF 2ND QUANTITY   
                        // Aplfz: "",                                       //PLANNED DLV TIME
                        Name1: item.VENDORNAME,                             //VENDOR NAME
                        Maktx: item.GMCDESCEN,                              //MATERIAL DESCRIPTION
                        Purplant: item.PLANTCD                              //PURCHASING
                    });
                });
                oParam["SBU"] = vSBU;
                oParam["N_CreateInfoRecParam"] = oInput;
                oParam["N_CreateInfoRecReturn"] = [];
                oModel.setUseBatch(false);


                // infnrData.forEach(async iData => {
                //     await me.updateInfoRecord(iData.PURORG,iData.MATNO,iData.VENDOR,iData.PURGRP, "00000002");
                //     // await me.getDynamicColumns('INFRECLIST_PR','ZDV_PR_INFOREC');
                //     // me.byId("btnINFNRSubmit").setVisible(false);
                //     // me.byId("btnINFNRCancel").setVisible(false);
                //     // me.byId("btnINFNRClose").setVisible(true);
                // })
                Common.openLoadingDialog(this);
                await new Promise((resolve)=>{
                    oModel.create("/CreateInfoRecordSet", oParam, {
                        method: "POST",
                        success: async function (oDataReturn, oResponse) {
                            //assign the materials based on the return
    
                            oDataReturn.N_CreateInfoRecReturn.results.forEach(iReturn => {
                                infnrData.filter(fData => fData.MATNO === iReturn.Matnr)
                                    .forEach(async iData => {
                                        iData.REMARKS = iData.REMARKS + " " + iReturn.Message;
                                        iData.INFORECORD = iReturn.Infnr;
                                        if(iReturn.Infnr !== "" && iReturn.Infnr !== null && iReturn.Infnr !== undefined){
                                            await me.updateInfoRecord(iData.PURORG,iData.MATNO,iData.VENDOR,iData.PURGRP, iReturn.Infnr);
                                        }
                                    })
                            });
    
                            await me.getDynamicColumns('INFRECLIST_PR','ZDV_PR_INFOREC');
                            me.byId("btnINFNRSubmit").setVisible(false);
                            me.byId("btnINFNRCancel").setVisible(false);
                            me.byId("btnINFNRClose").setVisible(true);
                            resolve();
                        },
                        error: function (err) {
                            resolve();
                            // Common.closeLoadingDialog(me);
                        }
                    });
                });
                Common.closeLoadingDialog(this);
            }

        },

        updateInfoRecord: async function(vPurOrg, vMatNo, vVendor, vPurchGrp, vInfoRec){
            var me = this;
            var oModel = this.getOwnerComponent().getModel();
            var rfcModel = this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");
            var oRawData = [];
            var oParamData = [];
            var oParam = {};

            await new Promise((resolve)=>{
                oModel.read("/PRSet", {
                    success: function (data, response) {
                        if(data.results.length > 0){
                            data.results.forEach((item, index) => {
                                item.DELETED = item.DELETED === "" ? false : true;
                                item.CREATEDDT = dateFormat.format(new Date(item.CREATEDDT));
                                item.UPDATEDDT = dateFormat.format(new Date(item.UPDATEDDT));
                                item.RELDT = dateFormat.format(new Date(item.RELDT));
                                item.REQDT = dateFormat.format(new Date(item.REQDT));
                                item.DELDT = dateFormat.format(new Date(item.DELDT));
                            })
                            oRawData = data.results;
                        }
                        resolve();
                    },
                    error: function (err) { 
                        resolve();
                    }
                });
            })

            for(var index in oRawData){
                if(oRawData[index].PURORG === vPurOrg && oRawData[index].MATNO === vMatNo && oRawData[index].VENDOR === vVendor 
                    && oRawData[index].PURGRP === vPurchGrp && oRawData[index].DELETED === false && oRawData[index].CLOSED === false){
                    oParamData.push({
                        PreqNo: oRawData[index].PRNO,
                        PreqItem: oRawData[index].PRITM,
                        Matno: oRawData[index].MATNO,
                        Uom: oRawData[index].UOM,
                        Quantity: oRawData[index].QUANTITY,
                        DelivDate: sapDateFormat.format(new Date(oRawData[index].DELDT)) + "T00:00:00",
                        Batch: oRawData[index].BATCH,
                        Plant: oRawData[index].PLANTCD,
                        Purgrp: oRawData[index].PURGRP,
                        Reqsnr: oRawData[index].REQSTNR,
                        DesVendor: oRawData[index].VENDOR,
                        PurchOrg: oRawData[index].PURORG,
                        Trackingno: oRawData[index].TRCKNO,
                        Supplytyp: oRawData[index].SUPTYP,
                        InfoRec: vInfoRec,
                        Shiptoplant: oRawData[index].SHIPTOPLANT,
                        Seasoncd: oRawData[index].SEASONCD,
                        ShortText: oRawData[index].SHORTTEXT,
                        Callbapi: 'X'
                    })
                }
            }
            if (oParamData.length > 0) {
                oParam['N_ChangePRParam'] = oParamData;
                oParam['N_ChangePRReturn'] = [];
                await new Promise((resolve, reject)=>{
                    rfcModel.create("/ChangePRSet", oParam, {
                        method: "POST",
                        success: async function(oResultCPR, oResponse) {
                            await me.getAllData();
                            await me.getDynamicColumns('PRHDR', 'ZDV_3DERP_PR')
                            await me.prUnLock();
                            resolve();
                        },
                        error: function(err) {
                            resolve();
                        }
                    })
                });
            }
        },

        formatDateToYYYYMMDD(date) {
            var year = date.getFullYear();
            var month = ('0' + (date.getMonth() + 1)).slice(-2);
            var day = ('0' + date.getDate()).slice(-2);
            
            return year + '-' + month + '-' + day;
        },


        onCancelInfoRec: function(){
            this._INFORECDialog.close();
            this._INFORECDialog.destroy();
            this._INFORECDialog = null;

            this.prUnLock();
        },

        onTableResize: function(oEvent){
            var vFullScreen = oEvent.getSource().data("Max") === "1" ? true : false;
            var vTableTyp = oEvent.getSource().data("Type");
            if(vTableTyp === "Hdr"){
                if(vFullScreen){
                    this.byId("SmartFilterBar").setFilterBarExpanded(false);
                    this.byId("btnFullScreen").setVisible(false);
                    this.byId("btnExitFullScreen").setVisible(true);
                }else{
                    this.byId("SmartFilterBar").setFilterBarExpanded(true);
                    this.byId("btnFullScreen").setVisible(true);
                    this.byId("btnExitFullScreen").setVisible(false);
                }
            }
        },

        onExportToExcel: Utils.onExport,

        callCaptionsAPI: async function(){
            var me = this;
            var oJSONModel = new JSONModel();
            var oDDTextParam = [];
            var oDDTextResult = [];
            var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");

            //Total
            oDDTextParam.push({CODE: "TOTAL"});
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
            oDDTextParam.push({CODE: "SEASON"});

            //Button Label
            oDDTextParam.push({CODE: "POLIST"});
            oDDTextParam.push({CODE: "REFRESH"});
            oDDTextParam.push({CODE: "NEW"});
            oDDTextParam.push({CODE: "EDIT"});
            oDDTextParam.push({CODE: "DELETE"});
            oDDTextParam.push({CODE: "CLOSE"});
            oDDTextParam.push({CODE: "SAVE"});
            oDDTextParam.push({CODE: "CANCEL"});
            oDDTextParam.push({CODE: "SAVELAYOUT"});
            oDDTextParam.push({CODE: "VIEW"});

            //MessageBox
            oDDTextParam.push({CODE: "INFO_NO_LAYOUT"});
            oDDTextParam.push({CODE: "INFO_ALREADY_DELETED"});
            oDDTextParam.push({CODE: "INFO_ERROR"});
            oDDTextParam.push({CODE: "INFO_LAYOUT_SAVE"});
            oDDTextParam.push({CODE: "INFO_ALREADY_CLOSED"});
            oDDTextParam.push({CODE: "INFO_NO_RECORD_SELECT"});
            oDDTextParam.push({CODE: "INFO_NO_DATA_EDIT"});
            oDDTextParam.push({CODE: "INFO_NO_DATA_DELETE"});
            oDDTextParam.push({CODE: "INFO_NO_DATA_CLOSE"});
            oDDTextParam.push({CODE: "INFO_DELETED_OR_CLOSED"});
            oDDTextParam.push({CODE: "INFO_REQUIRED_FIELD"});

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

            oDDTextParam.push({CODE: "ASSIGNVENDOR"});
            oDDTextParam.push({CODE: "UNDOASSIGNVENDOR"});

            oDDTextParam.push({CODE: "INFO_NO_RECORD_TO_PROC"});
            oDDTextParam.push({CODE: "INFO_INVALID_SEL_MATTYP"});
            oDDTextParam.push({CODE: "INFO_VENDOR_ALREADY_ASSIGNED"});
            oDDTextParam.push({CODE: "INFO_INVALID_SEL_MANUALASSIGNVENDOR"});
            oDDTextParam.push({CODE: "INFO_NO_VENDOR"});

            oDDTextParam.push({CODE: "MATERIALNO"});
            oDDTextParam.push({CODE: "VENDORNAME"});
            oDDTextParam.push({CODE: "PURCHORG"});
            oDDTextParam.push({CODE: "ASSIGN"});

            oDDTextParam.push({CODE: "INFO_CHECK_INVALID_ENTRIES"});
            oDDTextParam.push({CODE: "INFO_INPUT_REQD_FIELDS"});
            oDDTextParam.push({CODE: "CONFIRM_CANCEL_ASSIGNVENDOR"});

            oDDTextParam.push({CODE: "CRTINFOREC"});
            oDDTextParam.push({CODE: "INFO_NO_DATA_TO_PROCESS"});
            oDDTextParam.push({CODE: "INFO_VENDOR_REQUIRED"});
            oDDTextParam.push({CODE: "INFO_FILL_REQUIRED_FIELDS"});

            oDDTextParam.push({CODE: "INFO_SEL1_PR_ONLY"});
            oDDTextParam.push({CODE: "INFO_NO_SEL_RECORD_TO_PROC"});

            oDDTextParam.push({CODE: "PRNUMBER"});
            oDDTextParam.push({CODE: "PRITEMNO"});
            oDDTextParam.push({CODE: "INFORECORD"});
            oDDTextParam.push({CODE: "PURCHPLANT"});
            oDDTextParam.push({CODE: "CURR"});
            oDDTextParam.push({CODE: "PRICE"});
            oDDTextParam.push({CODE: "PRICEUNIT"});
            oDDTextParam.push({CODE: "UOM"});
            oDDTextParam.push({CODE: "CONVNUM"});
            oDDTextParam.push({CODE: "CONVDEN"});
            oDDTextParam.push({CODE: "TAXCODE"});
            oDDTextParam.push({CODE: "INCO1"});
            oDDTextParam.push({CODE: "INCO2"});

            oDDTextParam.push({CODE: "EXPORTTOEXCEL"});
            
            await oModel.create("/CaptionMsgSet", { CaptionMsgItems: oDDTextParam  }, {
                method: "POST",
                success: function(oData, oResponse) {
                    oData.CaptionMsgItems.results.forEach(item=>{
                        oDDTextResult[item.CODE] = item.TEXT;
                    })
                    
                    // console.log(oDDTextResult)
                    oJSONModel.setData(oDDTextResult);
                    that.getView().setModel(oJSONModel, "captionMsg");
                    me.getOwnerComponent().getModel("CAPTION_MSGS_MODEL").setData({text: oDDTextResult});
                },
                error: function(err) {
                    sap.m.MessageBox.error(err);
                }
            });
        },

        prLock: async (me) => {
            var oModelLock = me.getOwnerComponent().getModel("ZGW_3DERP_LOCK_SRV");
            var oParamLock = {};
            var sError = "";
            var boolResult = true;

            await new Promise((resolve, reject) => {
                oParamLock["N_IMPRTAB"] = me._oLockData;
                oParamLock["iv_count"] = 300;
                oParamLock["N_LOCK_MESSAGES"] = []; 

                oModelLock.create("/Lock_PRSet", oParamLock, {
                    method: "POST",
                    success: function(oResultLock) {
                        // console.log("Lock", oResultLock);
                        for(var item of oResultLock.N_LOCK_MESSAGES.results) {
                            if (item.Type === "E") {
                                sError += item.Message + ". ";
                            }
                        }
                        
                        if (sError.length > 0) {
                            boolResult = false;
                            sap.m.MessageBox.information(sError);
                            Common.closeLoadingDialog(me);
                        }
                        else boolResult = true;
                        resolve();
                    },
                    error: function (err) {
                        Common.closeLoadingDialog(me);
                        resolve(false);
                    }
                });
            });
            return boolResult;
        },

        prUnLock() {
            var oModelLock = this.getOwnerComponent().getModel("ZGW_3DERP_LOCK_SRV");
            var oParamUnLock = {};
            var me = this;

            oParamUnLock["N_IMPRTAB"] = this._oLockData;
            oModelLock.create("/Unlock_PRSet", oParamUnLock, {
                method: "POST",
                success: function(oResultLock) {
                    console.log("Unlock", oResultLock)
                },
                error: function (err) {
                    Common.closeLoadingDialog(me);
                }
            })

            this._oLockData = [];
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
    }
  );
  