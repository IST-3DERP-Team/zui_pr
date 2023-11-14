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
    ],
    function(BaseController, JSONModel, MessageBox, Common, formatter, Filter, FilterOperator,Device, HashChanger, XMLModel, TableFilter, TableValueHelp, SearchField, typeString) {
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

            this._Model = this.getOwnerComponent().getModel();
            // this._i18n = this.getOwnerComponent().getModel("i18n").getResourceBundle();

            this._isEdited = false
            this._DiscardChangesDialog = null;
            this._oDataBeforeChange = {}
            this._smartFilterBar = this.getView().byId("SmartFilterBar");

            //for word Searching Function
            this._isSearchGlobalHasValue = false;
            this._searchQuery = "";

            this._oDataOnEditValidate = [];
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

            //MATNO
            await new Promise((resolve, reject) => {
                oModelFilter.read('/ZVB_3DERP_PRMATNO',{
                    success: function (data, response) {
                        data.results.forEach(item=>{
                            item.MATNO = item.MatNo;
                            item.Item = item.MatNo;
                            item.Desc = item.GMCDesc;
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
                        }else{
                            me._columnLoadError = true;
                            if(modCode === "PRHDR"){
                                me.getView().setModel(oJSONColumnsModel, "Columns");
                                me.setTableColumnsData(modCode);
                                resolve();
                            }
                            if(modCode === "PRPOLIST"){
                                oJSONColumnsModel.setData(oData.results);
                                me.getView().setModel(oJSONColumnsModel, "POListCol");
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

            
            this.byId(table).addEventDelegate(oDelegateKeyUp);
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
                            return oValue[0].Desc + " (" + sColumnId + ")";
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

                                        me._oDataBeforeChange = jQuery.extend(true, {}, me.getView().getModel("TableData").getData());
                                        
                                        me.getView().getModel("TableData").setProperty("/results", aDataToEdit);
                                        await me.getDynamicColumns('PRHDR', 'ZDV_3DERP_PR')
                        
                                        me.getView().getModel("ui").setProperty("/dataMode", 'EDIT');
                                        
                                        me.setRowEditMode();
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
        setRowEditMode: function(){
            var me = this;
            // this.getView().getModel(model).getData().results.forEach(item => item.Edited = false);
            var oTable = this.byId("styleDynTable");

            var oColumnsModel = this.getView().getModel("Columns");
            var oColumnsData = oColumnsModel.getProperty('/');

            var oParamData;
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
                                    // id: "ipt" + ci.name,
                                    type: "Text",
                                    value: "{path: '" + ci.ColumnName + "', mandatory: '" + ci.Mandatory + "'}",
                                    maxLength: +ci.Length,
                                    showValueHelp: false,
                                    liveChange: this.onInputLiveChange.bind(this)
                                }));
                            }else{
                                col.setTemplate(new sap.m.Input({
                                    // id: "ipt" + ci.name,
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
                                            { value: 'ValueKey' }
                                        ],
                                        formatter: this.formatValueHelp.bind(this),
                                        mandatory: ci.Mandatory
                                    },
                                    textFormatMode: 'ValueKey',
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
                                // id: "ipt" + ci.name,
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
                                // id: "ipt" + ci.name,
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
                    that.byId("btnView").setVisible(true);
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

            oDDTextParam.push({CODE: "FULLSCREEN"});
            oDDTextParam.push({CODE: "EXITFULLSCREEN"});

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
  