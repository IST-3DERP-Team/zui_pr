sap.ui.define([
    "sap/ui/core/mvc/Controller",
    'sap/ui/model/Filter',
    "../js/Common",
    // "../js/Utils",
    "sap/ui/model/json/JSONModel",
    'jquery.sap.global',
    'sap/ui/core/routing/HashChanger'
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, Filter, Common, Utils, JSONModel, jQuery, HashChanger) {
        "use strict";

        var that;
        var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({pattern : "MM/dd/yyyy" });

        return Controller.extend("zuipr.controller.PRDet", {

            onInit: function () {
                that = this;
                
                //Initialize router
                var oComponent = this.getOwnerComponent();
                this._router = oComponent.getRouter();
                this._router.getRoute("PRDetail").attachPatternMatched(this._routePatternMatched, this);
                
                //Initialize translations
                this._i18n = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            },
            _routePatternMatched: function (oEvent) {
                this._prno = oEvent.getParameter("arguments").PRNO; //get Style from route pattern
                this._pritm = oEvent.getParameter("arguments").PRITM; //get SBU from route pattern
                
                // //Load header
                this.getHeaderData(); //get header data

                // this.getColorsTable();

                // //Load value helps
                // Utils.getStyleSearchHelps(this);
                // Utils.getAttributesSearchHelps(this);
                // Utils.getProcessAttributes(this);

                // //Attachments
                // this.bindUploadCollection();
                // this.getView().getModel("FileModel").refresh();
            },
            getHeaderData: function () {
                var me = this;
                var prno = this._prno;
                var pritm = this._pritm;
                var oModel = this.getOwnerComponent().getModel();
                var oJSONModel = new sap.ui.model.json.JSONModel();
                var oView = this.getView();

                Common.openLoadingDialog(that);

                //read Style header data
                
                var entitySet = "/PRSet(PRNO='" + prno + "',PRITM='"+ pritm +"')"
                oModel.read(entitySet, {
                    success: function (oData, oResponse) {
                        // var oldData = oData;
                        // me._headerData = JSON.parse(JSON.stringify(oData));
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
                        // me.setChangeStatus(false);
                    },
                    error: function () {
                        Common.closeLoadingDialog(that);
                    }
                })
            },

           
        });
    });
